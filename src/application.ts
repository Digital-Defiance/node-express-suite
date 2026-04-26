/**
 * @fileoverview Generic Express application class.
 * Extends BaseApplication with HTTP/HTTPS server, routing, and middleware.
 * Database-agnostic — database backends are provided via IDatabasePlugin.
 * @module application
 */

import { HandleableError } from '@digitaldefiance/i18n-lib';
import {
  Constants,
  getSuiteCoreI18nEngine,
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';
import express, {
  Application as ExpressApplication,
  NextFunction,
  Request,
  Response,
} from 'express';
import { readFileSync } from 'fs';
import { HelmetOptions } from 'helmet';
import { Server } from 'http';
import { createServer } from 'https';
import { isAbsolute, normalize, resolve } from 'path';
import { BaseApplication } from './base-application';
import { Environment } from './environment';
import { IApplication, ICSPConfig, isCSPConfig } from './interfaces';
import { IConstants } from './interfaces/constants';
import { IFlexibleCSP, isFlexibleCSP } from './interfaces/flexible-csp';
import { initMiddleware, isHelmetOptions } from './middleware-utils';
import { AppRouter } from './routers/app';
import { BaseRouter } from './routers/base';
import { debugLog, handleError, sendApiMessageResponse } from './utils';
import { GreenlockManager } from './greenlock-manager';
import { IDatabasePlugin } from './plugins/database-plugin';
import type { IDatabase } from '@digitaldefiance/suite-core-lib';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { createNoOpDatabase } from './utils/no-op-database';
import { ServiceKeys } from './container/service-definitions';
import { EmailServices } from './enumerations/email-services';
import { DummyEmailService } from './services/dummy-email-service';
import { FakeEmailService } from './services/fake-email-service';
import { PostfixEmailService } from './services/postfixEmail';
import { IEmailService } from './interfaces/email-service';
import { AdminEmailRouter } from './routers/admin-email-router';
import { authenticateToken } from './middlewares/authenticate-token';

type ServerWithOptionalClose = Server & { closeAllConnections?: () => void };

/**
 * Generic Express application class.
 *
 * Provides HTTP/HTTPS server, routing, middleware, and error handling.
 * Database backends are plugged in via IDatabasePlugin rather than
 * being baked into the class hierarchy.
 *
 * @template TID - Platform ID type (Buffer, ObjectId, etc.)
 * @template TEnvironment - Environment type
 * @template TConstants - Constants type
 * @template TAppRouter - App router type
 */
export class Application<
  TID extends PlatformID = Buffer,
  TEnvironment extends Environment<TID> = Environment<TID>,
  TConstants extends IConstants = IConstants,
  TAppRouter extends AppRouter<TID> = AppRouter<TID>,
> extends BaseApplication<TID, unknown, TConstants> {
  public readonly expressApp: ExpressApplication;
  private server: ServerWithOptionalClose | null = null;
  private readonly _cspConfig: ICSPConfig | HelmetOptions | IFlexibleCSP;
  private readonly _apiRouterFactory: (
    app: IApplication<TID>,
  ) => BaseRouter<TID>;
  private readonly _appRouterFactory: (
    apiRouter: BaseRouter<TID>,
  ) => TAppRouter;
  private readonly _initMiddleware: typeof initMiddleware;
  private _apiRouter?: BaseRouter<TID>;
  private greenlockManager: GreenlockManager | null = null;
  private _databasePlugin: IDatabasePlugin<TID> | null = null;

  public override get environment(): TEnvironment {
    return super.environment as TEnvironment;
  }

  /**
   * Get the registered database plugin, if any.
   */
  public get databasePlugin(): IDatabasePlugin<TID> | null {
    return this._databasePlugin;
  }

  /**
   * Get the IDatabase instance.
   * When a database plugin is registered and connected, returns the
   * plugin's database (e.g. MongooseDatabase). Otherwise falls back
   * to the base class's database (typically the no-op placeholder).
   */
  public override get database(): IDatabase {
    if (this._databasePlugin) {
      return this._databasePlugin.database;
    }
    return super.database;
  }

  /**
   * Get the raw database connection object from the registered plugin.
   * For Mongo plugins this is `typeof mongoose`.
   * Returns undefined when no database plugin is registered.
   */
  public get db(): unknown | undefined {
    return this._databasePlugin?.db;
  }

  /**
   * Get a model by name from the registered database plugin.
   * For Mongo plugins this returns a Mongoose Model.
   * Returns undefined when no database plugin is registered.
   */
  public getModel<U>(modelName: string): U | undefined {
    return this._databasePlugin?.getModel?.<U>(modelName);
  }

  /**
   * Register a database plugin. Must be called before start().
   * The plugin will be initialized during start() and its database
   * will be used as the application's primary database.
   */
  public useDatabasePlugin(plugin: IDatabasePlugin<TID>): this {
    this._databasePlugin = plugin;
    // Also register it as a regular plugin so it participates in the lifecycle
    this.plugins.register(plugin);
    return this;
  }

  /**
   * Create the email service instance for the configured backend.
   * Handles Dummy, Fake, and Postfix natively. For SES or other providers,
   * override this method in a subclass to return the appropriate implementation.
   */
  protected createEmailService(): IEmailService {
    switch (this.environment.emailService) {
      case EmailServices.Fake:
        return FakeEmailService.getInstance<TID, IApplication<TID>>(this);
      case EmailServices.Dummy:
        return new DummyEmailService<TID, IApplication<TID>>(this);
      case EmailServices.Postfix:
        return new PostfixEmailService<TID>(this);
      default:
        throw new Error(
          `Email service '${this.environment.emailService}' is not implemented in the base Application. ` +
            `Override createEmailService() in your subclass to provide a '${this.environment.emailService}' implementation.`,
        );
    }
  }

  /**
   * Hook for subclasses to register services before the server starts.
   * Called during the constructor.
   */
  protected registerServices(): void {
    const emailService = this.createEmailService();
    this.services.register(ServiceKeys.EMAIL, () => emailService);
  }

  constructor(
    environment: TEnvironment,
    apiRouterFactory: (app: IApplication<TID>) => BaseRouter<TID>,
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
    constants: TConstants = Constants as TConstants,
    appRouterFactory: (apiRouter: BaseRouter<TID>) => TAppRouter = (
      apiRouter,
    ) => new AppRouter(apiRouter) as TAppRouter,
    customInitMiddleware: typeof initMiddleware = initMiddleware,
    database?: IDatabase,
  ) {
    super(environment, database ?? createNoOpDatabase(), constants);
    this._apiRouterFactory = apiRouterFactory;
    this._appRouterFactory = appRouterFactory;
    this._initMiddleware = customInitMiddleware;
    this.expressApp = express();
    this.server = null;
    this._cspConfig = cspConfig;
    this.registerServices();
  }

  public override async start(uri?: string): Promise<void> {
    const engine = getSuiteCoreI18nEngine({ constants: this.constants });

    // If a database plugin is registered, handle its lifecycle
    if (this._databasePlugin) {
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

      // Dev store setup
      if (this.environment.devDatabase && this._databasePlugin.setupDevStore) {
        const devUri = await this._databasePlugin.setupDevStore();
        if (devUri) {
          uri = devUri;
        }
      }

      try {
        // Connect the database plugin
        await this._databasePlugin.connect(uri);

        // Initialize all plugins (including the database plugin)
        await this.plugins.initAll(this);

        // Wire up auth provider from database plugin
        if (this._databasePlugin.authenticationProvider && !this.authProvider) {
          this.authProvider = this._databasePlugin.authenticationProvider;
        }

        // Dev store initialization (seeding)
        if (
          this.environment.devDatabase &&
          this._databasePlugin.initializeDevStore
        ) {
          await this._databasePlugin.initializeDevStore();
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
    } else {
      // No database plugin — use BaseApplication's IDatabase path
      await super.start(uri, true);
    }

    // Start Express server and routing
    try {
      this._apiRouter = this._apiRouterFactory(this);
      if (isFlexibleCSP(this._cspConfig) || isCSPConfig(this._cspConfig)) {
        this._initMiddleware(
          this.expressApp,
          this._cspConfig.corsWhitelist,
          this._cspConfig.csp,
        );
      } else if (isHelmetOptions(this._cspConfig)) {
        this._initMiddleware(this.expressApp, [], this._cspConfig);
      }
      const appRouter = this._appRouterFactory(this._apiRouter);

      appRouter.init(this.expressApp);

      // Mount admin email inspection router when fake email capture is active
      if (this.environment.emailService === EmailServices.Fake) {
        const requireAuth = (req: Request, res: Response, next: NextFunction) =>
          authenticateToken<TID>(this, req, res, next);
        this.expressApp.use(
          '/api/admin/emails',
          new AdminEmailRouter<TID, IApplication<TID>>(this, requireAuth)
            .router,
        );
      }

      this.expressApp.use(
        (
          err: HandleableError | Error,
          req: Request,
          res: Response,
          _next: NextFunction,
        ) => {
          if (
            res.headersSent ||
            (err as { _errorHandlerProcessing?: boolean })
              ._errorHandlerProcessing
          ) {
            return;
          }
          (
            err as { _errorHandlerProcessing?: boolean }
          )._errorHandlerProcessing = true;

          const safeHandle = () => {
            try {
              const handleableError =
                err instanceof HandleableError
                  ? err
                  : new HandleableError(
                      err instanceof Error ? err : new Error(String(err)),
                      { cause: err },
                    );
              handleError(
                handleableError,
                res,
                sendApiMessageResponse,
                () => {},
              );
            } catch {
              res.status(500).json({
                message: engine.translateStringKey(
                  SuiteCoreStringKey.Error_RecursiveErrorHandlingDetected,
                ),
                error: {
                  message:
                    err instanceof Error
                      ? err.message
                      : engine.translateStringKey(
                          SuiteCoreStringKey.Common_UnexpectedError,
                        ),
                },
              });
            }
          };

          setImmediate(safeHandle);
        },
      );

      const serversReady: Promise<void>[] = [];
      serversReady.push(
        new Promise<void>((resolvePromise) => {
          this.server = this.expressApp.listen(
            this.environment.port,
            this.environment.host,
            () => {
              debugLog(
                this.environment.debug,
                'log',
                `[ ${engine.translateStringKey(
                  SuiteCoreStringKey.Common_Ready,
                )} ] http://${this.environment.host}:${this.environment.port}`,
              );
              resolvePromise();
            },
          ) as ServerWithOptionalClose;
        }),
      );

      if (this.environment.letsEncrypt.enabled) {
        this.greenlockManager = new GreenlockManager(
          this.environment.letsEncrypt,
        );
        serversReady.push(this.greenlockManager.start(this.expressApp));
      } else if (this.environment.httpsDevCertRoot) {
        try {
          const certRoot = normalize(this.environment.httpsDevCertRoot);
          if (!isAbsolute(certRoot) || certRoot.includes('..')) {
            throw new TranslatableSuiteError(
              SuiteCoreStringKey.Error_InvalidCertificatePathMustBeAbsolute,
            );
          }
          const certPath = normalize(resolve(certRoot + '.pem'));
          const keyPath = normalize(resolve(certRoot + '-key.pem'));
          if (certPath.includes('..') || keyPath.includes('..')) {
            throw new TranslatableSuiteError(
              SuiteCoreStringKey.Error_InvalidCertificatePathAfterResolution,
            );
          }
          const options = {
            // amazonq-ignore-next-line fixed above
            key: readFileSync(keyPath),
            // amazonq-ignore-next-line fixed above
            cert: readFileSync(certPath),
          };

          serversReady.push(
            new Promise<void>((resolvePromise) => {
              createServer(options, this.expressApp).listen(
                this.environment.httpsDevPort,
                this.environment.host,
                () => {
                  console.log(
                    `[ ${engine.translateStringKey(
                      SuiteCoreStringKey.Common_Ready,
                    )} ] https://${this.environment.host}:${
                      this.environment.httpsDevPort
                    }`,
                  );
                  resolvePromise();
                },
              );
            }),
          );
        } catch (err) {
          console.error('Failed to start HTTPS server:', err);
        }
      }

      await Promise.all(serversReady);
      this._ready = true;
    } catch (err) {
      console.error(
        engine.translateStringKey(
          SuiteCoreStringKey.Error_FailedToStartApplication,
        ),
        err,
      );
      if (process.env['NODE_ENV'] === 'test') {
        throw err;
      }
      process.exit(1);
    }
  }

  public override async stop(): Promise<void> {
    if (this.greenlockManager) {
      await this.greenlockManager.stop();
      this.greenlockManager = null;
    }

    const engine = getSuiteCoreI18nEngine({ constants: this.constants });
    if (this.server) {
      debugLog(
        this.environment.debug,
        'log',
        `[ ${engine.translateStringKey(
          SuiteCoreStringKey.Common_Stopping,
        )} ] ${engine.translateStringKey(
          SuiteCoreStringKey.Common_ApplicationAndDatabase,
        )}`,
      );
      await new Promise<void>((resolvePromise, reject) => {
        this.server!.closeAllConnections?.();
        this.server!.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolvePromise();
          }
        });
      });
      this.server = null;
    }

    // Database plugin handles its own teardown via stop()
    // which is called by PluginManager.stopAll() in super.stop()
    if (this._databasePlugin) {
      await this.plugins.stopAll();
      this._ready = false;
    } else {
      await super.stop();
    }

    debugLog(
      this.environment.debug,
      'log',
      `[ ${engine.translateStringKey(
        SuiteCoreStringKey.Common_Stopped,
      )} ] ${engine.translateStringKey(
        SuiteCoreStringKey.Common_ApplicationAndDatabase,
      )}`,
    );
  }
}
