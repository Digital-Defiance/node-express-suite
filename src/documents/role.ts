import { IRoleBase } from '@digitaldefiance/suite-core-lib';
import { Types } from 'mongoose';
import { IBaseDocument } from './base';

/**
 * Composite interface for role collection documents
 */
export type IRoleDocument = IBaseDocument<
  IRoleBase<Types.ObjectId, Date>,
  Types.ObjectId
>;
