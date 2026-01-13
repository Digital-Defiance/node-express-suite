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
import { IUserDocument } from '../documents';
import { IRequestUserBackendObject } from '../interfaces/backend-objects/request-user';
import { RoleService } from './role';
import {
  getEnhancedNodeIdProvider,
  PlatformID,
} from '@digitaldefiance/node-ecies-lib';

/**
 * Service for converting between user documents, DTOs, and backend objects.
 * Provides transformation methods for user data in different contexts (API, JWT, database).
 * @template I Platform-specific ID type (Buffer, ObjectId, etc.)
 * @template _TTokenRole Token role type implementing ITokenRole
 */
export class RequestUserService<
  I extends PlatformID,
  _TTokenRole extends ITokenRole<I>,
> {
  /**
   * Converts a user document and roles into a request user DTO for API responses.
   * Calculates combined role privileges and serializes IDs to strings.
   * @template I Platform-specific ID type
   * @template S Site language string literal type
   * @template TTokenRole Token role type
   * @template TRequestUserDTO Request user DTO type
   * @param userDoc User document from database
   * @param roles Array of token roles for the user
   * @returns Request user DTO suitable for API responses
   * @throws {Error} If user document is missing _id
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
   * Hydrates a request user DTO back into a backend object with typed IDs and dates.
   * Converts string IDs to platform-specific types and reconstitutes Date objects.
   * @template I Platform-specific ID type
   * @template S Site language string literal type
   * @template TRequestUserDTO Request user DTO type with site language
   * @param requestUser Request user DTO from API or JWT
   * @returns Backend object with typed IDs and dates
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
