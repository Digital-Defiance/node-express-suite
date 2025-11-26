import { Schema, Types } from '@digitaldefiance/mongoose-types';
import { IMnemonicBase } from '@digitaldefiance/suite-core-lib';
import { IMnemonicDocument } from '../documents/mnemonic';
import { IConstants } from '../interfaces/constants';

export function createMnemonicSchema<
  T extends IConstants = IConstants,
  I extends string | Types.ObjectId = Types.ObjectId
>(validationMessage?: () => string, constants?: T): Schema<IMnemonicBase<I>, IMnemonicDocument<I>>;

export const MnemonicSchema: Schema<IMnemonicBase<Types.ObjectId>, IMnemonicDocument<Types.ObjectId>>;
