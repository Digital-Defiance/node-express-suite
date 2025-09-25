/// <reference path="../types.d.ts" />

import {
  ECIES,
  EmailString,
  HandleableError,
  SecureString,
  UINT64_SIZE,
} from '@digitaldefiance/ecies-lib';
import { isValidTimezone, LanguageCodes } from '@digitaldefiance/i18n-lib';
import {
  Member as BackendMember,
  ECIESService,
} from '@digitaldefiance/node-ecies-lib';
import {
  AccountStatus,
  Constants as AppConstants,
  EmailTokenType,
  GenericValidationError,
  getSuiteCoreTranslation,
  ITokenRole,
  ITokenUser,
  IUserBase,
  SuiteCoreStringKey,
  UsernameOrEmailRequiredError,
} from '@digitaldefiance/suite-core-lib';
import { NextFunction, Request, Response } from 'express';
import { body } from 'express-validator';
import { Types } from 'mongoose';
import { z } from 'zod';
import { BackupCode } from '../backup-code';
import { DecoratorBaseController } from '../decorators/base-controller';
import { Controller, Get, Post } from '../decorators/controller';
import { IUserDocument } from '../documents/user';
import { BaseModelName } from '../enumerations/base-model-name';
import { MnemonicOrPasswordRequiredError } from '../errors/mnemonic-or-password-required';
import {
  IApiChallengeResponse,
  IApiCodeCountResponse,
  IApiLoginResponse,
  IApiMessageResponse,
  IApiMnemonicResponse,
  IApiRegistrationResponse,
  IApiRequestUserResponse,
} from '../interfaces';
import { IApiBackupCodesResponse } from '../interfaces/api-responses/backup-codes-response';
import { IApplication } from '../interfaces/application';
import { IStatusCodeResponse } from '../interfaces/status-code-response';
import { findAuthToken } from '../middlewares/authenticate-token';
import { BackupCodeService } from '../services/backup-code';
import { JwtService } from '../services/jwt';
import { RequestUserService } from '../services/request-user';
import { RoleService } from '../services/role';
import { SystemUserService } from '../services/system-user';
import { UserService } from '../services/user';
import { ApiErrorResponse } from '../types';
import { requireValidatedFieldsAsync, withTransaction } from '../utils';

const isString = (v: unknown): v is string => typeof v === 'string';

const RegisterSchema = z.object({
  username: z.string(),
  email: z.string(),
  timezone: z.string(),
  password: z.string().min(8).optional(),
});

const EmailLoginChallengeSchema = z.object({
  token: z.string(),
  signature: z.string(),
  email: z.string().optional(),
  username: z.string().optional(),
});

const DirectLoginChallengeSchema = z.object({
  challenge: z.string(),
  signature: z.string(),
  email: z.string().optional(),
  username: z.string().optional(),
});

@Controller()
export class UserController<
  I = Types.ObjectId,
  D extends Date = Date,
  S extends string = string,
  A extends string = string,
  TUser extends IUserBase<I, D, S, A> = IUserBase<I, D, S, A>,
  TTokenRole extends ITokenRole<I, D> = ITokenRole<I, D>,
  TTokenUser extends ITokenUser = ITokenUser,
  TApplication extends IApplication = IApplication,
  TLanguage extends string = string,
