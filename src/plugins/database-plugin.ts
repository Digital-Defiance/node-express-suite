/**
 * @fileoverview Database plugin interface.
 * Extends IApplicationPlugin with database-specific lifecycle hooks,
 * allowing database backends to be plugged into an Application as plugins
 * rather than baked into the class hierarchy.
 * @module plugins/database-plugin
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type { IDatabase } from '@digitaldefiance/suite-core-lib';
import type { IAuthenticationProvider } from '../interfaces/authentication-provider';
import type { IApplicationPlugin } from './plugin-interface';

/**
 * Plugin interface for database backends.
 *
 * A database plugin owns the full database lifecycle: connection, disconnection,
 * dev store provisioning, authentication provider wiring, and any
 * backend-specific accessors (e.g. Mongoose models, schema maps).
 *
 * The plugin's `init()` is called during `Application.start()` (via PluginManager)
 * after the base IDatabase has been connected. The plugin can use `init()` to
 * wire up the auth provider, seed dev data, register models, etc.
 *
 * @template TID - Platform ID type (Buffer, ObjectId, etc.)
 */
export interface IDatabasePlugin<
  TID extends PlatformID = Buffer,
> extends IApplicationPlugin<TID> {
  /**
   * The IDatabase instance this plugin manages.
   * The Application will use this as its primary database.
   */
  readonly database: IDatabase;

  /**
   * Optional authentication provider supplied by this database backend.
   * If provided, the Application will set this as its authProvider during start().
   */
  readonly authenticationProvider?: IAuthenticationProvider<TID>;

  /**
   * Connect the database. Called by Application.start() before plugin init.
   * @param uri - Optional connection URI (from environment or dev store).
   */
  connect(uri?: string): Promise<void>;

  /**
   * Disconnect the database. Called by Application.stop().
   */
  disconnect(): Promise<void>;

  /**
   * Whether the database is currently connected.
   */
  isConnected(): boolean;

  /**
   * Optional: provision an ephemeral dev/test database.
   * Returns the connection URI for the provisioned store.
   * Called before connect() when environment.devDatabase is truthy.
   */
  setupDevStore?(): Promise<string>;

  /**
   * Optional: tear down the ephemeral dev/test database on shutdown.
   */
  teardownDevStore?(): Promise<void>;

  /**
   * Optional: seed the database after connection in dev mode.
   * Called after connect() and init() when environment.devDatabase is truthy.
   * May return initialization results (e.g. seeded user data).
   */
  initializeDevStore?(): Promise<unknown>;

  /**
   * Optional: raw database connection object.
   * For Mongo plugins this is `typeof mongoose`.
   * For other backends this may be their native connection type.
   */
  readonly db?: unknown;

  /**
   * Optional: get a model by name.
   * For Mongo plugins this returns a Mongoose Model.
   * Other backends may return their own model type or undefined.
   */
  getModel?<U>(modelName: string): U | undefined;
}
