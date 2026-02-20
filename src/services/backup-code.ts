/**
 * @fileoverview Backup code service for secure account recovery.
 * Implements v1.0.0 backup code scheme with Argon2id KDF and HKDF-SHA256 checksums.
 * @module services/backup-code
 */

import {
  EmailString,
  MemberType,
  SecureBuffer,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import { ClientSession } from '@digitaldefiance/mongoose-types';
import {
  Member as BackendMember,
  ECIESService,
  PlatformID,
} from '@digitaldefiance/node-ecies-lib';
import {
  IBackupCode,
  InvalidBackupCodeError,
  ITokenRole,
} from '@digitaldefiance/suite-core-lib';
import { timingSafeEqual } from 'crypto';
import { BackupCode } from '../backup-code';
import { LocalhostConstants as AppConstants } from '../constants';
import { IUserDocument } from '../documents';
import { InvalidBackupCodeVersionError } from '../errors/invalid-backup-code-version';
import { IApplication } from '../interfaces/application';
import { BaseService } from './base';
import { KeyWrappingService } from './index';
import { RoleService } from './role';
import { SymmetricService } from './symmetric';
import { SystemUserService } from './system-user';

/**
 * Service for backup code generation, validation, and key recovery.
 * Implements secure backup code scheme with constant-time validation and key wrapping.
 * @template TID - Platform ID type (defaults to Buffer)
 * @template TDate - Date type (defaults to Date)
 * @template TTokenRole - Token role interface type
 * @template TApplication - Application interface type
 * @extends {BaseService<TID>}
 */
export class BackupCodeService<
  TID extends PlatformID = Buffer,
  TDate extends Date = Date,
  TTokenRole extends ITokenRole<TID, TDate> = ITokenRole<TID, TDate>,
  TApplication extends IApplication<TID> = IApplication<TID>,
> extends BaseService<TID> {
  private readonly eciesService: ECIESService<TID>;
  private systemUser?: BackendMember<TID>;
  private readonly keyWrappingService: KeyWrappingService;
  private readonly roleService: RoleService<TID, TDate, TTokenRole>;

  /**
   * Construct a BackupCodeService.
   */
  constructor(
    application: TApplication,
    eciesService: ECIESService<TID>,
    keyWrappingService: KeyWrappingService,
    roleService: RoleService<TID, TDate, TTokenRole>,
  ) {
    super(application);
    this.eciesService = eciesService;
    this.keyWrappingService = keyWrappingService;
    this.roleService = roleService;
  }

  /**
   * Get the lazily-initialized system user for key wrapping/unwrapping.
   */
  private getSystemUser(): BackendMember<TID> {
    if (!this.systemUser) {
      // System user is always created with Buffer IDs, but we need to cast to the generic type I
      // This is safe because the system user's ID type is compatible with all ID types
      this.systemUser = SystemUserService.getSystemUser(
        this.application.environment,
        this.application.constants,
      ) as unknown as BackendMember<TID>;
    }
    return this.systemUser;
  }

  /**
   * Forcibly set the system user (for database initialization)
   * @param user
   */
  public setSystemUser(user: BackendMember<TID>): void {
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
    userDoc: IUserDocument<string, TID>,
    backupCode: string,
    newPassword?: SecureString,
    session?: ClientSession,
  ): Promise<{
    userDoc: IUserDocument<string, TID>;
    user: BackendMember<TID>;
    codeCount: number;
  }> {
    const normalizedCode = BackupCode.normalizeCode(backupCode);
    return await this.withTransaction<{
      userDoc: IUserDocument<string, TID>;
      user: BackendMember<TID>;
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
    userDoc: IUserDocument<string, TID>,
    backupCode: string,
    newPassword?: SecureString,
    session?: ClientSession,
  ): Promise<{
    userDoc: IUserDocument<string, TID>;
    user: BackendMember<TID>;
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
    fetchBatch: (
      afterId?: string,
      limit?: number,
    ) => Promise<IUserDocument<string, TID>[]>,
    saveUser: (user: IUserDocument<string, TID>) => Promise<void>,
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

      afterId = users[users.length - 1]?._id?.toString() ?? undefined;
    }
    return processed;
  }
}
