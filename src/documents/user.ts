import { AccountStatus, IUserBase } from '@digitaldefiance/suite-core-lib';
import { Types } from '@digitaldefiance/mongoose-types';
import { IBaseDocument } from './base';

/**
 * Composite interface for user collection documents
 */
export type IUserDocument<S extends string = string, I extends string | Types.ObjectId = Types.ObjectId> = IBaseDocument<
  IUserBase<I, Date, S, AccountStatus>,
  I
>;
