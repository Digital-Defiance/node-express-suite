import { Environment } from '../environment';
import { IConstants } from '../interfaces';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

export interface AppConfig<
  TModelDocs = unknown,
  TInitResults = unknown,
  I extends PlatformID = Buffer,
> {
  environment: Environment;
  constants: IConstants;
  models: TModelDocs;
  initResults: TInitResults;
  idType: I;
  dateType: Date;
}

export interface DefaultAppConfig extends AppConfig<unknown, unknown> {
  idType: Buffer;
  dateType: Date;
}
