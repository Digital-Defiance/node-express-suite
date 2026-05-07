/**
 * @fileoverview Storage-agnostic user-role document type.
 * @module interfaces/documents/user-role
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type { IUserRoleBase } from '@digitaldefiance/suite-core-lib';
import type { BaseDocument } from './base';

/**
 * Storage-agnostic user-role document type.
 * Satisfied by both Mongoose documents and BrightDb plain records.
 *
 * @template TID - Platform ID type (defaults to Buffer)
 * @template TDate - Date type (defaults to Date)
 */
export type UserRoleDocument<
  TID extends PlatformID = Buffer,
  TDate extends Date | number = Date,
> = BaseDocument<IUserRoleBase<TID, TDate>, TID>;
