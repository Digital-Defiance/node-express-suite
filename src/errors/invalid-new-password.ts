import {
  SuiteCoreStringKey,
  TranslatableSuiteHandleableError,
} from '@digitaldefiance/suite-core-lib';

export class InvalidNewPasswordError extends TranslatableSuiteHandleableError {
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
