import { Member, PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IRoleDocument } from '../documents/role';
import { IUserDocument } from '../documents/user';
import { IUserRoleDocument } from '../documents/user-role';

// Re-export essential document types
export type { IRoleDocument, IUserDocument, IUserRoleDocument };

export interface IServerInitResult<I extends PlatformID = Buffer> {
  adminRole: IRoleDocument<I>;
  adminUser: IUserDocument<string, I>;
  adminUsername: string;
  adminEmail: string;
  adminMnemonic: string;
  adminPassword: string;
  adminBackupCodes: Array<string>;
  adminMember: Member<I>;
  adminUserRole: IUserRoleDocument<I>;
  memberRole: IRoleDocument<I>;
  memberUser: IUserDocument<string, I>;
  memberUsername: string;
  memberEmail: string;
  memberMnemonic: string;
  memberPassword: string;
  memberBackupCodes: Array<string>;
  memberMember: Member<I>;
  memberUserRole: IUserRoleDocument<I>;
  systemRole: IRoleDocument<I>;
  systemUser: IUserDocument<string, I>;
  systemUsername: string;
  systemEmail: string;
  systemMnemonic: string;
  systemPassword: string;
  systemBackupCodes: Array<string>;
  systemMember: Member<I>;
  systemUserRole: IUserRoleDocument<I>;
}
