import { IMnemonicBase } from '@digitaldefiance/suite-core-lib';
import { Types } from 'mongoose';
import { IBaseDocument } from './base';

/**
 * Composite interface for user collection documents
 */
export type IMnemonicDocument = IBaseDocument<
  IMnemonicBase<Types.ObjectId>,
  Types.ObjectId
>;
