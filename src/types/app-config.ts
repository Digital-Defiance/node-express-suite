import { Types } from 'mongoose';
import { IConstants } from '../interfaces';
import { Environment } from '../environment';

export interface AppConfig<TModelDocs = any, TInitResults = any> {
  environment: Environment;
  constants: IConstants;
  models: TModelDocs;
  initResults: TInitResults;
  idType: Types.ObjectId | string;
  dateType: Date;
}

export interface DefaultAppConfig extends AppConfig<any, any> {
  idType: Types.ObjectId;
  dateType: Date;
}
