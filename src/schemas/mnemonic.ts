import {
  getSuiteCoreTranslation,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { Schema } from 'mongoose';
import { LocalhostConstants as AppConstants } from '../constants';
import { IMnemonicDocument } from '../documents/mnemonic';
import { IConstants } from '../interfaces/constants';

/**
 * Create a mnemonic schema with custom or default constants
 */
export function createMnemonicSchema<T extends IConstants = IConstants>(
  validationMessage?: () => string,
  constants: T = AppConstants as T,
): Schema<IMnemonicDocument> {
  return new Schema<IMnemonicDocument>({
    hmac: {
      type: String,
      required: true,
      unique: true,
      index: true,
      validate: {
        validator: (v: string) => constants.HmacRegex.test(v),
        message:
          validationMessage ||
          (() =>
            getSuiteCoreTranslation(SuiteCoreStringKey.Validation_HmacRegex)),
      },
    },
  });
}

/**
 * Default mnemonic schema using AppConstants
 */
export const MnemonicSchema = createMnemonicSchema();
