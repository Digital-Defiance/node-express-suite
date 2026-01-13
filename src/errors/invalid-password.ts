/**
 * @fileoverview Error for invalid passwords during authentication.
 * Thrown when password verification fails, sets HTTP status code to 403.
 * @module errors/invalid-password
 */

import {
  SuiteCoreStringKey,
  TranslatableSuiteHandleableError,
} from '@digitaldefiance/suite-core-lib';

/**
 * Error thrown when a password is incorrect during authentication.
 * Sets HTTP status code to 403 (Forbidden).
 */
export class InvalidPasswordError extends TranslatableSuiteHandleableError {
  /**
   * Creates a new invalid password error.
   * @param language Optional language code for error message
   * @param statusCode HTTP status code (defaults to 403)
   */
  constructor(language?: string, statusCode = 403) {
    super(SuiteCoreStringKey.Validation_InvalidPassword, undefined, language, {
      statusCode,
    });
    this.name = 'InvalidPasswordError';
  }
}
