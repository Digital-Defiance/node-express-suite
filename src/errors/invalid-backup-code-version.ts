/**
 * @fileoverview Error for invalid backup code version.
 * Thrown when attempting to use a backup code with an unsupported version.
 * @module errors/invalid-backup-code-version
 */

import {
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';

/**
 * Error thrown when a backup code has an invalid or unsupported version.
 */
export class InvalidBackupCodeVersionError extends TranslatableSuiteError {
  /** The invalid version string */
  public readonly version: string;

  /**
   * Creates a new invalid backup code version error.
   * @param version The invalid version string
   */
  constructor(version: string) {
    super(SuiteCoreStringKey.Error_InvalidBackupCodeVersionTemplate, {
      version,
    });
    this.version = version;
    this.name = 'InvalidBackupCodeVersionError';
  }
}
