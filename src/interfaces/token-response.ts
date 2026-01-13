/**
 * @fileoverview Token response interface for authentication.
 * Extends API message response with JWT token.
 * @module interfaces/token-response
 */

import { IApiMessageResponse } from './api-message-response';

/**
 * API response containing authentication token.
 * @extends IApiMessageResponse
 * @property {string} token - JWT authentication token
 */
export interface IApiTokenResponse extends IApiMessageResponse {
  token: string;
}
