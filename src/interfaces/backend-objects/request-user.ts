/**
 * @fileoverview Backend request user object type.
 * Defines request user type for backend operations.
 * @module interfaces/backend-objects/request-user
 */

import { IRequestUser } from '../request-user';
import { IRoleBackendObject } from './role';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Backend request user object type.
 * @template TLanguage - String type for language
 * @template TID - Platform ID type (defaults to Buffer)
 */
export type IRequestUserBackendObject<
  TLanguage extends string,
  TID extends PlatformID = Buffer,
> = IRequestUser<TID, Array<IRoleBackendObject<any>>, TLanguage, Date>;
