import mongoose, { Types, Model } from 'mongoose';
import { Environment } from '../environment';
import { IConstants } from './constants';
import { IBaseDocument } from '../documents';

export interface IApplication<T, I extends Types.ObjectId | string, TBaseDocument extends IBaseDocument<T, I> = IBaseDocument<T, I>, TEnvironment extends Environment = Environment, TConstants extends IConstants = IConstants> {
  get environment(): TEnvironment;
  get constants(): TConstants;
  get db(): typeof mongoose;
  get ready(): boolean;
  start(): Promise<void>;
  getModel<U extends TBaseDocument>(modelName: string): Model<U>;
}
