/**
 * @fileoverview MongoDB validation error response interface.
 * Extends API message response with MongoDB-specific validation errors.
 * @module interfaces/api-mongo-validation-error-response
 */

import { IApiMessageResponse } from './api-message-response';
import { IMongoErrors } from './mongo-errors';

/**
 * API response for MongoDB validation errors.
 * @extends IApiMessageResponse
 * @property {IMongoErrors} errors - MongoDB validation error details
 */
export interface IApiMongoValidationErrorResponse extends IApiMessageResponse {
  errors: IMongoErrors;
}
