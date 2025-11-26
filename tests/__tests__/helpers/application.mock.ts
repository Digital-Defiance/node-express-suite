import { SecureString } from '@digitaldefiance/ecies-lib';
import { Document, Model } from '@digitaldefiance/mongoose-types';
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
    ...overrides?.environment,
    ...envOverrides,
  } as Environment;

  const defaultGetModel = <T extends Document>(name: string): Model<T> =>
    ({}) as Model<T>;

  return {
    environment: mockEnvironment,
    constants: LocalhostConstants,
    db: overrides?.db || ({} as any),
    ready: true,
    start: jest.fn(),
    getModel: overrides?.getModel || defaultGetModel,
    services: new ServiceContainer(),
    plugins: new PluginManager(),
  } as IApplication;
}
