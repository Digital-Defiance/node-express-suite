/**
 * @fileoverview Base application interface defining core application structure and services.
 * Database-agnostic — does NOT include Mongoose/MongoDB-specific members.
 * For MongoDB access, use IMongoApplication from './mongo-application'.
 * @module interfaces/application
 */

import type {
  IAuthProviderPort,
  IConstantsPort,
  IDatabasePort,
  IEnvironmentPort,
  IServicesPort,
} from './application-ports';
import { IAuthenticationProvider } from './authentication-provider';
import { IConstants } from './constants';
import type { IEnvironment } from './environment';
import type { IPluginManager, IPluginsPort } from './plugin-manager';
import type { IServiceContainer } from './service-container';
import type { IDatabase } from '@digitaldefiance/suite-core-lib';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Core application interface providing access to all application services and configuration.
 * This interface is database-agnostic. It does NOT expose `db: typeof mongoose` or
 * `getModel()` — those belong on IMongoApplication for Mongoose consumers.
 * It is the full contract that real applications implement. Code that reads only part of it
 * should depend on a port from './application-ports' (or on {@link IPluginsPort}) instead, so a
 * plain object can be passed without a cast.
 * @template TID Platform-specific ID type (Buffer, ObjectId, etc.)
 */
export interface IApplication<TID extends PlatformID = Buffer>
  extends
    IEnvironmentPort<IEnvironment<TID>>,
    IConstantsPort,
    IServicesPort,
    IPluginsPort<TID>,
    IDatabasePort,
    IAuthProviderPort<TID> {
  /** Application environment configuration */
  get environment(): IEnvironment<TID>;
  /** Application constants and configuration values */
  get constants(): IConstants;
  /** Whether the application is ready to handle requests */
  get ready(): boolean;
  /** Service container for dependency injection */
  get services(): IServiceContainer;
  /** Plugin manager for extensibility */
  get plugins(): IPluginManager<TID>;
  /**
   * Storage-agnostic database instance.
   * Both Mongoose-backed apps (via BaseApplication) and BrightChainDb apps
   * can expose their database through this property.
   * Optional — not all applications require a database.
   */
  get database(): IDatabase | undefined;
  /**
   * Storage-agnostic authentication provider.
   * Supplies user lookup, role resolution, and credential verification
   * for the authentication middlewares.
   * Optional — not all applications require authentication.
   */
  get authProvider(): IAuthenticationProvider<TID> | undefined;
  /** Starts the application and initializes all services */
  start(): Promise<void>;
}
