import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { IApplication } from './application';
import { IServerInitResult } from './server-init-result';

export interface ITestEnvironment {
  application: IApplication;
  mongoServer: MongoMemoryReplSet;
  mongoUri: string;
  accountData: IServerInitResult;
  dbName: string;
}
