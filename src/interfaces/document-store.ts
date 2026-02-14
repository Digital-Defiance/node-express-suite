/**
 * @fileoverview Storage-agnostic interface for database operations.
 * Implementations wrap specific database technologies (mongoose, BrightChainDb, etc.).
 * @module interfaces/document-store
 */

import { Model } from '@digitaldefiance/mongoose-types';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { IBaseDocument } from '../documents/base';
import { ISchema } from './schema';
import { IApplication } from './application';

/**
 * Storage-agnostic interface for database operations.
 * Implementations wrap specific database technologies (mongoose, BrightChainDb, etc.).
 * @template TID - Platform-specific ID type extending PlatformID
 * @template TModelDocs - Record mapping model names to their document types
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface IDocumentStore<
  TID extends PlatformID = Buffer,
  TModelDocs extends Record<string, IBaseDocument<any, TID>> = Record<
    string,
    IBaseDocument<any, TID>
  >,
> {
  /** Connect to the backing store. URI may be ignored by non-network stores. */
  connect(uri?: string): Promise<void>;

  /** Disconnect from the backing store. */
  disconnect(): Promise<void>;

  /** Whether the store is currently connected and ready for operations. */
  isConnected(): boolean;

  /** Retrieve a model/collection handle by name. */
  getModel<T extends IBaseDocument<any, TID>>(modelName: string): Model<T>;

  /** The schema map, if available (populated after connect). */
  readonly schemaMap?: { [K in keyof TModelDocs]: ISchema<TID, TModelDocs[K]> };

  /** The dev database instance, if any (for cleanup on stop). */
  readonly devDatabase?: MongoMemoryReplSet;

  /** Optional: provision a dev/test database, returning its connection URI. */
  setupDevStore?(): Promise<string | void>;

  /** Optional: seed the dev database with initial data. */
  initializeDevStore?<TInitResults>(
    app: IApplication<TID>,
  ): Promise<TInitResults>;
}
