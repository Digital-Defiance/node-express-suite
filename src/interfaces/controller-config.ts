/**
 * @fileoverview Controller configuration interface.
 * Defines type configuration for controllers with platform-specific types.
 * @module interfaces/controller-config
 */

import {
  ITokenRole,
  ITokenUser,
  IUserBase,
} from '@digitaldefiance/suite-core-lib';
import { BaseDocument } from '../documents';
import { Environment } from '../environment';
import { IApplication } from './application';
import { IConstants } from './constants';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Configuration interface for controller type parameters.
 * Defines all type parameters used across controllers.
 * @template TID - Platform ID type (defaults to Buffer)
 * @template TDate - Date type (defaults to Date)
 * @template TLanguage - String type (defaults to string)
 * @template TAccountStatus - Account status type (defaults to string)
 */
export interface IControllerConfig<
  TID extends PlatformID = Buffer,
  TDate extends Date = Date,
  TLanguage extends string = string,
  TAccountStatus extends string = string,
> {
  idType: TID;
  dateType: TDate;
  stringType: TLanguage;
  accountStatusType: TAccountStatus;
  userType: IUserBase<TID, TDate, TLanguage, TAccountStatus>;
  tokenRoleType: ITokenRole<TID, TDate>;
  tokenUserType: ITokenUser;
  baseDocumentType: BaseDocument<any, TID>;
  environmentType: Environment<TID>;
  constantsType: IConstants;
  applicationType: IApplication<TID>;
}

/**
 * Default controller configuration with standard types.
 * Uses Buffer for IDs, Date for dates, and string for language/status.
 */
export type DefaultControllerConfig = IControllerConfig<
  Buffer,
  Date,
  string,
  string
>;