> extends DecoratorBaseController<TLanguage> {
  protected readonly userService: UserService<
    I,
    D,
    S,
    A,
    TUser,
    TTokenRole,
    TApplication
  >;
  protected readonly jwtService: JwtService<
    I,
    D,
    TTokenRole,
    TTokenUser,
    TApplication
  >;
  protected readonly backupCodeService: BackupCodeService<
    I,
    D,
    TTokenRole,
    TApplication
  >;
  protected readonly roleService: RoleService<I, D, TTokenRole>;
  protected readonly eciesService: ECIESService;
  protected readonly systemUser: BackendMember;

  constructor(
    application: IApplication,
    jwtService: JwtService<I, D, TTokenRole, TTokenUser, TApplication>,
    userService: UserService<I, D, S, A, TUser, TTokenRole, TApplication>,
    backupCodeService: BackupCodeService<I, D, TTokenRole, TApplication>,
    roleService: RoleService<I, D, TTokenRole>,
    eciesService: ECIESService,
  ) {
    super(application);
    this.jwtService = jwtService;
    this.userService = userService;
    this.backupCodeService = backupCodeService;
    this.roleService = roleService;
    this.eciesService = eciesService;
    this.systemUser = SystemUserService.getSystemUser(application.environment);
  }

  @Get('/verify', { auth: true })
  async tokenVerifiedResponse(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiRequestUserResponse | ApiErrorResponse>> {
    if (!req.user) {
      throw new HandleableError(
        new Error(
          getSuiteCoreTranslation(SuiteCoreStringKey.Common_NoUserOnRequest),
        ),
        {
          statusCode: 401,
        },
      );
    }
    return {
      statusCode: 200,
      response: {
        message: getSuiteCoreTranslation(
          SuiteCoreStringKey.Validation_TokenValid,
        ),
        user: req.user,
      },
    };
  }

  @Get('/refresh-token', { auth: true })
  async refreshToken(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiLoginResponse | ApiErrorResponse>> {
    const token = findAuthToken(req.headers);
    if (!token) {
      throw new GenericValidationError(
        getSuiteCoreTranslation(SuiteCoreStringKey.Validation_TokenMissing),
      );
    }

    const tokenUser = await this.jwtService.verifyToken(token);
    if (!tokenUser) {
      throw new GenericValidationError(
        getSuiteCoreTranslation(SuiteCoreStringKey.Validation_TokenInvalid),
      );
    }

    const UserModel = this.application.getModel<IUserDocument>(
      BaseModelName.User,
    );
    const userDoc = await UserModel.findById(tokenUser.userId, {
      password: 0,
    });
    if (!userDoc || userDoc.accountStatus !== AccountStatus.Active) {
      throw new GenericValidationError(
        getSuiteCoreTranslation(SuiteCoreStringKey.Validation_UserNotFound),
      );
    }
    const { token: newToken, roles } = await this.jwtService.signToken(
      userDoc,
      this.application.environment.jwtSecret,
      (req.user?.siteLanguage as string) ?? LanguageCodes.EN_US,
    );

    return {
      statusCode: 200,
      response: {
        message: getSuiteCoreTranslation(SuiteCoreStringKey.TokenRefreshed),
        user: RequestUserService.makeRequestUserDTO(userDoc, roles),
        token: newToken,
        serverPublicKey: this.application.environment.systemPublicKeyHex ?? '',
      },
      headers: {
        Authorization: `Bearer ${newToken}`,
      },
    };
  }

  @Post('/register', {
    schema: RegisterSchema,
    validation: (validationLanguage: string) => [
      body('username')
        .matches(AppConstants.UsernameRegex)
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_UsernameRegexErrorTemplate,
            undefined,
            validationLanguage,
          ),
        ),
      body('email')
        .isEmail()
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_InvalidEmail,
            undefined,
            validationLanguage,
          ),
        ),
      body('timezone')
        .isString()
        .custom((value) => isValidTimezone(value))
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_TimezoneInvalid,
            undefined,
            validationLanguage,
          ),
        ),
      body('password')
        .optional()
        .matches(AppConstants.PasswordRegex)
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_PasswordRegexErrorTemplate,
          ),
        ),
    ],
  })
  async register(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiRegistrationResponse | ApiErrorResponse>> {
    return await withTransaction(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      undefined,
      async (sess) => {
        return await requireValidatedFieldsAsync(
          req,
          RegisterSchema,
          async ({ username, email, timezone, password }) => {
            if (
              !isString(username) ||
              !isString(email) ||
              !isString(timezone)
            ) {
              throw new GenericValidationError(
                getSuiteCoreTranslation(
                  SuiteCoreStringKey.Validation_MissingValidatedData,
                ),
              );
            }

            const { user, mnemonic, backupCodes } =
              await this.userService.newUser(
                this.systemUser,
                {
                  username: username.trim(),
                  email: email.trim(),
                  timezone: timezone,
                },
                undefined,
                undefined,
                sess,
                this.application.environment.debug,
                password as string | undefined,
              );

            await this.userService.createAndSendEmailToken(
              user,
              EmailTokenType.AccountVerification,
              sess,
              this.application.environment.debug,
            );

            return {
              statusCode: 201,
              response: {
                message: getSuiteCoreTranslation(
                  SuiteCoreStringKey.Registration_Success,
                  { MNEMONIC: mnemonic },
                ),
                mnemonic,
                backupCodes,
              },
            };
          },
        );
      },
      {
        timeoutMs: this.application.environment.mongo.transactionTimeout * 30,
      },
    );
  }

  @Post('/account-verification', {
    validation: (validationLanguage: string) => [
      body('token')
        .not()
        .isEmpty()
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_TokenRequired,
            undefined,
            validationLanguage,
          ),
        )
        .matches(new RegExp(`^[a-f0-9]{${AppConstants.EmailTokenLength * 2}}$`))
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_InvalidToken,
            undefined,
            validationLanguage,
          ),
        ),
    ],
  })
  async completeAccountVerification(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const { token } = this.validatedBody;

    return await withTransaction(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      undefined,
      async (sess) => {
        await this.userService.verifyAccountTokenAndComplete(
          token as string,
          sess,
        );
        return {
          statusCode: 200,
          response: {
            message: getSuiteCoreTranslation(
              SuiteCoreStringKey.EmailVerification_Success,
            ),
          },
        };
      },
    );
  }

  @Post('/language', {
    auth: true,
    validation: (validationLanguage: string) => [
      body('language')
        .isString()
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_InvalidLanguage,
            undefined,
            validationLanguage,
          ),
        )
        .isIn(Object.values(LanguageCodes))
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_InvalidLanguage,
            undefined,
            validationLanguage,
          ),
        ),
    ],
  })
  async setLanguage(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiRequestUserResponse | ApiErrorResponse>> {
    return await withTransaction(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      undefined,
      async (sess) => {
        const { language } = this.validatedBody;
        if (!req.user) {
          throw new HandleableError(
            new Error(
              getSuiteCoreTranslation(
                SuiteCoreStringKey.Common_NoUserOnRequest,
              ),
            ),
            { statusCode: 401 },
          );
        }

        const user = await this.userService.updateSiteLanguage(
          req.user.id,
          language as string,
          sess,
        );

        return {
          statusCode: 200,
          response: {
            message: getSuiteCoreTranslation(
              SuiteCoreStringKey.LanguageUpdate_Success,
            ),
            user,
          },
        };
      },
    );
  }

  @Get('/backup-codes', { auth: true })
  async getBackupCodeCount(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiCodeCountResponse | ApiErrorResponse>> {
    if (!req.user) {
      throw new HandleableError(
        new Error(
          getSuiteCoreTranslation(SuiteCoreStringKey.Common_NoUserOnRequest),
        ),
        { statusCode: 401 },
      );
    }

    const UserModel = this.application.getModel<IUserDocument>(
      BaseModelName.User,
    );
    const user = await UserModel.findById(req.user.id);

    return {
      statusCode: 200,
      response: {
        message: 'Backup codes retrieved',
        codeCount: user?.backupCodes?.length || 0,
      } as IApiCodeCountResponse,
    };
  }

  @Post('/backup-codes', {
    auth: true,
    cryptoAuth: true,
    validation: (validationLanguage: string) => [
      body().custom((value, { req }) => {
        if (!req.body?.password && !req.body?.mnemonic) {
          throw new MnemonicOrPasswordRequiredError();
        }
        return true;
      }),
      body('password')
        .optional()
        .notEmpty()
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_CurrentPasswordRequired,
            undefined,
            validationLanguage,
          ),
        ),
      body('mnemonic')
        .optional()
        .notEmpty()
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_MnemonicRequired,
            undefined,
            validationLanguage,
          ),
        )
        .matches(AppConstants.MnemonicRegex)
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_MnemonicRegex,
            undefined,
            validationLanguage,
          ),
        ),
    ],
  })
  async resetBackupCodes(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiBackupCodesResponse | ApiErrorResponse>> {
    if (!req.user || !req.eciesUser || !req.eciesUser.hasPrivateKey) {
      throw new HandleableError(
        new Error(
          getSuiteCoreTranslation(SuiteCoreStringKey.Common_NoUserOnRequest),
        ),
        { statusCode: 401 },
      );
    }

    const newBackupCodes = await this.userService.resetUserBackupCodes(
      req.eciesUser,
      this.systemUser,
    );
    const codes = newBackupCodes.map((c) => c.notNullValue);
    newBackupCodes.forEach((c) => c.dispose());

    return {
      statusCode: 200,
      response: {
        message: getSuiteCoreTranslation(
          SuiteCoreStringKey.BackupCodeRecovery_YourNewCodes,
        ),
        backupCodes: codes,
      },
    };
  }

  @Post('/recover-mnemonic', {
    auth: true,
    cryptoAuth: true,
    validation: (validationLanguage: string) => [
      body('password')
        .isString()
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_CurrentPasswordRequired,
            undefined,
            validationLanguage,
          ),
        ),
    ],
  })
  async recoverMnemonic(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiMnemonicResponse | ApiErrorResponse>> {
    return await withTransaction(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      undefined,
      async (sess) => {
        if (!req.user) {
          throw new HandleableError(
            new Error(
              getSuiteCoreTranslation(
                SuiteCoreStringKey.Validation_InvalidCredentials,
              ),
            ),
            { statusCode: 401 },
          );
        } else if (!req.eciesUser) {
          throw new HandleableError(
            new Error(
              getSuiteCoreTranslation(
                SuiteCoreStringKey.Validation_MnemonicOrPasswordRequired,
              ),
            ),
            { statusCode: 401 },
          );
        }

        const { password } = this.validatedBody;
        if (!isString(password)) {
          throw new GenericValidationError(
            getSuiteCoreTranslation(
              SuiteCoreStringKey.Validation_MissingValidatedData,
            ),
          );
        }

        const userDoc = await this.userService.findUserById(
          new Types.ObjectId(req.user.id),
          true,
          sess,
        );

        const mnemonic = await this.userService.recoverMnemonic(
          req.eciesUser,
          userDoc.mnemonicRecovery,
        );

        return {
          statusCode: 200,
          response: {
            message: getSuiteCoreTranslation(
              SuiteCoreStringKey.MnemonicRecovery_Success,
            ),
            mnemonic: mnemonic.notNullValue,
          },
        };
      },
    );
  }

  @Post('/change-password', {
    auth: true,
    validation: (validationLanguage: string) => [
      body('currentPassword')
        .notEmpty()
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_Required,
            undefined,
            validationLanguage,
          ),
        ),
      body('newPassword')
        .matches(AppConstants.PasswordRegex)
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_PasswordRegexErrorTemplate,
          ),
        )
        .notEmpty()
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_Required,
            undefined,
            validationLanguage,
          ),
        ),
    ],
  })
  async changePassword(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    return await withTransaction(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      undefined,
      async (sess) => {
        const { currentPassword, newPassword } = this.validatedBody;
        if (!req.user) {
          throw new HandleableError(
            new Error(
              getSuiteCoreTranslation(
                SuiteCoreStringKey.Common_NoUserOnRequest,
              ),
            ),
            { statusCode: 401 },
          );
        }

        if (!isString(currentPassword) || !isString(newPassword)) {
          throw new GenericValidationError(
            getSuiteCoreTranslation(
              SuiteCoreStringKey.Validation_MissingValidatedData,
            ),
          );
        }

        await this.userService.changePassword(
          req.user.id,
          currentPassword,
          newPassword,
          sess,
        );

        return {
          statusCode: 200,
          response: {
            message: getSuiteCoreTranslation(
              SuiteCoreStringKey.PasswordChange_Success,
            ),
          },
        };
      },
    );
  }

  @Post('/request-direct-login')
  async requestDirectLogin(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiChallengeResponse | ApiErrorResponse>> {
    const challenge = this.userService.generateDirectLoginChallenge();
    return {
      statusCode: 200,
      response: {
        challenge: challenge,
        message: getSuiteCoreTranslation(
          SuiteCoreStringKey.Login_ChallengeGenerated,
        ),
        serverPublicKey: this.application.environment.systemPublicKeyHex ?? '',
      },
    };
  }

  @Post('/direct-challenge', {
    schema: DirectLoginChallengeSchema,
    validation: (validationLanguage: string) => [
      body('challenge')
        .not()
        .isEmpty()
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_InvalidChallenge,
            undefined,
            validationLanguage,
          ),
        )
        .matches(
          new RegExp(
            `^[a-f0-9]{${(UINT64_SIZE + 32 + ECIES.SIGNATURE_SIZE) * 2}}$`,
          ),
        )
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_InvalidChallenge,
            undefined,
            validationLanguage,
          ),
        ),
      body('signature')
        .not()
        .isEmpty()
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_InvalidSignature,
          ),
        )
        .matches(new RegExp(`^[a-f0-9]{${ECIES.SIGNATURE_SIZE * 2}}$`))
        .withMessage(SuiteCoreStringKey.Validation_InvalidSignature),
      body().custom((value, { req }) => {
        if (!req.body.username && !req.body.email) {
          throw new UsernameOrEmailRequiredError();
        }
        return true;
      }),
      body('username')
        .optional()
        .matches(AppConstants.UsernameRegex)
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_UsernameRegexErrorTemplate,
            undefined,
            validationLanguage,
          ),
        ),
      body('email')
        .optional()
        .isEmail()
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_InvalidEmail,
            undefined,
            validationLanguage,
          ),
        ),
    ],
  })
  async directLoginChallenge(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiLoginResponse | ApiErrorResponse>> {
    return await withTransaction(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      undefined,
      async (sess) => {
        const { username, email, challenge, signature } = this.validatedBody;

        const { userDoc } = await this.userService.verifyDirectLoginChallenge(
          String(challenge),
          String(signature) as any,
          username ? String(username) : undefined,
          email ? String(email) : undefined,
          sess,
        );

        const { token: jwtToken, roles } = await this.jwtService.signToken(
          userDoc,
          this.application.environment.jwtSecret,
          (req.user?.siteLanguage as string) ?? LanguageCodes.EN_US,
        );

        return {
          statusCode: 200,
          response: {
            user: userDoc as any,
            token: jwtToken,
            serverPublicKey:
              this.application.environment.systemPublicKeyHex ?? '',
            message: getSuiteCoreTranslation(
              SuiteCoreStringKey.LoggedIn_Success,
            ),
          },
        };
      },
    );
  }

  @Post('/request-email-login', {
    validation: (validationLanguage: string) => [
      body().custom((value, { req }) => {
        if (!req.body.username && !req.body.email) {
          throw new UsernameOrEmailRequiredError();
        }
        return true;
      }),
      body('username')
        .optional()
        .matches(AppConstants.UsernameRegex)
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_UsernameRegexErrorTemplate,
            undefined,
            validationLanguage,
          ),
        ),
      body('email')
        .optional()
        .isEmail()
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_InvalidEmail,
            undefined,
            validationLanguage,
          ),
        ),
    ],
  })
  async requestEmailLogin(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const { username, email } = this.validatedBody;

    try {
      await withTransaction(
        this.application.db.connection,
        this.application.environment.mongo.useTransactions,
        undefined,
        async (sess) => {
          const userDoc = await this.userService.findUser(
            email as string,
            username as string,
            sess,
          );
          await this.userService.createAndSendEmailToken(
            userDoc,
            EmailTokenType.LoginRequest,
            sess,
            this.application.environment.debug,
          );
        },
      );
    } catch (error) {
      // Suppress user-related errors for security
    }

    return {
      statusCode: 200,
      response: {
        message: getSuiteCoreTranslation(SuiteCoreStringKey.Email_TokenSent),
      },
    };
  }

  @Post('/email-challenge', {
    schema: EmailLoginChallengeSchema,
    validation: (validationLanguage: string) => [
      body('token')
        .not()
        .isEmpty()
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_TokenRequired,
            undefined,
            validationLanguage,
          ),
        )
        .matches(new RegExp(`^[a-f0-9]{${AppConstants.EmailTokenLength * 2}}$`))
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_InvalidToken,
            undefined,
            validationLanguage,
          ),
        ),
      body('signature')
        .not()
        .isEmpty()
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_InvalidSignature,
          ),
        )
        .matches(new RegExp(`^[a-f0-9]{${ECIES.SIGNATURE_SIZE * 2}}$`))
        .withMessage(SuiteCoreStringKey.Validation_InvalidSignature),
      body().custom((value, { req }) => {
        if (!req.body.username && !req.body.email) {
          throw new UsernameOrEmailRequiredError();
        }
        return true;
      }),
      body('username')
        .optional()
        .matches(AppConstants.UsernameRegex)
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_UsernameRegexErrorTemplate,
            undefined,
            validationLanguage,
          ),
        ),
      body('email')
        .optional()
        .isEmail()
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_InvalidEmail,
            undefined,
            validationLanguage,
          ),
        ),
    ],
  })
  async emailLoginChallenge(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiLoginResponse | ApiErrorResponse>> {
    return await withTransaction(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      undefined,
      async (sess) => {
        const { token, signature } = this.validatedBody;

        const userDoc = await this.userService.validateEmailLoginTokenChallenge(
          String(token),
          String(signature) as any,
          sess,
        );

        const { token: jwtToken, roles } = await this.jwtService.signToken(
          userDoc,
          this.application.environment.jwtSecret,
          (req.user?.siteLanguage as string) ?? LanguageCodes.EN_US,
        );

        return {
          statusCode: 200,
          response: {
            user: userDoc as any,
            token: jwtToken,
            serverPublicKey:
              this.application.environment.systemPublicKeyHex ?? '',
            message: getSuiteCoreTranslation(
              SuiteCoreStringKey.LoggedIn_Success,
            ),
          },
        };
      },
    );
  }

  @Post('/resend-verification', {
    validation: (validationLanguage: string) => [
      body().custom((value, { req }) => {
        if (!req.body.username && !req.body.email) {
          throw new UsernameOrEmailRequiredError();
        }
        return true;
      }),
      body('username')
        .optional()
        .isString()
        .matches(AppConstants.UsernameRegex)
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_UsernameRegexErrorTemplate,
            undefined,
            validationLanguage,
          ),
        ),
      body('email').optional().isEmail(),
    ],
  })
  async resendVerification(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    return await withTransaction(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      undefined,
      async (sess) => {
        const { username, email } = this.validatedBody;

        const UserModel = this.application.getModel<IUserDocument>(
          BaseModelName.User,
        );
        let query: { username?: string; email?: string } = {};
        if (isString(username)) query.username = username;
        else if (isString(email)) query.email = email;
        else {
          throw new GenericValidationError(
            getSuiteCoreTranslation(
              SuiteCoreStringKey.Validation_MissingValidatedData,
            ),
          );
        }

        const user = await UserModel.findOne(query).session(sess ?? null);
        if (!user) {
          throw new GenericValidationError(
            getSuiteCoreTranslation(SuiteCoreStringKey.Validation_UserNotFound),
            { statusCode: 404 },
          );
        }

        await this.userService.resendEmailToken(
          user._id.toString(),
          EmailTokenType.AccountVerification,
          sess,
          this.application.environment.debug,
        );

        return {
          statusCode: 200,
          response: {
            message: getSuiteCoreTranslation(
              SuiteCoreStringKey.EmailVerification_Resent,
            ),
          },
        };
      },
    );
  }

  @Post('/backup-code', {
    validation: (validationLanguage: string) => [
      body('email').optional().isEmail(),
      body('username')
        .optional()
        .matches(AppConstants.UsernameRegex)
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_UsernameRegexErrorTemplate,
            undefined,
            validationLanguage,
          ),
        ),
      body('code')
        .custom((value) => {
          const normalized = BackupCode.normalizeCode(value);
          return (
            AppConstants.BACKUP_CODES.DisplayRegex.test(value) ||
            AppConstants.BACKUP_CODES.NormalizedHexRegex.test(normalized)
          );
        })
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_InvalidBackupCode,
            undefined,
            validationLanguage,
          ),
        ),
      body('recoverMnemonic').isBoolean().optional(),
      body('newPassword')
        .optional()
        .matches(AppConstants.PasswordRegex)
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_PasswordRegexErrorTemplate,
            undefined,
            validationLanguage,
          ),
        ),
    ],
  })
  async useBackupCodeLogin(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiLoginResponse | ApiErrorResponse>> {
    return await withTransaction(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      undefined,
      async (sess) => {
        const { code, newPassword, email, username } = this.validatedBody;

        if (!code) {
          throw new GenericValidationError(
            getSuiteCoreTranslation(
              SuiteCoreStringKey.Validation_MissingValidatedData,
            ),
          );
        }

        const recoverMnemonic =
          this.validatedBody?.['recoverMnemonic'] === 'true' ||
          this.validatedBody?.['recoverMnemonic'] === true;

        const userDoc = await this.userService.findUser(
          email as string,
          username as string,
          sess,
        );

        const {
          user,
          userDoc: updatedUserDoc,
          codeCount,
        } = await this.backupCodeService.recoverKeyWithBackupCode(
          userDoc,
          code as string,
          newPassword ? new SecureString(newPassword as string) : undefined,
          sess,
        );

        let mnemonic: SecureString | undefined;
        if (recoverMnemonic) {
          const memberType = await this.roleService.getMemberType(
            updatedUserDoc,
            sess,
          );
          const freshUser = new BackendMember(
            this.eciesService,
            memberType,
            updatedUserDoc.username,
            new EmailString(updatedUserDoc.email),
            Buffer.from(updatedUserDoc.publicKey, 'hex'),
            user.privateKey,
            undefined,
            updatedUserDoc._id,
            new Date(updatedUserDoc.createdAt),
            new Date(updatedUserDoc.updatedAt),
          );
          mnemonic = await this.userService.recoverMnemonic(
            freshUser,
            updatedUserDoc.mnemonicRecovery,
          );
        }

        const { token, roles } = await this.jwtService.signToken(
          userDoc,
          this.application.environment.jwtSecret,
          LanguageCodes.EN_US,
        );

        this.userService.updateLastLogin(updatedUserDoc._id).catch(() => {});

        return {
          statusCode: 200,
          response: {
            user: RequestUserService.makeRequestUserDTO(userDoc, roles),
            token: token,
            message: getSuiteCoreTranslation(
              SuiteCoreStringKey.BackupCodeRecovery_Success,
            ),
            codeCount,
            ...(recoverMnemonic && mnemonic
              ? { mnemonic: mnemonic.value }
              : {}),
            serverPublicKey:
              this.application.environment.systemPublicKeyHex ?? '',
          },
        };
      },
    );
  }

  @Post('/forgot-password', {
    validation: (validationLanguage: string) => [
      body('email')
        .isEmail()
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_InvalidEmail,
            undefined,
            validationLanguage,
          ),
        ),
    ],
  })
  async forgotPassword(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    return await withTransaction(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      undefined,
      async (sess) => {
        const { email } = this.validatedBody;

        const UserModel = this.application.getModel<IUserDocument>(
          BaseModelName.User,
        );
        if (!isString(email)) {
          throw new GenericValidationError(
            getSuiteCoreTranslation(
              SuiteCoreStringKey.Validation_MissingValidatedData,
            ),
          );
        }

        const user = await UserModel.findOne({
          email: email.toLowerCase(),
        }).session(sess ?? null);

        if (!user || !user.passwordWrappedPrivateKey) {
          return {
            statusCode: 200,
            response: {
              message: getSuiteCoreTranslation(
                SuiteCoreStringKey.PasswordReset_Success,
              ),
            },
          };
        }

        await this.userService.createAndSendEmailToken(
          user,
          EmailTokenType.PasswordReset,
          sess,
          this.application.environment.debug,
        );

        return {
          statusCode: 200,
          response: {
            message: getSuiteCoreTranslation(
              SuiteCoreStringKey.PasswordReset_Success,
            ),
          },
        };
      },
    );
  }

  @Get('/verify-reset-token')
  async verifyResetToken(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const token = req.query['token'] as string;
    if (!token) {
      throw new GenericValidationError(
        getSuiteCoreTranslation(SuiteCoreStringKey.Validation_TokenMissing),
      );
    }

    return await withTransaction(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      undefined,
      async (sess) => {
        await this.userService.verifyEmailToken(
          token,
          EmailTokenType.PasswordReset,
          sess,
        );
        return {
          statusCode: 200,
          response: {
            message: 'Token is valid',
          },
        };
      },
    );
  }

  @Post('/reset-password', {
    validation: (validationLanguage: string) => [
      body('token')
        .not()
        .isEmpty()
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_TokenRequired,
            undefined,
            validationLanguage,
          ),
        )
        .matches(new RegExp(`^[a-f0-9]{${AppConstants.EmailTokenLength * 2}}$`))
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_InvalidToken,
            undefined,
            validationLanguage,
          ),
        ),
      body('newPassword')
        .optional()
        .isLength({ min: 8 })
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_PasswordMinLengthTemplate,
            undefined,
            validationLanguage,
          ),
        )
        .matches(AppConstants.PasswordRegex)
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_PasswordRegexErrorTemplate,
            undefined,
            validationLanguage,
          ),
        ),
      body('password')
        .optional()
        .isLength({ min: 8 })
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_PasswordMinLengthTemplate,
            undefined,
            validationLanguage,
          ),
        )
        .matches(AppConstants.PasswordRegex)
        .withMessage(
          getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_PasswordRegexErrorTemplate,
            undefined,
            validationLanguage,
          ),
        ),
      body('currentPassword').optional().isString(),
      body('mnemonic').optional().isString(),
    ],
  })
  async resetPassword(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    return await withTransaction(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      undefined,
      async (sess) => {
        const { token, newPassword, password, currentPassword, mnemonic } =
          this.validatedBody;
        const selectedNewPassword = (newPassword ?? password) as
          | string
          | undefined;

        if (!isString(token) || !isString(selectedNewPassword)) {
          throw new GenericValidationError(
            getSuiteCoreTranslation(
              SuiteCoreStringKey.Validation_MissingValidatedData,
            ),
          );
        }

        const credential =
          (mnemonic as string | undefined) ??
          (currentPassword as string | undefined);
        if (!isString(credential)) {
          throw new GenericValidationError(
            getSuiteCoreTranslation(
              SuiteCoreStringKey.Validation_MissingValidatedData,
            ),
          );
        }

        await this.userService.resetPasswordWithToken(
          token as string,
          selectedNewPassword,
          credential,
          sess,
        );

        return {
          statusCode: 200,
          response: {
            message: getSuiteCoreTranslation(
              SuiteCoreStringKey.PasswordChange_Success,
            ),
          },
        };
      },
    );
  }
}
