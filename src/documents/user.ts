/**
 * @fileoverview User document interface for Mongoose user model.
 * Combines base document with user-specific fields and account status.
 * @module documents/user
 */

import { AccountStatus, IUserBase } from '@digitaldefiance/suite-core-lib';
import { IBaseDocument } from './base';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * User document interface for MongoDB user collection.
 * @template S - String type for site language (defaults to string)
 * @template I - Platform ID type (defaults to Buffer)
 * @typedef {IBaseDocument<IUserBase<I, Date, S, AccountStatus>, I>} IUserDocument
 */
export type IUserDocument<
  S extends string = string,
  I extends PlatformID = Buffer,
> = IBaseDocument<IUserBase<I, Date, S, AccountStatus>, I>;
