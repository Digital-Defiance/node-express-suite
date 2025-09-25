import { ECIES as ECIESDefaults } from '@digitaldefiance/ecies-lib';
import { createConstants } from '@digitaldefiance/suite-core-lib';
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
  siteDomain: string,
  overrides?: Partial<IConstants>,
): IConstants => {
  return Object.freeze({
    ...createConstants(siteDomain, overrides),
    CHECKSUM: CHECKSUM,
    JWT: JWT,
    FEC: FEC,
    ECIES: ECIES,
  } as const);
};

export const Constants: IConstants = createExpressConstants('localhost');

if (
  CHECKSUM.SHA3_BUFFER_LENGTH !== CHECKSUM.SHA3_DEFAULT_HASH_BITS / 8 ||
  CHECKSUM.SHA3_BUFFER_LENGTH !== CHECKSUM.SHA3_DEFAULT_HASH_BITS / 8
) {
  throw new Error('Invalid checksum constants');
}
