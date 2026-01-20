/**
 * @fileoverview JWT sign response interface.
 * Defines structure for JWT token generation response with user and role data.
 * @module interfaces/jwt-sign-response
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ITokenRole,
  ITokenRoleDTO,
  ITokenUser,
} from '@digitaldefiance/suite-core-lib';

/**
 * Response from JWT token signing operation.
 * @template TID - Platform ID type (defaults to Buffer)
 * @template D - Date type (defaults to Date)
 * @template TTokenRole - Token role type (defaults to ITokenRole<I, D>)
 */
export interface IJwtSignResponse<
  TID extends PlatformID = Buffer,
  D extends Date = Date,
  TTokenRole extends ITokenRole<TID, D> = ITokenRole<TID, D>,
> {
  token: string;
  tokenUser: ITokenUser;
  roleNames: string[];
  roleTranslatedNames: string[];
  roles: TTokenRole[];
  roleDTOs: ITokenRoleDTO[];
}
