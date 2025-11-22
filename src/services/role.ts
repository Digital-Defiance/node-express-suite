import { MemberType } from '@digitaldefiance/ecies-lib';
import {
  GlobalActiveContext,
  IActiveContext,
  I18nEngine,
} from '@digitaldefiance/i18n-lib';
import {
  IRoleBase,
  IRoleDTO,
  ITokenRole,
  ITokenRoleDTO,
  IUserRoleBase,
  LastAdminError,
  Role,
} from '@digitaldefiance/suite-core-lib';
import { ClientSession, Document, Types } from 'mongoose';
import { IBaseDocument, IUserDocument } from '../documents';
import { IRoleDocument } from '../documents/role';
import { IUserRoleDocument } from '../documents/user-role';
import { BaseModelName } from '../enumerations/base-model-name';
import { Environment } from '../environment';
import { IConstants } from '../interfaces';
import { IApplication } from '../interfaces/application';
import { IRoleBackendObject } from '../interfaces/backend-objects/role';
import { ModelRegistry } from '../model-registry';
import { omit } from '../utils';
import { BaseService } from './base';

/**
 * Service for managing roles
 */
export class RoleService<
  I extends string | Types.ObjectId = Types.ObjectId,
  D extends Date = Date,
  TTokenRole extends ITokenRole<I, D> = ITokenRole<I, D>,
