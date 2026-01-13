/**
 * @fileoverview Concrete implementation of the Application class for testing and development.
 * @module application-concrete
 */

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
 * Concrete implementation of the Application class for testing and development purposes.
 * Provides a ready-to-use application instance with default configuration and dummy email service.
 *
 * @template TID - Platform ID type (Buffer, ObjectId, etc.)
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
  /**
   * Creates a new concrete application instance.
   *
   * @param environment - Application environment configuration
   * @param constants - Application constants (defaults to LocalhostConstants)
   */
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
