/**
 * @fileoverview Symmetric encryption error with typed error codes.
 * Provides specific error types for symmetric encryption failures.
 * @module errors/symmetric
 */

import { CoreLanguageCode, PluginTypedError } from '@digitaldefiance/i18n-lib';
import {
  SuiteCoreComponentId,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import type { SuiteCoreStringKeyValue } from '@digitaldefiance/suite-core-lib';
import { LocalhostConstants } from '../constants';
import { SymmetricErrorType } from '../enumerations/symmetric-error-type';
import { IConstants } from '../interfaces/constants';
import { SymmetricService } from '../services/symmetric';

/**
 * Error thrown when symmetric encryption operations fail.
 * Provides typed error codes for different failure scenarios.
 */
export class SymmetricError extends PluginTypedError<
  typeof SymmetricErrorType,
  SuiteCoreStringKeyValue
> {
  /**
   * Creates a new symmetric encryption error.
   * @param type Type of symmetric error
   * @param language Optional language code for error message
   * @param constants Constants for key size information (defaults to LocalhostConstants)
   */
  constructor(
    type: SymmetricErrorType,
    language?: CoreLanguageCode,
    constants: IConstants = LocalhostConstants,
  ) {
    super(
      SuiteCoreComponentId,
      type,
      {
        [SymmetricErrorType.DataNullOrUndefined]:
          SuiteCoreStringKey.Error_SymmetricDataNullOrUndefined,
        [SymmetricErrorType.InvalidKeyLength]:
          SuiteCoreStringKey.Error_SymmetricInvalidKeyLengthTemplate,
      },
      language,
      {
        KEY_BITS: SymmetricService.symmetricKeyBits(constants.ECIES),
        KEY_BYTES: SymmetricService.symmetricKeyBytes(constants.ECIES),
      },
    );
    this.name = 'SymmetricError';
  }
}
