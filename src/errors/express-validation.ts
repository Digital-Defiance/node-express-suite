/**
 * @fileoverview Express validation error for handling express-validator validation failures.
 * Wraps validation errors with translatable error messages.
 * @module errors/express-validation
 */

import { TranslatableGenericError } from '@digitaldefiance/i18n-lib';
import {
  SuiteCoreComponentId,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { Result, ValidationError } from 'express-validator';

/**
 * Error thrown when express-validator validation fails.
 * Contains the validation errors and sets HTTP status code to 422 (Unprocessable Entity).
 */
export class ExpressValidationError extends TranslatableGenericError<SuiteCoreStringKey> {
  /** Validation errors from express-validator */
  public readonly errors: Result<ValidationError> | ValidationError[];
  /** HTTP status code (422 for validation errors) */
  public readonly statusCode?: number = 422;

  /**
   * Creates a new express validation error.
   * @param errors Validation errors from express-validator
   */
  constructor(errors: Result<ValidationError> | ValidationError[]) {
    const errorsArray = Array.isArray(errors) ? errors : errors.array();
    const _errorCount = errorsArray.length;
    super(
      SuiteCoreComponentId,
      SuiteCoreStringKey.Validation_ExpressValidationFailed,
    );
    this.errors = errors;
    this.name = 'ExpressValidationError';
  }
}
