import {
  CoreLanguageCode,
  GlobalActiveContext,
  IActiveContext,
} from '@digitaldefiance/i18n-lib';
import { Connection } from '@digitaldefiance/mongoose-types';
import { IFailableResult } from '@digitaldefiance/suite-core-lib';
import { HelmetOptions } from 'helmet';
import { Application } from '../../application';
import { IBaseDocument } from '../../documents';
import { Environment } from '../../environment';
import {
  IApplication,
  IConstants,
  ICSPConfig,
  IFlexibleCSP,
  IServerInitResult,
} from '../../interfaces';
import { ITestEnvironment } from '../../interfaces/test-environment';
import { initMiddleware } from '../../middleware-utils';
import { AppRouter, BaseRouter } from '../../routers';
import { DatabaseInitializationService } from '../../services';
import { SchemaMap } from '../../types';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

export async function setupTestEnvironment<
  TID extends PlatformID = Buffer,
  TModelDocs extends Record<string, IBaseDocument<any, TID>> = Record<
    string,
    IBaseDocument<any, TID>
  >,
  TConstants extends IConstants = IConstants,
  TAppRouter extends AppRouter<TID> = AppRouter<TID>,
>(
  constants: TConstants,
  apiRouterFactory: (app: IApplication<TID>) => BaseRouter<TID>,
  schemaMapFactory: (connection: Connection) => SchemaMap<TID, TModelDocs>,
  appRouterFactory: (apiRouter: BaseRouter<TID>) => TAppRouter = (apiRouter) =>
    new AppRouter(apiRouter) as TAppRouter,
  customInitMiddleware: typeof initMiddleware = initMiddleware,
  envLocation?: string,
  databaseInitFunction?: (
    application: IApplication<TID>,
  ) => Promise<IFailableResult<IServerInitResult<TID>>>,
  initResultHashFunction?: (initResults: IServerInitResult<TID>) => string,
  cspConfig: ICSPConfig | HelmetOptions | IFlexibleCSP = {
    corsWhitelist: [],
    csp: {
      defaultSrc: [],
      imgSrc: [],
      connectSrc: [],
      scriptSrc: [],
      styleSrc: [],
      fontSrc: [],
      frameSrc: [],
    },
  },
): Promise<ITestEnvironment<TID>> {
  // Make runtime deterministic for tests
  process.env.NODE_ENV = 'test';
  process.env['DEV_DATABASE'] = 'test';
  // Increase libuv threadpool for concurrent pbkdf2 work
  if (!process.env['UV_THREADPOOL_SIZE']) {
    process.env['UV_THREADPOOL_SIZE'] = '16';
  }

  // Optimize MongoDB settings for test performance while maintaining reliability
  if (!process.env['MONGO_MAX_POOL_SIZE']) {
    process.env['MONGO_MAX_POOL_SIZE'] = '5'; // Increased for better concurrency
  }
  if (!process.env['MONGO_MIN_POOL_SIZE']) {
    process.env['MONGO_MIN_POOL_SIZE'] = '2'; // Increased for better performance
  }
  if (!process.env['MONGO_SERVER_SELECTION_TIMEOUT_MS']) {
    process.env['MONGO_SERVER_SELECTION_TIMEOUT_MS'] = '5000'; // Increased for stability
  }
  if (!process.env['MONGO_SOCKET_TIMEOUT_MS']) {
    process.env['MONGO_SOCKET_TIMEOUT_MS'] = '15000'; // Increased for stability
  }
  if (!process.env['MONGO_TRANSACTION_TIMEOUT']) {
    process.env['MONGO_TRANSACTION_TIMEOUT'] = '15000'; // Increased for stability
  }
  if (!process.env['MONGO_TRANSACTION_LOCK_REQUEST_TIMEOUT']) {
    process.env['MONGO_TRANSACTION_LOCK_REQUEST_TIMEOUT'] = '8000'; // Increased for stability
  }
  if (!process.env['MONGO_TRANSACTION_RETRY_BASE_DELAY']) {
    process.env['MONGO_TRANSACTION_RETRY_BASE_DELAY'] = '100'; // Increased for stability
  }
  // Disable transactions in test environment for better reliability
  if (!process.env['MONGO_USE_TRANSACTIONS']) {
    process.env['MONGO_USE_TRANSACTIONS'] = 'false'; // Disable transactions for tests
  }

  // Ensure language is set to English for consistent test behavior
  process.env.LANGUAGE = 'English (US)';

  // Use a random high port to avoid conflicts
  process.env['PORT'] = String(Math.floor(Math.random() * 10000) + 50000);

  // Use unique database name for each test to avoid conflicts
  const uniqueDbName = `test_${Date.now()}_${Math.floor(
    Math.random() * 10000,
  )}`;
  process.env['DEV_DATABASE'] = uniqueDbName;

  // Reset global language context to English
  const setAdminLanguage = (language: CoreLanguageCode) => {
    const context = GlobalActiveContext.getInstance<
      CoreLanguageCode,
      IActiveContext<CoreLanguageCode>
    >();
    context.setAdminLanguage(language);
  };
  setAdminLanguage('en-US');

  const env = new Environment<TID>(envLocation, true);

  const application = new Application<
    IServerInitResult<TID>,
    TModelDocs,
    TID,
    Environment<TID>,
    TConstants,
    TAppRouter
  >(
    env,
    apiRouterFactory,
    schemaMapFactory,
    databaseInitFunction ??
      DatabaseInitializationService.initUserDb.bind(
        DatabaseInitializationService,
      ),
    initResultHashFunction ??
      DatabaseInitializationService.serverInitResultHash.bind(
        DatabaseInitializationService,
      ),
    cspConfig,
    constants,
    appRouterFactory,
    customInitMiddleware,
  );

  const initResult: IFailableResult<IServerInitResult<TID>> =
    await DatabaseInitializationService.initUserDb<TID>(application);
  if (!initResult.success || !initResult.data) {
    throw new Error('Failed to initialize database for tests');
  }
  const accountData = initResult.data;

  // Create and start your app
  try {
    await application.start();

    const command = {
      ...(application.environment.mongo.setParameterSupported
        ? { setParameter: 1 }
        : {}),
      ...(application.environment.mongo.useTransactions &&
      application.environment.mongo.transactionLifetimeLimitSecondsSupported
        ? {
            transactionLifetimeLimitSeconds:
              application.environment.mongo.transactionTimeout,
          }
        : {}),
      ...(application.environment.mongo.useTransactions &&
      application.environment.mongo
        .maxTransactionLockRequestTimeoutMillisSupported
        ? {
            maxTransactionLockRequestTimeoutMillis:
              application.environment.mongo.transactionLockRequestTimeout,
          }
        : {}),
    };

    if (Object.keys(command).length > 0 && application.db.connection.db) {
      // Configure MongoDB for better concurrency
      await application.db.connection.db
        .admin()
        .command(command)
        .catch(() => undefined);
    }
  } catch (error) {
    console.error(
      'Failed to start application with MongoDB URI:',
      application.environment.mongo.uri,
    );
    console.error('Connection error:', error);
    throw error;
  }

  // Ensure the test process uses the same JWT secret as the application
  process.env.JWT_SECRET = application.environment.jwtSecret;

  return {
    application,
    mongoServer: application.devDatabase!,
    mongoUri: application.environment.mongo.uri!,
    accountData,
    dbName: application.environment.devDatabase!,
  };
}
