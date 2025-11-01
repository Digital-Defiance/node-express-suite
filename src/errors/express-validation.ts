import { PluginTranslatableGenericError } from '@digitaldefiance/i18n-lib';
import {
  SuiteCoreComponentId,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { Result, ValidationError } from 'express-validator';

export class ExpressValidationError extends PluginTranslatableGenericError<SuiteCoreStringKey> {
  public readonly errors: Result<ValidationError> | ValidationError[];
  public readonly statusCode?: number = 422;
  constructor(errors: Result<ValidationError> | ValidationError[]) {
    const errorsArray = Array.isArray(errors) ? errors : errors.array();
    const errorCount = errorsArray.length;
    super(
      SuiteCoreComponentId,
      SuiteCoreStringKey.Validation_ExpressValidationFailed,
    );
    this.errors = errors;
    this.name = 'ExpressValidationError';
  }
}
