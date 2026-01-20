/**
 * @fileoverview Application builder for fluent application construction.
 * Provides builder pattern for creating Application instances.
 * @module builders/application-builder
 */

import mongoose from '@digitaldefiance/mongoose-types';
import {
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';
import { HelmetOptions } from 'helmet';
import { Application } from '../application';
import { BaseApplication } from '../application-base';
import { IBaseDocument } from '../documents';
import { Environment } from '../environment';
import {
  IApplication,
  ICSPConfig,
  IFailableResult,
  IServerInitResult,
} from '../interfaces';
import { IConstants } from '../interfaces/constants';
import { IFlexibleCSP } from '../interfaces/flexible-csp';
import { initMiddleware } from '../middleware-utils';
import { AppRouter } from '../routers/app';
import { BaseRouter } from '../routers/base';
import { SchemaMap } from '../types';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Builder for constructing Application instances with fluent API.
 * @template TID - Platform ID type
 * @template TModelDocs - Model documents type
 * @template TInitResults - Initialization results type
 * @template TConstants - Constants type (defaults to IConstants)
 */
export class ApplicationBuilder<
  TID extends PlatformID,
  TModelDocs extends Record<string, IBaseDocument<any, TID>>,
  TInitResults extends IServerInitResult<TID>,
  TConstants extends IConstants = IConstants,
> {
  private environment?: Environment<TID>;
  private apiRouterFactory?: (app: IApplication<TID>) => BaseRouter<TID>;
  private appRouterFactory?: (apiRouter: BaseRouter<TID>) => AppRouter<TID>;
  private schemaMapFactory?: (
    connection: mongoose.Connection,
  ) => SchemaMap<TID, TModelDocs>;
  private databaseInitFunction?: (
    app: BaseApplication<TID, TModelDocs, TInitResults>,
  ) => Promise<IFailableResult<TInitResults>>;
  private initResultHashFunction?: (results: TInitResults) => string;
  private cspConfig?: ICSPConfig | HelmetOptions | IFlexibleCSP;
  private constants?: TConstants;
  private customInitMiddleware?: typeof initMiddleware;

  withEnvironment(env: Environment<TID>): this {
    this.environment = env;
    return this;
  }

  withApiRouter(factory: (app: any) => BaseRouter<TID>): this {
    this.apiRouterFactory = factory;
    return this;
  }

  withAppRouter(factory: (apiRouter: BaseRouter<TID>) => AppRouter<TID>): this {
    this.appRouterFactory = factory;
    return this;
  }

  withSchemaMap(
    factory: (connection: mongoose.Connection) => SchemaMap<TID, TModelDocs>,
  ): this {
    this.schemaMapFactory = factory;
    return this;
  }

  withDatabaseInit(
    initFn: (
      app: BaseApplication<TID, TModelDocs, TInitResults>,
    ) => Promise<IFailableResult<TInitResults>>,
    hashFn: (results: TInitResults) => string,
  ): this {
    this.databaseInitFunction = initFn;
    this.initResultHashFunction = hashFn;
    return this;
  }

  withCSP(config: ICSPConfig | HelmetOptions | IFlexibleCSP): this {
    this.cspConfig = config;
    return this;
  }

  withConstants(constants: TConstants): this {
    this.constants = constants;
    return this;
  }

  withMiddleware(middleware: typeof initMiddleware): this {
    this.customInitMiddleware = middleware;
    return this;
  }

  build(): Application<
    TInitResults,
    TModelDocs,
    TID,
    Environment<TID>,
    TConstants,
    AppRouter<TID>
  > {
    if (!this.environment)
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_EnvironmentIsRequired,
      );
    if (!this.apiRouterFactory)
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_ApiRouterFactoryIsRequired,
      );
    if (!this.schemaMapFactory)
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_SchemaMapFactoryIsRequired,
      );
    if (!this.databaseInitFunction)
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_DatabaseInitFunctionIsRequired,
      );
    if (!this.initResultHashFunction)
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_InitResultHashFunctionIsRequired,
      );

    return new Application(
      this.environment,
      this.apiRouterFactory,
      this.schemaMapFactory,
      this.databaseInitFunction,
      this.initResultHashFunction,
      this.cspConfig,
      this.constants,
      this.appRouterFactory,
      this.customInitMiddleware,
    );
  }
}
