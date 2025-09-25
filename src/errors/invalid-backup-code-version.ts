import {
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';

export class InvalidBackupCodeVersionError extends TranslatableSuiteError {
  public readonly version: string;
  constructor(version: string) {
    super(SuiteCoreStringKey.Error_InvalidBackupCodeVersionTemplate, {
      version,
    });
    this.version = version;
  }
}
