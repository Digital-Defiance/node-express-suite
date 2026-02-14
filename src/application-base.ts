/**
 * @fileoverview Base application class with core functionality.
 * Delegates database operations to an IDatabase instance (or legacy IDocumentStore).
 * @module application-base
 */

// Avoid importing from the barrel (../index) here to prevent circular deps
import type {
  BsonDocument,
  ICollection,
  IDatabase,
  IDatabaseLifecycleHooks,
} from '@brightchain/brightchain-lib';
import { Model } from '@digitaldefiance/mongoose-types';
import mongoose from '@digitaldefiance/mongoose-types';
import {
  Constants,
  getSuiteCoreI18nEngine,
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { join } from 'path';
import { ServiceContainer } from './container';
import { IBaseDocument } from './documents/base';
import { Environment } from './environment';
import { IApplication } from './interfaces/application';
import { IConstants } from './interfaces/constants';
import { IDocumentStore } from './interfaces/document-store';
import { PluginManager } from './plugins';
import { MongooseDocumentStore } from './services/mongoose-document-store';
import { SchemaMap } from './types';
import { defaultMongoUriValidator } from './utils/default-mongo-uri-validator';
import { debugLog } from './utils';
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
 * Base Application class with core functionality.
 * Accepts an IDatabase (preferred) or legacy IDocumentStore for backward compatibility.
 * When an IDatabase is provided, database lifecycle is managed through the IDatabase contract.
 * When a legacy IDocumentStore is provided, it is used directly for backward compatibility.
 */
export class BaseApplication<
  TID extends PlatformID,
  TModelDocs extends Record<string, IBaseDocument<any, TID>>,
  TInitResults,
  TConstants extends IConstants = IConstants,
> implements IApplication<TID> {
  /**
   * Application environment
   */
  private _environment: Environment<TID>;

  /**
   * Constants for the application
   */
  private _constants: TConstants;

  /**
   * The IDatabase instance for storage-agnostic database operations.
   * Set when an IDatabase is passed to the constructor.
   */
  protected readonly _database: IDatabase | undefined;

  /**
   * The injected document store handling all database operations.
   * Set when a legacy IDocumentStore is passed to the constructor.
   * @deprecated Prefer _database (IDatabase) for new code.
   */
  protected readonly _documentStore:
    | IDocumentStore<TID, TModelDocs>
    | undefined;

  /**
   * Optional lifecycle hooks for database initialization on the IDatabase path.
   */
  protected readonly _lifecycleHooks:
    | IDatabaseLifecycleHooks<TInitResults>
    | undefined;

  /**
   * Whether setupDevStore was invoked during start() (for teardown on stop).
   */
  protected _devStoreProvisioned = false;

  /**
   * Get the application environment
   */
  public get environment(): Environment<TID> {
    return this._environment;
  }

  public get constants(): TConstants {
    return this._constants;
  }

  /**
   * Reload the environment from file
   */
  public reloadEnvironment(path?: string, override = true): void {
    this._environment = new Environment(path, false, override);
  }

  /**
   * Get the path to the dist directory
   */
  public static get distDir(): string {
    const cwd = process.cwd();
    const distPath = join(cwd, 'dist');
    return distPath;
  }

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
   * Flag indicating whether the application is ready to handle requests
   */
  protected _ready: boolean;

  /**
   * Service container for dependency injection
   */
  public readonly services: ServiceContainer;

  /**
   * Plugin manager for extensibility
   */
  public readonly plugins: PluginManager<TID>;

  /**
   * Get the connected MongoDB database instance.
   * @deprecated Use database (IDatabase) or documentStore instead for storage-agnostic access.
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
   * Get the IDatabase instance, if one was provided.
   */
  public get database(): IDatabase | undefined {
    return this._database;
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

  /**
   * Get whether the application is ready to handle requests
   */
  public get ready(): boolean {
    return this._ready;
  }

  constructor(
    environment: Environment<TID>,
    databaseOrStore: IDatabase | IDocumentStore<TID, TModelDocs>,
    constants: TConstants = Constants as TConstants,
    lifecycleHooks?: IDatabaseLifecycleHooks<TInitResults>,
  ) {
    this._ready = false;
    this._environment = environment;
    this._constants = constants;

    // Duck-typing detection: IDatabase has 'collection' and 'startSession' methods
    if (isIDatabase(databaseOrStore)) {
      this._database = databaseOrStore;
      this._documentStore = undefined;
      this._lifecycleHooks = lifecycleHooks;
    } else {
      this._database = undefined;
      this._documentStore = databaseOrStore;
      // Lifecycle hooks are only used on the IDatabase path
      this._lifecycleHooks = undefined;
    }

    this.services = new ServiceContainer();
    this.plugins = new PluginManager<TID>();
  }

  /**
   * Start the application and connect to the database.
   * Delegates connection to IDatabase or legacy IDocumentStore.
   */
  public async start(mongoUri?: string, delayReady?: boolean): Promise<void> {
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

    // Legacy IDocumentStore path: handle dev database setup
    if (this._documentStore) {
      if (this._environment.devDatabase && !this._documentStore.devDatabase) {
        if (this._documentStore.setupDevStore) {
          mongoUri = (await this._documentStore.setupDevStore()) as
            | string
            | undefined;
        }
      }
    }

    // IDatabase path: handle dev store setup via lifecycle hooks
    if (
      this._database &&
      this._lifecycleHooks?.setupDevStore &&
      this._environment.devDatabase
    ) {
      mongoUri = await this._lifecycleHooks.setupDevStore();
      this._devStoreProvisioned = true;
    }

    try {
      const uri = mongoUri ?? this.environment.mongo.uri;

      if (this._database) {
        // IDatabase path: validate URI before connecting
        if (this._lifecycleHooks?.validateUri) {
          this._lifecycleHooks.validateUri(uri);
        } else {
          defaultMongoUriValidator(uri, this._environment.production);
        }

        await this._database.connect(uri);
      } else if (this._documentStore) {
        // Legacy IDocumentStore path
        await this._documentStore.connect(uri);
      }

      // Initialize plugins
      await this.plugins.initAll(this);

      // IDatabase path: run database initialization hook in dev mode
      if (
        this._database &&
        this._lifecycleHooks?.initializeDatabase &&
        this._environment.devDatabase
      ) {
        const initTimeoutMs = 300000; // 5 minutes
        const engine = getSuiteCoreI18nEngine({ constants: this._constants });

        let initTimeout: ReturnType<typeof setTimeout> | undefined;
        const initResult = await Promise.race([
          this._lifecycleHooks.initializeDatabase(this),
          new Promise<never>((_, reject) => {
            initTimeout = setTimeout(() => {
              const logMsg = engine.translateStringKey(
                SuiteCoreStringKey.Admin_Error_FailedToInitializeUserDatabaseTimeoutTemplate,
                { timeMs: initTimeoutMs.toString() },
              );
              console.error(logMsg);
              reject(new Error(logMsg));
            }, initTimeoutMs);
          }),
        ]);
        if (initTimeout) clearTimeout(initTimeout);

        if (initResult.success && initResult.data !== undefined) {
          if (
            this._environment.detailedDebug &&
            this._lifecycleHooks.hashInitResults
          ) {
            const initHash = this._lifecycleHooks.hashInitResults(
              initResult.data,
            );
            debugLog(
              true,
              'log',
              engine.translateStringKey(
                SuiteCoreStringKey.Admin_DatabaseInitializedWithOptionsHashTemplate,
                { hash: initHash },
              ),
            );
          }
        } else {
          if (this._environment.detailedDebug && initResult.error) {
            debugLog(true, 'log', initResult.error);
          }
          throw new TranslatableSuiteError(
            SuiteCoreStringKey.Admin_Error_FailedToInitializeUserDatabase,
          );
        }
      }
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
  }

  /**
   * Stop the application.
   * Delegates disconnection to IDatabase or legacy IDocumentStore.
   */
  public async stop(): Promise<void> {
    await this.plugins.stopAll();

    if (this._database) {
      // IDatabase path
      await this._database.disconnect();

      // Teardown dev store if it was provisioned via lifecycle hooks
      if (this._devStoreProvisioned && this._lifecycleHooks?.teardownDevStore) {
        try {
          await this._lifecycleHooks.teardownDevStore();
        } catch (teardownErr) {
          console.error(
            'Failed to teardown dev store:',
            teardownErr instanceof Error
              ? teardownErr.message
              : String(teardownErr),
          );
        }
      }
    } else if (this._documentStore) {
      // Legacy IDocumentStore path
      await this._documentStore.disconnect();
      if (this._documentStore.devDatabase) {
        await this._documentStore.devDatabase.stop();
      }
    }

    this._ready = false;
  }

  /**
   * Get a collection by name via the IDatabase interface.
   * @param name Name of the collection
   * @returns ICollection<T> for the named collection
   * @throws if no IDatabase was provided
   */
  public getCollection<T extends BsonDocument>(name: string): ICollection<T> {
    if (!this._database) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Admin_Error_DatabaseNotConnectedYet,
      );
    }
    return this._database.collection<T>(name);
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
