import { CoreLanguageCode, PluginTypedError } from '@digitaldefiance/i18n-lib';
import {
  SuiteCoreComponentId,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { LocalhostConstants } from '../constants';
import { SymmetricErrorType } from '../enumerations/symmetric-error-type';
import { IConstants } from '../interfaces/constants';
import { SymmetricService } from '../services/symmetric';

export class SymmetricError extends PluginTypedError<
  typeof SymmetricErrorType,
  SuiteCoreStringKey
> {
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
