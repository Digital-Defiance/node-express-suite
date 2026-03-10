/**
 * @fileoverview Application constants including checksum, JWT, FEC, and ECIES configurations.
 * Provides factory functions for creating environment-specific constant sets.
 * @module constants
 */

import { ECIES as ECIESDefaults } from '@digitaldefiance/ecies-lib';
import { Constants as NodeEciesConstants } from '@digitaldefiance/node-ecies-lib';
import {
  createConstants,
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';
import { IFECConsts } from './interfaces';
import { IChecksumConsts } from './interfaces/checksum-consts';
import { IConstants } from './interfaces/constants';
import { IJwtConsts } from './interfaces/jwt-consts';

/**
 * Constants for checksum operations
 * These values are critical for data integrity and MUST NOT be changed
 * in an already established system as it will break all existing checksums.
 */
export const CHECKSUM: IChecksumConsts = Object.freeze({
  /** Default hash bits for SHA3 */
  SHA3_DEFAULT_HASH_BITS: 512 as const,

  /** Length of a SHA3 checksum buffer in bytes */
  SHA3_BUFFER_LENGTH: 64 as const,

  /** algorithm to use for checksum */
  ALGORITHM: 'sha3-512' as const,

  /** encoding to use for checksum */
  ENCODING: 'hex' as const,
} as const);

export const JWT: IJwtConsts = {
  /**
   * Algorithm to use for JWT
   */
  ALGORITHM: 'HS256' as const,

  /**
   * The expiration time for a JWT token in seconds
   */
  EXPIRATION_SEC: 86400 as const,
} as const;

export const FEC: IFECConsts = {
  /**
   * Maximum size of a single shard
   */
  MAX_SHARD_SIZE: 1048576 as const,
} as const;

// use defaults from ecies-lib
export const ECIES = Object.freeze(ECIESDefaults);

export const createExpressConstants = (
  overrides?: Partial<IConstants>,
): IConstants => {
  return Object.freeze({
    ...NodeEciesConstants,
    CHECKSUM: CHECKSUM,
    JWT: JWT,
    FEC: FEC,
    ECIES: ECIES,
    ECIES_VERSION_SIZE: 1,
    ECIES_CIPHER_SUITE_SIZE: 1,
    ...createConstants(overrides),
  } as IConstants);
};

export const LocalhostConstants: IConstants = createExpressConstants();

if (
  CHECKSUM.SHA3_BUFFER_LENGTH !== CHECKSUM.SHA3_DEFAULT_HASH_BITS / 8 ||
  CHECKSUM.SHA3_BUFFER_LENGTH !== CHECKSUM.SHA3_DEFAULT_HASH_BITS / 8
) {
  throw new TranslatableSuiteError(
    SuiteCoreStringKey.Error_InvalidChecksumConstants,
  );
}
