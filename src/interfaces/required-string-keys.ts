/**
 * @fileoverview Required string keys interface for i18n.
 * Defines minimum required translation keys for the library.
 * @module interfaces/required-string-keys
 */

/**
 * Base interface defining the minimum required string keys.
 * Must be implemented by any application using this library.
 */
export interface RequiredStringKeys {
  Common_UnexpectedError: string;
  Error_EngineAlreadySet: string;
  Error_EngineNotSet: string;
  Error_LengthExceedsMaximum: string;
  Error_LengthIsInvalidType: string;
  // Validation errors
  ValidationError: string;
  Validation_MissingValidatedData: string;
  Validation_MissingValidatedDataForField: string;

  // Admin/system messages
  Admin_NoMongoDbClientFoundFallingBack: string;
  Admin_TransactionFailedTransientTemplate: string;
  Admin_TransactionTimeoutTemplate: string;
}

/**
 * Type constraint to ensure user's string key enum extends the required keys.
 * @template T - String key type
 */
export type ExtendedStringKeys<T extends string> =
  T extends keyof RequiredStringKeys ? T : T | keyof RequiredStringKeys;
