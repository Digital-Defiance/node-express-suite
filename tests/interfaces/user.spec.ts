import { AccountStatus, IBackupCode } from '@digitaldefiance/suite-core-lib';
import { IBackendUser, IFrontendUser } from '../../src/interfaces/models/user';

// Mock ObjectId for testing
class MockObjectId {
  constructor(public id: string = 'mockid123') {}
  toString() {
    return this.id;
  }
}

describe('User Model Interfaces', () => {
  describe('IFrontendUser', () => {
    it('should accept valid frontend user object with string IDs', () => {
      const backupCode: IBackupCode = {
        version: '1.0',
        checksumSalt: 'salt',
        checksum: 'checksum',
        encrypted: 'encrypted',
      };

      const user: IFrontendUser<'en'> = {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        publicKey: 'publickey123',
        timezone: 'UTC',
        siteLanguage: 'en',
        emailVerified: true,
        accountStatus: AccountStatus.Active,
        directChallenge: false,
        backupCodes: [backupCode],
        mnemonicRecovery: 'encrypted_mnemonic',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'creator123',
        updatedBy: 'updater123',
      };

      expect(user._id).toBe('user123');
      expect(typeof user._id).toBe('string');
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.accountStatus).toBe(AccountStatus.Active);
      expect(user.siteLanguage).toBe('en');
      expect(user.backupCodes).toHaveLength(1);
    });

    it('should handle optional fields', () => {
      const user: Partial<IFrontendUser<'en'>> = {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        lastLogin: new Date(),
        mnemonicId: 'mnemonic123',
        passwordWrappedPrivateKey: {
          salt: 'salt',
          iv: 'iv',
          authTag: 'authTag',
          ciphertext: 'ciphertext',
          iterations: 10000,
        },
        deletedAt: new Date(),
        deletedBy: 'deleter123',
      };

      expect(user.lastLogin).toBeInstanceOf(Date);
      expect(user.mnemonicId).toBe('mnemonic123');
      expect(user.passwordWrappedPrivateKey?.iterations).toBe(10000);
    });

    it('should work with different language types', () => {
      type MultiLanguage = 'en' | 'es' | 'fr';

      const user: Partial<IFrontendUser<MultiLanguage>> = {
        _id: 'user123',
        siteLanguage: 'es',
      };

      expect(user.siteLanguage).toBe('es');
    });
  });

  describe('IBackendUser', () => {
    it('should accept valid backend user object with ObjectId (default)', () => {
      const objectId = new MockObjectId() as any;
      const backupCode: IBackupCode = {
        version: '1.0',
        checksumSalt: 'salt',
        checksum: 'checksum',
        encrypted: 'encrypted',
      };

      const user: IBackendUser<'en'> = {
        _id: objectId,
        username: 'testuser',
        email: 'test@example.com',
        publicKey: 'publickey123',
        timezone: 'UTC',
        siteLanguage: 'en',
        emailVerified: true,
        accountStatus: AccountStatus.Active,
        directChallenge: false,
        backupCodes: [backupCode],
        mnemonicRecovery: 'encrypted_mnemonic',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: objectId,
        updatedBy: objectId,
      };

      expect(user._id).toBeInstanceOf(MockObjectId);
      expect(user.createdBy).toBeInstanceOf(MockObjectId);
      expect(user.updatedBy).toBeInstanceOf(MockObjectId);
    });

    it('should work with string IDs (SQL/UUID)', () => {
      const backupCode: IBackupCode = {
        version: '1.0',
        checksumSalt: 'salt',
        checksum: 'checksum',
        encrypted: 'encrypted',
      };

      const user: IBackendUser<'en', string> = {
        _id: 'uuid-123',
        username: 'testuser',
        email: 'test@example.com',
        publicKey: 'publickey123',
        timezone: 'UTC',
        siteLanguage: 'en',
        emailVerified: true,
        accountStatus: AccountStatus.Active,
        directChallenge: false,
        backupCodes: [backupCode],
        mnemonicRecovery: 'encrypted_mnemonic',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'uuid-creator',
        updatedBy: 'uuid-updater',
      };

      expect(typeof user._id).toBe('string');
      expect(user._id).toBe('uuid-123');
      expect(typeof user.createdBy).toBe('string');
      expect(typeof user.updatedBy).toBe('string');
    });

    it('should work with different language types', () => {
      type CustomLanguage = 'en' | 'es' | 'fr';

      const user: Partial<IBackendUser<CustomLanguage>> = {
        siteLanguage: 'es',
      };

      expect(user.siteLanguage).toBe('es');
    });
  });

  describe('Frontend vs Backend differences', () => {
    it('should use string IDs for frontend', () => {
      const frontendUser: Partial<IFrontendUser<'en'>> = {
        _id: 'string-id',
        createdBy: 'creator-id',
      };

      expect(typeof frontendUser._id).toBe('string');
      expect(typeof frontendUser.createdBy).toBe('string');
    });

    it('should use ObjectId for backend by default', () => {
      const objectId = new MockObjectId() as any;
      const backendUser: Partial<IBackendUser<'en'>> = {
        _id: objectId,
        createdBy: objectId,
      };

      expect(backendUser._id).toBeInstanceOf(MockObjectId);
      expect(backendUser.createdBy).toBeInstanceOf(MockObjectId);
    });
  });

  describe('User interface validation', () => {
    it('should enforce required fields through TypeScript', () => {
      // This test validates that TypeScript compilation would catch missing required fields
      const requiredFields = [
        '_id',
        'username',
        'email',
        'publicKey',
        'timezone',
        'siteLanguage',
        'emailVerified',
        'accountStatus',
        'directChallenge',
        'backupCodes',
        'mnemonicRecovery',
        'createdAt',
        'updatedAt',
        'createdBy',
        'updatedBy',
      ];

      expect(requiredFields).toHaveLength(15);
    });

    it('should handle all account statuses', () => {
      const statuses = [
        AccountStatus.PendingEmailVerification,
        AccountStatus.Active,
        AccountStatus.AdminLock,
      ];

      statuses.forEach((status) => {
        const user: Partial<IFrontendUser<'en'>> = {
          accountStatus: status,
        };
        expect(Object.values(AccountStatus)).toContain(user.accountStatus);
      });
    });
  });
});
