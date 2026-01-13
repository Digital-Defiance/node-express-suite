/**
 * @fileoverview Application interface defining core application structure and services.
 * Provides access to environment, constants, database, and service container.
 * @module interfaces/application
 */

import mongoose, { Model } from '@digitaldefiance/mongoose-types';
import { ServiceContainer } from '../container';
import { IBaseDocument } from '../documents';
import { Environment } from '../environment';
import { IConstants } from './constants';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Core application interface providing access to all application services and configuration.
 * @template TID Platform-specific ID type (Buffer, ObjectId, etc.)
 */
export interface IApplication<TID extends PlatformID = Buffer> {
  /** Application environment configuration */
  get environment(): Environment<TID>;
  /** Application constants and configuration values */
  get constants(): IConstants;
  /** Mongoose database connection */
  get db(): typeof mongoose;
  /** Whether the application is ready to handle requests */
  get ready(): boolean;
  /** Service container for dependency injection */
  get services(): ServiceContainer;
  /** Plugin manager for extensibility */
  get plugins(): import('../plugins').PluginManager<TID>;
  /** Starts the application and initializes all services */
  start(): Promise<void>;
  /**
   * Gets a Mongoose model by name.
   * @template U Document type extending IBaseDocument
   * @param modelName Name of the model to retrieve
   * @returns Mongoose model instance
   */
  getModel<U extends IBaseDocument<any, TID>>(modelName: string): Model<U>;
}
