import {
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';

export class InvalidModelError extends TranslatableSuiteError {
  constructor(public readonly modelKey: string) {
    super(SuiteCoreStringKey.Error_InvalidModelKeyTemplate, { modelKey });
    this.name = 'InvalidModelError';
  }
}
