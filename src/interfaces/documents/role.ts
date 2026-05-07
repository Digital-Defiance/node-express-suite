/**
 * @fileoverview Storage-agnostic role document type.
 * @module interfaces/documents/role
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type { IRoleBase } from '@digitaldefiance/suite-core-lib';
import type { BaseDocument } from './base';

/**
 * Storage-agnostic role document type.
 * Satisfied by both Mongoose documents and BrightDb plain records.
 *
 * @template TID - Platform ID type (defaults to Buffer)
 * @template TDate - Date type (defaults to Date)
 */
export type RoleDocument<
  TID extends PlatformID = Buffer,
  TDate extends Date | number = Date,
> = BaseDocument<IRoleBase<TID, TDate>, TID>;
