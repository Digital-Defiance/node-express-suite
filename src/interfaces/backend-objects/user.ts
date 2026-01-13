/**
 * @fileoverview Backend user object type.
 * Defines user type for backend operations with platform-specific IDs.
 * @module interfaces/backend-objects/user
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { AccountStatus, IUserBase } from '@digitaldefiance/suite-core-lib';

/**
 * Backend user object type.
 * @template S - String type for language
 * @template I - Platform ID type (defaults to Buffer)
 */
export type IUserBackendObject<
  S extends string,
  I extends PlatformID = Buffer,
> = IUserBase<I, Date, S, AccountStatus>;
