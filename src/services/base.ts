/**
 * @fileoverview Base service class providing common functionality for all services.
 * Includes transaction management utilities.
 * @module services/base
 */

import { IApplication } from '../interfaces/application';
import type { IDatabasePort } from '../interfaces/application-ports';
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
  TApplication extends IDatabasePort = IApplication<TID>,
> {
  protected readonly application: TApplication;

  constructor(application: TApplication) {
    this.application = application;
  }

  /**
   * Run a callback within a database transaction.
   *
   * Session rules:
   * - If the caller passes a `session`, reuse it: the callback receives that
   *   session and no second transaction is opened. (The caller owns commit
   *   and rollback.)
   * - Otherwise, when IDatabase is available (e.g. BrightChainDb, Mongoose via
   *   plugin), open a transaction and pass the adapter's session to the
   *   callback, so the callback's operations commit or roll back with it.
   * - With no database, the callback runs without a session.
   */
  public async withTransaction<T>(
    callback: TransactionCallback<T>,
    session?: unknown,
    options?: { timeoutMs?: number },
    ...args: unknown[]
  ): Promise<T> {
    if (session !== undefined) {
      return await callback(session, ...args);
    }

    const db = this.application.database;
    if (db) {
      return await db.withTransaction(async (adapterSession) => {
        return await callback(adapterSession, ...args);
      });
    }

    return await callback(undefined, ...args);
  }
}
