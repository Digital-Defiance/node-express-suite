import {
  ITokenRole,
  ITokenRoleDTO,
  ITokenUser,
} from '@digitaldefiance/suite-core-lib';
import { Types } from '@digitaldefiance/mongoose-types';

export interface IJwtSignResponse<
  I = Types.ObjectId,
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
