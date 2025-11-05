import { Types } from 'mongoose';
import { IConstants } from '../interfaces';
import { Environment } from '../environment';

export interface ControllerConfig {
  idType: Types.ObjectId | string;
  dateType: Date;
  constants: IConstants;
  environment: Environment;
}

export interface DefaultControllerConfig extends ControllerConfig {
  idType: Types.ObjectId;
  dateType: Date;
}
