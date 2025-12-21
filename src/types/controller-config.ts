import { Types } from '@digitaldefiance/mongoose-types';
import { Environment } from '../environment';
import { IConstants } from '../interfaces';

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
