/**
 * Base interface defining the minimum required string keys that must be implemented
 * by any application using this library
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
 * Type constraint to ensure user's string key enum extends the required keys
 */
export type ExtendedStringKeys<T extends string> =
  T extends keyof RequiredStringKeys ? T : T | keyof RequiredStringKeys;
