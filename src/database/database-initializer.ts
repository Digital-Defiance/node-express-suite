import { IApplication } from '../interfaces/application';
import { IFailableResult } from '../interfaces/failable-result';

export interface IDatabaseInitializer<T = unknown> {
  initialize(app: IApplication): Promise<IFailableResult<T>>;
  hash(results: T): string;
}
