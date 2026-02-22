/**
 * @fileoverview Service for transforming user documents into request user DTOs and backend objects.
 * Handles serialization and deserialization of user data for API requests and JWT tokens.
 * @module services/request-user
 */

import {
  IRequestUserDTO,
  IRoleDTO,
  ITokenRole,
} from '@digitaldefiance/suite-core-lib';
import { UserDocument } from '../documents';
import { IRequestUserBackendObject } from '../interfaces/backend-objects/request-user';
import { RoleService } from './role';
import {
  getEnhancedNodeIdProvider,
  PlatformID,
} from '@digitaldefiance/node-ecies-lib';

/**
 * Service for converting between user documents, DTOs, and backend objects.
 * Provides transformation methods for user data in different contexts (API, JWT, database).
 * @template TID Platform-specific ID type (Buffer, ObjectId, etc.)
 * @template _TTokenRole Token role type implementing ITokenRole
 */
export class RequestUserService<
  TID extends PlatformID,
  _TTokenRole extends ITokenRole<TID>,
> {
  /**
   * Converts a user document and roles into a request user DTO for API responses.
   * Calculates combined role privileges and serializes IDs to strings.
   * @template TID Platform-specific ID type
   * @template TLanguage Site language string literal type
   * @template TTokenRole Token role type
   * @template TRequestUserDTO Request user DTO type
   * @param userDoc User document from database
   * @param roles Array of token roles for the user
   * @returns Request user DTO suitable for API responses
   * @throws {Error} If user document is missing _id
   */
  public static makeRequestUserDTO<
    TID extends PlatformID,
    TLanguage extends string,
    TTokenRole extends ITokenRole<TID>,
    TRequestUserDTO extends IRequestUserDTO,
  >(
    userDoc:
      | UserDocument<TLanguage, TID>
      | (Pick<
          UserDocument<TLanguage, TID>,
          keyof UserDocument<TLanguage, TID>
        > & {
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

    const provider = getEnhancedNodeIdProvider<TID>();
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
   * Hydrates a request user DTO back into a backend object with typed IDs and dates.
   * Converts string IDs to platform-specific types and reconstitutes Date objects.
   * @template TID Platform-specific ID type
   * @template TLanguage Site language string literal type
   * @template TRequestUserDTO Request user DTO type with site language
   * @param requestUser Request user DTO from API or JWT
   * @returns Backend object with typed IDs and dates
   */
  public static hydrateRequestUser<
    TID extends PlatformID,
    TLanguage extends string,
    TRequestUserDTO extends IRequestUserDTO & { siteLanguage: TLanguage },
  >(requestUser: TRequestUserDTO): IRequestUserBackendObject<TLanguage, TID> {
    const provider = getEnhancedNodeIdProvider<TID>();
    const convert = (id: string) => provider.idFromString(id);
    const hydratedRoles = requestUser.roles.map((role: IRoleDTO) =>
      RoleService.hydrateRoleDTOToBackend<TID>(role),
    );

    const hydratedUser: IRequestUserBackendObject<TLanguage, TID> = {
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
