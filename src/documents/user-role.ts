import { IUserRoleBase } from '@digitaldefiance/suite-core-lib';
import { Types } from '@digitaldefiance/mongoose-types';
import { IBaseDocument } from './base';

/**
 * Composite interface for user-role collection documents
 */
export type IUserRoleDocument<I extends string | Types.ObjectId = Types.ObjectId> = IBaseDocument<
  IUserRoleBase<I, Date>,
  I
>;
