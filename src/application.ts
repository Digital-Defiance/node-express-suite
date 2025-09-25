import { HandleableError } from '@digitaldefiance/ecies-lib';
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
import mongoose from 'mongoose';
import { resolve, normalize, isAbsolute } from 'path';
import { BaseApplication } from './application-base';
import { IBaseDocument } from './documents/base';
import { Environment } from './environment';
import { ICSPConfig, IFailableResult } from './interfaces';
import { IConstants } from './interfaces/constants';
import { Middlewares } from './middlewares';
import { AppRouter } from './routers/app';
import { BaseRouter } from './routers/base';
import { SchemaMap } from './types';
import { debugLog, handleError, sendApiMessageResponse } from './utils';

/**
 * Application class
 */
export class Application<
  TModelDocs extends Record<string, IBaseDocument<any>>,
  TInitResults,
  TConstants extends IConstants = IConstants,
> extends BaseApplication<TModelDocs, TInitResults, TConstants> {
  public readonly expressApp: ExpressApplication;
  private server: Server | null = null;
  private readonly _cspConfig: ICSPConfig;
  private readonly _apiRouter: BaseRouter;

  constructor(
    environment: Environment,
    apiRouter: BaseRouter,
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
  ) {
    super(
      environment,
      schemaMapFactory,
      databaseInitFunction,
      initResultHashFunction,
      constants,
    );
    this._apiRouter = apiRouter;
    this.expressApp = express();
    this.server = null;
    this._cspConfig = cspConfig;
  }

  public override async start(mongoUri?: string): Promise<void> {
    const engine = getSuiteCoreI18nEngine();
    await super.start(mongoUri, true);
    try {
      Middlewares.init(
        this.expressApp,
        this._cspConfig.corsWhitelist,
        this._cspConfig.csp,
      );
      const appRouter = new AppRouter(this._apiRouter);

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
          );
        }),
      );

      if (this.environment.httpsDevCertRoot) {
        try {
          const certRoot = normalize(this.environment.httpsDevCertRoot);
          if (!isAbsolute(certRoot) || certRoot.includes('..')) {
            throw new TranslatableSuiteError(SuiteCoreStringKey.Error_InvalidCertificatePathMustBeAbsolute);
          }
          const certPath = normalize(resolve(certRoot + '.pem'));
          const keyPath = normalize(resolve(certRoot + '-key.pem'));
          if (certPath.includes('..') || keyPath.includes('..')) {
            throw new TranslatableSuiteError(SuiteCoreStringKey.Error_InvalidCertificatePathAfterResolution);
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
