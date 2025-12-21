import { Schema } from '@digitaldefiance/mongoose-types';
import {
  getSuiteCoreTranslation,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { LocalhostConstants as AppConstants } from '../constants';
import { IConstants } from '../interfaces/constants';

/**
 * Create a mnemonic schema with custom or default constants
 */
export function createMnemonicSchema<T extends IConstants = IConstants>(
  validationMessage?: () => string,
  constants: T = AppConstants as T,
): Schema {
  const definition = {
    hmac: {
      type: String,
      required: true,
      unique: true,
      index: true,
      validate: {
        validator: (v: string) => constants.MnemonicHmacRegex.test(v),
        message:
          validationMessage ||
          (() =>
            getSuiteCoreTranslation(SuiteCoreStringKey.Validation_HmacRegex)),
      },
    },
  };
  return new Schema(definition);
}

/**
 * Default mnemonic schema using AppConstants
 */
export const MnemonicSchema = createMnemonicSchema();
