import { Application } from './application';
import { Environment } from './environment';
import { IConstants, IServerInitResult } from './interfaces';
import { LocalhostConstants } from './constants';
import { ApiRouter, AppRouter } from './routers';
import { BaseModelDocs, getSchemaMap } from './schemas';
import { DatabaseInitializationService } from './services';
import { DummyEmailService } from './services/dummy-email-service';
import { emailServiceRegistry } from './registry';

/**
 * Test application concrete class
 */
export class ApplicationConcrete extends Application<IServerInitResult, BaseModelDocs, Environment, IConstants, AppRouter> {
  constructor(
    environment: Environment,
    constants: IConstants = LocalhostConstants,
  ) {
    super(
      environment,
      () => new ApiRouter(this),
      getSchemaMap,
      DatabaseInitializationService.initUserDb.bind(DatabaseInitializationService),
      DatabaseInitializationService.serverInitResultHash.bind(DatabaseInitializationService),
      undefined,
      constants,
      (apiRouter) => new AppRouter(apiRouter),
      undefined
    );
    emailServiceRegistry.setService(new DummyEmailService(this));
  }
}