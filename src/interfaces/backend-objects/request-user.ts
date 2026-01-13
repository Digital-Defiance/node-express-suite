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
 * @template S - String type for language
 * @template I - Platform ID type (defaults to Buffer)
 */
export type IRequestUserBackendObject<
  S extends string,
  I extends PlatformID = Buffer,
> = IRequestUser<I, Array<IRoleBackendObject<any>>, S, Date>;
