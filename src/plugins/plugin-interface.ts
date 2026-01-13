/**
 * @fileoverview Application plugin interface.
 * Defines contract for application plugins.
 * @module plugins/plugin-interface
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IApplication } from '../interfaces/application';

/**
 * Interface for application plugins.
 * @template TID - Platform ID type (defaults to Buffer)
 */
export interface IApplicationPlugin<TID extends PlatformID = Buffer> {
  readonly name: string;
  readonly version?: string;
  init(app: IApplication<TID>): Promise<void>;
  stop?(): Promise<void>;
}
