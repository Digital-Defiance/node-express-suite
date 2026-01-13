/**
 * @fileoverview Backend role object type.
 * Defines role type for backend operations with platform-specific IDs.
 * @module interfaces/backend-objects/role
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IRoleBase, Role } from '@digitaldefiance/suite-core-lib';

/**
 * Backend role object type.
 * @template I - Platform ID type (defaults to Buffer)
 */
export type IRoleBackendObject<I extends PlatformID = Buffer> = IRoleBase<
  I,
  Date,
  Role
>;
