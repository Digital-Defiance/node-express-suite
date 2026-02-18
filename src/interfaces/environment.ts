/**
 * @fileoverview Environment interface defining application configuration and credentials.
 * Contains all environment variables, database configuration, and user credentials.
 * @module interfaces/environment
 */

import { SecureBuffer, SecureString } from '@digitaldefiance/ecies-lib';
import { BackupCode } from '../backup-code';
import { IMongoEnvironment } from './environment-mongo';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { ILetsEncryptConfig } from './lets-encrypt-config';

/**
 * Environment configuration interface for the application.
 * Contains all configuration values, credentials, and environment-specific settings.
 * @template TID Platform-specific ID type (Buffer, ObjectId, etc.)
 */
export interface IEnvironment<TID extends PlatformID = Buffer> {
  /**
   * Whether to use a memory database for local development (eg with MongoMemoryServer)
   * If set, this will create a new in-memory database instance on application start with the given database name
   */
  devDatabase?: string;
  /**
   * Whether to print certain console debug messages
   */
  debug: boolean;
  /**
   * Whether to enable super verbose debug messags
   */
  detailedDebug: boolean;
  /**
   * The host name of the server
   */
  host: string;
  /**
   * The port the server is running on
   */
  port: number;
  /**
   * The base path of the server
   */
  basePath: string;
  /**
   * The URL of the server
   */
  serverUrl: string;
  /**
   * The secret used to sign JWTs
   */
  jwtSecret: string;
  /**
   * The email address to send notifications from
   */
  emailSender: string;
  /**
   * API distribution directory
   */
  apiDistDir: string;
  /**
   * react dist dir
   */
  reactDistDir: string;
  /**
   * The directory and root filename to store HTTPS development certificates
   */
  httpsDevCertRoot?: string;
  /**
   * The port to use for HTTPS development certificates
   */
  httpsDevPort: number;
  /**
   * Disable email sending
   */
  disableEmailSend: boolean;
  /**
   * MongoDB configuration
   */
  mongo: IMongoEnvironment;
  /**
   * Mnemonic for the admin user
   */
  adminMnemonic?: SecureString;
  /**
   * The ID of the admin user
   */
  adminId?: TID;
  /**
   * The creation date of the admin user
   */
  adminCreatedAt?: Date;
  /**
   * The password of the admin user
   */
  adminPassword?: SecureString;
  /**
   * The ID of the admin user role object
   */
  adminRoleId?: TID;
  /**
   * The ID of the admin user's user role object
   */
  adminUserRoleId?: TID;
  /**
   * Backup codes for the admin user
   */
  adminBackupCodes?: BackupCode[];
  /**
   * Mnemonic for the member user
   */
  memberMnemonic?: SecureString;
  /**
   * The ID of the member user
   */
  memberId?: TID;
  /**
   * The creation date of the member user
   */
  memberCreatedAt?: Date;
  /**
   * The password of the member user
   */
  memberPassword?: SecureString;
  /**
   * The ID of the member user role object
   */
  memberRoleId?: TID;
  /**
   * The ID of the member user's user role object
   */
  memberUserRoleId?: TID;
  /**
   * Backup codes for the member user
   */
  memberBackupCodes?: BackupCode[];
  /**
   * Mnemonic for the system user
   */
  systemMnemonic?: SecureString;
  /**
   * The ID of the system user
   */
  systemId?: TID;
  /**
   * The creation date of the system user
   */
  systemCreatedAt?: Date;
  /**
   * The public key of the system user
   */
  systemPublicKeyHex?: string;
  /**
   * The password of the system user
   */
  systemPassword?: SecureString;
  /**
   * The ID of the system user role object
   */
  systemRoleId?: TID;
  /**
   * The ID of the system user's user role object
   */
  systemUserRoleId?: TID;
  /**
   * Backup codes for the system user
   */
  systemBackupCodes?: BackupCode[];
  /**
   * HMAC secret for mnemonic encryption
   */
  mnemonicHmacSecret: SecureBuffer;
  /**
   * Encryption key for mnemonics
   */
  mnemonicEncryptionKey: SecureBuffer;
  /**
   * The timezone for the server
   */
  timezone: string;
  /**
   * The default language for the admin interface/CLI
   */
  adminLanguage: string;
  /**
   * The number of PBKDF2 iterations for key wrapping
   */
  pbkdf2Iterations: number;
  /**
   * Whether this is a production environment
   */
  production: boolean;

  /**
   * Let's Encrypt / Greenlock configuration
   */
  letsEncrypt: ILetsEncryptConfig;
}
