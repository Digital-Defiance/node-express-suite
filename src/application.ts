/**
 * @fileoverview Main application class with Express server.
 * Extends BaseApplication with HTTP/HTTPS server and routing.
 * @module application
 */

import { HandleableError } from '@digitaldefiance/i18n-lib';
import mongoose from '@digitaldefiance/mongoose-types';
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
import { BaseApplication } from './application-base';
import { IBaseDocument } from './documents/base';
import { Environment } from './environment';
import {
  IApplication,
  ICSPConfig,
  IFailableResult,
  isCSPConfig,
  IServerInitResult,
} from './interfaces';
import { IConstants } from './interfaces/constants';
import { IFlexibleCSP, isFlexibleCSP } from './interfaces/flexible-csp';
import { initMiddleware, isHelmetOptions } from './middleware-utils';
import { AppRouter } from './routers/app';
import { BaseRouter } from './routers/base';
import { DatabaseInitializationService } from './services';
import { SchemaMap } from './types';
import { debugLog, handleError, sendApiMessageResponse } from './utils';
import { GreenlockManager } from './greenlock-manager';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Application class
 */
type ServerWithOptionalClose = Server & { closeAllConnections?: () => void };

export class Application<
  TInitResults extends IServerInitResult<TID>,
  TModelDocs extends Record<string, IBaseDocument<any, TID>>,
  TID extends PlatformID = Buffer,
  TEnvironment extends Environment<TID> = Environment<TID>,
  TConstants extends IConstants = IConstants,
  TAppRouter extends AppRouter<TID> = AppRouter<TID>,
>
  extends BaseApplication<TID, TModelDocs, TInitResults, TConstants>
  implements IApplication<TID>
{
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

  public override get environment(): TEnvironment {
    return super.environment as TEnvironment;
  }

  protected registerServices(): void {
    // Services will be registered by subclasses or ApiRouter
    // Base implementation does nothing
  }

  constructor(
    environment: TEnvironment,
    apiRouterFactory: (app: IApplication<TID>) => BaseRouter<TID>,
    schemaMapFactory: (
      connection: mongoose.Connection,
    ) => SchemaMap<TID, TModelDocs>,
    databaseInitFunction: (
      application: BaseApplication<TID, TModelDocs, TInitResults>,
    ) => Promise<IFailableResult<TInitResults>>,
    initResultHashFunction: (initResults: TInitResults) => string,
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
  ) {
    super(
      environment,
      schemaMapFactory,
      databaseInitFunction,
      initResultHashFunction,
      constants,
    );
    this._apiRouterFactory = apiRouterFactory;
    this._appRouterFactory = appRouterFactory;
    this._initMiddleware = customInitMiddleware;
    this.expressApp = express();
    this.server = null;
    this._cspConfig = cspConfig;
    this.registerServices();
  }

  public override async start(mongoUri?: string): Promise<void> {
    const engine = getSuiteCoreI18nEngine({ constants: this.constants });
    await super.start(mongoUri, true);
    if (this.devDatabase) {
      const result = await this.initializeDevDatabase();
      DatabaseInitializationService.printServerInitResults(result, false);
    }
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
        new Promise<void>((resolve) => {
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
              resolve();
            },
          ) as ServerWithOptionalClose;
        }),
      );

      if (this.environment.letsEncrypt.enabled) {
        // Let's Encrypt mode: start GreenlockManager for HTTPS on 443 + redirect on 80
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
            new Promise<void>((resolve) => {
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
                  resolve();
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
      await new Promise<void>((resolve, reject) => {
        this.server!.closeAllConnections?.();
        this.server!.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      this.server = null;
    }

    await super.stop();
    this._ready = false;
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
