import {
  SuiteCoreStringKey,
  TranslatableSuiteHandleableError,
} from '@digitaldefiance/suite-core-lib';

export class InvalidPasswordError extends TranslatableSuiteHandleableError {
  constructor(language?: string, statusCode = 403) {
    super(SuiteCoreStringKey.Validation_InvalidPassword, undefined, language, {
      statusCode,
    });
    this.name = 'InvalidPasswordError';
  }
}
