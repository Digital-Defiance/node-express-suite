import { Language } from '@digitaldefiance/i18n-lib';
import { AccountStatus, IUserBase } from '@digitaldefiance/suite-core-lib';
import { Types } from 'mongoose';
import { IBaseDocument } from './base';

/**
 * Composite interface for user collection documents
 */
export type IUserDocument<S extends string = Language> = IBaseDocument<
  IUserBase<Types.ObjectId, Date, S, AccountStatus>
>;
