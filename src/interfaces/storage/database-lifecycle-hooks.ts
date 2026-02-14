import { IFailableResult } from '../failable-result';

/**
 * Storage-agnostic lifecycle hooks for database initialization.
 * Provided to BaseApplication to enable init, validation, and dev setup
 * regardless of which database backend (IDatabase or IDocumentStore) is used.
 *
 * All hooks are optional, allowing partial configuration.
 * Each hook is a stateless function (or closure) receiving all needed context
 * as parameters, enabling independent unit testing.
 *
 * @template TInitResults - Application-specific initialization result type
 */
export interface IDatabaseLifecycleHooks<TInitResults = unknown> {
  /**
   * Validate a database connection URI before connecting.
   * Should throw on invalid or unsafe URIs.
   * If not provided, BaseApplication uses a default validator.
   */
  validateUri?: (uri: string) => void;

  /**
   * Provision an ephemeral dev/test database.
   * Returns the connection URI for the provisioned store.
   * Called before connect() when environment.devDatabase is truthy.
   */
  setupDevStore?: () => Promise<string>;

  /**
   * Clean up the ephemeral dev/test database on shutdown.
   * Called during stop() if setupDevStore was invoked.
   */
  teardownDevStore?: () => Promise<void>;

  /**
   * Initialize/seed the database after connection.
   * Called after connect() when environment.devDatabase is truthy.
   * Must return a failable result indicating success or failure.
   */
  initializeDatabase?: (
    application: unknown,
  ) => Promise<IFailableResult<TInitResults>>;

  /**
   * Hash the initialization results for logging purposes.
   * Called after successful initializeDatabase when detailedDebug is enabled.
   */
  hashInitResults?: (initResults: TInitResults) => string;
}
