/**
 * @fileoverview JWT constants interface.
 * Defines configuration constants for JWT token generation and validation.
 * @module interfaces/jwt-consts
 */

/**
 * Constants for JWT token configuration.
 * Defines algorithm and expiration settings.
 */
export interface IJwtConsts {
  /**
   * Algorithm to use for JWT
   */
  ALGORITHM:
    | 'HS256'
    | 'HS384'
    | 'HS512'
    | 'RS256'
    | 'RS384'
    | 'RS512'
    | 'ES256'
    | 'ES384'
    | 'ES512'
    | 'PS256'
    | 'PS384'
    | 'PS512';

  /**
   * The expiration time for a JWT token in seconds
   */
  EXPIRATION_SEC: number;
}
