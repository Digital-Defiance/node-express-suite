/**
 * @fileoverview Controller configuration type.
 * Defines type configuration for controllers.
 * @module types/controller-config
 */

import { Environment } from '../environment';
import { IConstants } from '../interfaces';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Controller configuration interface.
 * @template I - Platform ID type (defaults to Buffer)
 */
export interface ControllerConfig<I extends PlatformID = Buffer> {
  idType: I;
  dateType: Date;
  constants: IConstants;
  environment: Environment;
}

/**
 * Default controller configuration with standard types.
 */
export interface DefaultControllerConfig extends ControllerConfig {
  idType: Buffer;
  dateType: Date;
}
