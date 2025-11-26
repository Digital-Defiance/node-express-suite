import { Types } from '@digitaldefiance/mongoose-types';
import { ITokenRole, ITokenUser, IUserBase } from '@digitaldefiance/suite-core-lib';
import { IBaseDocument } from '../documents';
import { Environment } from '../environment';
import { IConstants } from './constants';
import { IApplication } from './application';

export interface IControllerConfig<
  I extends Types.ObjectId | string = Types.ObjectId,
  D extends Date = Date,
  S extends string = string,
  A extends string = string
> {
  idType: I;
  dateType: D;
  stringType: S;
  accountStatusType: A;
  userType: IUserBase<I, D, S, A>;
  tokenRoleType: ITokenRole<I, D>;
  tokenUserType: ITokenUser;
  baseDocumentType: IBaseDocument<any, Types.ObjectId>;
  environmentType: Environment;
  constantsType: IConstants;
  applicationType: IApplication;
}

export type DefaultControllerConfig = IControllerConfig<Types.ObjectId, Date, string, string>;
