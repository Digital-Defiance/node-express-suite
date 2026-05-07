/**
 * @fileoverview Storage-agnostic user document type.
 * @module interfaces/documents/user
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type { AccountStatus, IUserBase } from '@digitaldefiance/suite-core-lib';
import type { BaseDocument } from './base';

/**
 * Storage-agnostic user document type.
 * Satisfied by both Mongoose documents and BrightDb plain records.
 *
 * @template TLanguage - String type for site language (defaults to string)
 * @template TID - Platform ID type (defaults to Buffer)
 */
export type UserDocument<
  TLanguage extends string = string,
  TID extends PlatformID = Buffer,
  TDate extends Date | number = Date,
> = BaseDocument<IUserBase<TID, TDate, TLanguage, AccountStatus>, TID>;
