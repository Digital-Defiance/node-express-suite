/**
 * @fileoverview Abstract JWT service base class.
 * Provides storage-agnostic token verification logic.
 * Concrete implementations (Mongo, BrightDb, etc.) extend this
 * and provide signToken with their storage-specific role lookup.
 * @module services/abstract-jwt-service
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type {
  ITokenRoleDTO,
  ITokenUser,
} from '@digitaldefiance/suite-core-lib';
import {
  JsonWebTokenError,
  JwtPayload,
  TokenExpiredError as JwtTokenExpiredError,
  verify,
  VerifyOptions,
} from 'jsonwebtoken';
import { promisify } from 'util';
import { InvalidJwtTokenError } from '../errors/invalid-jwt-token';
import { TokenExpiredError } from '../errors/token-expired';
import type { IApplication } from '../interfaces/application';
import type { IJwtService } from '../interfaces/jwt-service';
import { BaseService } from './base';

const verifyAsync = promisify<
  string,
  string | Buffer,
  VerifyOptions,
  JwtPayload | string
>(verify);

/**
 * Abstract base class for JWT token operations.
 *
 * Provides a complete, storage-agnostic `verifyToken` implementation.
 * Subclasses must implement `signToken` using their backend-specific
 * role service to look up user roles and produce signed tokens.
 *
 * @template TID - Platform ID type (defaults to Buffer)
 * @template TTokenUser - Token user type (defaults to ITokenUser)
 * @template TApplication - Application interface type
 */
export abstract class AbstractJwtService<
  TID extends PlatformID = Buffer,
  TTokenUser extends ITokenUser = ITokenUser,
  TApplication extends IApplication<TID> = IApplication<TID>,
>
  extends BaseService<TID, TApplication>
  implements IJwtService<TTokenUser>
{
  constructor(application: TApplication) {
    super(application);
  }

  /**
   * Verify a JWT token and return the decoded user payload.
   *
   * This implementation is storage-agnostic — it only depends on
   * `application.environment.jwtSecret` and `application.constants.JWT`.
   */
  public async verifyToken(token: string): Promise<TTokenUser | null> {
    try {
      const decoded = (await verifyAsync(
        token,
        this.application.environment.jwtSecret,
        {
          algorithms: [this.application.constants.JWT.ALGORITHM],
        },
      )) as JwtPayload;

      if (
        typeof decoded === 'object' &&
        decoded !== null &&
        'userId' in decoded &&
        'roles' in decoded
      ) {
        return {
          userId: decoded['userId'] as string,
          roles: decoded['roles'] as ITokenRoleDTO[],
        } as TTokenUser;
      } else {
        return null;
      }
    } catch (err) {
      if (err instanceof JwtTokenExpiredError) {
        throw new TokenExpiredError();
      } else if (err instanceof JsonWebTokenError) {
        throw err;
      }
      throw new InvalidJwtTokenError();
    }
  }
}
