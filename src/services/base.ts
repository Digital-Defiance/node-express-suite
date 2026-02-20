/**
 * @fileoverview Base service class providing common functionality for all services.
 * Includes transaction management utilities.
 * @module services/base
 */

import { ClientSession } from '@digitaldefiance/mongoose-types';
import { IApplication } from '../interfaces/application';
import { IMongoApplication } from '../interfaces/mongo-application';
import { TransactionCallback } from '../types';
import {
  TransactionOptions,
  withTransaction as utilsWithTransaction,
} from '../utils';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Type guard: does the application expose a Mongoose connection?
 */
function isMongoApplication<TID extends PlatformID>(
  app: IApplication<TID>,
): app is IMongoApplication<TID> {
  return 'db' in app && (app as IMongoApplication<TID>).db !== undefined;
}

/**
 * Base service class providing common functionality for all services.
 * Uses IApplication (database-agnostic). When the application is a
 * IMongoApplication, withTransaction delegates to the Mongoose transaction
 * utilities. When only an IDatabase is available, it delegates to
 * IDatabase.withTransaction instead.
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
   * When the application is a IMongoApplication (has .db), delegates to the
   * Mongoose-aware utils.withTransaction with full retry/timeout support.
   *
   * When only IDatabase is available (e.g. BrightChainDb), delegates to
   * IDatabase.withTransaction.
   *
   * When neither is available, runs the callback without a transaction.
   */
  public async withTransaction<T>(
    callback: TransactionCallback<T>,
    session?: ClientSession,
    options?: TransactionOptions<TID>,
    ...args: unknown[]
  ) {
    // Mongoose path — full retry/timeout support
    if (isMongoApplication<TID>(this.application)) {
      return await utilsWithTransaction<T, TID>(
        this.application.db.connection,
        this.application.environment.mongo.useTransactions,
        session,
        callback,
        options ?? {},
        ...args,
      );
    }

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
