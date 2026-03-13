/**
 * @fileoverview Abstract role service base class.
 * Provides storage-agnostic role-checking logic (getMemberType, isUserAdmin, etc.).
 * Concrete implementations (Mongo, BrightDb, etc.) extend this and provide
 * the storage-specific methods: getUserRoles, getRoleIdByName, rolesToTokenRoles.
 * @module services/abstract-role-service
 */

import { MemberType } from '@digitaldefiance/ecies-lib';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type { IRoleBase, ITokenRole } from '@digitaldefiance/suite-core-lib';
import type { IApplication } from '../interfaces/application';
import type { IRoleService } from '../interfaces/role-service';
import { BaseService } from './base';

/**
 * Abstract base class for role service operations.
 *
 * Provides default implementations for role-checking methods
 * (`isUserAdmin`, `isUserMember`, `getMemberType`) that delegate
 * to `getUserRoles`. Subclasses must implement the storage-specific
 * methods: `getUserRoles`, `getRoleIdByName`, `rolesToTokenRoles`.
 *
 * @template TID - Platform ID type (defaults to Buffer)
 * @template TDate - Date type (defaults to Date)
 * @template TTokenRole - Token role type (defaults to ITokenRole<TID, TDate>)
 * @template TRole - Raw role type returned by getUserRoles (defaults to IRoleBase<TID>)
 * @template TApplication - Application interface type
 */
export abstract class AbstractRoleService<
  TID extends PlatformID = Buffer,
  TDate extends Date = Date,
  TTokenRole extends ITokenRole<TID, TDate> = ITokenRole<TID, TDate>,
  TRole extends IRoleBase<TID> = IRoleBase<TID>,
  TApplication extends IApplication<TID> = IApplication<TID>,
>
  extends BaseService<TID, TApplication>
  implements IRoleService<TID, TDate, TTokenRole, TRole>
{
  constructor(application: TApplication) {
    super(application);
  }

  // ── Abstract methods (storage-specific) ───────────────────────────

  /**
   * Get the role ID for a given role name.
   * Must be implemented by storage-specific subclasses.
   */
  abstract getRoleIdByName(roleName: string): Promise<TID | null | undefined>;

  /**
   * Get all roles assigned to a user.
   * Must be implemented by storage-specific subclasses.
   */
  abstract getUserRoles(userId: TID): Promise<TRole[]>;

  /**
   * Convert role objects to token role representations.
   * Must be implemented by storage-specific subclasses.
   */
  abstract rolesToTokenRoles(
    roles: TRole[],
    overrideLanguage?: string,
  ): TTokenRole[];

  // ── Default implementations (storage-agnostic) ────────────────────

  /**
   * Check if a user has the admin role.
   * Default implementation delegates to getUserRoles.
   */
  public async isUserAdmin(userId: TID): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return roles.some((r) => r.admin);
  }

  /**
   * Check if a user has the member role.
   * Default implementation delegates to getUserRoles.
   */
  public async isUserMember(userId: TID): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return roles.some((r) => r.member);
  }

  /**
   * Get the MemberType for a user based on their roles.
   * Default implementation: system > admin > member > anonymous.
   */
  public async getMemberType(userId: TID): Promise<MemberType> {
    const roles = await this.getUserRoles(userId);
    if (roles.some((r) => r.system)) {
      return MemberType.System;
    } else if (roles.some((r) => r.admin)) {
      return MemberType.Admin;
    } else if (roles.some((r) => r.member)) {
      return MemberType.User;
    } else {
      return MemberType.Anonymous;
    }
  }
}
