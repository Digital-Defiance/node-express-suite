import {
  ECIES,
  EmailString,
  IECIESConfig,
  MemberType,
  SecureBuffer,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import {
  CoreLanguageCode,
  TranslatableGenericError,
  TranslatableHandleableGenericError,
} from '@digitaldefiance/i18n-lib';
import {
  Member as BackendMember,
  ECIESService,
} from '@digitaldefiance/node-ecies-lib';
import {
  AccountStatus,
  getSuiteCoreI18nEngine,
  IFailableResult,
  IMnemonicBase,
  SuiteCoreComponentId,
  SuiteCoreStringKey,
  TranslatableSuiteError,
  TranslatableSuiteHandleableError,
} from '@digitaldefiance/suite-core-lib';
import { crc32 } from 'crc';
import { createHash, randomBytes } from 'crypto';
import { ObjectId as MongoObjectId } from 'mongodb';
import { Connection, Types } from 'mongoose';
import { BackupCode } from '../backup-code';
import { IBaseDocument } from '../documents/base';
import { IRoleDocument } from '../documents/role';
import { IUserDocument } from '../documents/user';
import { IUserRoleDocument } from '../documents/user-role';
import { BaseModelName } from '../enumerations/base-model-name';
import { Environment } from '../environment';
import { IConstants } from '../interfaces';
import { IApplication } from '../interfaces/application';
import { IServerInitResult } from '../interfaces/server-init-result';
import { ModelRegistry } from '../model-registry';
import { KeyWrappingService } from '../services/key-wrapping';
import { debugLog, withTransaction } from '../utils';
import { BackupCodeService } from './backup-code';
import { MnemonicService } from './mnemonic';
import { RoleService } from './role';
import { SystemUserService } from './system-user';

export abstract class DatabaseInitializationService {
  // Static initialization state management
  protected static initializationPromises = new Map<
    string,
    Promise<IFailableResult<IServerInitResult>>
  >();
  protected static initializationLock = new Map<string, boolean>();
  protected static defaultI18nTFunc(
    componentId: string,
    str: string,
    variables?: Record<string, any>,
    language?: string
  ): string {
    // Use the I18nEngine's t() function which handles {{component.key}} syntax
    return getSuiteCoreI18nEngine().t(str, variables, language);
  }

  /**
   * Get the mnemonic or generate a new one if not present
   * @param mnemonic The existing mnemonic or undefined
   * @param eciesService The ECIES service to generate a new mnemonic
   * @returns The existing or new mnemonic
   */
  public static mnemonicOrNew(
    mnemonic: SecureString | undefined,
    eciesService: ECIESService,
  ): SecureString {
    return mnemonic && mnemonic.hasValue
      ? mnemonic
      : eciesService.generateNewMnemonic();
  }
  /**
   * Generate a cache key for a user based on their details
   * @param username The username
   * @param email The email address
   * @param mnemonic The mnemonic
   * @param id The user ID
   * @returns The generated cache key
   */
  public static cacheKey(
    username: string,
    email: EmailString,
    mnemonic: SecureString,
    id: Types.ObjectId,
  ): string {
    const combined = `${username}|${email.email}|${
      mnemonic.value
    }|${id.toString()}`;
    const buffer = Buffer.from(combined, 'utf-8');
    const crcHash = crc32(buffer);
    return crcHash.toString(16).padStart(8, '0');
  }
  /**
   * Get a cached BackendMember or create a new one if not cached
   * @param username The username
   * @param email The email address
   * @param mnemonic The mnemonic or undefined to generate a new one
   * @param memberType The type of member (Admin, Member, System)
   * @param eciesService The ECIES service to handle key generation
   * @param memberId Optional specific member ID to use
   * @param createdBy Optional ID of the user who created this member
   * @returns The cached or newly created BackendMember and the mnemonic used
   */
  public static cacheOrNew(
    username: string,
    email: EmailString,
    mnemonic: SecureString | undefined,
    memberType: MemberType,
    eciesService: ECIESService,
    memberId?: Types.ObjectId,
    createdBy?: Types.ObjectId,
  ): {
    member: BackendMember;
    mnemonic: SecureString;
  } {
    const m = this.mnemonicOrNew(mnemonic, eciesService);

    const newId: Types.ObjectId = memberId ? memberId : new MongoObjectId();
    const key = DatabaseInitializationService.cacheKey(
      username,
      email,
      m,
      newId,
    );
    if (!global.__MEMBER_CACHE__) {
      global.__MEMBER_CACHE__ = new Map<
        string,
        {
          member: BackendMember;
          mnemonic: SecureString;
        }
      >();
    }
    if (!global.__MEMBER_CACHE__.has(key)) {
      const { wallet } = eciesService.walletAndSeedFromMnemonic(m);

      // Get private key from wallet
      const privateKey = wallet.getPrivateKey();
      // Get public key with 0x04 prefix
      const publicKeyWithPrefix = Buffer.concat([
        Buffer.from([ECIES.PUBLIC_KEY_MAGIC]),
        wallet.getPublicKey(),
      ]) as Buffer;

      const user: BackendMember = new BackendMember(
        eciesService,
        memberType,
        username,
        email,
        publicKeyWithPrefix,
        new SecureBuffer(privateKey),
        wallet,
        newId,
        undefined,
        undefined,
        createdBy,
      );
      global.__MEMBER_CACHE__.set(key, { mnemonic: m, member: user });
      return { mnemonic: m, member: user };
    } else {
      return global.__MEMBER_CACHE__.get(key)!;
    }
  }

  /**
   * Generate a random password
   * @param length The length of the password
   * @returns The generated password
   */
  public static generatePassword(length: number): string {
    const specialCharacters = "!@#$%^&*()_+-=[]{};':|,.<>/?";
    const numbers = '0123456789';
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

    // Get a random character from a string
    const getRandomChar = (chars: string): string => {
      // amazonq-ignore-next-line false positive
      const randomIndex = randomBytes(1)[0] % chars.length;
      return chars[randomIndex];
    };

    // Start with one of each required character type
    // amazonq-ignore-next-line false positive
    let password = '';
    password += getRandomChar(letters);
    password += getRandomChar(numbers);
    password += getRandomChar(specialCharacters);

    // Fill the rest with random characters from all types
    const allCharacters = specialCharacters + numbers + letters;
    for (let i = password.length; i < length; i++) {
      password += getRandomChar(allCharacters);
    }

    // Shuffle the password characters to avoid predictable pattern
    const chars = password.split('');
    for (let i = chars.length - 1; i > 0; i--) {
      // amazonq-ignore-next-line already fixed
      const j = randomBytes(1)[0] % (i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
  }

  /**
   * Drops the database
   * @param connection The database connection
   * @returns True if the database was dropped, false if not connected
   */
  public static async dropDatabase(connection: Connection): Promise<boolean> {
    if (!connection.db) return false;
    debugLog(
      true,
      'warn',
      this.defaultI18nTFunc('suite-core-lib', '{{SuiteCoreStringKey.Admin_DroppingDatabase}}'),
    );
    return connection.db.dropDatabase();
  }

  public static getInitOptions(
    application: IApplication,
  ): {
    adminId?: Types.ObjectId;
    adminMnemonic?: SecureString;
    adminPassword?: SecureString;
    adminRoleId?: Types.ObjectId;
    adminUserRoleId?: Types.ObjectId;
    adminBackupCodes?: BackupCode[];
    memberId?: Types.ObjectId;
    memberMnemonic?: SecureString;
    memberPassword?: SecureString;
    memberRoleId?: Types.ObjectId;
    memberUserRoleId?: Types.ObjectId;
    memberBackupCodes?: BackupCode[];
    systemId?: Types.ObjectId;
    systemMnemonic?: SecureString;
    systemPassword?: SecureString;
    systemRoleId?: Types.ObjectId;
    systemUserRoleId?: Types.ObjectId;
    systemBackupCodes?: BackupCode[];
  } {
    return {
      adminId: application.environment.adminId
        ? application.environment.adminId
        : undefined,
      adminMnemonic: application.environment.adminMnemonic?.hasValue
        ? application.environment.adminMnemonic
        : undefined,
      adminPassword: application.environment.adminPassword?.hasValue
        ? application.environment.adminPassword
        : undefined,
      adminRoleId: application.environment.adminRoleId
        ? application.environment.adminRoleId
        : undefined,
      adminUserRoleId: application.environment.adminUserRoleId
        ? application.environment.adminUserRoleId
        : undefined,
      adminBackupCodes: application.environment.adminBackupCodes
        ? application.environment.adminBackupCodes
        : undefined,
      memberId: application.environment.memberId
        ? application.environment.memberId
        : undefined,
      memberMnemonic: application.environment.memberMnemonic?.hasValue
        ? application.environment.memberMnemonic
        : undefined,
      memberPassword: application.environment.memberPassword?.hasValue
        ? application.environment.memberPassword
        : undefined,
      memberRoleId: application.environment.memberRoleId
        ? application.environment.memberRoleId
        : undefined,
      memberUserRoleId: application.environment.memberUserRoleId
        ? application.environment.memberUserRoleId
        : undefined,
      memberBackupCodes: application.environment.memberBackupCodes
        ? application.environment.memberBackupCodes
        : undefined,
      systemId: application.environment.systemId
        ? application.environment.systemId
        : undefined,
      systemMnemonic: application.environment.systemMnemonic?.hasValue
        ? application.environment.systemMnemonic
        : undefined,
      systemPassword: application.environment.systemPassword?.hasValue
        ? application.environment.systemPassword
        : undefined,
      systemRoleId: application.environment.systemRoleId
        ? application.environment.systemRoleId
        : undefined,
      systemUserRoleId: application.environment.systemUserRoleId
        ? application.environment.systemUserRoleId
        : undefined,
      systemBackupCodes: application.environment.systemBackupCodes
        ? application.environment.systemBackupCodes
        : undefined,
    };
  }

  public static serverInitResultHash(
    serverInitResult: IServerInitResult,
  ): string {
    const h = createHash('sha256');
    h.update(serverInitResult.adminUser._id.toHexString());
    h.update(serverInitResult.adminRole._id.toHexString());
    h.update(serverInitResult.adminUserRole._id.toHexString());
    h.update(serverInitResult.adminUsername);
    h.update(serverInitResult.adminEmail);
    h.update(serverInitResult.adminMnemonic);
    h.update(serverInitResult.adminPassword);
    h.update(serverInitResult.adminUser.publicKey);
    serverInitResult.adminBackupCodes.map((bc) => h.update(bc));
    h.update(serverInitResult.memberUser._id.toHexString());
    h.update(serverInitResult.memberRole._id.toHexString());
    h.update(serverInitResult.memberUserRole._id.toHexString());
    h.update(serverInitResult.memberUsername);
    h.update(serverInitResult.memberEmail);
    h.update(serverInitResult.memberMnemonic);
    h.update(serverInitResult.memberPassword);
    h.update(serverInitResult.memberUser.publicKey);
    serverInitResult.memberBackupCodes.map((bc) => h.update(bc));
    h.update(serverInitResult.systemUser._id.toHexString());
    h.update(serverInitResult.systemRole._id.toHexString());
    h.update(serverInitResult.systemUserRole._id.toHexString());
    h.update(serverInitResult.systemUsername);
    h.update(serverInitResult.systemEmail);
    h.update(serverInitResult.systemMnemonic);
    h.update(serverInitResult.systemPassword);
    h.update(serverInitResult.systemUser.publicKey);
    serverInitResult.systemBackupCodes.map((bc) => h.update(bc));
    return h.digest('hex');
  }

  /**
   * Initialize the user database with default users and roles (with dependency injection)
   * @param application The application
   * @param keyWrappingService The key wrapping service
   * @param mnemonicService The mnemonic service
   * @param eciesService The ECIES service
   * @param roleService The role service
   * @param backupCodeService The backup code service
   * @returns The result of the initialization
   */
  public static async initUserDbWithServices(
    application: IApplication,
    keyWrappingService: KeyWrappingService,
    mnemonicService: MnemonicService,
    eciesService: ECIESService,
    roleService: RoleService,
    backupCodeService: BackupCodeService,
  ): Promise<IFailableResult<IServerInitResult>> {
    const isTestEnvironment = process.env['NODE_ENV'] === 'test';
    const options = DatabaseInitializationService.getInitOptions(application);
    const UserModel = ModelRegistry.instance.getTypedModel<IUserDocument>(
      BaseModelName.User,
    );
    const RoleModel = ModelRegistry.instance.getTypedModel<IRoleDocument>(
      BaseModelName.Role,
    );
    const adminUserId = options.adminId ?? new Types.ObjectId();
    const adminRoleId = options.adminRoleId ?? new Types.ObjectId();
    const adminUserRoleId = options.adminUserRoleId ?? new Types.ObjectId();
    const memberUserId = options.memberId ?? new Types.ObjectId();
    const memberRoleId = options.memberRoleId ?? new Types.ObjectId();
    const memberUserRoleId = options.memberUserRoleId ?? new Types.ObjectId();
    const systemUserId = options.systemId ?? new Types.ObjectId();
    const systemRoleId = options.systemRoleId ?? new Types.ObjectId();
    const systemUserRoleId = options.systemUserRoleId ?? new Types.ObjectId();

    // Check for existing users and roles with optimized queries
    // Use lean() for better performance on read-only operations
    const [existingUsers, existingRoles] = await Promise.all([
      UserModel.find({
        username: {
          $in: [
            application.constants.SystemUser,
            application.constants.AdministratorUser,
            application.constants.MemberUser,
          ],
        },
      }).lean(),
      RoleModel.find({
        name: {
          $in: [
            application.constants.AdministratorRole,
            application.constants.MemberRole,
            application.constants.SystemRole,
          ],
        },
      }).lean(),
    ]);

    if (existingUsers.length > 0 || existingRoles.length > 0) {
      // Database is already initialized, return the existing data
      const existingAdminUser = existingUsers.find(
        (u) => u.username === application.constants.AdministratorUser,
      );
      const existingMemberUser = existingUsers.find(
        (u) => u.username === application.constants.MemberUser,
      );
      const existingSystemUser = existingUsers.find(
        (u) => u.username === application.constants.SystemUser,
      );

      if (existingAdminUser && existingMemberUser && existingSystemUser) {
        const adminUserDoc = UserModel.hydrate(existingAdminUser);
        const memberUserDoc = UserModel.hydrate(existingMemberUser);
        const systemUserDoc = UserModel.hydrate(existingSystemUser);

        // Try to construct a minimal result from existing data
        // Note: This is a fallback case and some data may not be available
        const UserRoleModel =
          ModelRegistry.instance.getTypedModel<IUserRoleDocument>(
            BaseModelName.UserRole,
          );
        const [
          adminRole,
          memberRole,
          systemRole,
          adminUserRole,
          memberUserRole,
          systemUserRole,
        ] = await Promise.all([
          RoleModel.findOne({ name: application.constants.AdministratorRole }),
          RoleModel.findOne({ name: application.constants.MemberRole }),
          RoleModel.findOne({ name: application.constants.SystemRole }),
          UserRoleModel.findOne({ userId: adminUserDoc._id }),
          UserRoleModel.findOne({ userId: memberUserDoc._id }),
          UserRoleModel.findOne({ userId: systemUserDoc._id }),
        ]);

        if (
          adminRole &&
          memberRole &&
          systemRole &&
          adminUserRole &&
          memberUserRole &&
          systemUserRole
        ) {
          return {
            success: true,
            data: {
              adminRole,
              adminUserRole,
              adminUser: adminUserDoc,
              adminUsername: adminUserDoc.username,
              adminEmail: adminUserDoc.email,
              adminMnemonic: '', // Not available in fallback
              adminPassword: '', // Not available in fallback
              adminBackupCodes: [], // Not available in fallback
              adminMember: {} as BackendMember, // Not available in fallback
              memberRole,
              memberUserRole,
              memberUser: memberUserDoc,
              memberUsername: memberUserDoc.username,
              memberEmail: memberUserDoc.email,
              memberMnemonic: '', // Not available in fallback
              memberPassword: '', // Not available in fallback
              memberBackupCodes: [], // Not available in fallback
              memberMember: {} as BackendMember, // Not available in fallback
              systemRole,
              systemUserRole,
              systemUser: systemUserDoc,
              systemUsername: systemUserDoc.username,
              systemEmail: systemUserDoc.email,
              systemMnemonic: '', // Not available in fallback
              systemPassword: '', // Not available in fallback
              systemBackupCodes: [], // Not available in fallback
              systemMember: {} as BackendMember, // Not available in fallback
            },
          };
        }
      }

      return {
        success: false,
        message: getSuiteCoreI18nEngine().translate(
          SuiteCoreComponentId,
          SuiteCoreStringKey.Admin_DatabaseAlreadyInitialized,
        ),
        error: new Error(
          getSuiteCoreI18nEngine().translate(
            SuiteCoreComponentId,
            SuiteCoreStringKey.Admin_DatabaseAlreadyInitialized,
          ),
        ),
      };
    }

    debugLog(
      application.environment.detailedDebug,
      'log',
      getSuiteCoreI18nEngine().translate(
        SuiteCoreComponentId,
        SuiteCoreStringKey.Admin_SettingUpUsersAndRoles,
      ),
    );
    const now = new Date();

    // Add a small random delay in test environments to reduce collision probability
    if (isTestEnvironment) {
      const delay = (randomBytes(1)[0] % 50) + 10; // 10-60ms random delay (reduced)
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      // Use test-optimized settings for better performance
      const transactionOptions = isTestEnvironment
        ? { timeoutMs: 15000, retryAttempts: 2 } // Reduced timeout and retries for tests
        : { timeoutMs: 120000 }; // Keep original production timeout

      const result = await withTransaction<{
        adminRole: IRoleDocument;
        memberRole: IRoleDocument;
        systemRole: IRoleDocument;
        systemDoc: IUserDocument;
        systemUserRoleDoc: IUserRoleDocument;
        systemPassword: string;
        systemMnemonic: string;
        systemBackupCodes: SecureString[];
        systemMember: BackendMember;
        adminDoc: IUserDocument;
        adminUserRoleDoc: IUserRoleDocument;
        adminPassword: string;
        adminMnemonic: string;
        adminBackupCodes: SecureString[];
        adminMember: BackendMember;
        memberDoc: IUserDocument;
        memberUserRoleDoc: IUserRoleDocument;
        memberPassword: string;
        memberMnemonic: string;
        memberBackupCodes: SecureString[];
        memberUser: BackendMember;
      }>(
        application.db.connection,
        application.environment.mongo.useTransactions,
        undefined,
        async (sess) => {
          // Check if admin role already exists
          let adminRole = await RoleModel.findOne({
            name: application.constants.AdministratorRole,
          }).session(sess ?? null);
          if (!adminRole) {
            const adminRoleDocs = await RoleModel.create(
              [
                {
                  _id: adminRoleId,
                  name: application.constants.AdministratorRole,
                  admin: true,
                  member: true,
                  system: false,
                  child: false,
                  createdAt: now,
                  updatedAt: now,
                  createdBy: systemUserId,
                  updatedBy: systemUserId,
                },
              ],
              { session: sess },
            );
            if (adminRoleDocs.length !== 1) {
              throw new TranslatableSuiteError(
                SuiteCoreStringKey.Error_FailedToCreateRoleTemplate,
                {
                  NAME: application.constants.AdministratorRole,
                },
              );
            }
            adminRole = adminRoleDocs[0];
          }

          // Check if member role already exists
          let memberRole = await RoleModel.findOne({
            name: application.constants.MemberRole,
          }).session(sess ?? null);
          if (!memberRole) {
            const memberRoleDocs = await RoleModel.create(
              [
                {
                  _id: memberRoleId,
                  name: application.constants.MemberRole,
                  admin: false,
                  member: true,
                  child: false,
                  system: false,
                  createdAt: now,
                  updatedAt: now,
                  createdBy: systemUserId,
                  updatedBy: systemUserId,
                },
              ],
              { session: sess },
            );
            if (memberRoleDocs.length !== 1) {
              throw new TranslatableSuiteError(
                SuiteCoreStringKey.Error_FailedToCreateRoleTemplate,
                {
                  NAME: getSuiteCoreI18nEngine().translate(
                    SuiteCoreComponentId,
                    SuiteCoreStringKey.Common_Member,
                  ),
                },
              );
            }
            memberRole = memberRoleDocs[0];
          }

          // Check if system role already exists
          let systemRole = await RoleModel.findOne({
            name: application.constants.SystemRole,
          }).session(sess ?? null);
          if (!systemRole) {
            const systemRoleDocs = await RoleModel.create(
              [
                {
                  _id: systemRoleId,
                  name: application.constants.SystemRole,
                  admin: true,
                  member: true,
                  system: true,
                  child: false,
                  createdAt: now,
                  updatedAt: now,
                  createdBy: systemUserId,
                  updatedBy: systemUserId,
                },
              ],
              { session: sess },
            );
            if (systemRoleDocs.length !== 1) {
              throw new TranslatableSuiteError(
                SuiteCoreStringKey.Error_FailedToCreateRoleTemplate,
              );
            }
            systemRole = systemRoleDocs[0];
          }

          const systemUser = DatabaseInitializationService.cacheOrNew(
            application.constants.SystemUser,
            new EmailString(application.constants.SystemEmail),
            options.systemMnemonic!,
            MemberType.System,
            eciesService,
            options.systemId,
            options.systemId,
          );
          backupCodeService.setSystemUser(systemUser.member);
          SystemUserService.setSystemUser(systemUser.member, application.constants);
          // Encrypt mnemonic for recovery
          const systemEncryptedMnemonic = systemUser.member
            .encryptData(Buffer.from(systemUser.mnemonic.value ?? '', 'utf-8'))
            .toString('hex');
          const systemMnemonicDoc = await mnemonicService.addMnemonic(
            systemUser.mnemonic,
            sess,
          );
          if (!systemMnemonicDoc) {
            throw new Error(
              getSuiteCoreI18nEngine().translate(
                SuiteCoreComponentId,
                SuiteCoreStringKey.Error_FailedToStoreUserMnemonicTemplate,
                {
                  NAME: getSuiteCoreI18nEngine().translate(
                    SuiteCoreComponentId,
                    SuiteCoreStringKey.Common_System,
                  ),
                },
              ),
            );
          }
          const systemPasswordSecure = options.systemPassword
            ? options.systemPassword
            : new SecureString(this.generatePassword(16));

          const systemWrapped = keyWrappingService.wrapSecret(
            systemUser.member.privateKey!,
            systemPasswordSecure,
            application.constants,
          );
          const systemBackupCodes =
            options.systemBackupCodes ?? BackupCode.generateBackupCodes();
          const encryptedSystemBackupCodes =
            await BackupCode.encryptBackupCodes(
              systemUser.member,
              systemUser.member,
              systemBackupCodes,
            );
          const systemDocs = await UserModel.create(
            [
              {
                _id: systemUserId,
                username: application.constants.SystemUser,
                email: application.constants.SystemEmail,
                publicKey: systemUser.member.publicKey.toString('hex'),
                duressPasswords: [],
                mnemonicRecovery: systemEncryptedMnemonic,
                mnemonicId: systemMnemonicDoc._id,
                passwordWrappedPrivateKey: systemWrapped,
                backupCodes: encryptedSystemBackupCodes,
                timezone: application.environment.timezone,
                siteLanguage: 'en-US',
                emailVerified: true,
                accountStatus: AccountStatus.Active,
                createdAt: now,
                updatedAt: now,
                createdBy: systemUserId,
                updatedBy: systemUserId,
              },
            ],
            { session: sess },
          );
          if (systemDocs.length !== 1) {
            throw new Error(
              getSuiteCoreI18nEngine().translate(
                SuiteCoreComponentId,
                SuiteCoreStringKey.Error_FailedToCreateUserTemplate,
                {
                  NAME: getSuiteCoreI18nEngine().translate(
                    SuiteCoreComponentId,
                    SuiteCoreStringKey.Common_System,
                  ),
                },
              ),
            );
          }

          const systemDoc = systemDocs[0];

          // Create admin user-role relationship
          const systemUserRoleDoc = await roleService.addUserToRole(
            systemRoleId,
            systemUserId,
            systemUserId,
            sess,
            systemUserRoleId,
          );

          if (!systemUser.mnemonic.value) {
            throw new Error(
              getSuiteCoreI18nEngine().translate(
                SuiteCoreComponentId,
                SuiteCoreStringKey.Error_MnemonicIsNullTemplate,
                {
                  NAME: SuiteCoreStringKey.Common_System,
                },
              ),
            );
          }

          const adminUser = DatabaseInitializationService.cacheOrNew(
            application.constants.AdministratorUser,
            new EmailString(application.constants.AdministratorEmail),
            options.adminMnemonic,
            MemberType.User,
            eciesService,
            options.adminId,
            systemDoc._id,
          );
          // Encrypt mnemonic for recovery
          const adminEncryptedMnemonic = adminUser.member
            .encryptData(Buffer.from(adminUser.mnemonic.value ?? '', 'utf-8'))
            .toString('hex');
          const adminMnemonicDoc = await mnemonicService.addMnemonic(
            adminUser.mnemonic,
            sess,
          );
          if (!adminMnemonicDoc) {
            throw new Error(
              getSuiteCoreI18nEngine().translate(
                SuiteCoreComponentId,
                SuiteCoreStringKey.Error_FailedToStoreUserMnemonicTemplate,
                {
                  NAME: getSuiteCoreI18nEngine().translate(
                    SuiteCoreComponentId,
                    SuiteCoreStringKey.Common_Admin,
                  ),
                },
              ),
            );
          }
          const adminPasswordSecure = options.adminPassword
            ? options.adminPassword
            : new SecureString(this.generatePassword(16));

          const adminWrapped = keyWrappingService.wrapSecret(
            adminUser.member.privateKey!,
            adminPasswordSecure,
          );
          const adminBackupCodes =
            options.adminBackupCodes ?? BackupCode.generateBackupCodes();
          const encryptedAdminBackupCodes = await BackupCode.encryptBackupCodes(
            adminUser.member,
            systemUser.member,
            adminBackupCodes,
          );
          const adminDocs = await UserModel.create(
            [
              {
                _id: adminUserId,
                username: application.constants.AdministratorUser,
                email: application.constants.AdministratorEmail,
                publicKey: adminUser.member.publicKey.toString('hex'),
                duressPasswords: [],
                mnemonicRecovery: adminEncryptedMnemonic,
                mnemonicId: adminMnemonicDoc._id,
                passwordWrappedPrivateKey: adminWrapped,
                backupCodes: encryptedAdminBackupCodes,
                timezone: application.environment.timezone,
                siteLanguage: 'en-US',
                emailVerified: true,
                accountStatus: AccountStatus.Active,
                createdAt: now,
                updatedAt: now,
                createdBy: systemUserId,
                updatedBy: systemUserId,
              },
            ],
            { session: sess },
          );
          if (adminDocs.length !== 1) {
            throw new Error(
              getSuiteCoreI18nEngine().translate(
                SuiteCoreComponentId,
                SuiteCoreStringKey.Error_FailedToCreateUserTemplate,
                {
                  NAME: getSuiteCoreI18nEngine().translate(
                    SuiteCoreComponentId,
                    SuiteCoreStringKey.Common_Admin,
                  ),
                },
              ),
            );
          }

          const adminDoc = adminDocs[0];

          // Create admin user-role relationship
          const adminUserRoleDoc = await roleService.addUserToRole(
            adminRoleId,
            adminUserId,
            systemUserId,
            sess,
            adminUserRoleId,
          );

          if (!adminUser.mnemonic.value) {
            throw new Error(
              getSuiteCoreI18nEngine().translate(
                SuiteCoreComponentId,
                SuiteCoreStringKey.Error_MnemonicIsNullTemplate,
                {
                  NAME: getSuiteCoreI18nEngine().translate(
                    SuiteCoreComponentId,
                    SuiteCoreStringKey.Common_Admin,
                  ),
                },
              ),
            );
          }

          const memberUser = DatabaseInitializationService.cacheOrNew(
            application.constants.MemberUser,
            new EmailString(application.constants.MemberEmail),
            options.memberMnemonic,
            MemberType.User,
            eciesService,
            options.memberId,
            systemDoc._id,
          );
          const memberPasswordSecure = options.memberPassword
            ? options.memberPassword
            : new SecureString(this.generatePassword(16));

          const memberMnemonicDoc = await mnemonicService.addMnemonic(
            memberUser.mnemonic,
            sess,
          );
          if (!memberMnemonicDoc) {
            throw new Error(
              getSuiteCoreI18nEngine().translate(
                SuiteCoreComponentId,
                SuiteCoreStringKey.Error_FailedToStoreUserMnemonicTemplate,
                {
                  NAME: getSuiteCoreI18nEngine().translate(
                    SuiteCoreComponentId,
                    SuiteCoreStringKey.Common_Member,
                  ),
                },
              ),
            );
          }

          // Encrypt mnemonic for recovery
          const encryptedMemberMnemonic = memberUser.member
            .encryptData(Buffer.from(memberUser.mnemonic.value ?? '', 'utf-8'))
            .toString('hex');
          const memberWrapped = keyWrappingService.wrapSecret(
            memberUser.member.privateKey!,
            memberPasswordSecure,
          );
          const memberBackupCodes =
            options.memberBackupCodes ?? BackupCode.generateBackupCodes();
          const encryptedMemberBackupCodes =
            await BackupCode.encryptBackupCodes(
              memberUser.member,
              systemUser.member,
              memberBackupCodes,
            );
          const memberDocs = await UserModel.create(
            [
              {
                _id: memberUserId,
                username: application.constants.MemberUser,
                email: application.constants.MemberEmail,
                publicKey: memberUser.member.publicKey.toString('hex'),
                mnemonicId: memberMnemonicDoc._id,
                mnemonicRecovery: encryptedMemberMnemonic,
                passwordWrappedPrivateKey: memberWrapped,
                backupCodes: encryptedMemberBackupCodes,
                duressPasswords: [],
                timezone: application.environment.timezone,
                siteLanguage: 'en-US',
                emailVerified: true,
                accountStatus: AccountStatus.Active,
                createdAt: now,
                updatedAt: now,
                createdBy: systemUserId,
                updatedBy: systemUserId,
              },
            ],
            { session: sess },
          );
          if (memberDocs.length !== 1) {
            throw new Error(
              getSuiteCoreI18nEngine().translate(
                SuiteCoreComponentId,
                SuiteCoreStringKey.Error_FailedToCreateUserTemplate,
                {
                  NAME: getSuiteCoreI18nEngine().translate(
                    SuiteCoreComponentId,
                    SuiteCoreStringKey.Common_Member,
                  ),
                },
              ),
            );
          }

          const memberDoc = memberDocs[0];

          // Create member user-role relationship
          const memberUserRoleDoc = await roleService.addUserToRole(
            memberRoleId,
            memberUserId,
            systemUserId,
            sess,
            memberUserRoleId,
          );

          if (!memberUser.mnemonic.value) {
            throw new Error(
              getSuiteCoreI18nEngine().translate(
                SuiteCoreComponentId,
                SuiteCoreStringKey.Error_MnemonicIsNullTemplate,
                {
                  NAME: getSuiteCoreI18nEngine().translate(
                    SuiteCoreComponentId,
                    SuiteCoreStringKey.Common_Member,
                  ),
                },
              ),
            );
          }

          return {
            adminRole,
            memberRole,
            systemRole,
            systemDoc,
            systemUserRoleDoc,
            systemPassword: systemPasswordSecure.notNullValue,
            systemMnemonic: systemUser.mnemonic.notNullValue,
            systemBackupCodes: systemBackupCodes as SecureString[],
            systemMember: systemUser.member,
            adminDoc,
            adminUserRoleDoc,
            adminPassword: adminPasswordSecure.notNullValue,
            adminMnemonic: adminUser.mnemonic.notNullValue,
            adminBackupCodes: adminBackupCodes as SecureString[],
            adminMember: adminUser.member,
            memberDoc,
            memberUserRoleDoc,
            memberPassword: memberPasswordSecure.notNullValue,
            memberMnemonic: memberUser.mnemonic.notNullValue,
            memberBackupCodes: memberBackupCodes as SecureString[],
            memberUser: memberUser.member,
          };
        },
        transactionOptions,
      );

      return {
        success: true,
        data: {
          adminRole: result.adminRole,
          adminUserRole: result.adminUserRoleDoc,
          adminUser: result.adminDoc,
          adminUsername: result.adminDoc.username,
          adminEmail: result.adminDoc.email,
          adminMnemonic: result.adminMnemonic,
          adminPassword: result.adminPassword,
          adminBackupCodes: result.adminBackupCodes.map((bc) => bc.value ?? ''),
          adminMember: result.adminMember,
          memberRole: result.memberRole,
          memberUserRole: result.memberUserRoleDoc,
          memberUser: result.memberDoc,
          memberUsername: result.memberDoc.username,
          memberEmail: result.memberDoc.email,
          memberMnemonic: result.memberMnemonic,
          memberPassword: result.memberPassword,
          memberBackupCodes: result.memberBackupCodes.map(
            (bc) => bc.value ?? '',
          ),
          memberMember: result.memberUser,
          systemRole: result.systemRole,
          systemUserRole: result.systemUserRoleDoc,
          systemUser: result.systemDoc,
          systemUsername: result.systemDoc.username,
          systemEmail: result.systemDoc.email,
          systemMnemonic: result.systemMnemonic,
          systemPassword: result.systemPassword,
          systemBackupCodes: result.systemBackupCodes.map(
            (bc) => bc.value ?? '',
          ),
          systemMember: result.systemMember,
        },
      };
    } catch (error) {
      // Check if it's a translatable error and display cleanly
      if (
        error instanceof TranslatableGenericError ||
        error instanceof TranslatableHandleableGenericError ||
        error instanceof TranslatableSuiteError ||
        error instanceof TranslatableSuiteHandleableError
      ) {
        return {
          success: false,
          message: (error as Error).message,
          error: error as Error,
        };
      }

      return {
        success: false,
        message: getSuiteCoreI18nEngine().translate(
          SuiteCoreComponentId,
          SuiteCoreStringKey.Admin_Error_FailedToInitializeUserDatabase,
        ),
        error:
          error instanceof Error
            ? error
            : new Error(
                getSuiteCoreI18nEngine().translate(
                  SuiteCoreComponentId,
                  SuiteCoreStringKey.Admin_Error_FailedToInitializeUserDatabase,
                ),
              ),
      };
    }
  }

  public static printServerInitResults(result: IServerInitResult): void {
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '\n=== {{SuiteCoreStringKey.Admin_AccountCredentials}} ===',
      ),
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_System}} {{SuiteCoreStringKey.Common_ID}}: {id}',
        {
          id: result.systemUser._id.toHexString(),
        },
      ),
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_System}} {{SuiteCoreStringKey.Common_Role}}: {roleName}',
        {
          roleName: result.systemRole.name,
        },
      ),
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_System}} {{SuiteCoreStringKey.Common_Role}} {{SuiteCoreStringKey.Common_ID}}: {roleId}',
        {
          roleId: result.systemRole._id.toString(),
        },
      ),
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_System}} {{SuiteCoreStringKey.Common_User}} {{SuiteCoreStringKey.Common_Role}} {{SuiteCoreStringKey.Common_ID}}: {userRoleId}',
        {
          userRoleId: result.systemUserRole._id.toString(),
        },
      ),
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_System}} {{SuiteCoreStringKey.Common_Username}}: {username}',
        {
          username: result.systemUsername,
        },
      ),
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_System}} {{SuiteCoreStringKey.Common_Email}}: {email}',
        {
          email: result.systemEmail,
        },
      ),
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_System}} {{SuiteCoreStringKey.Common_Password}}: {password}',
        {
          password: result.systemPassword,
        },
      ),
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_System}} {{SuiteCoreStringKey.Common_Mnemonic}}: {mnemonic}',
        {
          mnemonic: result.systemMnemonic,
        },
      ),
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_System}} {{SuiteCoreStringKey.Common_PublicKey}}: {publicKey}',
        {
          publicKey: result.systemUser.publicKey,
        },
      ),
    );
    debugLog(
      true,
      'log',
      `${this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_System}} {{SuiteCoreStringKey.Common_BackupCodes}}',
      )}: ${result.systemBackupCodes.join(', ')}`,
    );
    debugLog(true, 'log', '');
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_Admin}} {{SuiteCoreStringKey.Common_ID}}: {id}',
        {
          id: result.adminUser._id.toHexString(),
        },
      ),
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_Admin}} {{SuiteCoreStringKey.Common_Role}}: {roleName}',
        {
          roleName: result.adminRole.name,
        },
      ),
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_Admin}} {{SuiteCoreStringKey.Common_Role}} {{SuiteCoreStringKey.Common_ID}}: {roleId}',
        {
          roleId: result.adminRole._id.toString(),
        },
      ),
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_Admin}} {{SuiteCoreStringKey.Common_User}} {{SuiteCoreStringKey.Common_Role}} {{SuiteCoreStringKey.Common_ID}}: {userRoleId}',
        {
          userRoleId: result.adminUserRole._id.toString(),
        },
      ),
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_Admin}} {{SuiteCoreStringKey.Common_Username}}: {username}',
        {
          username: result.adminUsername,
        },
      ),
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_Admin}} {{SuiteCoreStringKey.Common_Email}}: {email}',
        {
          email: result.adminEmail,
        },
      ),
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_Admin}} {{SuiteCoreStringKey.Common_Password}}: {password}',
        {
          password: result.adminPassword,
        },
      ),
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_Admin}} {{SuiteCoreStringKey.Common_Mnemonic}}: {mnemonic}',
        {
          mnemonic: result.adminMnemonic,
        },
      ),
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_Admin}} {{SuiteCoreStringKey.Common_PublicKey}}: {publicKey}',
        {
          publicKey: result.adminUser.publicKey,
        },
      ),
    );
    debugLog(
      true,
      'log',
      `${this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_Admin}} {{SuiteCoreStringKey.Common_BackupCodes}}',
      )}: ${result.adminBackupCodes.join(', ')}`,
    );
    debugLog(true, 'log', '');
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_Member}} {{SuiteCoreStringKey.Common_ID}}: {id}',
        {
          id: result.memberUser._id.toHexString(),
        },
      ),
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_Member}} {{SuiteCoreStringKey.Common_Role}}: {roleName}',
        {
          roleName: result.memberRole.name,
        },
      ),
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_Member}} {{SuiteCoreStringKey.Common_Role}} {{SuiteCoreStringKey.Common_ID}}: {roleId}',
        {
          roleId: result.memberRole._id.toString(),
        },
      ),
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_Member}} {{SuiteCoreStringKey.Common_User}} {{SuiteCoreStringKey.Common_Role}} {{SuiteCoreStringKey.Common_ID}}: {userRoleId}',
        {
          userRoleId: result.memberUserRole._id.toString(),
        },
      ),
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_Member}} {{SuiteCoreStringKey.Common_Username}}: {username}',
        {
          username: result.memberUsername,
        },
      ),
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_Member}} {{SuiteCoreStringKey.Common_Email}}: {email}',
        {
          email: result.memberEmail,
        },
      ),
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_Member}} {{SuiteCoreStringKey.Common_Password}}: {password}',
        {
          password: result.memberPassword,
        },
      ),
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_Member}} {{SuiteCoreStringKey.Common_Mnemonic}}: {mnemonic}',
        {
          mnemonic: result.memberMnemonic,
        },
      ),
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_Member}} {{SuiteCoreStringKey.Common_PublicKey}}: {publicKey}',
        {
          publicKey: result.memberUser.publicKey,
        },
      ),
    );
    debugLog(
      true,
      'log',
      `${this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '{{SuiteCoreStringKey.Common_Member}} {{SuiteCoreStringKey.Common_BackupCodes}}',
      )}: ${result.memberBackupCodes.join(', ')}`,
    );
    debugLog(
      true,
      'log',
      this.defaultI18nTFunc(
        SuiteCoreComponentId,
        '\n=== {{SuiteCoreStringKey.Admin_EndCredentials}} ===',
      ),
    );
  }

  public static setEnvFromInitResults(result: IServerInitResult): void {
    process.env['ADMIN_ID'] = result.adminUser._id.toHexString();
    process.env['ADMIN_PUBLIC_KEY'] = result.adminUser.publicKey;
    process.env['ADMIN_MNEMONIC'] = result.adminMnemonic;
    process.env['ADMIN_PASSWORD'] = result.adminPassword;
    process.env['ADMIN_ROLE_ID'] = result.adminRole._id.toHexString();
    process.env['ADMIN_USER_ROLE_ID'] = result.adminUserRole._id.toHexString();
    //
    process.env['MEMBER_ID'] = result.memberUser._id.toHexString();
    process.env['MEMBER_PUBLIC_KEY'] = result.memberUser.publicKey;
    process.env['MEMBER_MNEMONIC'] = result.memberMnemonic;
    process.env['MEMBER_PASSWORD'] = result.memberPassword;
    process.env['MEMBER_ROLE_ID'] = result.memberRole._id.toHexString();
    process.env['MEMBER_USER_ROLE_ID'] =
      result.memberUserRole._id.toHexString();
    //
    process.env['SYSTEM_ID'] = result.systemUser._id.toHexString();
    process.env['SYSTEM_PUBLIC_KEY'] = result.systemUser.publicKey;
    process.env['SYSTEM_MNEMONIC'] = result.systemMnemonic;
    process.env['SYSTEM_PASSWORD'] = result.systemPassword;
    process.env['SYSTEM_ROLE_ID'] = result.systemRole._id.toHexString();
    process.env['SYSTEM_USER_ROLE_ID'] =
      result.systemUserRole._id.toHexString();
  }

  /**
   * Initialize the user database with default users and roles (convenience method)
   * This method creates the necessary services and calls initUserDbWithServices
   * @param application The application
   * @returns The result of the initialization
   */
  public static async initUserDb(
    application: IApplication,
  ): Promise<IFailableResult<IServerInitResult>> {
    const mnemonicModel = ModelRegistry.instance.getTypedModel<
      IBaseDocument<IMnemonicBase<Types.ObjectId>>
    >(BaseModelName.Mnemonic);
    const mnemonicService = new MnemonicService(
      mnemonicModel,
      application.environment.mnemonicHmacSecret,
      application.constants,
    );
    const config: IECIESConfig = {
      curveName: ECIES.CURVE_NAME,
      primaryKeyDerivationPath: ECIES.PRIMARY_KEY_DERIVATION_PATH,
      mnemonicStrength: ECIES.MNEMONIC_STRENGTH,
      symmetricAlgorithm: ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKeyBits: ECIES.SYMMETRIC.KEY_BITS,
      symmetricKeyMode: ECIES.SYMMETRIC.MODE,
    };
    const eciesService = new ECIESService(config);
    const roleService = new RoleService(application);
    const keyWrappingService = new KeyWrappingService();
    const backupCodeService = new BackupCodeService(
      application,
      eciesService,
      keyWrappingService,
      roleService,
    );

    return this.initUserDbWithServices(
      application,
      keyWrappingService,
      mnemonicService,
      eciesService,
      roleService,
      backupCodeService,
    );
  }
}
