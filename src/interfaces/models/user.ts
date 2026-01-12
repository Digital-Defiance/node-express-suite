import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
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
  I extends PlatformID = Buffer,
> = IUserBase<I, Date, TLanguage, AccountStatus>;
