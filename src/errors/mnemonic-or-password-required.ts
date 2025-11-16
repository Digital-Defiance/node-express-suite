import {
  SuiteCoreStringKey,
  TranslatableSuiteHandleableError,
} from '@digitaldefiance/suite-core-lib';

export class MnemonicOrPasswordRequiredError extends TranslatableSuiteHandleableError {
  constructor() {
    super(SuiteCoreStringKey.Validation_MnemonicOrPasswordRequired, {
      statusCode: 422,
    });
    this.name = 'MnemonicOrPasswordRequiredError';
  }
}
