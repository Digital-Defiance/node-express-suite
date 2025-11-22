import { IMnemonicBase } from '@digitaldefiance/suite-core-lib';
import { Types } from 'mongoose';
import { IBaseDocument } from './base';

/**
 * Composite interface for user collection documents
 */
export type IMnemonicDocument<I extends string | Types.ObjectId = Types.ObjectId> = IBaseDocument<
  IMnemonicBase<I>,
  I
>;
