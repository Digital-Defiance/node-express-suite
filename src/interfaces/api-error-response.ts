/**
 * @fileoverview Generic API error response interface.
 * Extends API message response with error details.
 * @module interfaces/api-error-response
 */

import { IApiMessageResponse } from './api-message-response';

/**
 * Generic API error response.
 * @extends IApiMessageResponse
 */
export interface IApiErrorResponse extends IApiMessageResponse {
  error: unknown;
}
