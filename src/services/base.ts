/**
 * @fileoverview Base service class providing common functionality for all services.
 * Includes transaction management utilities.
 * @module services/base
 */

import { IApplication } from '../interfaces/application';
import { TransactionCallback } from '../types';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Base service class providing common functionality for all services.
 * Database-agnostic: when an IDatabase is available, withTransaction
 * delegates to IDatabase.withTransaction. Otherwise, the callback
 * runs directly without a transaction.
 *
 * @template TID - Platform ID type (defaults to Buffer)
 * @template TApplication - Application interface type (defaults to IApplication)
 */
export class BaseService<
  TID extends PlatformID = Buffer,
  TApplication extends IApplication<TID> = IApplication<TID>,
> {
  protected readonly application: TApplication;

  constructor(application: TApplication) {
    this.application = application;
  }

  /**
   * Run a callback within a database transaction.
   *
   * When IDatabase is available (e.g. BrightChainDb, Mongoose via plugin),
   * delegates to IDatabase.withTransaction.
   *
   * When no database is available, runs the callback directly without a
   * transaction.
   */
  public async withTransaction<T>(
    callback: TransactionCallback<T>,
    session?: unknown,
    options?: { timeoutMs?: number },
    ...args: unknown[]
  ): Promise<T> {
    // IDatabase path — delegate to IDatabase.withTransaction
    const db = this.application.database;
    if (db) {
      return await db.withTransaction(async () => {
        return await callback(session, ...args);
      });
    }

    // No database — run callback directly without transaction
    return await callback(session, ...args);
  }
}
