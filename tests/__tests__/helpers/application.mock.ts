import { SecureString } from '@digitaldefiance/ecies-lib';
import { IApplication } from '../../../src/interfaces/application';
import { Model, Document } from 'mongoose';
import { Environment } from '../../../src/environment';
import { Constants } from '../../../src/constants';

export function createApplicationMock(
  overrides?: Partial<IApplication>,
  envOverrides?: Partial<Environment>
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

  const defaultGetModel = <T extends Document>(name: string): Model<T> => ({} as Model<T>);

  return {
    environment: mockEnvironment,
    constants: Constants,
    db: overrides?.db || ({} as any),
    ready: true,
    start: jest.fn(),
    getModel: overrides?.getModel || defaultGetModel,
  } as IApplication;
}
