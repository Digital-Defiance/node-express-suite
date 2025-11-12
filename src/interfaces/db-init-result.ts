import { IFailableResult } from './failable-result';

export interface IDBInitResult<T> extends IFailableResult<T> {
  alreadyInitialized: boolean;
}