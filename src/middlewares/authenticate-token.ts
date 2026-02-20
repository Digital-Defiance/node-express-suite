/**
 * @fileoverview JWT token authentication middleware.
 * Validates bearer tokens, loads user data, and sets up request context.
 * Storage-agnostic — delegates user lookup and role resolution to
 * IAuthenticationProvider on the application.
 * @module middlewares/authenticate-token
 */

import type { Timezone as TimezoneType } from '@digitaldefiance/i18n-lib';
import { GlobalActiveContext } from '@digitaldefiance/i18n-lib';
import {
  AccountStatus,
  getSuiteCoreTranslation,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { NextFunction, Request, Response } from 'express';
import { IncomingHttpHeaders } from 'http';
import { TokenExpiredError } from '../errors/token-expired';
import { IApplication } from '../interfaces/application';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

// Type for Timezone constructor
type TimezoneConstructor = new (tz: string) => TimezoneType;

// Helper to create Timezone from the same module instance as GlobalActiveContext
function createTimezone(tz: string): TimezoneType {
  const context = GlobalActiveContext.getInstance();
  const TimezoneConstructor = context.adminTimezone
    .constructor as TimezoneConstructor;
  return new TimezoneConstructor(tz);
}

/**
 * Extracts bearer token from HTTP request headers.
 * @param {IncomingHttpHeaders} headers - HTTP request headers
 * @returns {string | null} Bearer token if found, null otherwise
 */
export function findAuthToken(headers: IncomingHttpHeaders): string | null {
  const authHeader = headers['Authorization'] || headers['authorization'];
  if (authHeader && typeof authHeader === 'string') {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1];
    }
  }
  return null;
}

/**
 * Express middleware for JWT token authentication.
 * Validates token, loads user from database, checks account status,
 * and populates req.user with authenticated user data.
 *
 * Delegates to `application.authProvider` for storage-agnostic user lookup
 * and role resolution. The application must have an authProvider configured.
 *
 * @template TID - Platform ID type (defaults to Buffer)
 * @param {IApplication<TID>} application - Application instance with authProvider
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {Promise<Response>} Response object
 * @throws {TokenExpiredError} When token has expired
 */
export async function authenticateToken<TID extends PlatformID = Buffer>(
  application: IApplication<TID>,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response> {
  const authProvider = application.authProvider;
  if (!authProvider) {
    return res.status(500).send('Authentication provider not configured');
  }

  const token = findAuthToken(req.headers);
  if (token == null) {
    return res
      .status(401)
      .send(
        getSuiteCoreTranslation(SuiteCoreStringKey.Validation_InvalidToken),
      );
  }

  try {
    const user = await authProvider.verifyToken(token);
    if (user === null) {
      return res.status(403).send(
        // amazonq-ignore-next-line false positive, hardcoded string
        getSuiteCoreTranslation(SuiteCoreStringKey.Validation_UserNotFound),
      );
    }

    // Look up the user and check account status
    const authenticatedUser = await authProvider.findUserById(user.userId);
    if (
      !authenticatedUser ||
      authenticatedUser.accountStatus !== AccountStatus.Active
    ) {
      return res.status(403).send(
        // amazonq-ignore-next-line false positive, hardcoded string
        getSuiteCoreTranslation(SuiteCoreStringKey.Validation_UserNotFound),
      );
    }

    // Build the full request user DTO with roles
    const requestUserDTO = await authProvider.buildRequestUserDTO(user.userId);
    if (!requestUserDTO) {
      return res.status(403).send(
        // amazonq-ignore-next-line false positive, hardcoded string
        getSuiteCoreTranslation(SuiteCoreStringKey.Validation_UserNotFound),
      );
    }

    req.user = requestUserDTO;

    // Update global context with user's language and timezone
    const context = GlobalActiveContext.getInstance();
    if (authenticatedUser.siteLanguage) {
      context.userLanguage = authenticatedUser.siteLanguage;
    }
    context.setLanguageContextSpace('user');
    context.userTimezone = createTimezone(authenticatedUser.timezone);

    next();
    return res;
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      return res.status(401).send({
        message: getSuiteCoreTranslation(
          SuiteCoreStringKey.Validation_TokenExpired,
        ),
        error: err,
      });
    } else if (err instanceof Error && err.name === 'JsonWebTokenError') {
      return res.status(400).send({
        message: getSuiteCoreTranslation(
          SuiteCoreStringKey.Validation_InvalidToken,
        ),
        error: err,
      });
    } else {
      return res.status(500).send({
        message: getSuiteCoreTranslation(
          SuiteCoreStringKey.Common_UnexpectedError,
        ),
        error: err,
      });
    }
  }
}
