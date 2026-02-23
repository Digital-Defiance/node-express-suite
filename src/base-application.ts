/**
 * @fileoverview Database-agnostic base application class.
 * Delegates database operations to an IDatabase instance.
 * For MongoDB/Mongoose-specific functionality, see MongoDatabasePlugin.
 * @module base-application
 */

// Avoid importing from the barrel (../index) here to prevent circular deps
import type {
  BsonDocument,
  ICollection,
  IDatabase,
  IDatabaseLifecycleHooks,
} from '@digitaldefiance/suite-core-lib';
import {
  Constants,
  getSuiteCoreI18nEngine,
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';
import { join } from 'path';
import { ServiceContainer } from './container';
import { Environment } from './environment';
import { IApplication } from './interfaces/application';
import { IAuthenticationProvider } from './interfaces/authentication-provider';
import { IConstants } from './interfaces/constants';
import { PluginManager } from './plugins';
import { debugLog } from './utils';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Database-agnostic base application class.
 * Accepts an IDatabase for storage operations and optional lifecycle hooks
 * for dev store provisioning, URI validation, and database initialization.
 *
 * For MongoDB/Mongoose-specific functionality (IDocumentStore, schemaMap,
 * getModel, db), use MongoDatabasePlugin which plugs into Application.
 */
export class BaseApplication<
  TID extends PlatformID,
  TInitResults = unknown,
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
   */
  protected readonly _database: IDatabase;

  /**
   * Optional lifecycle hooks for database initialization.
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
   * Get the IDatabase instance.
   */
  public get database(): IDatabase {
    return this._database;
  }

  /**
   * Authentication provider for storage-agnostic user lookup and credential verification.
   * Subclasses can override this to provide a custom authentication provider.
   */
  private _authProvider: IAuthenticationProvider<TID> | undefined;

  public get authProvider(): IAuthenticationProvider<TID> | undefined {
    return this._authProvider;
  }

  public set authProvider(provider: IAuthenticationProvider<TID> | undefined) {
    this._authProvider = provider;
  }

  /**
   * Get whether the application is ready to handle requests
   */
  public get ready(): boolean {
    return this._ready;
  }

  constructor(
    environment: Environment<TID>,
    database: IDatabase,
    constants: TConstants = Constants as TConstants,
    lifecycleHooks?: IDatabaseLifecycleHooks<TInitResults>,
  ) {
    this._ready = false;
    this._environment = environment;
    this._constants = constants;
    this._database = database;
    this._lifecycleHooks = lifecycleHooks;
    this.services = new ServiceContainer();
    this.plugins = new PluginManager<TID>();
  }

  /**
   * Start the application and connect to the database.
   * Delegates connection to the IDatabase instance.
   */
  public async start(uri?: string, delayReady?: boolean): Promise<void> {
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

    // Handle dev store setup via lifecycle hooks
    if (this._lifecycleHooks?.setupDevStore && this._environment.devDatabase) {
      uri = await this._lifecycleHooks.setupDevStore();
      this._devStoreProvisioned = true;
    }

    try {
      const resolvedUri = uri ?? this.environment.databaseUri;

      // Only validate/connect if a URI was provided.
      // Non-Mongo databases (e.g. BrightChainDb) manage their own connection
      // internally and do not need a URI passed from the environment.
      if (resolvedUri && this._lifecycleHooks?.validateUri) {
        this._lifecycleHooks.validateUri(resolvedUri);
      }
      await this._database.connect(resolvedUri);

      // Initialize plugins
      await this.plugins.initAll(this);

      // Run database initialization hook in dev mode
      if (
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
   * Delegates disconnection to the IDatabase instance.
   */
  public async stop(): Promise<void> {
    await this.plugins.stopAll();

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

    this._ready = false;
  }

  /**
   * Get a collection by name via the IDatabase interface.
   * @param name Name of the collection
   * @returns ICollection<T> for the named collection
   */
  public getCollection<T extends BsonDocument>(name: string): ICollection<T> {
    return this._database.collection<T>(name);
  }
}
