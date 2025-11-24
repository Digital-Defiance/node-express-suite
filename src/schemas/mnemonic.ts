import { Schema, Types } from 'mongoose';
import {
  getSuiteCoreTranslation,
  IMnemonicBase,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { LocalhostConstants as AppConstants } from '../constants';
import { IMnemonicDocument } from '../documents/mnemonic';
import { IConstants } from '../interfaces/constants';

/**
 * Create a mnemonic schema with custom or default constants
 */
export function createMnemonicSchema<
  T extends IConstants = IConstants,
  I extends string | Types.ObjectId = Types.ObjectId
>(
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
  return new Schema(definition) as Schema<IMnemonicBase<I>, IMnemonicDocument<I>>;
}

/**
 * Default mnemonic schema using AppConstants
 */
export const MnemonicSchema = createMnemonicSchema();
