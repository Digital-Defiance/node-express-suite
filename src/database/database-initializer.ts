/**
 * @fileoverview Database initializer interface.
 * Defines contract for database initialization implementations.
 * @module database/database-initializer
 */

import { IApplication } from '../interfaces/application';
import { IFailableResult } from '@digitaldefiance/suite-core-lib';

export interface IDatabaseInitializer<T = unknown> {
  initialize(app: IApplication): Promise<IFailableResult<T>>;
  hash(results: T): string;
}
