/**
 * @fileoverview Response builder for API responses.
 * Provides fluent API for building HTTP responses with status codes.
 * @module responses/response-builder
 */

import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import {
  getSuiteCoreTranslation,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { IStatusCodeResponse } from '../interfaces';
import { ApiResponse } from '../types';

/**
 * Builder for constructing API responses with fluent interface.
 * @template T - Response type extending ApiResponse
 */
export class ResponseBuilder<T extends ApiResponse = ApiResponse> {
  private statusCode: number = 200;
  private responseData: Partial<T> = {};
  private responseHeaders?: Record<string, string>;

  /**
   * Creates a 200 OK response builder.
   * @template T - Response type
   * @returns {ResponseBuilder<T>} Response builder instance
   */
  static ok<T extends ApiResponse = ApiResponse>(): ResponseBuilder<T> {
    return new ResponseBuilder<T>().status(200);
  }

  /**
   * Creates a 201 Created response builder.
   * @template T - Response type
   * @returns {ResponseBuilder<T>} Response builder instance
   */
  static created<T extends ApiResponse = ApiResponse>(): ResponseBuilder<T> {
    return new ResponseBuilder<T>().status(201);
  }

  /**
   * Creates a 202 Accepted response builder.
   * @template T - Response type
   * @returns {ResponseBuilder<T>} Response builder instance
   */
  static accepted<T extends ApiResponse = ApiResponse>(): ResponseBuilder<T> {
    return new ResponseBuilder<T>().status(202);
  }

  /**
   * Creates a 204 No Content response builder.
   * @returns {ResponseBuilder<ApiResponse>} Response builder instance
   */
  static noContent(): ResponseBuilder<ApiResponse> {
    return new ResponseBuilder<ApiResponse>().status(204);
  }

  /**
   * Creates a 400 Bad Request response builder.
   * @template T - Response type
   * @returns {ResponseBuilder<T>} Response builder instance
   */
  static badRequest<T extends ApiResponse = ApiResponse>(): ResponseBuilder<T> {
    return new ResponseBuilder<T>().status(400);
  }

  /**
   * Creates a 401 Unauthorized response builder.
   * @template T - Response type
   * @returns {ResponseBuilder<T>} Response builder instance
   */
  static unauthorized<
    T extends ApiResponse = ApiResponse,
  >(): ResponseBuilder<T> {
    return new ResponseBuilder<T>().status(401);
  }

  /**
   * Creates a 403 Forbidden response builder.
   * @template T - Response type
   * @returns {ResponseBuilder<T>} Response builder instance
   */
  static forbidden<T extends ApiResponse = ApiResponse>(): ResponseBuilder<T> {
    return new ResponseBuilder<T>().status(403);
  }

  /**
   * Creates a 404 Not Found response builder.
   * @template T - Response type
   * @returns {ResponseBuilder<T>} Response builder instance
   */
  static notFound<T extends ApiResponse = ApiResponse>(): ResponseBuilder<T> {
    return new ResponseBuilder<T>().status(404);
  }

  /**
   * Creates a 500 Internal Server Error response builder.
   * @template T - Response type
   * @returns {ResponseBuilder<T>} Response builder instance
   */
  static error<T extends ApiResponse = ApiResponse>(): ResponseBuilder<T> {
    return new ResponseBuilder<T>().status(500);
  }

  /**
   * Sets the HTTP status code.
   * @param {number} code - HTTP status code
   * @returns {this} This builder instance for chaining
   */
  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  /**
   * Sets a translatable message on the response.
   * @param {SuiteCoreStringKey} key - Translation key
   * @param {Record<string, string>} [params] - Translation parameters
   * @param {string} [language] - Target language
   * @returns {this} This builder instance for chaining
   */
  message(
    key: SuiteCoreStringKey,
    params?: Record<string, string>,
    language?: string,
  ): this {
    (this.responseData as T & { message?: string }).message =
      getSuiteCoreTranslation(key, params, language as CoreLanguageCode);
    return this;
  }

  /**
   * Sets response data.
   * @param {Partial<T>} data - Response data to merge
   * @returns {this} This builder instance for chaining
   */
  data(data: Partial<T>): this {
    this.responseData = { ...this.responseData, ...data };
    return this;
  }

  /**
   * Sets response headers.
   * @param {Record<string, string>} headers - HTTP headers
   * @returns {this} This builder instance for chaining
   */
  headers(headers: Record<string, string>): this {
    this.responseHeaders = headers;
    return this;
  }

  /**
   * Builds the final response object.
   * @returns {IStatusCodeResponse<T>} Complete response with status code and headers
   */
  build(): IStatusCodeResponse<T> {
    return {
      statusCode: this.statusCode,
      response: this.responseData as T,
      ...(this.responseHeaders ? { headers: this.responseHeaders } : {}),
    };
  }
}

export const Response = ResponseBuilder;
