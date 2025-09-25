import { IUserRoleBase } from '@digitaldefiance/suite-core-lib';
import { Types } from 'mongoose';
import { IBaseDocument } from './base';

/**
 * Composite interface for user-role collection documents
 */
export type IUserRoleDocument = IBaseDocument<
  IUserRoleBase<Types.ObjectId, Date>,
  Types.ObjectId
>;
