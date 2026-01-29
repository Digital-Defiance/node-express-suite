/**
 * @fileoverview Error for missing validated data in request processing.
 * Thrown when expected validated data is not present after validation middleware.
 * @module errors/missing-validated-data
 */

import {
  SuiteCoreStringKey,
  TranslatableSuiteHandleableError,
} from '@digitaldefiance/suite-core-lib';
import type { SuiteCoreStringKeyValue } from '@digitaldefiance/suite-core-lib';

/**
 * Error thrown when validated data is missing from the request.
 * Sets HTTP status code to 422 (Unprocessable Entity).
 * @template _TLanguage Language string literal type
 * @template _TContext Context string literal type
 */
export class MissingValidatedDataError<
  _TLanguage extends string,
  _TContext extends string,
> extends TranslatableSuiteHandleableError {
  /** The missing field name (if single field) */
  public readonly field?: string;
  /** The missing field names (if multiple fields) */
  public readonly fields?: string[];

  /**
   * Creates a new missing validated data error.
   * @param data Field name(s) that are missing
   */
  constructor(data?: string | string[]) {
    let message: SuiteCoreStringKeyValue;
    let fields: string[] | undefined;
    let field: string;
    if (data && Array.isArray(data)) {
      message =
        SuiteCoreStringKey.Validation_MissingValidatedDataForFieldTemplate;
      field = data.join(', ');
      fields = data;
    } else if (data) {
      message =
        SuiteCoreStringKey.Validation_MissingValidatedDataForFieldTemplate;
      field = String(data);
    } else {
      message = SuiteCoreStringKey.Validation_MissingValidatedData;
      field = '';
    }
    super(message, { field }, undefined, {
      statusCode: 422,
    });
    this.field = field;
    this.fields = fields;
    this.name = 'MissingValidatedDataError';
  }
}
