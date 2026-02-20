/**
 * @fileoverview Cryptographic authentication middleware for operations requiring private keys.
 * Validates mnemonic or password to unlock user's private key for sensitive operations.
 * Storage-agnostic — delegates credential verification to IAuthenticationProvider.
 * @module middlewares/authenticate-crypto
 */

import { SecureString } from '@digitaldefiance/ecies-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  AccountStatus,
  getSuiteCoreTranslation,
  InvalidCredentialsError,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { NextFunction, Request, Response } from 'express';
import { InvalidPasswordError } from '../errors';
import { IApplication } from '../interfaces/application';

/**
 * Express middleware for cryptographic authentication.
 * Requires mnemonic or password in request body to unlock user's private key.
 * Attaches authenticated BackendMember with private key to req.eciesUser.
 * Used for operations requiring cryptographic signing or decryption.
 *
 * Delegates to `application.authProvider` for storage-agnostic credential
 * verification. The application must have an authProvider configured with
 * authenticateWithMnemonic and/or authenticateWithPassword.
 *
 * @template TID - Platform ID type (defaults to Buffer)
 * @template TAccountStatus - Account status type (defaults to AccountStatus)
 * @param {IApplication<TID>} application - Application instance with authProvider
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
  const authProvider = application.authProvider;
  if (!authProvider) {
    return res.status(500).send('Authentication provider not configured');
  }

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

  try {
    // Verify the user exists and is active
    const authenticatedUser = await authProvider.findUserById(req.user.id);
    if (
      !authenticatedUser ||
      authenticatedUser.accountStatus !== activeStatusValue
    ) {
      return res.status(403).send(
        // amazonq-ignore-next-line false positive, hardcoded string
        getSuiteCoreTranslation(SuiteCoreStringKey.Validation_UserNotFound),
      );
    }

    // Ensure we're only authenticating the currently logged-in user
    if (authenticatedUser.id !== req.user.id) {
      return res.status(403).send(
        // amazonq-ignore-next-line false positive, hardcoded string
        getSuiteCoreTranslation(
          SuiteCoreStringKey.Validation_InvalidCredentials,
        ),
      );
    }

    if (mnemonic) {
      if (!authProvider.authenticateWithMnemonic) {
        return res.status(501).send({
          message: 'Mnemonic authentication not supported by this provider',
        });
      }
      const userMnemonic = new SecureString(mnemonic);
      try {
        const result = await authProvider.authenticateWithMnemonic(
          authenticatedUser.email,
          userMnemonic,
        );
        // Double-check authenticated user matches logged-in user
        if (result.userId !== req.user.id) {
          return res
            .status(403)
            .send(
              getSuiteCoreTranslation(
                SuiteCoreStringKey.Validation_InvalidCredentials,
              ),
            );
        }
        req.eciesUser = result.userMember;
      } finally {
        userMnemonic.dispose();
      }
    } else if (password) {
      if (!authProvider.authenticateWithPassword) {
        return res.status(501).send({
          message: 'Password authentication not supported by this provider',
        });
      }
      const result = await authProvider.authenticateWithPassword(
        authenticatedUser.email,
        password,
      );
      // Double-check authenticated user matches logged-in user
      if (result.userId !== req.user.id) {
        return res
          .status(403)
          .send(
            getSuiteCoreTranslation(
              SuiteCoreStringKey.Validation_InvalidCredentials,
            ),
          );
      }
      req.eciesUser = result.userMember;
    } else {
      // Should not happen due to earlier guard; keeps TypeScript happy
      return res.status(400).send({
        // amazonq-ignore-next-line false positive, hardcoded string
        message: getSuiteCoreTranslation(
          SuiteCoreStringKey.Validation_MnemonicOrPasswordRequired,
        ),
      });
    }

    next();
    return;
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
