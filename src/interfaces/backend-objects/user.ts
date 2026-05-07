/**
 * @fileoverview Backend user object type.
 * Defines user type for backend operations with platform-specific IDs.
 * @module interfaces/backend-objects/user
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { AccountStatus, IUserBase } from '@digitaldefiance/suite-core-lib';

/**
 * Backend user object type.
 * @template TLanguage - String type for language
 * @template TID - Platform ID type (defaults to Buffer)
 * @template TDate - Date type (defaults to Date)
 */
export type IUserBackendObject<
  TLanguage extends string,
  TID extends PlatformID = Buffer,
  TDate extends Date | number = Date,
> = IUserBase<TID, TDate, TLanguage, AccountStatus>;
