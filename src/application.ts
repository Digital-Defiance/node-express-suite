import { HandleableError } from '@digitaldefiance/i18n-lib';
import {
  Constants,
  getSuiteCoreI18nEngine,
  SuiteCoreComponentId,
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
import { Server } from 'http';
import { createServer } from 'https';
import mongoose, { Types } from 'mongoose';
import { isAbsolute, normalize, resolve } from 'path';
import { BaseApplication } from './application-base';
import { IBaseDocument } from './documents/base';
import { Environment } from './environment';
import { IApplication, ICSPConfig, IFailableResult } from './interfaces';
import { IConstants } from './interfaces/constants';
import { initMiddleware } from './middlewares';
import { AppRouter } from './routers/app';
import { BaseRouter } from './routers/base';
import { SchemaMap } from './types';
import { debugLog, handleError, sendApiMessageResponse } from './utils';

/**
 * Application class
 */
type ServerWithOptionalClose = Server & { closeAllConnections?: () => void };

export class Application<
    T,
    I extends Types.ObjectId | string,
    TInitResults,
    TModelDocs extends Record<string, IBaseDocument<any>>,
    TBaseDocument extends IBaseDocument<T, I> = IBaseDocument<T, I>,
    TEnvironment extends Environment = Environment,
    TConstants extends IConstants = IConstants,
    TAppRouter extends AppRouter = AppRouter,
  >
  extends BaseApplication<TModelDocs, TInitResults, TConstants>
  implements IApplication<T, I, TBaseDocument, TEnvironment, TConstants>
{
  public readonly expressApp: ExpressApplication;
  private server: ServerWithOptionalClose | null = null;
  private readonly _cspConfig: ICSPConfig;
  private readonly _apiRouterFactory: (app: IApplication<T, I, TBaseDocument, TEnvironment, TConstants>) => BaseRouter;
  private readonly _appRouterFactory: (apiRouter: BaseRouter) => TAppRouter;
  private _apiRouter?: BaseRouter;

  public override get environment(): TEnvironment {
    return super.environment as TEnvironment;
  }

  constructor(
    environment: TEnvironment,
    apiRouterFactory: (
      app: IApplication<T, I, TBaseDocument, TEnvironment, TConstants>,
    ) => BaseRouter,
    schemaMapFactory: (
      connection: mongoose.Connection,
    ) => SchemaMap<TModelDocs>,
    databaseInitFunction: (
      application: BaseApplication<TModelDocs, TInitResults>,
    ) => Promise<IFailableResult<TInitResults>>,
    initResultHashFunction: (initResults: TInitResults) => string,
    cspConfig: ICSPConfig = {
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
    appRouterFactory: (apiRouter: BaseRouter) => TAppRouter = (apiRouter) => new AppRouter(apiRouter) as TAppRouter,
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
    this.expressApp = express();
    this.server = null;
    this._cspConfig = cspConfig;
  }

  public override async start(mongoUri?: string): Promise<void> {
    const engine = getSuiteCoreI18nEngine();
    await super.start(mongoUri, true);
    try {
      this._apiRouter = this._apiRouterFactory(this);
      initMiddleware(
        this.expressApp,
        this._cspConfig.corsWhitelist,
        this._cspConfig.csp,
      );
      const appRouter = this._appRouterFactory(this._apiRouter);

      appRouter.init(this.expressApp);
      this.expressApp.use(
        (
          err: HandleableError | Error,
          req: Request,
          res: Response,
          next: NextFunction,
        ) => {
          const handleableError =
            err instanceof HandleableError
              ? err
              : new HandleableError(
                  new Error(
                    err.message ||
                      engine.translate(
                        SuiteCoreComponentId,
                        SuiteCoreStringKey.Common_UnexpectedError,
                      ),
                  ),
                  { cause: err },
                );
          handleError(handleableError, res, sendApiMessageResponse, next);
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
                `[ ${engine.translate(
                  SuiteCoreComponentId,
                  SuiteCoreStringKey.Common_Ready,
                )} ] http://${this.environment.host}:${this.environment.port}`,
              );
              resolve();
            },
          ) as ServerWithOptionalClose;
        }),
      );

      if (this.environment.httpsDevCertRoot) {
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
                () => {
                  console.log(
                    `[ ${engine.translate(
                      SuiteCoreComponentId,
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
        engine.translate(
          SuiteCoreComponentId,
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
    const engine = getSuiteCoreI18nEngine();
    if (this.server) {
      debugLog(
        this.environment.debug,
        'log',
        `[ ${engine.translate(
          SuiteCoreComponentId,
          SuiteCoreStringKey.Common_Stopping,
        )} ] ${engine.translate(
          SuiteCoreComponentId,
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
      `[ ${engine.translate(
        SuiteCoreComponentId,
        SuiteCoreStringKey.Common_Stopped,
      )} ] ${engine.translate(
        SuiteCoreComponentId,
        SuiteCoreStringKey.Common_ApplicationAndDatabase,
      )}`,
    );
  }
}
