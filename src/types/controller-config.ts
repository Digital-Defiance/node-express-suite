import { Environment } from '../environment';
import { IConstants } from '../interfaces';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

export interface ControllerConfig<I extends PlatformID = Buffer> {
  idType: I;
  dateType: Date;
  constants: IConstants;
  environment: Environment;
}

export interface DefaultControllerConfig extends ControllerConfig {
  idType: Buffer;
  dateType: Date;
}
