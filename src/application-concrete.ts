import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { Application } from './application';
import { LocalhostConstants } from './constants';
import { Environment } from './environment';
import { IConstants, IServerInitResult } from './interfaces';
import { emailServiceRegistry } from './registry';
import { ApiRouter, AppRouter } from './routers';
import { BaseModelDocs, getSchemaMap } from './schemas';
import { DatabaseInitializationService } from './services';
import { DummyEmailService } from './services/dummy-email-service';

/**
 * Test application concrete class
 */
export class ApplicationConcrete<
  TID extends PlatformID = Buffer,
> extends Application<
  IServerInitResult<TID>,
  BaseModelDocs,
  TID,
  Environment<TID>,
  IConstants,
  AppRouter<TID>
> {
  constructor(
    environment: Environment<TID>,
    constants: IConstants = LocalhostConstants,
  ) {
    super(
      environment,
      () => new ApiRouter(this),
      getSchemaMap,
      DatabaseInitializationService.initUserDb.bind(
        DatabaseInitializationService,
      ),
      DatabaseInitializationService.serverInitResultHash.bind(
        DatabaseInitializationService,
      ),
      undefined,
      constants,
      (apiRouter) => new AppRouter(apiRouter),
      undefined,
    );
    emailServiceRegistry.setService(
      new DummyEmailService<TID, typeof this>(this),
    );
  }
}
