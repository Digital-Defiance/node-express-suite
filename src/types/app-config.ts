/**
 * @fileoverview Application configuration type.
 * Defines structure for application-wide configuration.
 * @module types/app-config
 */

import { Environment } from '../environment';
import { IConstants } from '../interfaces';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Application configuration interface.
 * @template TModelDocs - Model documents type
 * @template TInitResults - Initialization results type
 * @template TID - Platform ID type (defaults to Buffer)
 */
export interface AppConfig<
  TModelDocs = unknown,
  TInitResults = unknown,
  TID extends PlatformID = Buffer,
  TDate extends Date | number = Date,
> {
  environment: Environment;
  constants: IConstants;
  models: TModelDocs;
  initResults: TInitResults;
  idType: TID;
  dateType: TDate;
}

/**
 * Default application configuration with standard types.
 */
export interface DefaultAppConfig extends AppConfig<unknown, unknown> {
  idType: Buffer;
  dateType: Date;
}
