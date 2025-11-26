import { Types } from '@digitaldefiance/mongoose-types';
import { AccountStatus, IUserBase } from '@digitaldefiance/suite-core-lib';

/**
 * Front-end Base interface for user collection documents
 */
export type IFrontendUser<TLanguage extends string> = IUserBase<
  string,
  Date,
  TLanguage,
  AccountStatus
>;
/**
 * Back-end Base interface for user collection documents
 */
export type IBackendUser<
  TLanguage extends string,
  I = Types.ObjectId,
> = IUserBase<I, Date, TLanguage, AccountStatus>;
