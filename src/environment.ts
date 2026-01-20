/**
 * @fileoverview Environment configuration class.
 * Loads and validates environment variables for application configuration.
 * @module environment
 */

import { SecureBuffer, SecureString } from '@digitaldefiance/ecies-lib';
import {
  getSuiteCoreTranslation,
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { BackupCode } from './backup-code';
import { LocalhostConstants } from './constants';
import { setGlobalActiveContextAdminLanguageFromProcessArgvOrEnv } from './get-language';
import { setGlobalActiveContextAdminTimezoneFromProcessArgvOrEnv } from './get-timezone';
import { IConstants } from './interfaces/constants';
import { IEnvironment } from './interfaces/environment';
import { IMongoEnvironment } from './interfaces/environment-mongo';
import type { EnvironmentVariables } from './types/environment-variables';
import {
  DEBUG_TYPE,
  debugLog,
  DEFAULT_TRANSACTION_LOCK_REQUEST_TIMEOUT,
  DEFAULT_TRANSACTION_TIMEOUT,
  locatePEMRoot,
  parseBackupCodes,
} from './utils';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

export class Environment<
  TID extends PlatformID = Buffer,
> implements IEnvironment<TID> {
  private readonly _environment: IEnvironment<TID>;
  private readonly _envObject: EnvironmentVariables;
  public static requireEnv<T>(key: string, obj: EnvironmentVariables): T {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_MissingRequiredEnvironmentVariableTemplate,
        { key },
      );
    }
    const value = obj[key];
    if (!value || String(value).trim() === '') {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_EmptyEnvironmentVariableTemplate,
        { key },
      );
    }
    return value as T;
  }
  constructor(
    path?: string,
    initialization = false,
    override = true,
    constants: IConstants = LocalhostConstants,
  ) {
    let envObj = process.env;
    let debug = envObj['DEBUG'] === 'true' || envObj['DEBUG'] === '1';
    let detailedDebug =
      envObj['DETAILED_DEBUG'] === 'true' || envObj['DETAILED_DEBUG'] === '1';
    if (path && existsSync(path)) {
      debugLog(
        debug,
        'log',
        getSuiteCoreTranslation(
          SuiteCoreStringKey.Admin_LoadingEnvironmentTemplate,
          {
            PATH: path,
          },
        ),
      );
      const result = config({ path, override: override });
      envObj = override
        ? { ...envObj, ...result.parsed }
        : { ...result.parsed, ...envObj };
      // debug / detailedDebug may have changed due to the env loading
      debug = envObj['DEBUG'] === 'true' || envObj['DEBUG'] === '1';
      detailedDebug =
        envObj['DETAILED_DEBUG'] === 'true' || envObj['DETAILED_DEBUG'] === '1';

      if (result.error || !result.parsed) {
        throw new TranslatableSuiteError(
          SuiteCoreStringKey.Admin_Error_FailedToLoadEnvironment,
        );
      }
    } else if (path) {
      debugLog(
        debug,
        'warn',
        getSuiteCoreTranslation(
          SuiteCoreStringKey.Admin_EnvFileNotFoundTemplate,
          {
            PATH: path,
          },
        ),
      );
    }

    const httpsDevCertRoot = process.env['HTTPS_DEV_CERT_DIR']
      ? locatePEMRoot(process.env['HTTPS_DEV_CERT_DIR'])
      : undefined;
    const httpsDevPort = process.env['HTTPS_DEV_PORT']
      ? parseInt(process.env['HTTPS_DEV_PORT'] ?? '3443')
      : 443;

    const devDatabase =
      envObj['DEV_DATABASE'] !== undefined && envObj['DEV_DATABASE'] !== ''
        ? envObj['DEV_DATABASE']
        : undefined;
    const isDevDatabase = devDatabase !== undefined && devDatabase !== '';

    this._environment = {
      debug: debug,
      devDatabase: devDatabase,
      detailedDebug: detailedDebug,
      host: envObj['HOST'] ?? '0.0.0.0',
      port: envObj['PORT'] ? Number(envObj['PORT']) : 3000,
      jwtSecret: Environment.requireEnv<string>('JWT_SECRET', envObj),
      emailSender: envObj['EMAIL_SENDER'] ?? 'noreply@localhost',
      basePath: envObj['BASE_PATH'] ?? '/',
      serverUrl:
        envObj['NODE_ENV'] === 'production'
          ? 'https://localhost'
          : httpsDevCertRoot
            ? `https://localhost:${httpsDevPort}`
            : 'http://localhost:3000',
      // Avoid importing Application here to prevent circular deps
      // Compute dist dir from process.cwd() directly
      apiDistDir: Environment.requireEnv<string>('API_DIST_DIR', envObj),
      reactDistDir: Environment.requireEnv<string>('REACT_DIST_DIR', envObj),
      httpsDevCertRoot: httpsDevCertRoot,
      httpsDevPort: httpsDevPort,
      disableEmailSend:
        envObj['DISABLE_EMAIL_SEND'] === 'true' ||
        envObj['DISABLE_EMAIL_SEND'] === '1',
      mongo: {
        dbName: envObj['MONGO_DB_NAME'] ?? 'db',
        uri:
          envObj['MONGO_URI'] ??
          `mongodb://db:27017/${envObj['MONGO_DB_NAME'] ?? 'db'}`,
        setParameterSupported:
          envObj['MONGO_SET_PARAMETER_SUPPORTED'] === 'true' ||
          envObj['MONGO_SET_PARAMETER_SUPPORTED'] === '1',
        transactionLifetimeLimitSecondsSupported:
          envObj['MONGO_TRANSACTION_LIFETIME_LIMIT_SECONDS_SUPPORTED'] ===
            'true' ||
          envObj['MONGO_TRANSACTION_LIFETIME_LIMIT_SECONDS_SUPPORTED'] === '1',
        maxTransactionLockRequestTimeoutMillisSupported:
          envObj[
            'MONGO_MAX_TRANSACTION_LOCK_REQUEST_TIMEOUT_MILLIS_SUPPORTED'
          ] === 'true' ||
          envObj[
            'MONGO_MAX_TRANSACTION_LOCK_REQUEST_TIMEOUT_MILLIS_SUPPORTED'
          ] === '1',
        maxPoolSize: envObj['MONGO_MAX_POOL_SIZE']
          ? parseInt(envObj['MONGO_MAX_POOL_SIZE'])
          : 10,
        minPoolSize: envObj['MONGO_MIN_POOL_SIZE']
          ? parseInt(envObj['MONGO_MIN_POOL_SIZE'])
          : 2,
        maxIdleTimeMS: envObj['MONGO_MAX_IDLE_TIME_MS']
          ? parseInt(envObj['MONGO_MAX_IDLE_TIME_MS'])
          : 30000,
        serverSelectionTimeoutMS: envObj['MONGO_SERVER_SELECTION_TIMEOUT_MS']
          ? parseInt(envObj['MONGO_SERVER_SELECTION_TIMEOUT_MS'])
          : 5000,
        socketTimeoutMS: envObj['MONGO_SOCKET_TIMEOUT_MS']
          ? parseInt(envObj['MONGO_SOCKET_TIMEOUT_MS'])
          : 45000,
        retryWrites:
          envObj['MONGO_RETRY_WRITES'] === 'false' ||
          envObj['MONGO_RETRY_WRITES'] === '0'
            ? false
            : envObj['MONGO_RETRY_WRITES'] === 'true' ||
              envObj['MONGO_RETRY_WRITES'] === '1' ||
              true,
        retryReads:
          envObj['MONGO_RETRY_READS'] === 'false' ||
          envObj['MONGO_RETRY_READS'] === '0'
            ? false
            : envObj['MONGO_RETRY_READS'] === 'true' ||
              envObj['MONGO_RETRY_READS'] === '1' ||
              true,
        readConcern: { level: 'majority' },
        writeConcern: { w: 'majority', j: true },
        transactionTimeout: envObj['MONGO_TRANSACTION_TIMEOUT']
          ? parseInt(envObj['MONGO_TRANSACTION_TIMEOUT'])
          : DEFAULT_TRANSACTION_TIMEOUT,
        transactionLockRequestTimeout: envObj[
          'MONGO_TRANSACTION_LOCK_REQUEST_TIMEOUT'
        ]
          ? parseInt(envObj['MONGO_TRANSACTION_LOCK_REQUEST_TIMEOUT'])
          : DEFAULT_TRANSACTION_LOCK_REQUEST_TIMEOUT,
        useTransactions:
          envObj['MONGO_USE_TRANSACTIONS'] === 'true' ||
          envObj['MONGO_USE_TRANSACTIONS'] === '1',
        transactionRetryBaseDelay: envObj['MONGO_TRANSACTION_RETRY_BASE_DELAY']
          ? parseInt(envObj['MONGO_TRANSACTION_RETRY_BASE_DELAY'])
          : envObj['NODE_ENV'] === 'test'
            ? 25
            : 100,
      },
      adminMnemonic: new SecureString(envObj['ADMIN_MNEMONIC'] ?? null),
      adminCreatedAt: envObj['ADMIN_CREATED_AT']
        ? new Date(envObj['ADMIN_CREATED_AT'])
        : new Date(),
      adminId: envObj['ADMIN_ID']
        ? (constants.idProvider.fromBytes(
            constants.idProvider.deserialize(envObj['ADMIN_ID']),
          ) as TID)
        : (constants.idProvider.fromBytes(
            constants.idProvider.generate(),
          ) as TID),
      adminPassword: envObj['ADMIN_PASSWORD']
        ? new SecureString(envObj['ADMIN_PASSWORD'])
        : undefined,
      adminRoleId: envObj['ADMIN_ROLE_ID']
        ? (constants.idProvider.fromBytes(
            constants.idProvider.deserialize(envObj['ADMIN_ROLE_ID']),
          ) as TID)
        : undefined,
      adminUserRoleId: envObj['ADMIN_ROLE_ID']
        ? (constants.idProvider.fromBytes(
            constants.idProvider.deserialize(envObj['ADMIN_ROLE_ID']),
          ) as TID)
        : undefined,
      adminBackupCodes: envObj['ADMIN_BACKUP_CODES']
        ? parseBackupCodes('admin', envObj)
        : undefined,
      memberMnemonic: new SecureString(envObj['MEMBER_MNEMONIC'] ?? null),
      memberCreatedAt: envObj['MEMBER_CREATED_AT']
        ? new Date(envObj['MEMBER_CREATED_AT'])
        : new Date(),
      memberId: envObj['MEMBER_ID']
        ? (constants.idProvider.fromBytes(
            constants.idProvider.deserialize(envObj['MEMBER_ID']),
          ) as TID)
        : (constants.idProvider.fromBytes(
            constants.idProvider.generate(),
          ) as TID),
      memberPassword: envObj['MEMBER_PASSWORD']
        ? new SecureString(envObj['MEMBER_PASSWORD'])
        : undefined,
      memberRoleId: envObj['MEMBER_ROLE_ID']
        ? (constants.idProvider.fromBytes(
            constants.idProvider.deserialize(envObj['MEMBER_ROLE_ID']),
          ) as TID)
        : undefined,
      memberUserRoleId: envObj['MEMBER_USER_ROLE_ID']
        ? (constants.idProvider.fromBytes(
            constants.idProvider.deserialize(envObj['MEMBER_USER_ROLE_ID']),
          ) as TID)
        : undefined,
      memberBackupCodes: envObj['MEMBER_BACKUP_CODES']
        ? parseBackupCodes('member', envObj)
        : undefined,
      systemMnemonic: new SecureString(envObj['SYSTEM_MNEMONIC'] ?? null),
      systemCreatedAt: envObj['SYSTEM_CREATED_AT']
        ? new Date(envObj['SYSTEM_CREATED_AT'])
        : new Date(),
      systemId: envObj['SYSTEM_ID']
        ? (constants.idProvider.fromBytes(
            constants.idProvider.deserialize(envObj['SYSTEM_ID']),
          ) as TID)
        : (constants.idProvider.fromBytes(
            constants.idProvider.generate(),
          ) as TID),
      systemPublicKeyHex: envObj['SYSTEM_PUBLIC_KEY'] ?? undefined,
      systemPassword: envObj['SYSTEM_PASSWORD']
        ? new SecureString(envObj['SYSTEM_PASSWORD'])
        : undefined,
      systemRoleId: envObj['SYSTEM_ROLE_ID']
        ? (constants.idProvider.fromBytes(
            constants.idProvider.deserialize(envObj['SYSTEM_ROLE_ID']),
          ) as TID)
        : undefined,
      systemUserRoleId: envObj['SYSTEM_ROLE_ID']
        ? (constants.idProvider.fromBytes(
            constants.idProvider.deserialize(envObj['SYSTEM_ROLE_ID']),
          ) as TID)
        : undefined,
      systemBackupCodes: envObj['SYSTEM_BACKUP_CODES']
        ? parseBackupCodes('system', envObj)
        : undefined,
      mnemonicHmacSecret: new SecureBuffer(
        Buffer.from(envObj['MNEMONIC_HMAC_SECRET'] ?? '', 'hex'),
      ),
      mnemonicEncryptionKey: new SecureBuffer(
        Buffer.from(envObj['MNEMONIC_ENCRYPTION_KEY'] ?? '', 'hex'),
      ),
      timezone: setGlobalActiveContextAdminTimezoneFromProcessArgvOrEnv(),

      // Set language last as it depends on process.env and argv
      adminLanguage: setGlobalActiveContextAdminLanguageFromProcessArgvOrEnv(),
      pbkdf2Iterations: parseInt(envObj['PBKDF2_ITERATIONS'] ?? '100000'),
      production: envObj['NODE_ENV'] === 'production',
    };
    this._envObject = envObj;
    // ensure all required environment variables are set
    if (!this._environment.host) {
      throw new Error(
        getSuiteCoreTranslation(SuiteCoreStringKey.Admin_EnvNotSetTemplate, {
          variable: 'HOST',
        }),
      );
    }
    if (!this._environment.port) {
      throw new Error(
        getSuiteCoreTranslation(SuiteCoreStringKey.Admin_EnvNotSetTemplate, {
          variable: 'PORT',
        }),
      );
    }
    if (!this._environment.serverUrl) {
      throw new Error(
        getSuiteCoreTranslation(SuiteCoreStringKey.Admin_EnvNotSetTemplate, {
          variable: 'SERVER_URL',
        }),
      );
    }
    if (!this._environment.jwtSecret) {
      throw new Error(
        getSuiteCoreTranslation(SuiteCoreStringKey.Admin_EnvNotSetTemplate, {
          variable: 'JWT_SECRET',
        }),
      );
    }
    if (!constants.JwtSecretRegex.test(this._environment.jwtSecret)) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_MustMatchRegexTemplate,
        { value: 'JWT_SECRET' },
      );
    }
    if (
      !constants.MnemonicHmacRegex.test(
        this._environment.mnemonicHmacSecret.valueAsHexString,
      )
    ) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_MustMatchRegexTemplate,
        { value: 'MNEMONIC_HMAC_SECRET' },
      );
    }
    if (
      !constants.MnemonicEncryptionKeyRegex.test(
        this._environment.mnemonicEncryptionKey.valueAsHexString,
      )
    ) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_MustMatchRegexTemplate,
        { value: 'MNEMONIC_ENCRYPTION_KEY' },
      );
    }
    if (!this._environment.mongo.uri) {
      throw new Error(
        getSuiteCoreTranslation(SuiteCoreStringKey.Admin_EnvNotSetTemplate, {
          variable: 'MONGO_URI',
        }),
      );
    }
    if (!this._environment.emailSender) {
      throw new Error(
        getSuiteCoreTranslation(SuiteCoreStringKey.Admin_EnvNotSetTemplate, {
          variable: 'EMAIL_SENDER',
        }),
      );
    }
    if (
      !initialization &&
      !isDevDatabase &&
      !this._environment.systemPublicKeyHex
    ) {
      throw new Error(
        getSuiteCoreTranslation(SuiteCoreStringKey.Admin_EnvNotSetTemplate, {
          variable: 'SYSTEM_PUBLIC_KEY',
        }),
      );
    }
    if (this._environment.mnemonicHmacSecret.length !== 32) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_MnemonicHmacSecretMustBe64CharHexString,
      );
    }
    if (!/^[0-9a-f]{64}$/i.test(envObj['MNEMONIC_HMAC_SECRET'] ?? '')) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_MnemonicHmacSecretMustBe64CharHexString,
      );
    }
    if (this._environment.mnemonicEncryptionKey.length !== 32) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_MnemonicEncryptionKeyMustBe64CharHexString,
      );
    }
    if (!/^[0-9a-f]{64}$/i.test(envObj['MNEMONIC_ENCRYPTION_KEY'] ?? '')) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_MnemonicEncryptionKeyMustBe64CharHexString,
      );
    }
    if (
      !isDevDatabase &&
      this._environment.adminMnemonic?.value &&
      !constants.MnemonicRegex.test(this._environment.adminMnemonic.value ?? '')
    ) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_AdminMnemonicMustBeValidMnemonicPhrase,
      );
    }
    if (
      !isDevDatabase &&
      this._environment.memberMnemonic?.value &&
      !constants.MnemonicRegex.test(
        this._environment.memberMnemonic.value ?? '',
      )
    ) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_MemberMnemonicMustBeValidMnemonicPhrase,
      );
    }
    if (!this._environment.apiDistDir) {
      throw new Error(
        getSuiteCoreTranslation(SuiteCoreStringKey.Admin_EnvNotSetTemplate, {
          variable: 'API_DIST_DIR',
        }),
      );
    } else if (!existsSync(this._environment.apiDistDir)) {
      throw new Error(
        getSuiteCoreTranslation(
          SuiteCoreStringKey.Admin_EnvDirSetButMissingTemplate,
          {
            VAR: 'API_DIST_DIR',
            PATH: this._environment.apiDistDir,
          },
        ),
      );
    }
    if (!this._environment.reactDistDir) {
      throw new Error(
        getSuiteCoreTranslation(SuiteCoreStringKey.Admin_EnvNotSetTemplate, {
          variable: 'REACT_DIST_DIR',
        }),
      );
    } else if (!existsSync(this._environment.reactDistDir)) {
      throw new Error(
        getSuiteCoreTranslation(
          SuiteCoreStringKey.Admin_EnvDirSetButMissingTemplate,
          {
            VAR: 'REACT_DIST_DIR',
            PATH: this._environment.reactDistDir,
          },
        ),
      );
    }
    if (this.pbkdf2Iterations < 1) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_Pbkdf2IterationsMustBeGreaterThanZero,
      );
    }
  }

  public has(key: string): boolean {
    return Object.prototype.hasOwnProperty.call(this._envObject, key);
  }

  public get(key: string): string | undefined {
    return this.has(key) ? String(this._envObject[key]) : undefined;
  }

  public setEnvironment(key: string, value: any): void {
    // keys are optionally dotted strings for nested objects within the IEnvironment such as mongo.uri
    const keys = key.split('.');
    let obj: any = this._environment;
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
  }

  public getObject(): EnvironmentVariables {
    return this._envObject;
  }

  /**
   * Whether to print certain console debug messages and enable certain debug features
   */
  public get debug(): boolean {
    return this._environment.debug;
  }

  /**
   * Whether to use a development database (eg with less durability and security for ease of local dev)
   */
  public get devDatabase(): string | undefined {
    return this._environment.devDatabase;
  }

  public get detailedDebug(): boolean {
    return this._environment.detailedDebug;
  }

  /**
   * The hostname of this server
   */
  public get host(): string {
    return this._environment.host;
  }

  /**
   * The primary port of this server
   */
  public get port(): number {
    return this._environment.port;
  }

  /**
   * The JWT secret of this server
   */
  public get jwtSecret(): string {
    return this._environment.jwtSecret;
  }

  /**
   * The email sernder for this site
   */
  public get emailSender(): string {
    return this._environment.emailSender;
  }

  /**
   * The base path of the express http server (eg /)
   */
  public get basePath(): string {
    return this._environment.basePath;
  }

  /**
   * The full URL to the server
   */
  public get serverUrl(): string {
    return this._environment.serverUrl;
  }

  /**
   * The path to the API dist directory
   */
  public get apiDistDir(): string {
    return this._environment.apiDistDir;
  }

  /**
   * The path to the react dist directory
   */
  public get reactDistDir(): string {
    return this._environment.reactDistDir;
  }

  /**
   * The directory + cert root name (eg /workspaces/myapp/locahost+2) to store HTTPS development certificates
   */
  public get httpsDevCertRoot(): string | undefined {
    return this._environment.httpsDevCertRoot;
  }

  /**
   * The port to use for development HTTPS
   */
  public get httpsDevPort(): number {
    return this._environment.httpsDevPort;
  }

  /**
   * Whether to disable email sending
   */
  public get disableEmailSend(): boolean {
    return this._environment.disableEmailSend;
  }

  /**
   * The MongoDB configuration (primarily for transactions)
   */
  public get mongo(): IMongoEnvironment {
    return this._environment.mongo;
  }

  /**
   * The admin user's mnemonic used to encrypt all files
   */
  public get adminMnemonic(): SecureString | undefined {
    return this._environment.adminMnemonic;
  }

  /**
   * The date the admin user was created
   */
  public get adminCreatedAt(): Date | undefined {
    return this._environment.adminCreatedAt;
  }

  /**
   * The ID of the admin user
   */
  public get adminId(): TID | undefined {
    return this._environment.adminId;
  }

  /**
   * The password of the admin user
   */
  public get adminPassword(): SecureString | undefined {
    return this._environment.adminPassword;
  }

  /**
   * The role ID of the admin user
   */
  public get adminRoleId(): TID | undefined {
    return this._environment.adminRoleId;
  }

  /**
   * The user role ID of the admin user
   */
  public get adminUserRoleId(): TID | undefined {
    return this._environment.adminUserRoleId;
  }

  /**
   * Backup codes for the admin user
   */
  public get adminBackupCodes(): BackupCode[] | undefined {
    return this._environment.adminBackupCodes;
  }

  /**
   * The test member user's mnemonic used to encrypt all files
   */
  public get memberMnemonic(): SecureString | undefined {
    return this._environment.memberMnemonic;
  }

  /**
   * The date the member user was created
   */
  public get memberCreatedAt(): Date | undefined {
    return this._environment.memberCreatedAt;
  }

  /**
   * The date the member user was created
   */
  public get memberId(): TID | undefined {
    return this._environment.memberId;
  }

  /**
   * The password of the member user
   */
  public get memberPassword(): SecureString | undefined {
    return this._environment.memberPassword;
  }

  /**
   * The role ID of the member user
   */
  public get memberRoleId(): TID | undefined {
    return this._environment.memberRoleId;
  }

  /**
   * The user role ID of the member user
   */
  public get memberUserRoleId(): TID | undefined {
    return this._environment.memberUserRoleId;
  }

  /**
   * Backup codes for the member user
   */
  public get memberBackupCodes(): BackupCode[] | undefined {
    return this._environment.memberBackupCodes;
  }

  /**
   * The system user's mnemonic used to encrypt all files
   */
  public get systemMnemonic(): SecureString | undefined {
    return this._environment.systemMnemonic;
  }

  /**
   * The date the system user was created
   */
  public get systemCreatedAt(): Date | undefined {
    return this._environment.systemCreatedAt;
  }

  /**
   * The ID of the system user
   */
  public get systemId(): TID | undefined {
    return this._environment.systemId;
  }

  /**
   * The public key of the system user
   */
  public get systemPublicKeyHex(): string | undefined {
    return this._environment.systemPublicKeyHex;
  }

  /**
   * The password of the system user
   */
  public get systemPassword(): SecureString | undefined {
    return this._environment.systemPassword;
  }

  /**
   * The role ID of the system user
   */
  public get systemRoleId(): TID | undefined {
    return this._environment.systemRoleId;
  }

  /**
   * The user role ID of the system user
   */
  public get systemUserRoleId(): TID | undefined {
    return this._environment.systemUserRoleId;
  }

  /**
   * Backup codes for the system user
   */
  public get systemBackupCodes(): BackupCode[] | undefined {
    return this._environment.systemBackupCodes;
  }

  /**
   * The system's HMAC secret for the mnemonic tracking collection
   */
  public get mnemonicHmacSecret(): SecureBuffer {
    return this._environment.mnemonicHmacSecret;
  }

  /**
   * The system's HMAC encryption key for the mnemonic tracking collection
   */
  public get mnemonicEncryptionKey(): SecureBuffer {
    return this._environment.mnemonicEncryptionKey;
  }

  /**
   * The timezone for the server
   */
  public get timezone(): string {
    return this._environment.timezone;
  }

  public get adminLanguage(): string {
    return this._environment.adminLanguage;
  }

  /**
   * The number of pbkdf2 iterations for key wrapping
   */
  public get pbkdf2Iterations(): number {
    return this._environment.pbkdf2Iterations;
  }

  /**
   * Whether this is a production environment
   */
  public get production(): boolean {
    return this._environment.production;
  }

  /**
   * Console dump the environment variables for debugging purposes
   */
  public dumpEnvironment(logLevel: DEBUG_TYPE = 'log'): void {
    debugLog(
      true,
      logLevel,
      `Environment Variables:
-------------------------
DEBUG: ${this.debug}
DETAILED_DEBUG: ${this.detailedDebug}
HOST: ${this.host}
PORT: ${this.port}
JWT_SECRET: ${this.jwtSecret}
EMAIL_SENDER: ${this.emailSender}
BASE_PATH: ${this.basePath}
SERVER_URL: ${this.serverUrl}
API_DIST_DIR: ${this.apiDistDir}
REACT_DIST_DIR: ${this.reactDistDir}
DISABLE_EMAIL_SEND: ${this.disableEmailSend}
TIMEZONE: ${this.timezone}
Mongo:
-- URI: ${this.mongo.uri}
-- USE_TRANSACTIONS: ${this.mongo.useTransactions ? 'true' : 'false'}
-- SET_PARAMETER_SUPPORTED: ${this.mongo.setParameterSupported}
-- TRANSACTION_LIFETIME_LIMIT_SECONDS_SUPPORTED: ${
        this.mongo.transactionLifetimeLimitSecondsSupported
      }
-- MAX_TRANSACTION_LOCK_REQUEST_TIMEOUT_MILLIS_SUPPORTED: ${
        this.mongo.maxTransactionLockRequestTimeoutMillisSupported
      }
-- MAX_POOL_SIZE: ${this.mongo.maxPoolSize}
-- MIN_POOL_SIZE: ${this.mongo.minPoolSize}
-- MAX_IDLE_TIME_MS: ${this.mongo.maxIdleTimeMS}
-- SERVER_SELECTION_TIMEOUT_MS: ${this.mongo.serverSelectionTimeoutMS}
-- SOCKET_TIMEOUT_MS: ${this.mongo.socketTimeoutMS}
-- RETRY_WRITES: ${this.mongo.retryWrites ? 'true' : 'false'}
-- RETRY_READS: ${this.mongo.retryReads ? 'true' : 'false'}
-- TRANSACTION_TIMEOUT: ${this.mongo.transactionTimeout}
-- TRANSACTION_LOCK_REQUEST_TIMEOUT: ${this.mongo.transactionLockRequestTimeout}
LANGUAGE: ${this.adminLanguage}
Admin User Data:
-- ADMIN_ID: ${this.adminId?.toString()}
-- ADMIN_CREATED_AT: ${this.adminCreatedAt?.toISOString()}
-- ADMIN_MNEMONIC: ${this.adminMnemonic?.value}
-- ADMIN_PASSWORD: ${this.adminPassword?.value}
-- ADMIN_ROLE_ID: ${this.adminRoleId?.toString()}
-- ADMIN_ROLE_ID: ${this.adminUserRoleId?.toString()}
-- ADMIN_BACKUP_CODES: ${this.adminBackupCodes
        ?.map((code: BackupCode) => code.value)
        .join(', ')}
Member User Data:
-- MEMBER_ID: ${this.memberId?.toString()}
-- MEMBER_CREATED_AT: ${this.memberCreatedAt?.toISOString()}
-- MEMBER_MNEMONIC: ${this.adminMnemonic?.value}
-- MEMBER_PASSWORD: ${this.memberPassword?.value}
-- MEMBER_ROLE_ID: ${this.memberRoleId?.toString()}
-- MEMBER_USER_ROLE_ID: ${this.memberUserRoleId?.toString()}
-- MEMBER_BACKUP_CODES: ${this.memberBackupCodes
        ?.map((code: BackupCode) => code.value)
        .join(', ')}
System User Data:
-- SYSTEM_ID: ${this.systemId?.toString()}
-- SYSTEM_CREATED_AT: ${this.systemCreatedAt?.toISOString()}
-- SYSTEM_MNEMONIC: ${this.systemMnemonic?.value}
-- SYSTEM_PUBLIC_KEY: ${this.systemPublicKeyHex}
-- SYSTEM_PASSWORD: ${this.systemPassword?.value}
-- SYSTEM_ROLE_ID: ${this.systemRoleId?.toString()}
-- SYSTEM_ROLE_ID: ${this.systemUserRoleId?.toString()}
-- SYSTEM_BACKUP_CODES: ${this.systemBackupCodes
        ?.map((code: BackupCode) => code.value)
        .join(', ')}
Mnemonic Service Configuration:
-- MNEMONIC_HMAC_SECRET: ${this.mnemonicHmacSecret.valueAsHexString}
-- MNEMONIC_ENCRYPTION_KEY: ${this.mnemonicEncryptionKey.valueAsHexString}
PBKDF2 Iterations: ${this.pbkdf2Iterations}
-------------------------`,
    );
  }
}
