/**
 * @fileoverview Error for invalid display names that don't meet requirements.
 * Thrown during display name changes or registration when display name validation fails.
 * @module errors/invalid-display-name
 */

import {
  SuiteCoreStringKey,
  TranslatableSuiteHandleableError,
} from '@digitaldefiance/suite-core-lib';

/**
 * Error thrown when a display name doesn't meet security requirements.
 * Sets HTTP status code to 422 (Unprocessable Entity).
 */
export class InvalidDisplayNameError extends TranslatableSuiteHandleableError {
  /**
   * Creates a new invalid display name error.
   * @param language Optional language code for error message
   * @param statusCode HTTP status code (defaults to 422)
   */
  constructor(language?: string, statusCode = 422) {
    super(
      SuiteCoreStringKey.Validation_DisplayNameRegexErrorTemplate,
      undefined,
      language,
      {
        statusCode,
      },
    );
    this.name = 'InvalidDisplayNameError';
  }
}
