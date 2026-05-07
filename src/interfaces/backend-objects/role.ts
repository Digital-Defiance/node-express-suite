/**
 * @fileoverview Backend role object type.
 * Defines role type for backend operations with platform-specific IDs.
 * @module interfaces/backend-objects/role
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IRoleBase, Role } from '@digitaldefiance/suite-core-lib';

/**
 * Backend role object type.
 * @template TID - Platform ID type (defaults to Buffer)
 * @template TDate - Date type (defaults to Date)
 */
export type IRoleBackendObject<
  TID extends PlatformID = Buffer,
  TDate extends Date | number = Date,
> = IRoleBase<TID, TDate, Role>;
