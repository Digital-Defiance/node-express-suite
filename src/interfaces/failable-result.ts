/**
 * @fileoverview Failable result interface for operation outcomes.
 * Generic interface for operations that can succeed or fail.
 * @module interfaces/failable-result
 */

/**
 * Result of an operation that can succeed or fail.
 * @template T - Result data type
 * @property {boolean} success - True if operation succeeded
 * @property {T} [data] - Result data if successful
 * @property {string} [message] - Success or informational message
 * @property {string | Error} [error] - Error message or object if failed
 */
export interface IFailableResult<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string | Error;
}
