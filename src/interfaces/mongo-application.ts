/**
 * @fileoverview Mongoose/MongoDB-specific application interface.
 * Extends the base IApplication with MongoDB-specific capabilities.
 * Use this interface in controllers, services, and middlewares that require
 * direct access to the Mongoose connection or MongoDB configuration.
 * @module interfaces/mongo-application
 */

import mongoose from '@digitaldefiance/mongoose-types';
import type { Model } from '@digitaldefiance/mongoose-types';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type { IBaseDocument } from '../documents';
import type { IApplication } from './application';

/**
 * MongoDB/Mongoose-specific application interface.
 * Extends IApplication with the Mongoose connection and MongoDB configuration.
 *
 * Use this interface when your code needs:
 *  - `application.db` (the Mongoose connection)
 *  - `application.environment.mongo` (MongoDB config with a guaranteed URI)
 *  - `application.getModel<T>(name)` (Mongoose model lookup)
 *
 * Non-Mongo applications (e.g. BrightChainDb) should use the base IApplication.
 */
export interface IMongoApplication<
  TID extends PlatformID = Buffer,
> extends IApplication<TID> {
  /** Mongoose database connection. */
  get db(): typeof mongoose;

  /**
   * Gets a Mongoose model by name.
   * @template U Document type extending IBaseDocument
   * @param modelName Name of the model to retrieve
   * @returns Mongoose model instance
   */
  getModel<U extends IBaseDocument<any, TID>>(modelName: string): Model<U>;
}
