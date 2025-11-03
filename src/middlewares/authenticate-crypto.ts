import { IECIESConfig, SecureString } from '@digitaldefiance/ecies-lib';
import {
  Member as BackendMember,
  ECIESService,
} from '@digitaldefiance/node-ecies-lib';
import {
  AccountStatus,
  getSuiteCoreTranslation,
  InvalidCredentialsError,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { NextFunction, Request, Response } from 'express';
import { ClientSession, Types } from 'mongoose';
import { IBaseDocument } from '../documents';
import { IUserDocument } from '../documents/user';
import { BaseModelName } from '../enumerations';
import { Environment } from '../environment';
import { InvalidPasswordError } from '../errors';
import { IConstants } from '../interfaces';
import { IApplication } from '../interfaces/application';
import { emailServiceRegistry } from '../registry';
import { BackupCodeService } from '../services/backup-code';
import { KeyWrappingService } from '../services/key-wrapping';
import { RoleService } from '../services/role';
import { UserService } from '../services/user';
import { withTransaction } from '../utils';

/**
 * Middleware to authenticate crypto operations requiring private key access
 * Expects mnemonic or password in request body for fresh authentication
 */
export async function authenticateCrypto<
  TAccountStatus extends string = AccountStatus,
>(
  application: IApplication<
    any,
    Types.ObjectId,
    IBaseDocument<any, Types.ObjectId>,
    Environment,
    IConstants
  >,
  req: Request,
  res: Response,
  next: NextFunction,
  activeStatusValue: TAccountStatus = AccountStatus.Active as TAccountStatus,
): Promise<Response | void> {
  if (!req.user) {
    return res.status(401).send(
      // amazonq-ignore-next-line false positive, hardcoded string
      getSuiteCoreTranslation(SuiteCoreStringKey.Validation_InvalidToken),
    );
  }

  // Try validatedBody first (if validation has run), then fall back to raw body
  // Note: This middleware runs BEFORE validation, so validatedBody may not exist yet
  const validatedBody = (req as Request & { validatedBody?: unknown })
    .validatedBody as Record<string, unknown> | undefined;
  const rawBody = req.body as Record<string, unknown> | undefined;
  const sourceBody = validatedBody ?? rawBody;

  if (!sourceBody) {
    return res.status(400).send({
      // amazonq-ignore-next-line false positive, hardcoded string
      message: getSuiteCoreTranslation(
        SuiteCoreStringKey.Validation_MnemonicOrPasswordRequired,
      ),
    });
  }

  const mnemonic =
    typeof sourceBody['mnemonic'] === 'string'
      ? (sourceBody['mnemonic'] as string)
      : undefined;
  const password =
    // amazonq-ignore-next-line false positive
    typeof sourceBody['password'] === 'string'
      ? (sourceBody['password'] as string)
      : undefined;
  if (!mnemonic && !password) {
    return res.status(400).send({
      // amazonq-ignore-next-line false positive, hardcoded string
      message: getSuiteCoreTranslation(
        SuiteCoreStringKey.Validation_MnemonicOrPasswordRequired,
      ),
    });
  }
  const UserModel = application.getModel<IUserDocument<string>>(
    BaseModelName.User,
  );
  const config: IECIESConfig = {
    curveName: application.constants.ECIES.CURVE_NAME,
    primaryKeyDerivationPath:
      application.constants.ECIES.PRIMARY_KEY_DERIVATION_PATH,
    mnemonicStrength: application.constants.ECIES.MNEMONIC_STRENGTH,
    symmetricAlgorithm:
      application.constants.ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
    symmetricKeyBits: application.constants.ECIES.SYMMETRIC.KEY_BITS,
    symmetricKeyMode: application.constants.ECIES.SYMMETRIC.MODE,
  };
  const keyWrappingService = new KeyWrappingService();

  const roleService = new RoleService(application);
  const userService = new UserService(
    application,
    roleService,
    emailServiceRegistry.getService(),
    keyWrappingService,
    new BackupCodeService(
      application,
      new ECIESService(config),
      keyWrappingService,
      roleService,
    ),
  );

  try {
    return await withTransaction<Response | void>(
      application.db.connection,
      application.environment.mongo.useTransactions,
      undefined,
      async (sess: ClientSession | undefined) => {
        const userDoc = await UserModel.findById(req.user!.id)
          .session(sess ?? null)
          .exec();

        if (!userDoc || userDoc.accountStatus !== activeStatusValue) {
          return res.status(403).send(
            // amazonq-ignore-next-line false positive, hardcoded string
            getSuiteCoreTranslation(SuiteCoreStringKey.Validation_UserNotFound),
          );
        }

        // Ensure we're only authenticating the currently logged-in user
        if (userDoc._id.toString() !== req.user!.id) {
          return res.status(403).send(
            // amazonq-ignore-next-line false positive, hardcoded string
            getSuiteCoreTranslation(
              SuiteCoreStringKey.Validation_InvalidCredentials,
            ),
          );
        }

        let loginResult: {
          userDoc: IUserDocument;
          userMember: BackendMember;
          adminMember: BackendMember;
        };

        if (mnemonic) {
          // Authenticate with mnemonic
          const userMnemonic = new SecureString(mnemonic);
          try {
            loginResult = await userService.loginWithMnemonic(
              userDoc.email,
              userMnemonic,
              sess,
            );
          } finally {
            userMnemonic.dispose();
          }
        } else if (password) {
          // Authenticate with password
          loginResult = await userService.loginWithPassword(
            userDoc.email,
            password,
            sess,
          );
        } else {
          // Should not happen due to earlier guard; keeps TypeScript happy
          return res.status(400).send({
            // amazonq-ignore-next-line false positive, hardcoded string
            message: getSuiteCoreTranslation(
              SuiteCoreStringKey.Validation_MnemonicOrPasswordRequired,
            ),
          });
        }

        // Double-check authenticated user matches logged-in user
        if (loginResult.userDoc._id.toString() !== req.user!.id) {
          return res.status(403).send(
            // amazonq-ignore-next-line false positive, hardcoded string
            getSuiteCoreTranslation(
              SuiteCoreStringKey.Validation_InvalidCredentials,
            ),
          );
        }

        // Attach the fully authenticated member (with private key) to the request
        req.eciesUser = loginResult.userMember;
        // Do not attach the admin user to the request; it's a process-wide singleton
        // and must not be disposed as part of request cleanup.

        next();
        return;
      },
      {
        timeoutMs: application.environment.mongo.transactionTimeout,
      },
    );
  } catch (err) {
    if (
      err instanceof InvalidCredentialsError ||
      err instanceof InvalidPasswordError
    ) {
      // amazonq-ignore-next-line false positive
      console.error(
        'Crypto authentication failed:',
        `userId=${String(req.user?.id || 'unknown').replace(
          /[\r\n]/g,
          '',
        )} hasPassword=${!!password} hasMnemonic=${!!mnemonic}`,
      );
      return res.status(401).send({
        // amazonq-ignore-next-line false positive, hardcoded string
        message: getSuiteCoreTranslation(
          SuiteCoreStringKey.Validation_InvalidCredentials,
        ),
      });
    }
    const sanitizedErr =
      err instanceof Error
        ? err.message.replace(/[\r\n]/g, ' ')
        : String(err).replace(/[\r\n]/g, ' ');
    console.error('Unexpected error in authenticateCrypto:', sanitizedErr);
    return res.status(500).send({
      // amazonq-ignore-next-line false positive, hardcoded string
      message: getSuiteCoreTranslation(
        SuiteCoreStringKey.Common_UnexpectedError,
      ),
      error: err,
    });
  }
}
