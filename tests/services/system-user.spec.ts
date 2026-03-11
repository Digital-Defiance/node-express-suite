import {
  EmailString,
  MemberType,
  SecureBuffer,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import { withConsoleMocks } from '@digitaldefiance/express-suite-test-utils';
import {
  Member as BackendMember,
  ECIESService,
} from '@digitaldefiance/node-ecies-lib';
import { TranslatableSuiteError } from '@digitaldefiance/suite-core-lib';
import { createExpressConstants } from '../../src/constants';
import { Environment } from '../../src/environment';
import { SystemUserService } from '../../src/services/system-user';

// Create test constants with valid email domain
const TestConstants = createExpressConstants();

describe('SystemUserService', () => {
  let mockEnvironment: Environment;
  const testPublicKeyHex = '0'.repeat(130);
  const testMnemonic =
    'test test test test test test test test test test test junk';

  beforeEach(() => {
    // Reset static state
    (SystemUserService as any).systemUser = null;

    mockEnvironment = {
      systemMnemonic: new SecureString(testMnemonic),
      systemPublicKeyHex: testPublicKeyHex,
      emailDomain: 'example.com',
    } as Environment;
  });

  describe('getSystemUser', () => {
    it('should throw error if systemMnemonic not set', () => {
      const env = { systemMnemonic: undefined } as Environment;

      expect(() => SystemUserService.getSystemUser(env, TestConstants)).toThrow(
        TranslatableSuiteError,
      );
      expect(() => SystemUserService.getSystemUser(env, TestConstants)).toThrow(
        /not set/i,
      );
    });

    it('should create system user from mnemonic', async () => {
      await withConsoleMocks({ mute: true }, () => {
        const user = SystemUserService.getSystemUser(
          mockEnvironment,
          TestConstants,
        );

        expect(user).toBeInstanceOf(BackendMember);
        expect(user.type).toBe(MemberType.System);
        expect(user.name).toBe(TestConstants.SystemUser);
        expect(user.email.toString()).toBe('system@example.com');
      });
    });

    it('should cache system user on subsequent calls', async () => {
      await withConsoleMocks({ mute: true }, () => {
        const user1 = SystemUserService.getSystemUser(
          mockEnvironment,
          TestConstants,
        );
        const user2 = SystemUserService.getSystemUser(
          mockEnvironment,
          TestConstants,
        );

        expect(user1).toBe(user2);
      });
    });

    it('should warn if derived public key does not match environment', async () => {
      await withConsoleMocks({ mute: true }, (spies) => {
        SystemUserService.getSystemUser(mockEnvironment, TestConstants);

        expect(spies.warn).toHaveBeenCalledWith(
          expect.stringContaining('System public key does not match'),
          expect.any(Object),
        );
      });
    });
  });

  describe('setSystemUser', () => {
    it('should set system user when valid', () => {
      const eciesService = new ECIESService(TestConstants.ECIES);
      const mockUser = new BackendMember(
        eciesService,
        MemberType.System,
        TestConstants.SystemUser,
        new EmailString('system@example.com'),
        Buffer.alloc(65),
        new SecureBuffer(Buffer.alloc(32)),
      );

      SystemUserService.setSystemUser(mockUser, TestConstants);

      const retrieved = SystemUserService.getSystemUser(
        mockEnvironment,
        TestConstants,
      );
      expect(retrieved).toBe(mockUser);
    });

    it('should throw error if user type is not System', () => {
      const eciesService = new ECIESService(TestConstants.ECIES);
      const invalidUser = new BackendMember(
        eciesService,
        MemberType.User,
        'NotSystem',
        new EmailString('test@example.com'),
        Buffer.alloc(65),
        new SecureBuffer(Buffer.alloc(32)),
      );

      expect(() =>
        SystemUserService.setSystemUser(invalidUser, TestConstants),
      ).toThrow(
        'setSystemUser can only be called with a MemberType.System user',
      );
    });

    it('should throw error if user name does not match SystemUser constant', () => {
      const eciesService = new ECIESService(TestConstants.ECIES);
      const invalidUser = new BackendMember(
        eciesService,
        MemberType.System,
        'WrongName',
        new EmailString('system@example.com'),
        Buffer.alloc(65),
        new SecureBuffer(Buffer.alloc(32)),
      );

      expect(() =>
        SystemUserService.setSystemUser(invalidUser, TestConstants),
      ).toThrow(
        'setSystemUser can only be called with a MemberType.System user',
      );
    });
  });
});
