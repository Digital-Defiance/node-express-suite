// Avoid importing from the barrel (../index) here to prevent circular deps
import {
  Constants,
  getSuiteCoreI18nEngine,
  getSuiteCoreTranslation,
  SuiteCoreComponentId,
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose, { Model, Types } from 'mongoose';
import { join } from 'path';
import { IBaseDocument } from './documents/base';
import { Environment } from './environment';
import { IApplication } from './interfaces/application';
import { IConstants } from './interfaces/constants';
import { IFailableResult } from './interfaces/failable-result';
import { ISchema } from './interfaces/schema';
import { ModelRegistry } from './model-registry';
import { SchemaMap } from './types';
import { debugLog } from './utils';

/**
 * Base Application class with core functionality
 */
export class BaseApplication<
  TModelDocs extends Record<string, IBaseDocument<any>>,
  TInitResults,
  TConstants extends IConstants = IConstants,
> implements IApplication<any, Types.ObjectId, IBaseDocument<any, Types.ObjectId>, Environment, IConstants>
{
  /**
   * Application environment
   */
  private _environment: Environment;
  /**
   * In-memory MongoDB instance for development
   */
  private _devDatabase?: MongoMemoryReplSet;
  /**
   * Constants for the application
   */
  private _constants: TConstants;
  /**
   * Function to create the schema map given a Mongoose connection
   */
  private readonly _schemaMapFactory: (
    connection: mongoose.Connection,
  ) => SchemaMap<TModelDocs>;
  /**
   * Function to initialize the database with default data
   */
  private readonly _databaseInitFunction: (
    application: BaseApplication<TModelDocs, TInitResults>,
  ) => Promise<IFailableResult<TInitResults>>;
  /**
   * Function to create a hash from the database initialization results (for logging purposes)
   */
  private readonly _initResultHashFunction: (
    initResults: TInitResults,
  ) => string;

  /**
   * Get the application environment
   */
  public get environment(): Environment {
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
   * Mongoose database instance
   */
  protected _db?: typeof mongoose;

  /**
   * Schema map for all models
   */
  protected _schemaMap: SchemaMap<TModelDocs> | undefined;
  public get schemaMap(): SchemaMap<TModelDocs> {
    if (!this._schemaMap) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Admin_Error_SchemaMapIsNotLoadedYet,
      );
    }
    return this._schemaMap;
  }

  /**
   * Flag indicating whether the application is ready to handle requests
   */
  protected _ready: boolean;

  /**
   * Get the connected MongoDB database instance
   */
  public get db(): typeof mongoose {
    if (!this._db) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Admin_Error_DatabaseNotConnectedYet,
      );
    }
    return this._db;
  }

  /**
   * Get whether the application is ready to handle requests
   */
  public get ready(): boolean {
    return this._ready;
  }

  constructor(
    environment: Environment,
    schemaMapFactory: (
      connection: mongoose.Connection,
    ) => SchemaMap<TModelDocs>,
    databaseInitFunction: (
      application: BaseApplication<TModelDocs, TInitResults>,
    ) => Promise<IFailableResult<TInitResults>>,
    initResultHashFunction: (initResults: TInitResults) => string,
    constants: TConstants = Constants as TConstants,
  ) {
    this._ready = false;
    this._environment = environment;
    this._constants = constants;
    this._schemaMapFactory = schemaMapFactory;
    this._databaseInitFunction = databaseInitFunction;
    this._initResultHashFunction = initResultHashFunction;
  }

  /**
   * Validate MongoDB URI to prevent SSRF attacks
   */
  private validateMongoUri(uri: string): void {
    // Validate protocol
    if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Admin_Error_InvalidMongoUri,
      );
    }

    // In production, block private IPs and localhost
    if (this._environment.production) {
      const urlMatch = uri.match(/^mongodb(?:\+srv)?:\/\/(?:[^@]+@)?([^:/]+)/);
      if (urlMatch) {
        const hostname = urlMatch[1];
        // Block localhost and private IP ranges
        if (
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname.startsWith('10.') ||
          hostname.startsWith('192.168.') ||
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
          hostname.startsWith('169.254.') || // Link-local
          hostname === '::1' || // IPv6 localhost
          hostname.startsWith('fc00:') || // IPv6 private
          hostname.startsWith('fd00:') // IPv6 private
        ) {
          throw new TranslatableSuiteError(
            SuiteCoreStringKey.Admin_Error_InvalidMongoUri,
          );
        }
      }
    }
  }

  /**
   * Connect to MongoDB and initialize schemas
   */
  protected async connectDatabase(
    mongoUri: string,
    debug = false,
  ): Promise<void> {
    this.validateMongoUri(mongoUri);

    debugLog(
      debug,
      'log',
      `[ ${getSuiteCoreTranslation(
        SuiteCoreStringKey.Common_Connecting,
      )} ] ${getSuiteCoreTranslation(
        SuiteCoreStringKey.Common_MongoDB,
      )}: ${mongoUri}`,
    );

    // Always disconnect first to ensure clean state
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    // amazonq-ignore-next-line solved above with validateMongoUri call
    await mongoose.connect(mongoUri, {
      maxPoolSize: this._environment.mongo.maxPoolSize,
      minPoolSize: this._environment.mongo.minPoolSize,
      maxIdleTimeMS: this._environment.mongo.maxIdleTimeMS,
      serverSelectionTimeoutMS:
        this._environment.mongo.serverSelectionTimeoutMS,
      socketTimeoutMS: this._environment.mongo.socketTimeoutMS,
      retryWrites: this._environment.mongo.retryWrites,
      retryReads: this._environment.mongo.retryReads,
      readConcern: this._environment.mongo.readConcern,
      writeConcern: this._environment.mongo.writeConcern,
    });
    this._db = mongoose;

    await new Promise<void>((resolve) => {
      if (mongoose.connection.readyState === 1) {
        resolve();
      } else {
        mongoose.connection.once('connected', resolve);
      }
    });

    const engine = getSuiteCoreI18nEngine();
    debugLog(
      debug,
      'log',
      engine.t(
        '[ {{SuiteCoreStringKey.Common_Connected}} ] {{SuiteCoreStringKey.Common_MongoDB}}',
      ),
    );

    debugLog(
      debug,
      'log',
      engine.t(
        '[ {{SuiteCoreStringKey.Common_Loading}} ] {{SuiteCoreStringKey.Common_Schemas}}',
      ),
    );
    this._schemaMap = this._schemaMapFactory(this.db.connection);
    // Register all base models in ModelRegistry for extensibility
    if (this._schemaMap) {
      Object.values(this._schemaMap).forEach((schema) => {
        ModelRegistry.instance.register({
          modelName: schema.modelName,
          schema: schema.schema,
          model: schema.model,
          collection: schema.collection,
          discriminators: schema.discriminators,
        });
      });
    }

    if (debug) {
      (Object.values(this._schemaMap) as ISchema<IBaseDocument<any>>[]).forEach(
        (schema) => {
          console.log(
            engine.t(
              `[ {{SuiteCoreStringKey.Common_Loaded}} ] {{SuiteCoreStringKey.Common_Schema}} '${schema.modelName.replace(
                /[\r\n]/g,
                '',
              )}'`,
            ),
          );
        },
      );
    }

    if (!this._db.connection.db) {
      console.error(
        engine.translate(
          SuiteCoreComponentId,
          SuiteCoreStringKey.Admin_Error_FailedToSetTransactionTimeout,
        ),
      );
    } else {
      const command = {
        ...(this._environment.mongo.setParameterSupported
          ? { setParameter: 1 }
          : {}),
        ...(this._environment.mongo.useTransactions &&
        this._environment.mongo.transactionLifetimeLimitSecondsSupported
          ? {
              transactionLifetimeLimitSeconds:
                this._environment.mongo.transactionTimeout,
            }
          : {}),
        ...(this._environment.mongo.useTransactions &&
        this._environment.mongo.maxTransactionLockRequestTimeoutMillisSupported
          ? {
              maxTransactionLockRequestTimeoutMillis:
                this._environment.mongo.transactionLockRequestTimeout,
            }
          : {}),
      };
      if (Object.keys(command).length > 0) {
        await this._db.connection.db
          .admin()
          .command(command)
          .catch(() => undefined);
      }
      debugLog(
        debug,
        'log',
        engine.translate(
          SuiteCoreComponentId,
          SuiteCoreStringKey.Admin_SetTransactionTimeoutSuccessfully,
        ),
      );
    }
  }

  /**
   * Disconnect from database
   */
  protected async disconnectDatabase(debug = false): Promise<void> {
    if (this._db && mongoose.connection.readyState !== 0) {
      await this._db.disconnect();
    }
    const engine = getSuiteCoreI18nEngine();
    this._db = undefined;
    debugLog(
      debug,
      'log',
      `[ ${engine.translate(
        SuiteCoreComponentId,
        SuiteCoreStringKey.Common_Disconnected,
      )} ] ${engine.translate(
        SuiteCoreComponentId,
        SuiteCoreStringKey.Common_MongoDB,
      )}`,
    );
  }

  /**
   * Set up an in-memory MongoDB instance for development
   * @returns The MongoDB connection URI
   */
  protected async setupDevDatabase(): Promise<string> {
    this._devDatabase = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    await this._devDatabase.waitUntilRunning();
    const mongoUri =
      this._devDatabase.getUri(this._environment.devDatabase) +
      '&maxPoolSize=20&minPoolSize=4';
    this._environment.setEnvironment('mongo.uri', mongoUri);
    debugLog(
      this._environment.debug,
      'log',
      `MongoDB Memory Server with transactions: ${mongoUri}`,
    );
    return mongoUri;
  }

  /**
   * Initialize the development database with default data
   */
  protected async initializeDevDatabase(): Promise<TInitResults> {
    const engine = getSuiteCoreI18nEngine();
    debugLog(
      this._environment.debug,
      'log',
      `${engine.translate(
        SuiteCoreComponentId,
        SuiteCoreStringKey.Admin_StartingDatabaseInitialization,
      )}:`,
      this._environment.mongo.useTransactions,
    );
    let initTimeout: NodeJS.Timeout | undefined;
    const initTimeoutMs = 300000;

    const accountDataResult: IFailableResult<TInitResults> = await Promise.race(
      [
        this._databaseInitFunction(this),
        new Promise<never>((_, reject) => {
          initTimeout = setTimeout(() => {
            const logMsg = engine.translate(
              SuiteCoreComponentId,
              SuiteCoreStringKey.Admin_Error_FailedToInitializeUserDatabaseTimeoutTemplate,
              { timeMs: initTimeoutMs.toString() },
            );
            console.error(logMsg);
            reject(new Error(logMsg));
          }, initTimeoutMs);
        }),
      ],
    );
    if (initTimeout) clearTimeout(initTimeout);

    if (accountDataResult.success && accountDataResult.data) {
      if (this._environment.detailedDebug) {
        const initHash = this._initResultHashFunction(accountDataResult.data);
        debugLog(
          true,
          'log',
          engine.translate(
            SuiteCoreComponentId,
            SuiteCoreStringKey.Admin_DatabaseInitializedWithOptionsHashTemplate,
            { hash: initHash },
          ),
        );
      }
      return accountDataResult.data;
    } else {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Admin_Error_FailedToInitializeUserDatabase,
      );
    }
  }

  /**
   * Get the in-memory MongoDB instance (if any)
   */
  public get devDatabase(): MongoMemoryReplSet | undefined {
    return this._devDatabase;
  }

  /**
   * Start the application and connect to the database
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
    if (this._environment.devDatabase && !this._devDatabase) {
      mongoUri = await this.setupDevDatabase();
    }
    try {
      await this.connectDatabase(
        mongoUri ?? this.environment.mongo.uri,
        this.environment.debug,
      );

      // Database initialization should be handled by the consuming application
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
   * Stop the application
   */
  public async stop(): Promise<void> {
    await this.disconnectDatabase();
    if (this._devDatabase) {
      await this._devDatabase.stop();
      this._devDatabase = undefined;
    }
    this._ready = false;
  }

  /**
   * Get a Mongoose model by name
   * @param modelName Name of the model
   * @returns
   */
  public getModel<T extends IBaseDocument<any>>(modelName: string): Model<T> {
    // if (!this.db) {
    //   throw new TranslatableError('Admin_Error_DatabaseNotConnectedYet');
    // }
    return ModelRegistry.instance.get<any, T>(modelName).model;
    //return this.db.connection.model<T>(modelName);
  }
}
