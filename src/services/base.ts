import { ClientSession } from '@digitaldefiance/mongoose-types';
import { IApplication } from '../interfaces/application';
import { TransactionCallback } from '../types';
import {
  TransactionOptions,
  withTransaction as utilsWithTransaction,
} from '../utils';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

export class BaseService<
  TID extends PlatformID = Buffer,
  TApplication extends IApplication<TID> = IApplication<TID>,
> {
  protected readonly application: TApplication;

  constructor(application: TApplication) {
    this.application = application;
  }
  public async withTransaction<T>(
    callback: TransactionCallback<T>,
    session?: ClientSession,
    options?: TransactionOptions<TID>,
    ...args: unknown[]
  ) {
    return await utilsWithTransaction<T, TID>(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      session,
      callback,
      options ?? {},
      ...args,
    );
  }
}
