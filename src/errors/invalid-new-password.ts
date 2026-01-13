/**
 * @fileoverview Error for invalid new passwords that don't meet requirements.
 * Thrown during password changes or registration when password validation fails.
 * @module errors/invalid-new-password
 */

import {
  SuiteCoreStringKey,
  TranslatableSuiteHandleableError,
} from '@digitaldefiance/suite-core-lib';

/**
 * Error thrown when a new password doesn't meet security requirements.
 * Sets HTTP status code to 422 (Unprocessable Entity).
 */
export class InvalidNewPasswordError extends TranslatableSuiteHandleableError {
  /**
   * Creates a new invalid new password error.
   * @param language Optional language code for error message
   * @param statusCode HTTP status code (defaults to 422)
   */
  constructor(language?: string, statusCode = 422) {
    super(
      SuiteCoreStringKey.Validation_PasswordRegexErrorTemplate,
      undefined,
      language,
      {
        statusCode,
      },
    );
    this.name = 'InvalidNewPasswordError';
  }
}
