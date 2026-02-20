/**
 * @fileoverview MongoDB/Mongoose-specific application base class.
 * Extends BaseApplication with IDocumentStore support, Mongoose model access,
 * schema maps, and dev database management.
 * @module mongo-application-base
 */

// Avoid importing from the barrel (../index) here to prevent circular deps
import type { IDatabase } from './interfaces/storage';
import { Model } from '@digitaldefiance/mongoose-types';
import mongoose from '@digitaldefiance/mongoose-types';
import {
  Constants,
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { BaseApplication } from './application-base';
import { IBaseDocument } from './documents/base';
import { Environment } from './environment';
import { IMongoApplication } from './interfaces/mongo-application';
import { IConstants } from './interfaces/constants';
import { IDocumentStore } from './interfaces/document-store';
import { MongooseDocumentStore } from './services/mongoose-document-store';
import { SchemaMap } from './types';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Duck-typing check to determine if a value conforms to the IDatabase interface.
 * Checks for the key methods that distinguish IDatabase from IDocumentStore.
 */
function isIDatabase(value: unknown): value is IDatabase {
  return (
    typeof value === 'object' &&
    value !== null &&
    'collection' in value &&
    'startSession' in value &&
    typeof (value as Record<string, unknown>)['collection'] === 'function' &&
    typeof (value as Record<string, unknown>)['startSession'] === 'function'
  );
}

/**
 * MongoDB/Mongoose-specific application base class.
 * Extends BaseApplication with legacy IDocumentStore support for backward
 * compatibility. Provides Mongoose-specific accessors: db, schemaMap,
 * devDatabase, getModel().
 *
 * Accepts either an IDatabase or an IDocumentStore in the constructor.
 * When an IDocumentStore is provided, a no-op IDatabase adapter is used
 * for the parent class, and the document store handles all database operations.
 */
export class MongoApplicationBase<
  TID extends PlatformID,
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  TModelDocs extends Record<string, IBaseDocument<any, TID>>,
  TInitResults,
  TConstants extends IConstants = IConstants,
>
  extends BaseApplication<TID, TInitResults, TConstants>
  implements IMongoApplication<TID>
{
  /**
   * The injected document store handling all database operations.
   * Set when a legacy IDocumentStore is passed to the constructor.
   * @deprecated Prefer IDatabase for new code.
   */
  protected readonly _documentStore:
    | IDocumentStore<TID, TModelDocs>
    | undefined;

  /**
   * Whether the constructor received an IDocumentStore (legacy path).
   */
  protected readonly _isLegacyDocumentStore: boolean;

  /**
   * Schema map for all models, delegated to the document store.
   * Only available when a legacy IDocumentStore is used.
   */
  public get schemaMap(): SchemaMap<TID, TModelDocs> {
    if (!this._documentStore) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Admin_Error_SchemaMapIsNotLoadedYet,
      );
    }
    const map = this._documentStore.schemaMap;
    if (!map) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Admin_Error_SchemaMapIsNotLoadedYet,
      );
    }
    return map as SchemaMap<TID, TModelDocs>;
  }

  /**
   * Get the connected MongoDB database instance.
   * @deprecated Use database (IDatabase) or getCollection instead for storage-agnostic access.
   */
  public get db(): typeof mongoose {
    if (this._documentStore instanceof MongooseDocumentStore) {
      return this._documentStore.db;
    }
    throw new TranslatableSuiteError(
      SuiteCoreStringKey.Admin_Error_DatabaseNotConnectedYet,
    );
  }

  /**
   * Get the injected document store.
   * @deprecated Prefer database (IDatabase) for new code.
   */
  public get documentStore(): IDocumentStore<TID, TModelDocs> | undefined {
    return this._documentStore;
  }

  /**
   * Get the in-memory MongoDB instance (if any), delegated to the document store.
   * Only available when a legacy IDocumentStore is used.
   */
  public get devDatabase(): MongoMemoryReplSet | undefined {
    return this._documentStore?.devDatabase;
  }

  constructor(
    environment: Environment<TID>,
    databaseOrStore: IDatabase | IDocumentStore<TID, TModelDocs>,
    constants: TConstants = Constants as TConstants,
  ) {
    if (isIDatabase(databaseOrStore)) {
      // IDatabase path — pass directly to parent
      super(environment, databaseOrStore, constants);
      this._documentStore = undefined;
      this._isLegacyDocumentStore = false;
    } else {
      // Legacy IDocumentStore path — create a no-op IDatabase for the parent
      // since the document store manages its own connection lifecycle.
      super(environment, createNoOpDatabase(), constants);
      this._documentStore = databaseOrStore;
      this._isLegacyDocumentStore = true;
    }
  }

  /**
   * Start the application.
   * When using a legacy IDocumentStore, handles dev database setup and
   * delegates connection to the document store.
   * When using IDatabase, delegates to the parent class.
   */
  public override async start(
    mongoUri?: string,
    delayReady?: boolean,
  ): Promise<void> {
    if (this._isLegacyDocumentStore && this._documentStore) {
      // Legacy IDocumentStore path
      if (this._ready) {
        console.error(
          'Failed to start the application:',
          'Application is already running',
        );
        const err = new Error('Application is already running');
        if (process.env['NODE_ENV'] === 'test') {
          throw err;
        }
        process.exit(1);
      }

      // Handle dev database setup
      if (this.environment.devDatabase && !this._documentStore.devDatabase) {
        if (this._documentStore.setupDevStore) {
          mongoUri = (await this._documentStore.setupDevStore()) as
            | string
            | undefined;
        }
      }

      try {
        const uri = mongoUri ?? this.environment.mongo?.uri;
        await this._documentStore.connect(uri);

        // Initialize plugins
        await this.plugins.initAll(this);
      } catch (err) {
        const sanitizedErr =
          err instanceof Error
            ? err.message.replace(/[\r\n]/g, ' ')
            : String(err).replace(/[\r\n]/g, ' ');
        console.error('Failed to start the application:', sanitizedErr);
        if (process.env['NODE_ENV'] === 'test') {
          throw err;
        }
        process.exit(1);
      }
      this._ready = delayReady ? false : true;
    } else {
      // IDatabase path — delegate to parent
      await super.start(mongoUri, delayReady);
    }
  }

  /**
   * Stop the application.
   * When using a legacy IDocumentStore, delegates disconnection to the store.
   * When using IDatabase, delegates to the parent class.
   */
  public override async stop(): Promise<void> {
    if (this._isLegacyDocumentStore && this._documentStore) {
      // Legacy IDocumentStore path
      await this.plugins.stopAll();
      await this._documentStore.disconnect();
      if (this._documentStore.devDatabase) {
        await this._documentStore.devDatabase.stop();
      }
      this._ready = false;
    } else {
      // IDatabase path — delegate to parent
      await super.stop();
    }
  }

  /**
   * Get a model by name, delegated to the legacy document store.
   * @deprecated Use getCollection<T>(name) with IDatabase instead.
   * @param modelName Name of the model
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getModel<T extends IBaseDocument<any, TID>>(
    modelName: string,
  ): Model<T> {
    if (!this._documentStore) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Admin_Error_DatabaseNotConnectedYet,
      );
    }
    return this._documentStore.getModel<T>(modelName);
  }
}

/**
 * Creates a no-op IDatabase that does nothing.
 * Used when a legacy IDocumentStore manages its own connection lifecycle.
 */
function createNoOpDatabase(): IDatabase {
  return {
    collection() {
      throw new Error(
        'No-op IDatabase: use the document store for collection access',
      );
    },
    startSession() {
      throw new Error(
        'No-op IDatabase: use the document store for session management',
      );
    },
    withTransaction() {
      throw new Error(
        'No-op IDatabase: use the document store for transactions',
      );
    },
    listCollections() {
      return [];
    },
    async dropCollection() {
      return false;
    },
    async connect() {
      // no-op — document store manages connection
    },
    async disconnect() {
      // no-op — document store manages disconnection
    },
    isConnected() {
      return false;
    },
  };
}
