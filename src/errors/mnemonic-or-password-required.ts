/**
 * @fileoverview Error for missing mnemonic or password during authentication.
 * Thrown when neither mnemonic nor password is provided for login.
 * @module errors/mnemonic-or-password-required
 */

import {
  SuiteCoreStringKey,
  TranslatableSuiteHandleableError,
} from '@digitaldefiance/suite-core-lib';

/**
 * Error thrown when neither mnemonic nor password is provided for authentication.
 * Sets HTTP status code to 422 (Unprocessable Entity).
 */
export class MnemonicOrPasswordRequiredError extends TranslatableSuiteHandleableError {
  /**
   * Creates a new mnemonic or password required error.
   */
  constructor() {
    super(SuiteCoreStringKey.Validation_MnemonicOrPasswordRequired, {
      statusCode: 422,
    });
    this.name = 'MnemonicOrPasswordRequiredError';
  }
}
