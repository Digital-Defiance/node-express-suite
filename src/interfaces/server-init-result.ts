/**
 * @fileoverview Base server initialization result interface.
 * Database-agnostic contract for the result of initializing a server
 * with admin, member, and system user accounts.
 * Backend-specific packages extend this with their document types.
 * @module interfaces/server-init-result
 */

import type { Member, PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Base result of server initialization.
 * Contains credentials and member objects for admin, member, and system accounts.
 * Backend-specific packages (mongo, brightdb) extend this with their
 * own document/record types for roles, users, and user-roles.
 *
 * @template TID - Platform ID type (defaults to Buffer)
 */
export interface IServerInitResult<TID extends PlatformID = Buffer> {
  adminUsername: string;
  adminEmail: string;
  adminMnemonic: string;
  adminPassword: string;
  adminBackupCodes: Array<string>;
  adminMember: Member<TID>;

  memberUsername: string;
  memberEmail: string;
  memberMnemonic: string;
  memberPassword: string;
  memberBackupCodes: Array<string>;
  memberMember: Member<TID>;

  systemUsername: string;
  systemEmail: string;
  systemMnemonic: string;
  systemPassword: string;
  systemBackupCodes: Array<string>;
  systemMember: Member<TID>;
}
