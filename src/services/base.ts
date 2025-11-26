import { ClientSession, Types } from '@digitaldefiance/mongoose-types';
import { IBaseDocument } from '../documents';
import { Environment } from '../environment';
import { IConstants } from '../interfaces';
import { IApplication } from '../interfaces/application';
import { TransactionCallback } from '../types';
import {
  TransactionOptions,
  withTransaction as utilsWithTransaction,
} from '../utils';

export class BaseService<
  TApplication extends IApplication = IApplication,
> {
  protected readonly application: TApplication;

  constructor(application: TApplication) {
    this.application = application;
  }
  public async withTransaction<T>(
    callback: TransactionCallback<T>,
    session?: ClientSession,
    options?: TransactionOptions,
    ...args: any
  ) {
    return await utilsWithTransaction<T>(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      session,
      callback,
      options ?? {},
      ...args,
    );
  }
}