> extends BaseService {
  /**
   * Constructor for the role service
   * @param application The application object
   */
  constructor(application: IApplication) {
    super(application);
  }

  public static roleToRoleDTO<I extends string | Types.ObjectId = Types.ObjectId, D extends Date = Date>(
    role: ITokenRole<I, D> | IRoleDocument<I> | Partial<IRoleBase<I>>,
  ): ITokenRoleDTO {
    const roleObj = role instanceof Document ? role.toObject() : role;
    return {
      _id: (role._id instanceof Types.ObjectId
        ? role._id.toString()
        : role._id) as string,
      name: roleObj.name as string,
      admin: roleObj.admin ?? false,
      member: roleObj.member ?? false,
      child: roleObj.child ?? false,
      system: roleObj.system ?? false,
      translatedName:
        'translatedName' in role ? role.translatedName : role.name,
      createdAt: (roleObj.createdAt instanceof Date
        ? roleObj.createdAt.toISOString()
        : roleObj.createdAt) as string,
      createdBy: (role.createdBy instanceof Types.ObjectId
        ? role.createdBy.toString()
        : role.createdBy) as string,
      updatedAt: (roleObj.updatedAt instanceof Date
        ? roleObj.updatedAt.toISOString()
        : roleObj.updatedAt) as string,
      updatedBy: (role.updatedBy instanceof Types.ObjectId
        ? role.updatedBy.toString()
        : role.updatedBy) as string,
      ...(roleObj.deletedAt
        ? {
            deletedAt: (roleObj.deletedAt instanceof Date
              ? roleObj.deletedAt.toISOString()
              : roleObj.deletedAt) as string,
          }
        : {}),
      ...(role.deletedBy
        ? {
            deletedBy: (role.deletedBy instanceof Types.ObjectId
              ? role.deletedBy.toString()
              : role.deletedBy) as string,
          }
        : {}),
    } as ITokenRoleDTO;
  }

  /**
   * Given a Role DTO, reconstitute ids and dates
   * @param role The Role DTO
   * @returns An IRoleBackendObject
   */
  public static hydrateRoleDTOToBackend<I extends string | Types.ObjectId = Types.ObjectId>(
    role: ITokenRoleDTO,
    idConverter?: (id: string) => I,
  ): IRoleBackendObject<I> {
    const convert =
      idConverter ?? ((id: string) => new Types.ObjectId(id) as unknown as I);
    return {
      ...(omit<ITokenRoleDTO, 'translatedName'>(role, [
        'translatedName',
      ]) as IRoleDTO),
      _id: convert(role._id),
      name: role.name as Role,
      createdAt: new Date(role.createdAt),
      createdBy: convert(role.createdBy),
      updatedAt: new Date(role.updatedAt),
      updatedBy: convert(role.updatedBy),
      ...(role.deletedAt ? { deletedAt: new Date(role.deletedAt) } : {}),
      ...(role.deletedBy
        ? {
            deletedBy: convert(role.deletedBy),
          }
        : {}),
    } as IRoleBackendObject<I>;
  }

  /**
   * Gets the role ID by name
   * @param roleName The name of the role
   * @returns The role ID or null if not found
   */
  public async getRoleIdByName(
    roleName: Role,
    session?: ClientSession,
  ): Promise<I | null> {
    const RoleModel = ModelRegistry.instance.get<
      any,
      any
    >(BaseModelName.Role).model;
    const role = await RoleModel.findOne({ name: roleName }, undefined, {
      session,
    }).select('_id');
    if (!role) {
      return null;
    }
    return role._id as I;
  }

  /**
   * Creates a new role
   * @param roleData The role data
   * @param session Optional mongoose session
   * @returns The created role document
   */
  public async createRole(
    roleData: IRoleBase<I, D, Role>,
    session?: ClientSession | null,
  ): Promise<IRoleDocument<I>> {
    const RoleModel = ModelRegistry.instance.get<
      any,
      any
    >(BaseModelName.Role).model;
    const role = new RoleModel(roleData);
    const savedRole = await role.save(session ? { session } : {});
    return savedRole as unknown as IRoleDocument<I>;
  }

  /**
   * Adds a user to a role
   * @param roleId - The role id
   * @param userId - The user id
   * @param createdBy - The user creating the relationship
   * @param session Optional mongoose session
   */
  public async addUserToRole(
    roleId: I,
    userId: I,
    createdBy: I,
    session?: ClientSession,
    overrideId?: I,
  ): Promise<IUserRoleDocument<I>> {
    const UserRoleModel = ModelRegistry.instance.get<
      any,
      any
    >(BaseModelName.UserRole).model;

    // Check if the user-role relationship already exists (and is not deleted)
    const existingUserRole = await UserRoleModel.findOne({
      userId,
      roleId,
      deletedAt: { $exists: false },
    }).session(session ?? null);

    if (existingUserRole) {
      // Relationship already exists, no need to create it again
      return existingUserRole;
    }

    const userRole = new UserRoleModel({
      ...(overrideId ? { _id: overrideId } : {}),
      userId,
      roleId,
      createdBy,
      updatedBy: createdBy,
    });
    const result = await userRole.save({ session });
    return result;
  }

  /**
   * Removes a user from a role
   * @param roleId - The role id
   * @param userId - The user id
   * @param deletedBy - The user removing the relationship
   * @param session Optional mongoose session
   * @throws LastAdminError if attempting to remove the last admin
   */
  public async removeUserFromRole(
    roleId: I,
    userId: I,
    deletedBy: I,
    session?: ClientSession,
  ): Promise<void> {
    const RoleModel = ModelRegistry.instance.get<
      any,
      any
    >(BaseModelName.Role).model;
    const UserRoleModel = ModelRegistry.instance.get<
      any,
      any
    >(BaseModelName.UserRole).model;

    const role = await RoleModel.findById(roleId).session(session ?? null);
    if (role?.admin) {
      const adminCount = await UserRoleModel.countDocuments({
        roleId,
        deletedAt: { $exists: false },
      }).session(session ?? null);
      if (adminCount <= 1) {
        throw new LastAdminError();
      }
    }

    await UserRoleModel.findOneAndUpdate(
      { userId, roleId, deletedAt: { $exists: false } },
      { deletedAt: new Date(), deletedBy },
      { session },
    );
  }

  /**
   * Deletes a role by ID
   * @param roleId The role ID
   * @param deleter The ID of the user deleting the role
   * @param hardDelete Whether to hard delete the role
   * @param session Optional mongoose session
   */
  public async deleteRole(
    roleId: I,
    deleter: I,
    hardDelete: boolean,
    session?: ClientSession,
  ): Promise<void> {
    const RoleModel = ModelRegistry.instance.get<
      any,
      any
    >(BaseModelName.Role).model;
    if (hardDelete) {
      await RoleModel.findByIdAndDelete(roleId).session(session ?? null);
    } else {
      await RoleModel.findByIdAndUpdate(roleId, {
        deletedAt: new Date(),
        deletedBy: deleter,
      }).session(session ?? null);
    }
  }

  /**
   * Gets all roles for a user
   * @param userId The user ID
   * @param session Optional mongoose session
   * @returns The roles the user is a member of
   */
  public async getUserRoles(
    userId: I,
    session?: ClientSession,
  ): Promise<IRoleDocument<I>[]> {
    const UserRoleModel = ModelRegistry.instance.get<
      any,
      any
    >(BaseModelName.UserRole).model;
    const RoleModel = ModelRegistry.instance.get<
      any,
      any
    >(BaseModelName.Role).model;
    if (!UserRoleModel || !RoleModel) throw new Error('Model not registered');

    // Return full documents
    const userRoles = await UserRoleModel.find({
      userId,
      deletedAt: { $exists: false },
    })
      .select('roleId')
      .session(session ?? null);

    const roleIds = userRoles.map((ur) => ur.roleId);
    return (await RoleModel.find({
      _id: { $in: roleIds },
      deletedAt: { $exists: false },
    }).session(session ?? null)) as unknown as IRoleDocument<I>[];
  }

  /**
   * Gets all users for a role
   * @param roleId The role ID
   * @param session Optional mongoose session
   * @returns The user IDs that are members of the role
   */
  public async getRoleUsers(
    roleId: I,
    session?: ClientSession,
  ): Promise<I[]> {
    const UserRoleModel = ModelRegistry.instance.get<
      any,
      any
    >(BaseModelName.UserRole).model;

    // Return full documents
    const userRoles = await UserRoleModel.find({
      roleId,
      deletedAt: { $exists: false },
    })
      .select('userId')
      .session(session ?? null);

    return userRoles.map((ur) => ur.userId);
  }

  /** Convert roles to translated TokenRoles */
  public rolesToTokenRoles(
    roles: Array<IRoleBackendObject<I>>,
    overrideLanguage?: string,
  ): Array<TTokenRole> {
    return roles.map((role) => {
      const engine = I18nEngine.getInstance('default');
      const userLang = GlobalActiveContext.getInstance<
        string,
        IActiveContext<string>
      >().userLanguage;
      const lang = (overrideLanguage || userLang || 'en-US') as string;
      const roleTranslation = engine.translateEnum(Role, role.name, lang);
      // Convert Mongoose document to plain object if needed
      const roleObj = role instanceof Document ? role.toObject() : role;
      return {
        ...roleObj,
        translatedName: roleTranslation,
      } as TTokenRole;
    });
  }

  public async isUserAdmin(
    userDoc: IUserDocument<string, I>,
    session?: ClientSession,
    providedRoles?: Array<IRoleDocument<I>>,
  ): Promise<boolean> {
    const roles =
      providedRoles ?? (await this.getUserRoles(userDoc._id, session));
    if (roles.filter((r) => r.admin).length > 0) {
      return true;
    }
    return false;
  }

  public async isUserMember(
    userDoc: IUserDocument<string, I>,
    session?: ClientSession,
    providedRoles?: Array<IRoleDocument<I>>,
  ): Promise<boolean> {
    const roles =
      providedRoles ?? (await this.getUserRoles(userDoc._id, session));
    if (roles.filter((r) => r.member).length > 0) {
      return true;
    }
    return false;
  }

  public async isUserChild(
    userDoc: IUserDocument<string, I>,
    session?: ClientSession,
    providedRoles?: Array<IRoleDocument<I>>,
  ): Promise<boolean> {
    const roles =
      providedRoles ?? (await this.getUserRoles(userDoc._id, session));
    if (roles.filter((r) => r.child).length > 0) {
      return true;
    }
    return false;
  }

  public async isSystemUser(
    userDoc: IUserDocument<string, I>,
    session?: ClientSession,
    providedRoles?: Array<IRoleDocument<I>>,
  ): Promise<boolean> {
    const roles =
      providedRoles ?? (await this.getUserRoles(userDoc._id, session));
    return roles.some((r) => r.system);
  }

  public async getMemberType(
    userDoc: IUserDocument<string, I>,
    session?: ClientSession,
    providedRoles?: Array<IRoleDocument<I>>,
  ): Promise<MemberType> {
    const roles =
      providedRoles ?? (await this.getUserRoles(userDoc._id, session));
    if (await this.isSystemUser(userDoc, session, roles)) {
      return MemberType.System;
    } else if (await this.isUserAdmin(userDoc, session, roles)) {
      return MemberType.Admin;
    } else if (await this.isUserMember(userDoc, session, roles)) {
      return MemberType.User;
    } else {
      return MemberType.Anonymous;
    }
  }
}
