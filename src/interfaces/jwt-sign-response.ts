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
 * @template I - Platform ID type (defaults to Buffer)
 * @template D - Date type (defaults to Date)
 * @template TTokenRole - Token role type (defaults to ITokenRole<I, D>)
 */
export interface IJwtSignResponse<
  I extends PlatformID = Buffer,
  D extends Date = Date,
  TTokenRole extends ITokenRole<I, D> = ITokenRole<I, D>,
> {
  token: string;
  tokenUser: ITokenUser;
  roleNames: string[];
  roleTranslatedNames: string[];
  roles: TTokenRole[];
  roleDTOs: ITokenRoleDTO[];
}
