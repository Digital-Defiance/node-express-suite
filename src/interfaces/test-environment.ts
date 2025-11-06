import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { IServerInitResult } from './server-init-result';
import { IApplication } from './application';

export interface ITestEnvironment {
  application: IApplication;
  mongoServer: MongoMemoryReplSet;
  mongoUri: string;
  accountData: IServerInitResult;
  dbName: string;
}
