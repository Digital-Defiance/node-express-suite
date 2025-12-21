import { Types } from '@digitaldefiance/mongoose-types';
import { Environment } from '../environment';
import { IConstants } from '../interfaces';

export interface AppConfig<TModelDocs = unknown, TInitResults = unknown> {
  environment: Environment;
  constants: IConstants;
  models: TModelDocs;
  initResults: TInitResults;
  idType: Types.ObjectId | string;
  dateType: Date;
}

export interface DefaultAppConfig extends AppConfig<unknown, unknown> {
  idType: Types.ObjectId;
  dateType: Date;
}
