import { SecureString } from '@digitaldefiance/ecies-lib';
import mongoose, { Document, Model } from '@digitaldefiance/mongoose-types';
import { LocalhostConstants } from '../../../src/constants';
import { ServiceContainer } from '../../../src/container';
import { Environment } from '../../../src/environment';
import { IApplication } from '../../../src/interfaces/application';
import { PluginManager } from '../../../src/plugins';

export function createApplicationMock(
  overrides?: Partial<IApplication>,
  envOverrides?: Partial<Environment>,
): IApplication {
  const mockEnvironment = {
    jwtSecret: new SecureString('test-jwt-secret'),
    mnemonicHmacSecret: new SecureString('test-hmac-secret'),
    mnemonicEncryptionKey: new SecureString('test-encryption-key'),
    timezone: { value: 'UTC' },
    mongo: { useTransactions: false },
    disableEmailSend: true,
    devDatabase: true,
    ...overrides?.environment,
    ...envOverrides,
  } as Environment;

  const defaultGetModel = <T extends Document>(name: string): Model<T> =>
    ({} as Model<T>);

  return {
    environment: mockEnvironment,
    constants: LocalhostConstants,
    disableEmailSend: true,
    db: overrides?.db || ({} as typeof mongoose),
    ready: true,
    async start() {
      /* noop */
    },
    getModel: overrides?.getModel || defaultGetModel,
    services: new ServiceContainer(),
    plugins: new PluginManager(),
  } as IApplication;
}

/**
 * Create a minimal IApplication mock suitable for router/middleware tests.
 */
export function createApplicationMock2(
  apiDistDir: string,
  reactDistDir: string,
  serverUrl: string = 'http://localhost:3000',
  overrides?: Partial<IApplication>,
  envOverrides?: Partial<Environment>,
): IApplication {
  // minimal environment-like object with only fields used by constructors
  const env: Partial<Environment> = {
    debug: false,
    detailedDebug: false,
    serverUrl: serverUrl,
    disableEmailSend: true,
    basePath: '/',
    apiDistDir: apiDistDir,
    reactDistDir: reactDistDir,
    ...envOverrides,
  };

  const application: IApplication = {
    get environment() {
      return { ...env } as Environment;
    },
    get db() {
      return mongoose;
    },
    get ready() {
      return true;
    },
    async start() {
      /* noop */
    },
    getModel<T extends Document>(): Model<T> {
      throw new Error('getModel not implemented in test mock');
    },
    services: new ServiceContainer(),
    plugins: new PluginManager(),
    constants: LocalhostConstants,
    disableEmailSend: true,
    ...(overrides as object),
  } as IApplication;

  return application;
}
