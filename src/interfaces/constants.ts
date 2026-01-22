/**
 * @fileoverview Constants interface combining all library constants.
 * Aggregates constants from ECIES, Node ECIES, Suite Core, and Node Express Suite.
 * @module interfaces/constants
 */

import {
  IChecksumConsts,
  IEncryptionConsts,
  IKeyringConsts,
  IConstants as INodeEciesConstants,
  IWrappedKeyConsts,
  PbkdfProfiles,
} from '@digitaldefiance/node-ecies-lib';
import { IConstants as ISuiteCoreConstants } from '@digitaldefiance/suite-core-lib';
import { IFECConsts } from './fec-consts';
import { IJwtConsts } from './jwt-consts';
import {
  IECIESConstants,
  IPBkdf2Consts,
  IVotingConsts,
} from '@digitaldefiance/ecies-lib';
import { CipherGCMTypes } from 'crypto';

/**
 * Combination of all constants from all libraries.
 * Extends Node ECIES constants (which includes ECIES_CONFIG and all crypto constants)
 * and Suite Core constants (which includes site-specific configuration).
 */
export interface IConstants extends INodeEciesConstants, ISuiteCoreConstants {
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
   * Voting constants used for homomorphic encryption voting
   */
  VOTING: IVotingConsts;
  /**
   * Algorithm configuration string for keyring operations
   */
  KEYRING_ALGORITHM_CONFIGURATION: CipherGCMTypes;
  ECIES_VERSION_SIZE: number;
  ECIES_CIPHER_SUITE_SIZE: number;
  MEMBER_ID_LENGTH: number;
}
