import {
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';

export class TokenExpiredError extends TranslatableSuiteError {
  constructor() {
    super(SuiteCoreStringKey.Validation_TokenExpired, { statusCode: 401 });
  }
}
