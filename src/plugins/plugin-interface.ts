import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IApplication } from '../interfaces/application';

export interface IApplicationPlugin<TID extends PlatformID = Buffer> {
  readonly name: string;
  readonly version?: string;
  init(app: IApplication<TID>): Promise<void>;
  stop?(): Promise<void>;
}
