import { InvalidEmailError } from '@digitaldefiance/ecies-lib';
import { I18nEngine } from '@digitaldefiance/i18n-lib';
import { ECIESService } from '@digitaldefiance/node-ecies-lib';
import {
  AccountLockedError,
  AccountStatus,
  AccountStatusError,
  InvalidUsernameError,
  UsernameOrEmailRequiredError,
} from '@digitaldefiance/suite-core-lib';
import { ModelRegistry } from '../../src/model-registry';
import { BackupCodeService } from '../../src/services/backup-code';
import { KeyWrappingService } from '../../src/services/key-wrapping';
import { RoleService } from '../../src/services/role';
import { UserService } from '../../src/services/user';
import { createApplicationMock } from '../__tests__/helpers/application.mock';
import { DummyEmailService } from '../../src/services/dummy-email-service';

beforeAll(() => {
  const mockModel = {
    findOne: jest.fn().mockReturnValue({
      session: jest.fn().mockResolvedValue(null),
    }),
  };
  jest
    .spyOn(ModelRegistry.instance, 'getTypedModel')
    .mockReturnValue(mockModel as any);
  jest.spyOn(ModelRegistry.instance, 'get').mockReturnValue({
    model: mockModel,
    schema: {} as any,
  } as any);

  // Mock I18nEngine for InvalidEmailError
  jest.spyOn(I18nEngine, 'getInstance').mockReturnValue({
    translate: jest.fn().mockReturnValue('Invalid email'),
  } as any);
});

function makeService(userDoc: unknown | null) {
  // Mock UserModel.findOne().session().exec() and .collation().session().exec() chaining
  const execMock = jest.fn().mockResolvedValue(userDoc);
  const sessionMock = jest.fn().mockReturnValue({ exec: execMock });
  const chainable = {
    collation: jest.fn().mockReturnThis(),
    session: sessionMock,
    exec: execMock,
  };

  const mockUserModel = {
    findOne: jest.fn().mockReturnValue(chainable),
  };

  // Mock ModelRegistry to return our mock
  jest
    .spyOn(ModelRegistry.instance, 'getTypedModel')
    .mockReturnValue(mockUserModel as any);
  jest.spyOn(ModelRegistry.instance, 'get').mockReturnValue({
    model: mockUserModel,
    schema: {} as any,
  } as any);

  const application = createApplicationMock();
  // @ts-expect-error - Mock only implements methods under test, not full Model interface
  application.getModel = jest.fn((name: string) => {
    if (name.includes('User')) return mockUserModel;
    return {
      findOne: jest.fn().mockReturnValue({
        session: jest.fn().mockResolvedValue(null),
      }),
    };
  });

  const roleService = new RoleService(application);
  const emailService = new DummyEmailService(application);
  const keyWrap = new KeyWrappingService();
  const eciesService = new ECIESService();
  const backupCodeService = new BackupCodeService(
    application,
    eciesService,
    keyWrap,
    roleService,
  );
  const svc = new UserService(
    application,
    roleService,
    emailService,
    keyWrap,
    backupCodeService,
  );
  return svc;
}

describe('UserService.findUser', () => {
  it('throws when neither email nor username provided', async () => {
    const svc = makeService(null);
    await expect(svc.findUser(undefined, undefined)).rejects.toBeInstanceOf(
      UsernameOrEmailRequiredError,
    );
  });

  it('throws InvalidEmailError when user not found (email path)', async () => {
    const svc = makeService(null);
    await expect(svc.findUser('user@example.com')).rejects.toBeInstanceOf(
      InvalidEmailError,
    );
  });

  it('throws InvalidEmailError when user is deleted (email path)', async () => {
    const svc = makeService({ deletedAt: new Date() });
    await expect(svc.findUser('user@example.com')).rejects.toBeInstanceOf(
      InvalidEmailError,
    );
  });

  it('throws InvalidUsernameError when user is deleted (username path)', async () => {
    const svc = makeService({ deletedAt: new Date() });
    await expect(svc.findUser(undefined, 'user')).rejects.toBeInstanceOf(
      InvalidUsernameError,
    );
  });

  it('returns doc when account is Active', async () => {
    const user = {
      _id: '507f1f77bcf86cd799439011',
      username: 'user',
      email: 'user@example.com',
      accountStatus: AccountStatus.Active,
    };
    const svc = makeService(user);
    const res = await svc.findUser(undefined, 'user');
    expect(res).toBe(user);
  });

  it('throws AccountLockedError when AdminLock', async () => {
    const svc = makeService({
      accountStatus: AccountStatus.AdminLock,
      _id: '507f1f77bcf86cd799439011',
      email: 'user@example.com',
    });
    await expect(svc.findUser('user@example.com')).rejects.toBeInstanceOf(
      AccountLockedError,
    );
  });

  it('throws a status error when PendingEmailVerification', async () => {
    const svc = makeService({
      accountStatus: AccountStatus.PendingEmailVerification,
      _id: '507f1f77bcf86cd799439011',
      email: 'user@example.com',
    });
    await expect(svc.findUser('user@example.com')).rejects.toMatchObject({
      name: expect.stringMatching(
        /PendingEmailVerificationError|AccountStatusError/,
      ),
    });
  });

  it('throws AccountStatusError for unknown status', async () => {
    const svc = makeService({
      accountStatus: 'Weird',
      _id: '507f1f77bcf86cd799439011',
      email: 'user@example.com',
    });
    await expect(svc.findUser('user@example.com')).rejects.toBeInstanceOf(
      AccountStatusError,
    );
  });
});
