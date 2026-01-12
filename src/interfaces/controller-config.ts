import {
  ITokenRole,
  ITokenUser,
  IUserBase,
} from '@digitaldefiance/suite-core-lib';
import { IBaseDocument } from '../documents';
import { Environment } from '../environment';
import { IApplication } from './application';
import { IConstants } from './constants';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

export interface IControllerConfig<
  I extends PlatformID = Buffer,
  D extends Date = Date,
  S extends string = string,
  A extends string = string,
> {
  idType: I;
  dateType: D;
  stringType: S;
  accountStatusType: A;
  userType: IUserBase<I, D, S, A>;
  tokenRoleType: ITokenRole<I, D>;
  tokenUserType: ITokenUser;
  baseDocumentType: IBaseDocument<any, I>;
  environmentType: Environment;
  constantsType: IConstants;
  applicationType: IApplication;
}

export type DefaultControllerConfig = IControllerConfig<
  Buffer,
  Date,
  string,
  string
>;
