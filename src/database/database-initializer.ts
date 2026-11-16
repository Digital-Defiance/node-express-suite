/**
 * @fileoverview Database initializer interface.
 * Defines contract for database initialization implementations.
 * @module database/database-initializer
 */

import type { IApplicationCore } from '../interfaces/application-ports';
import { IFailableResult } from '@digitaldefiance/suite-core-lib';

export interface IDatabaseInitializer<T = unknown> {
  initialize(app: IApplicationCore): Promise<IFailableResult<T>>;
  hash(results: T): string;
}
