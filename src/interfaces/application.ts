import mongoose, { Model } from '@digitaldefiance/mongoose-types';
import { ServiceContainer } from '../container';
import { IBaseDocument } from '../documents';
import { Environment } from '../environment';
import { IConstants } from './constants';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

export interface IApplication<TID extends PlatformID = Buffer> {
  get environment(): Environment<TID>;
  get constants(): IConstants;
  get db(): typeof mongoose;
  get ready(): boolean;
  get services(): ServiceContainer;
  get plugins(): import('../plugins').PluginManager<TID>;
  start(): Promise<void>;
  getModel<U extends IBaseDocument<any, TID>>(modelName: string): Model<U>;
}
