import { PluginTypedError } from '@digitaldefiance/i18n-lib';
import {
  getSuiteCoreI18nEngine,
  SuiteCoreComponentId,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { Constants } from '../constants';
import { SymmetricErrorType } from '../enumerations/symmetric-error-type';
import { IConstants } from '../interfaces/constants';
import { SymmetricService } from '../services/symmetric';

export class SymmetricError extends PluginTypedError<
  typeof SymmetricErrorType,
  SuiteCoreStringKey,
  string
> {
  constructor(
    type: SymmetricErrorType,
    language?: string,
    constants: IConstants = Constants,
  ) {
    const engine = getSuiteCoreI18nEngine();
    super(
      engine,
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
