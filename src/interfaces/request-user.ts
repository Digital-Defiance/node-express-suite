/**
 * @fileoverview Request user interface for Express request object.
 * Defines user data structure attached to authenticated requests.
 * @module interfaces/request-user
 */

import {
  ICombinedRolePrivileges,
  IRoleDTO,
  IRoleFrontendObject,
} from '@digitaldefiance/suite-core-lib';
import { IRoleBackendObject } from './backend-objects/role';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Interface for the user object stored in the request object.
 * Used for request handling, not for Mongoose documents.
 * @template I - Platform ID type (defaults to Buffer)
 * @template R - Role array type (defaults to IRoleDTO[])
 * @template S - String type for language (defaults to string)
 * @template D - Date type (defaults to string)
 */
export interface IRequestUser<
  I extends PlatformID = Buffer,
  R extends
    | Array<IRoleDTO>
    | Array<IRoleFrontendObject>
    | Array<IRoleBackendObject> = Array<IRoleDTO>,
  S extends string = string,
  D extends Date | string = string,
> {
  /**
   * The ID of the user
   */
  id: I;
  /**
   * The roles associated with the user
   */
  roles: R;
  /**
   * Combined role privileges across all user roles
   */
  rolePrivileges: ICombinedRolePrivileges;
  /**
   * The username of the user
   */
  username: string;
  /**
   * The email address of the user
   */
  email: string;
  /**
   * The timezone of the user
   */
  timezone: string;
  /**
   * The currency preference of the user
   */
  currency: string;
  /**
   * Whether the user has direct challenge login enabled
   */
  directChallenge: boolean;
  /**
   * The language of the user
   */
  siteLanguage: S;
  /**
   * The date the user last logged in
   */
  lastLogin?: D;
  /**
   * Whether the user has verified their email address
   */
  emailVerified: boolean;
  /**
   * Whether the user prefers dark mode
   */
  darkMode: boolean;
}
