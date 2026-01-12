import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { IApplication } from './application';
import { IServerInitResult } from './server-init-result';

export interface ITestEnvironment<TID extends PlatformID = Buffer> {
  application: IApplication<TID>;
  mongoServer: MongoMemoryReplSet;
  mongoUri: string;
  accountData: IServerInitResult<TID>;
  dbName: string;
}
