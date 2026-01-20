/**
 * @fileoverview Cryptographic authentication middleware for operations requiring private keys.
 * Validates mnemonic or password to unlock user's private key for sensitive operations.
 * @module middlewares/authenticate-crypto
 */

import { SecureString } from '@digitaldefiance/ecies-lib';
import { ClientSession } from '@digitaldefiance/mongoose-types';
import {
  Member as BackendMember,
  PlatformID,
} from '@digitaldefiance/node-ecies-lib';
import {
  AccountStatus,
  getSuiteCoreTranslation,
  InvalidCredentialsError,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { NextFunction, Request, Response } from 'express';
import { ServiceKeys } from '../container';
import { IUserDocument } from '../documents/user';
import { BaseModelName } from '../enumerations';
import { InvalidPasswordError } from '../errors';
import { IApplication } from '../interfaces/application';
import { withTransaction } from '../utils';

/**
 * Express middleware for cryptographic authentication.
 * Requires mnemonic or password in request body to unlock user's private key.
 * Attaches authenticated BackendMember with private key to req.eciesUser.
 * Used for operations requiring cryptographic signing or decryption.
 * @template TID - Platform ID type (defaults to Buffer)
 * @template TAccountStatus - Account status type (defaults to AccountStatus)
 * @param {IApplication<TID>} application - Application instance
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @param {TAccountStatus} [activeStatusValue] - Expected active account status
 * @returns {Promise<Response | void>} Response or void if successful
 * @throws {InvalidCredentialsError} When credentials are invalid
 * @throws {InvalidPasswordError} When password is incorrect
 */
export async function authenticateCrypto<
  TID extends PlatformID = Buffer,
  TAccountStatus extends string = AccountStatus,
>(
  application: IApplication<TID>,
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
  const UserModel = application.getModel<IUserDocument<string, TID>>(
    BaseModelName.User,
  );
  const userService = application.services.get(ServiceKeys.USER) as {
    loginWithMnemonic: (
      email: string,
      mnemonic: SecureString,
      session?: ClientSession,
    ) => Promise<any>;
    loginWithPassword: (
      email: string,
      password: string,
      session?: ClientSession,
    ) => Promise<any>;
  };

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
    console.error(
      `${getSuiteCoreTranslation(
        SuiteCoreStringKey.Error_UnexpectedErrorInAuthenticateCrypto,
      )}:`,
      sanitizedErr,
    );
    if (err instanceof Error && err.stack) {
      console.error(
        `${getSuiteCoreTranslation(SuiteCoreStringKey.Common_StackTrace)}:`,
        err.stack,
      );
    }
    return res.status(500).send({
      // amazonq-ignore-next-line false positive, hardcoded string
      message: getSuiteCoreTranslation(
        SuiteCoreStringKey.Common_UnexpectedError,
      ),
      error: err,
    });
  }
}
