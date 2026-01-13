/**
 * @fileoverview Handleable error options interface.
 * Defines options for errors that can be handled by error middleware.
 * @module interfaces/handleable-error-options
 */

/**
 * Options for handleable errors.
 * @property {Error} [cause] - Original error that caused this error
 * @property {boolean} [handled] - Whether error has been handled
 * @property {number} [statusCode] - HTTP status code for error response
 * @property {unknown} [sourceData] - Additional data related to the error
 */
export interface HandleableErrorOptions {
  cause?: Error;
  handled?: boolean;
  statusCode?: number;
  sourceData?: unknown;
}
