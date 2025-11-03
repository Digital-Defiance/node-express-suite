import { IRequestUserDTO, IRoleDTO, ITokenRole } from '@digitaldefiance/suite-core-lib';
import { Types } from 'mongoose';
import { IUserDocument } from '../documents';
import { IRequestUserBackendObject } from '../interfaces/backend-objects/request-user';
import { RoleService } from './role';

export class RequestUserService<I, TTokenRole extends ITokenRole<I>> {
  /**
   * Given a user document and an array of role documents, create the IRequestUser
   * @param userDoc
   * @returns
   */
  public static makeRequestUserDTO<
    I,
    TTokenRole extends ITokenRole<I>,
    TRequestUserDTO extends IRequestUserDTO,
  >(userDoc: IUserDocument, roles: TTokenRole[]): TRequestUserDTO {
    if (!userDoc._id) {
      throw new Error('User document is missing _id');
    }
    return {
      id: userDoc._id.toString(),
      email: userDoc.email,
      roles: roles.map((r) => RoleService.roleToRoleDTO(r)),
      username: userDoc.username,
      timezone: userDoc.timezone,
      ...(userDoc.lastLogin && { lastLogin: userDoc.lastLogin.toString() }),
      emailVerified: userDoc.emailVerified,
      siteLanguage: userDoc.siteLanguage as string,
    } as TRequestUserDTO;
  }

  /**
   * Given a request user, reconstitute dates, objectids, and enums
   * @param requestUser a RequestUser DTO
   * @returns An IRequestUserBackendObject
   */
  public static hydrateRequestUser<
    S extends string,
    TRequestUserDTO extends IRequestUserDTO & { siteLanguage: S },
  >(requestUser: TRequestUserDTO): IRequestUserBackendObject<S> {
    const hydratedRoles = requestUser.roles.map((role: IRoleDTO) =>
      RoleService.hydrateRoleDTOToBackend(role),
    );

    const hydratedUser: IRequestUserBackendObject<S> = {
      id: new Types.ObjectId(requestUser.id),
      email: requestUser.email,
      roles: hydratedRoles,
      username: requestUser.username,
      timezone: requestUser.timezone,
      emailVerified: requestUser.emailVerified,
      siteLanguage: requestUser.siteLanguage,
    };

    if (requestUser.lastLogin) {
      hydratedUser.lastLogin = new Date(requestUser.lastLogin);
    }

    return hydratedUser;
  }
}
