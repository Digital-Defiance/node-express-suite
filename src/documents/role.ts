import { IRoleBase } from '@digitaldefiance/suite-core-lib';
import { Types } from 'mongoose';
import { IBaseDocument } from './base';

/**
 * Composite interface for role collection documents
 */
export type IRoleDocument<I extends string | Types.ObjectId = Types.ObjectId> = IBaseDocument<
  IRoleBase<I, Date>,
  I
>;
