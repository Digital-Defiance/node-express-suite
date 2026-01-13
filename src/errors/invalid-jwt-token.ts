/**
 * @fileoverview Error for invalid JWT tokens.
 * Thrown when JWT token validation fails, sets HTTP status code to 401.
 * @module errors/invalid-jwt-token
 */

import {
  SuiteCoreStringKey,
  TranslatableSuiteHandleableError,
} from '@digitaldefiance/suite-core-lib';

/**
 * Error thrown when a JWT token is invalid or malformed.
 * Sets HTTP status code to 401 (Unauthorized).
 */
export class InvalidJwtTokenError extends TranslatableSuiteHandleableError {
  /**
   * Creates a new invalid JWT token error.
   */
  constructor() {
    super(SuiteCoreStringKey.Validation_InvalidToken, { statusCode: 401 });
    this.name = 'InvalidJwtTokenError';
  }
}
