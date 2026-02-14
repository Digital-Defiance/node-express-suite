/**
 * Result type for operations that can succeed or fail with optional data and error information.
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
