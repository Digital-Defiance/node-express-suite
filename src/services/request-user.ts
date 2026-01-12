import {
  IRequestUserDTO,
  IRoleDTO,
  ITokenRole,
} from '@digitaldefiance/suite-core-lib';
import { IUserDocument } from '../documents';
import { IRequestUserBackendObject } from '../interfaces/backend-objects/request-user';
import { RoleService } from './role';
import {
  getEnhancedNodeIdProvider,
  PlatformID,
} from '@digitaldefiance/node-ecies-lib';

export class RequestUserService<
  I extends PlatformID,
  _TTokenRole extends ITokenRole<I>,
> {
  /**
   * Given a user document and an array of role documents, create the IRequestUser
   * @param userDoc
   * @returns
   */
  public static makeRequestUserDTO<
    I extends PlatformID,
    S extends string,
    TTokenRole extends ITokenRole<I>,
    TRequestUserDTO extends IRequestUserDTO,
  >(
    userDoc:
      | IUserDocument<S, I>
      | (Pick<IUserDocument<S, I>, keyof IUserDocument<S, I>> & {
          _id: PlatformID;
        }),
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

    const provider = getEnhancedNodeIdProvider<I>();
    return {
      id: provider.idToString(userDoc._id),
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
    I extends PlatformID,
    S extends string,
    TRequestUserDTO extends IRequestUserDTO & { siteLanguage: S },
  >(requestUser: TRequestUserDTO): IRequestUserBackendObject<S, I> {
    const provider = getEnhancedNodeIdProvider<I>();
    const convert = (id: string) => provider.idFromString(id);
    const hydratedRoles = requestUser.roles.map((role: IRoleDTO) =>
      RoleService.hydrateRoleDTOToBackend<I>(role),
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
