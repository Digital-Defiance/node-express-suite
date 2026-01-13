/**
 * @fileoverview Error for expired tokens.
 * Thrown when a JWT or other token has expired, sets HTTP status code to 401.
 * @module errors/token-expired
 */

import {
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';

/**
 * Error thrown when a token has expired.
 * Sets HTTP status code to 401 (Unauthorized).
 */
export class TokenExpiredError extends TranslatableSuiteError {
  /**
   * Creates a new token expired error.
   */
  constructor() {
    super(SuiteCoreStringKey.Validation_TokenExpired, { statusCode: 401 });
    this.name = 'TokenExpiredError';
  }
}
