/**
 * @fileoverview Express validation error response interface.
 * Extends API message response with express-validator errors.
 * @module interfaces/api-express-validation-error-response
 */

import { Result, ValidationError } from 'express-validator';
import { IApiMessageResponse } from './api-message-response';

/**
 * API response for express-validator validation errors.
 * @extends IApiMessageResponse
 */
export interface IApiExpressValidationErrorResponse extends IApiMessageResponse {
  errors: ValidationError[] | Result<ValidationError>;
  errorType?: string;
}
