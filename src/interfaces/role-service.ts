/**
 * @fileoverview Abstract role service interface.
 * Database-agnostic contract for role-based access control operations.
 * Concrete implementations live in backend-specific packages
 * (e.g. node-express-suite-mongo, @brightchain/node-express-suite).
 * @module interfaces/role-service
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type { IRoleBase, ITokenRole } from '@digitaldefiance/suite-core-lib';
import type { MemberType } from '@digitaldefiance/ecies-lib';

/**
 * Abstract interface for role service operations.
 * Implementations handle role CRUD and user-role associations
 * using their backend-specific storage.
 *
 * @template TID - Platform ID type (defaults to Buffer)
 * @template TDate - Date type (defaults to Date)
 * @template TTokenRole - Token role type (defaults to ITokenRole<TID, TDate>)
 */
export interface IRoleService<
  TID extends PlatformID = Buffer,
  TDate extends Date = Date,
  TTokenRole extends ITokenRole<TID, TDate> = ITokenRole<TID, TDate>,
  TRole extends IRoleBase<TID> = IRoleBase<TID>,
> {
  /**
   * Get the role ID for a given role name.
   * @param roleName - The name of the role to look up
   * @returns The role ID, or null/undefined if not found
   */
  getRoleIdByName(roleName: string): Promise<TID | null | undefined>;

  /**
   * Get all roles assigned to a user.
   * @param userId - The user's ID
   * @returns Array of role objects (storage-specific, e.g. RoleDocument)
   */
  getUserRoles(userId: TID): Promise<TRole[]>;

  /**
   * Check if a user has the admin role.
   * @param userId - The user's ID
   */
  isUserAdmin(userId: TID): Promise<boolean>;

  /**
   * Check if a user has the member role.
   * @param userId - The user's ID
   */
  isUserMember(userId: TID): Promise<boolean>;

  /**
   * Get the MemberType for a user based on their roles.
   * @param userId - The user's ID
   */
  getMemberType(userId: TID): Promise<MemberType>;

  /**
   * Convert role objects to token role representations.
   * @param roles - Array of role objects
   * @param overrideLanguage - Optional language override for role name translation
   */
  rolesToTokenRoles(roles: TRole[], overrideLanguage?: string): TTokenRole[];
}
