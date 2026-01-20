/**
 * @fileoverview Server initialization result interface.
 * Defines structure for test server initialization with admin, member, and system users.
 * @module interfaces/server-init-result
 */

import { Member, PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IRoleDocument } from '../documents/role';
import { IUserDocument } from '../documents/user';
import { IUserRoleDocument } from '../documents/user-role';

// Re-export essential document types
export type { IRoleDocument, IUserDocument, IUserRoleDocument };

/**
 * Result of server initialization for testing.
 * Contains admin, member, and system user accounts with credentials and roles.
 * @template TID - Platform ID type (defaults to Buffer)
 */
export interface IServerInitResult<TID extends PlatformID = Buffer> {
  adminRole: IRoleDocument<TID>;
  adminUser: IUserDocument<string, TID>;
  adminUsername: string;
  adminEmail: string;
  adminMnemonic: string;
  adminPassword: string;
  adminBackupCodes: Array<string>;
  adminMember: Member<TID>;
  adminUserRole: IUserRoleDocument<TID>;
  memberRole: IRoleDocument<TID>;
  memberUser: IUserDocument<string, TID>;
  memberUsername: string;
  memberEmail: string;
  memberMnemonic: string;
  memberPassword: string;
  memberBackupCodes: Array<string>;
  memberMember: Member<TID>;
  memberUserRole: IUserRoleDocument<TID>;
  systemRole: IRoleDocument<TID>;
  systemUser: IUserDocument<string, TID>;
  systemUsername: string;
  systemEmail: string;
  systemMnemonic: string;
  systemPassword: string;
  systemBackupCodes: Array<string>;
  systemMember: Member<TID>;
  systemUserRole: IUserRoleDocument<TID>;
}
