import {
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';

export class ModelNotRegisteredError extends TranslatableSuiteError {
  constructor(public readonly modelName: string) {
    super(SuiteCoreStringKey.Error_ModelNotRegisteredTemplate, { modelName });
    this.name = 'ModelNotRegisteredError';
  }
}
