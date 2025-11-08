import { IECIESConstants, IPBkdf2Consts } from '@digitaldefiance/ecies-lib';
import {
  IEncryptionConsts,
  IKeyringConsts,
  IWrappedKeyConsts,
  PbkdfProfiles,
} from '@digitaldefiance/node-ecies-lib';
import { IConstants as IBaseConstants } from '@digitaldefiance/suite-core-lib';
import { CipherGCMTypes } from 'crypto';
import { IChecksumConsts } from './checksum-consts';
import { IFECConsts } from './fec-consts';
import { IJwtConsts } from './jwt-consts';

/**
 * Combination of all constants from all libraries
 * Ecies, Node Ecies, Suite Core, and Node Express Suite
 */
export interface IConstants extends IBaseConstants {
  UINT8_SIZE: number;
  UINT16_SIZE: number;
  UINT16_MAX: number;
  UINT32_SIZE: number;
  UINT32_MAX: number;
  UINT64_SIZE: number;
  UINT64_MAX: bigint;
  HEX_RADIX: number;
  /**
   * Number of rounds for bcrypt hashing. Higher values increase security but also consume more CPU resources.
   */
  BcryptRounds: number;
  /**
   * Minimum password length
   */
  PasswordMinLength: number;
  /**
   * The regular expression for valid passwords.
   */
  PasswordRegex: RegExp;
  /**
   * The regular expression for valid JWT tokens.
   */
  JwtSecretRegex: RegExp;
  /**
   * The regular expression for valid mnemonic phrases.
   * BIP39
   */
  MnemonicRegex: RegExp;
  /**
   * The regular expression for valid HMAC keys.
   */
  MnemonicHmacRegex: RegExp;
  /**
   * The regular expression for valid encryption keys.
   */
  MnemonicEncryptionKeyRegex: RegExp;
  /**
   * JWT constants
   */
  JWT: IJwtConsts;
  /**
   * Forward Error Correction constants
   */
  FEC: IFECConsts;
  /**
   * ECIES encryption constants
   */
  ECIES: IECIESConstants;
  /**
   * The length of a raw object ID (not the hex string representation)
   */
  OBJECT_ID_LENGTH: number;
  /**
   * PBKDF2 key derivation function constants
   */
  PBKDF2: IPBkdf2Consts;
  /**
   * Predefined PBKDF2 configuration profiles for different use cases
   */
  PBKDF2_PROFILES: PbkdfProfiles;
  /**
   * Checksum constants used for data integrity
   */
  CHECKSUM: IChecksumConsts;
  /**
   * Wrapped Key constants used for the key wrapping service
   */
  WRAPPED_KEY: IWrappedKeyConsts;
  /**
   * Keyring constants used for key management
   */
  KEYRING: IKeyringConsts;
  /**
   * Encryption constants used for encrypted data
   */
  ENCRYPTION: IEncryptionConsts;
  /**
   * Algorithm configuration string for keyring operations
   */
  KEYRING_ALGORITHM_CONFIGURATION: CipherGCMTypes;
}
