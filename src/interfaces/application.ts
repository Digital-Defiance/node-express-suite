import mongoose, { Model } from 'mongoose';
import { IBaseDocument } from '../documents';
import { Environment } from '../environment';
import { IConstants } from './constants';
import { ServiceContainer } from '../container';

export interface IApplication {
  get environment(): Environment;
  get constants(): IConstants;
  get db(): typeof mongoose;
  get ready(): boolean;
  get services(): ServiceContainer;
  get plugins(): import('../plugins').PluginManager;
  start(): Promise<void>;
  getModel<U extends IBaseDocument<any, any>>(modelName: string): Model<U>;
}
