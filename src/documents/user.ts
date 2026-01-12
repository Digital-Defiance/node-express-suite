import { AccountStatus, IUserBase } from '@digitaldefiance/suite-core-lib';
import { IBaseDocument } from './base';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Composite interface for user collection documents
 */
export type IUserDocument<
  S extends string = string,
  I extends PlatformID = Buffer,
> = IBaseDocument<IUserBase<I, Date, S, AccountStatus>, I>;
