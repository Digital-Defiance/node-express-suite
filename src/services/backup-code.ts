import {
  EmailString,
  MemberType,
  SecureBuffer,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import {
  Member as BackendMember,
  ECIESService,
} from '@digitaldefiance/node-ecies-lib';
import {
  IBackupCode,
  InvalidBackupCodeError,
  ITokenRole,
} from '@digitaldefiance/suite-core-lib';
import { timingSafeEqual } from 'crypto';
import { ClientSession, Types } from 'mongoose';
import { BackupCode } from '../backup-code';
import { LocalhostConstants as AppConstants } from '../constants';
import { IBaseDocument, IUserDocument } from '../documents';
import { Environment } from '../environment';
import { InvalidBackupCodeVersionError } from '../errors/invalid-backup-code-version';
import { IConstants } from '../interfaces';
import { IApplication } from '../interfaces/application';
import { BaseService } from './base';
import { KeyWrappingService } from './index';
import { RoleService } from './role';
import { SymmetricService } from './symmetric';
import { SystemUserService } from './system-user';

/**
 * Service handling generation, storage, validation, consumption, and recovery using backup codes.
 *
 * v1 scheme:
 * - Code: 32 lowercase alphanumerics (a–z0–9), displayed as 8 groups of 4: xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx
 * - Checksum/tag: HKDF-SHA256(codeUtf8, salt, "backup-checksum") → 32 bytes (stored as hex)
 * - KDF for encryption key: Argon2id(codeUtf8, salt) → 32 bytes
 * - Encryption: SymmetricService AEAD (encryptedData must embed IV + authTag + ciphertext)
 * - Wrapping: AEAD blob wrapped with system user's asymmetric key (ECIES)
 */
export class BackupCodeService<
  I = Types.ObjectId,
  D extends Date = Date,
  TTokenRole extends ITokenRole<I, D> = ITokenRole<I, D>,
  TApplication extends IApplication<
    any,
    Types.ObjectId,
    IBaseDocument<any, Types.ObjectId>,
    Environment,
    IConstants
  > = IApplication<
    any,
    Types.ObjectId,
    IBaseDocument<any, Types.ObjectId>,
    Environment,
    IConstants
  >,
> extends BaseService {
  private readonly eciesService: ECIESService;
  private systemUser?: BackendMember;
  private readonly keyWrappingService: KeyWrappingService;
  private readonly roleService: RoleService<I, D, TTokenRole>;

  /**
   * Construct a BackupCodeService.
   */
  constructor(
    application: TApplication,
    eciesService: ECIESService,
    keyWrappingService: KeyWrappingService,
    roleService: RoleService<I, D, TTokenRole>,
  ) {
    super(application);
    this.eciesService = eciesService;
    this.keyWrappingService = keyWrappingService;
    this.roleService = roleService;
  }

  /**
   * Get the lazily-initialized system user for key wrapping/unwrapping.
   */
  private getSystemUser(): BackendMember {
    if (!this.systemUser) {
      this.systemUser = SystemUserService.getSystemUser(
        this.application.environment,
        this.application.constants,
      );
    }
    return this.systemUser;
  }

  /**
   * Forcibly set the system user (for database initialization)
   * @param user
   */
  public setSystemUser(user: BackendMember): void {
    this.systemUser = user;
  }

  /**
   * v1: Consume (validate and remove) a backup code via constant-time checksum match.
   */
  public useBackupCodeV1(
    encryptedBackupCodes: Array<IBackupCode>,
    backupCode: string,
  ): { newCodesArray: Array<IBackupCode>; code: IBackupCode } {
    const normalizedCode = BackupCode.normalizeCode(backupCode);
    if (!AppConstants.BACKUP_CODES.NormalizedHexRegex.test(normalizedCode)) {
      throw new InvalidBackupCodeError();
    }
    const codeBytes = Buffer.from(normalizedCode, 'utf8');
    try {
      for (const code of encryptedBackupCodes) {
        if (code.version !== BackupCode.BackupCodeVersion) continue;
        const checksumSalt = Buffer.from(code.checksumSalt, 'hex');
        const expected = BackupCode.hkdfSha256(
          codeBytes,
          checksumSalt,
          Buffer.from('backup-checksum'),
          32,
        );
        if (
          code.checksum.length === expected.length * 2 &&
          timingSafeEqual(Buffer.from(code.checksum, 'hex'), expected)
        ) {
          const checksumHex = expected.toString('hex');
          return {
            newCodesArray: encryptedBackupCodes.filter(
              (c) => c.checksum !== checksumHex,
            ),
            code,
          };
        }
      }
      throw new InvalidBackupCodeError();
    } finally {
      codeBytes.fill(0);
    }
  }

  /**
   * Consume a backup code by first detecting the version and then dispatching to the appropriate handler.
   */
  public useBackupCode(
    encryptedBackupCodes: Array<IBackupCode>,
    backupCode: string,
  ): { newCodesArray: Array<IBackupCode>; code: IBackupCode } {
    const version = BackupCode.detectBackupCodeVersion(
      encryptedBackupCodes,
      backupCode,
    );
    switch (version) {
      case BackupCode.BackupCodeVersion:
        return this.useBackupCodeV1(
          encryptedBackupCodes.filter(
            (c) => c.version === BackupCode.BackupCodeVersion,
          ),
          backupCode,
        );
      default:
        throw new InvalidBackupCodeVersionError(version);
    }
  }

  /**
   * v1: Recover a user's private key using a backup code.
   */
  public async recoverKeyWithBackupCodeV1(
    userDoc: IUserDocument,
    backupCode: string,
    newPassword?: SecureString,
    session?: ClientSession,
  ): Promise<{
    userDoc: IUserDocument;
    user: BackendMember;
    codeCount: number;
  }> {
    const normalizedCode = BackupCode.normalizeCode(backupCode);
    return await this.withTransaction<{
      userDoc: IUserDocument;
      user: BackendMember;
      codeCount: number;
    }>(
      async (sess: ClientSession | undefined) => {
        const { code, newCodesArray } = this.useBackupCodeV1(
          userDoc.backupCodes,
          normalizedCode,
        );
        userDoc.backupCodes = newCodesArray;

        let decryptionKey: Buffer | undefined;
        try {
          const adminMember = this.getSystemUser();
          decryptionKey = await BackupCode.getBackupKeyV1(
            code.checksumSalt,
            normalizedCode,
            this.application.constants,
          );
          const privateKeyUnwrapped = adminMember.decryptData(
            Buffer.from(code.encrypted, 'hex'),
          );
          const decryptedPrivateKey = new SecureBuffer(
            SymmetricService.decryptBuffer(privateKeyUnwrapped, decryptionKey),
          );

          const memberType: MemberType = await this.roleService.getMemberType(
            userDoc,
            session,
          );
          const user = new BackendMember(
            this.eciesService,
            memberType,
            userDoc.username,
            new EmailString(userDoc.email),
            Buffer.from(userDoc.publicKey, 'hex'),
            decryptedPrivateKey,
            undefined,
            userDoc._id,
            new Date(userDoc.createdAt),
            new Date(userDoc.updatedAt),
          );

          if (!newPassword) {
            await userDoc.save({ session: sess });
            return {
              userDoc,
              user,
              codeCount: newCodesArray.length,
            };
          }

          const wrapped = this.keyWrappingService.wrapSecret(
            decryptedPrivateKey,
            newPassword,
            this.application.constants,
          );
          userDoc.passwordWrappedPrivateKey = wrapped;
          await userDoc.save({ session: sess });
          return { userDoc, user, codeCount: newCodesArray.length };
        } finally {
          if (decryptionKey) decryptionKey.fill(0);
        }
      },
      session,
      {
        timeoutMs: this.application.environment.mongo.transactionTimeout * 5,
      },
    );
  }

  /**
   * Recover a user's private key using a backup code (version-dispatched).
   */
  public async recoverKeyWithBackupCode(
    userDoc: IUserDocument,
    backupCode: string,
    newPassword?: SecureString,
    session?: ClientSession,
  ): Promise<{
    userDoc: IUserDocument;
    user: BackendMember;
    codeCount: number;
  }> {
    const version = BackupCode.detectBackupCodeVersion(
      userDoc.backupCodes,
      backupCode,
    );
    switch (version) {
      case BackupCode.BackupCodeVersion:
        return this.recoverKeyWithBackupCodeV1(
          userDoc,
          backupCode,
          newPassword,
          session,
        );
      default:
        throw new InvalidBackupCodeVersionError(version);
    }
  }

  /**
   * Rewrap system-wrapped AEAD blobs from old system key to new one without touching inner AEAD.
   */
  public async rewrapAllUsersBackupCodes(
    fetchBatch: (afterId?: string, limit?: number) => Promise<IUserDocument[]>,
    saveUser: (user: IUserDocument) => Promise<void>,
    oldSystem: BackendMember,
    newSystem: BackendMember,
    options?: { batchSize?: number; onProgress?: (count: number) => void },
  ): Promise<number> {
    const batchSize = options?.batchSize ?? 500;
    let processed = 0;
    let afterId: string | undefined;

    for (;;) {
      const users = await fetchBatch(afterId, batchSize);
      if (!users.length) break;

      for (const user of users) {
        let modified = false;
        for (const bc of user.backupCodes ?? []) {
          try {
            const sealed = oldSystem.decryptData(
              Buffer.from(bc.encrypted, 'hex'),
            );
            const rewrapped = newSystem.encryptData(sealed).toString('hex');
            if (rewrapped !== bc.encrypted) {
              bc.encrypted = rewrapped;
              modified = true;
            }
          } catch (e) {
            throw new Error(
              `Failed to rewrap backup code for user ${user._id}: ${
                (e as Error).message
              }`,
            );
          }
        }
        if (modified) {
          await saveUser(user);
          processed++;
          options?.onProgress?.(processed);
        }
      }

      afterId =
        (users[users.length - 1]?._id as unknown as string) ?? undefined;
    }
    return processed;
  }
}
