import { HandleableError } from '@digitaldefiance/i18n-lib';
import {
  getSuiteCoreI18nEngine,
  SuiteCoreComponentId,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { Error } from 'mongoose';

export class MongooseValidationError extends HandleableError {
  public readonly errors: {
    [path: string]: Error.CastError | Error.ValidatorError;
  };
  constructor(
    validationErrors: {
      [path: string]: Error.CastError | Error.ValidatorError;
    },
    language?: string,
  ) {
    const coreEngine = getSuiteCoreI18nEngine();
    super(
      new Error(
        `${coreEngine.translate(
          SuiteCoreComponentId,
          SuiteCoreStringKey.Validation_MongooseValidationError,
          undefined,
          language,
        )}: ${JSON.stringify(validationErrors)}`,
      ),
      { statusCode: 422 },
    );
    this.name = 'MongooseValidationError';
    this.errors = validationErrors;
  }
}
