import {
  IRequestUserDTO,
  IRoleDTO,
  ITokenRole,
} from '@digitaldefiance/suite-core-lib';
import { Types } from '@digitaldefiance/mongoose-types';
import { IUserDocument } from '../documents';
import { IRequestUserBackendObject } from '../interfaces/backend-objects/request-user';
import { convertStringToGenericId } from '../types/id-converters';
import { RoleService } from './role';

export class RequestUserService<
  I extends string | Types.ObjectId,
  TTokenRole extends ITokenRole<I>,
> {
  /**
   * Given a user document and an array of role documents, create the IRequestUser
   * @param userDoc
   * @returns
   */
  public static makeRequestUserDTO<
    I extends string | Types.ObjectId,
    S extends string,
    TTokenRole extends ITokenRole<I>,
    TRequestUserDTO extends IRequestUserDTO,
  >(
    userDoc:
      | IUserDocument<S, I>
      | (Pick<IUserDocument<S, I>, keyof IUserDocument<S, I>> & { _id: any }),
    roles: TTokenRole[],
  ): TRequestUserDTO {
    if (!userDoc._id) {
      throw new Error('User document is missing _id');
    }

    // Calculate combined role privileges across all roles
    const rolePrivileges = {
      admin: roles.some((r) => r.admin),
      member: roles.some((r) => r.member),
      child: roles.some((r) => r.child),
      system: roles.some((r) => r.system),
    };

    return {
      id: userDoc._id.toString(),
      email: userDoc.email,
      roles: roles.map((r) => RoleService.roleToRoleDTO(r)),
      rolePrivileges,
      username: userDoc.username,
      timezone: userDoc.timezone,
      currency: userDoc.currency,
      directChallenge: userDoc.directChallenge,
      emailVerified: userDoc.emailVerified,
      darkMode: userDoc.darkMode,
      siteLanguage: userDoc.siteLanguage as string,
      ...(userDoc.lastLogin && { lastLogin: userDoc.lastLogin.toString() }),
    } as TRequestUserDTO;
  }

  /**
   * Given a request user, reconstitute dates, objectids, and enums
   * @param requestUser a RequestUser DTO
   * @returns An IRequestUserBackendObject
   */
  public static hydrateRequestUser<
    I extends string | Types.ObjectId,
    S extends string,
    TRequestUserDTO extends IRequestUserDTO & { siteLanguage: S },
  >(
    requestUser: TRequestUserDTO,
    idConverter?: (id: string) => I,
  ): IRequestUserBackendObject<S, I> {
    const convert =
      idConverter ?? ((id: string) => convertStringToGenericId<I>(id));
    const hydratedRoles = requestUser.roles.map((role: IRoleDTO) =>
      RoleService.hydrateRoleDTOToBackend<I>(role, convert),
    );

    const hydratedUser: IRequestUserBackendObject<S, I> = {
      id: convert(requestUser.id),
      email: requestUser.email,
      roles: hydratedRoles,
      rolePrivileges: requestUser.rolePrivileges,
      username: requestUser.username,
      timezone: requestUser.timezone,
      currency: requestUser.currency,
      directChallenge: requestUser.directChallenge,
      emailVerified: requestUser.emailVerified,
      darkMode: requestUser.darkMode,
      siteLanguage: requestUser.siteLanguage,
    };

    if (requestUser.lastLogin) {
      hydratedUser.lastLogin = new Date(requestUser.lastLogin);
    }

    return hydratedUser;
  }
}
