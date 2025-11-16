import {
  SuiteCoreStringKey,
  TranslatableSuiteHandleableError,
} from '@digitaldefiance/suite-core-lib';

export class InvalidJwtTokenError extends TranslatableSuiteHandleableError {
  constructor() {
    super(SuiteCoreStringKey.Validation_InvalidToken, { statusCode: 401 });
    this.name = 'InvalidJwtTokenError';
  }
}
