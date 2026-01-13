/**
 * @fileoverview Status code response wrapper interface.
 * Wraps API responses with HTTP status codes and optional headers.
 * @module interfaces/status-code-response
 */

import { ApiResponse } from '../types';

/**
 * HTTP response wrapper with status code and headers.
 * @template T - API response type
 * @property {number} statusCode - HTTP status code
 * @property {T} response - Response payload
 * @property {Record<string, string>} [headers] - Optional HTTP headers
 */
export interface IStatusCodeResponse<T extends ApiResponse> {
  statusCode: number;
  response: T;
  headers?: Record<string, string>;
}
