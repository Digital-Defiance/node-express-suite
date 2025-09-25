import mongoose, { Document, Model } from 'mongoose';
import { Environment } from '../environment';
import { IConstants } from './constants';

export interface IApplication<TConstants extends IConstants = IConstants> {
  get environment(): Environment;
  get constants(): TConstants;
  get db(): typeof mongoose;
  get ready(): boolean;
  start(): Promise<void>;
  getModel<T extends Document>(modelName: string): Model<T>;
}
