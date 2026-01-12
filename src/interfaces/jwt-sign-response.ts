import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ITokenRole,
  ITokenRoleDTO,
  ITokenUser,
} from '@digitaldefiance/suite-core-lib';

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
