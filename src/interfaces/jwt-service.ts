/**
 * @fileoverview Abstract JWT service interface.
 * Database-agnostic contract for JWT token operations.
 * Concrete implementations live in backend-specific packages
 * (e.g. node-express-suite-mongo, @brightchain/node-express-suite).
 * @module interfaces/jwt-service
 */

import type { ITokenUser } from '@digitaldefiance/suite-core-lib';

/**
 * Abstract interface for JWT token operations.
 * Implementations handle token signing and verification
 * using their backend-specific user/role storage.
 *
 * @template TID - Platform ID type (defaults to Buffer)
 * @template TTokenUser - Token user type (defaults to ITokenUser)
 */
export interface IJwtService<TTokenUser extends ITokenUser = ITokenUser> {
  /**
   * Verify a JWT token and return the decoded user payload.
   * @param token - The JWT token string to verify
   * @returns The decoded token user, or null if invalid
   * @throws {TokenExpiredError} If the token has expired
   * @throws {InvalidJwtTokenError} If the token is malformed
   */
  verifyToken(token: string): Promise<TTokenUser | null>;
}
