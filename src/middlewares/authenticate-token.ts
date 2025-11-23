import type { Timezone as TimezoneType } from '@digitaldefiance/i18n-lib';
import { GlobalActiveContext } from '@digitaldefiance/i18n-lib';
import {
  AccountStatus,
  getSuiteCoreTranslation,
  ITokenRole,
  ITokenUser,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { NextFunction, Request, Response } from 'express';
import { IncomingHttpHeaders } from 'http';
import { ClientSession, Types } from 'mongoose';
import { IUserDocument } from '../documents/user';
import { BaseModelName } from '../enumerations/base-model-name';
import { TokenExpiredError } from '../errors/token-expired';
import { IApplication } from '../interfaces/application';
import { JwtService } from '../services/jwt';
import { RequestUserService } from '../services/request-user';
import { RoleService } from '../services/role';
import { withTransaction } from '../utils';

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
 * Find the auth token in the headers
 * @param headers The headers
 * @returns The auth token
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
 * Middleware to authenticate a token
 * @param application The application
 * @param req The request
 * @param res The response
 * @param next The next function
 * @returns The response
 */
export async function authenticateToken<
  I extends Types.ObjectId | string = Types.ObjectId,
  D extends Date = Date,
  TTokenRole extends ITokenRole<I, D> = ITokenRole<I, D>,
  TTokenUser extends ITokenUser = ITokenUser,
  TApplication extends IApplication = IApplication,
>(
  application: TApplication,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response> {
  const UserModel = application.getModel<IUserDocument<string, I>>(
    BaseModelName.User,
  );
  const token = findAuthToken(req.headers);
  if (token == null) {
    return res
      .status(401)
      .send(
        getSuiteCoreTranslation(SuiteCoreStringKey.Validation_InvalidToken),
      );
  }

  try {
    return await withTransaction<Response>(
      application.db.connection,
      application.environment.mongo.useTransactions,
      undefined,
      async (sess: ClientSession | undefined) => {
        const jwtService = new JwtService<
          I,
          D,
          TTokenRole,
          TTokenUser,
          TApplication
        >(application);
        const user: TTokenUser | null = await jwtService.verifyToken(token);
        if (user === null) {
          return res.status(403).send(
            // amazonq-ignore-next-line false positive, hardcoded string
            getSuiteCoreTranslation(SuiteCoreStringKey.Validation_UserNotFound),
          );
        }
        const userDoc = await UserModel.findById(user.userId)
          .select('-password')
          .session(sess ?? null)
          .exec();
        if (!userDoc || userDoc.accountStatus !== AccountStatus.Active) {
          return res.status(403).send(
            // amazonq-ignore-next-line false positive, hardcoded string
            getSuiteCoreTranslation(SuiteCoreStringKey.Validation_UserNotFound),
          );
        }
        const roleService = new RoleService<I, D, TTokenRole>(application);
        const roles = await roleService.getUserRoles(userDoc._id as I, sess);
        const tokenRoles = roleService.rolesToTokenRoles(roles);
        req.user = RequestUserService.makeRequestUserDTO(userDoc, tokenRoles);
        const context = GlobalActiveContext.getInstance();
        context.userLanguage = userDoc.siteLanguage ?? context.userLanguage;
        context.setLanguageContextSpace('user');
        context.userTimezone = createTimezone(userDoc.timezone);
        next();
        return res;
      },
      {
        timeoutMs: application.environment.mongo.transactionTimeout,
      },
    );
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
