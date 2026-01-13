/**
 * @fileoverview Default runtime configuration for Express application constants.
 * Provides configuration registry and factory functions for creating customized constant sets.
 * @module defaults
 */

import {
  ECIES as BaseECIES,
  IIdProviderBase,
} from '@digitaldefiance/ecies-lib';
import {
  KEYRING_ALGORITHM_CONFIGURATION,
  Constants as NodeEciesConstants,
} from '@digitaldefiance/node-ecies-lib';
import { Constants as CoreConstants } from '@digitaldefiance/suite-core-lib';
import { CHECKSUM, ECIES, FEC, JWT } from './constants';
import { IConstants } from './interfaces/constants';
import { DeepPartial } from './interfaces/deep-partial';

export const EXPRESS_RUNTIME_CONFIGURATION_KEY = Symbol.for(
  'digitaldefiance.node.express.defaults',
);

const UINT8_SIZE = 1;
const UINT16_SIZE = 2;
const UINT16_MAX = 65535;
const UINT32_SIZE = 4;
const UINT32_MAX = 4294967295;
const UINT64_SIZE = 8;
const UINT64_MAX = 18446744073709551615n;
const HEX_RADIX = 16;
const OBJECT_ID_LENGTH = 24;

const defaultConfig: IConstants = Object.freeze({
  ...CoreConstants,
  ...NodeEciesConstants,
  UINT8_SIZE,
  UINT16_SIZE,
  UINT16_MAX,
  UINT32_SIZE,
  UINT32_MAX,
  UINT64_SIZE,
  UINT64_MAX,
  HEX_RADIX,
  OBJECT_ID_LENGTH,
  MEMBER_ID_LENGTH: 8,
  KEYRING_ALGORITHM_CONFIGURATION,
  ECIES_VERSION_SIZE: 1,
  ECIES_CIPHER_SUITE_SIZE: 1,
  CHECKSUM: CHECKSUM,
  JWT: JWT,
  ECIES: ECIES,
  FEC: FEC,
  PBKDF2: {
    ALGORITHM: 'sha256',
    SALT_BYTES: 32,
    ITERATIONS_PER_SECOND: 10000,
  },
});

const registry = new Map<symbol, IConstants>();
registry.set(EXPRESS_RUNTIME_CONFIGURATION_KEY, defaultConfig);

export function createExpressRuntimeConfiguration(
  overrides?: DeepPartial<IConstants>,
  base: IConstants = defaultConfig,
): IConstants {
  const merged: IConstants = {
    ...base,
    ...(overrides ?? {}),
    idProvider: (overrides?.idProvider ?? base.idProvider) as IIdProviderBase,
    UsernameRegex: (overrides?.UsernameRegex ?? base.UsernameRegex) as RegExp,
    PasswordRegex: (overrides?.PasswordRegex ?? base.PasswordRegex) as RegExp,
    MnemonicRegex: (overrides?.MnemonicRegex ?? base.MnemonicRegex) as RegExp,
    JwtSecretRegex: (overrides?.JwtSecretRegex ??
      base.JwtSecretRegex) as RegExp,
    MnemonicEncryptionKeyRegex: (overrides?.MnemonicEncryptionKeyRegex ??
      base.MnemonicEncryptionKeyRegex) as RegExp,
    MnemonicHmacRegex: (overrides?.MnemonicHmacRegex ??
      base.MnemonicHmacRegex) as RegExp,
    KEYRING: {
      ALGORITHM: overrides?.KEYRING?.ALGORITHM ?? base.KEYRING.ALGORITHM,
      KEY_BITS: overrides?.KEYRING?.KEY_BITS ?? base.KEYRING.KEY_BITS,
      MODE: overrides?.KEYRING?.MODE ?? base.KEYRING.MODE,
    },
    ENCRYPTION: {
      ENCRYPTION_TYPE_SIZE:
        overrides?.ENCRYPTION?.ENCRYPTION_TYPE_SIZE ??
        base.ENCRYPTION.ENCRYPTION_TYPE_SIZE,
      RECIPIENT_ID_SIZE:
        overrides?.ENCRYPTION?.RECIPIENT_ID_SIZE ??
        base.ENCRYPTION.RECIPIENT_ID_SIZE,
    },
    BACKUP_CODES: {
      ...base.BACKUP_CODES,
      ...(overrides?.BACKUP_CODES ?? {}),
      NormalizedHexRegex: (overrides?.BACKUP_CODES?.NormalizedHexRegex ??
        base.BACKUP_CODES.NormalizedHexRegex) as RegExp,
      DisplayRegex: (overrides?.BACKUP_CODES?.DisplayRegex ??
        base.BACKUP_CODES.DisplayRegex) as RegExp,
    },
    CHECKSUM: {
      ...base.CHECKSUM,
      ...(overrides?.CHECKSUM ?? {}),
    },
    JWT: {
      ...base.JWT,
      ...(overrides?.JWT ?? {}),
    },
    PBKDF2: {
      ...base.PBKDF2,
      ...(overrides?.PBKDF2 ?? {}),
      ALGORITHM:
        overrides?.PBKDF2?.ALGORITHM ?? base.PBKDF2.ALGORITHM ?? 'sha256',
    },
    PBKDF2_PROFILES: {
      USER_LOGIN: {
        hashBytes:
          overrides?.PBKDF2_PROFILES?.USER_LOGIN?.hashBytes ??
          base.PBKDF2_PROFILES.USER_LOGIN.hashBytes,
        iterations:
          overrides?.PBKDF2_PROFILES?.USER_LOGIN?.iterations ??
          base.PBKDF2_PROFILES.USER_LOGIN.iterations,
        saltBytes:
          overrides?.PBKDF2_PROFILES?.USER_LOGIN?.saltBytes ??
          base.PBKDF2_PROFILES.USER_LOGIN.saltBytes,
        algorithm:
          overrides?.PBKDF2_PROFILES?.USER_LOGIN?.algorithm ??
          base.PBKDF2_PROFILES.USER_LOGIN.algorithm,
      },
      KEY_WRAPPING: {
        hashBytes:
          overrides?.PBKDF2_PROFILES?.KEY_WRAPPING?.hashBytes ??
          base.PBKDF2_PROFILES.KEY_WRAPPING.hashBytes,
        iterations:
          overrides?.PBKDF2_PROFILES?.KEY_WRAPPING?.iterations ??
          base.PBKDF2_PROFILES.KEY_WRAPPING.iterations,
        saltBytes:
          overrides?.PBKDF2_PROFILES?.KEY_WRAPPING?.saltBytes ??
          base.PBKDF2_PROFILES.KEY_WRAPPING.saltBytes,
        algorithm:
          overrides?.PBKDF2_PROFILES?.KEY_WRAPPING?.algorithm ??
          base.PBKDF2_PROFILES.KEY_WRAPPING.algorithm,
      },
      BACKUP_CODES: {
        hashBytes:
          overrides?.PBKDF2_PROFILES?.BACKUP_CODES?.hashBytes ??
          base.PBKDF2_PROFILES.BACKUP_CODES.hashBytes,
        iterations:
          overrides?.PBKDF2_PROFILES?.BACKUP_CODES?.iterations ??
          base.PBKDF2_PROFILES.BACKUP_CODES.iterations,
        saltBytes:
          overrides?.PBKDF2_PROFILES?.BACKUP_CODES?.saltBytes ??
          base.PBKDF2_PROFILES.BACKUP_CODES.saltBytes,
        algorithm:
          overrides?.PBKDF2_PROFILES?.BACKUP_CODES?.algorithm ??
          base.PBKDF2_PROFILES.BACKUP_CODES.algorithm,
      },
      HIGH_SECURITY: {
        hashBytes:
          overrides?.PBKDF2_PROFILES?.HIGH_SECURITY?.hashBytes ??
          base.PBKDF2_PROFILES.HIGH_SECURITY.hashBytes,
        iterations:
          overrides?.PBKDF2_PROFILES?.HIGH_SECURITY?.iterations ??
          base.PBKDF2_PROFILES.HIGH_SECURITY.iterations,
        saltBytes:
          overrides?.PBKDF2_PROFILES?.HIGH_SECURITY?.saltBytes ??
          base.PBKDF2_PROFILES.HIGH_SECURITY.saltBytes,
        algorithm:
          overrides?.PBKDF2_PROFILES?.HIGH_SECURITY?.algorithm ??
          base.PBKDF2_PROFILES.HIGH_SECURITY.algorithm,
      },
      BROWSER_PASSWORD: {
        hashBytes:
          overrides?.PBKDF2_PROFILES?.BROWSER_PASSWORD?.hashBytes ??
          base.PBKDF2_PROFILES.BROWSER_PASSWORD.hashBytes,
        iterations:
          overrides?.PBKDF2_PROFILES?.BROWSER_PASSWORD?.iterations ??
          base.PBKDF2_PROFILES.BROWSER_PASSWORD.iterations,
        saltBytes:
          overrides?.PBKDF2_PROFILES?.BROWSER_PASSWORD?.saltBytes ??
          base.PBKDF2_PROFILES.BROWSER_PASSWORD.saltBytes,
        algorithm:
          overrides?.PBKDF2_PROFILES?.BROWSER_PASSWORD?.algorithm ??
          base.PBKDF2_PROFILES.BROWSER_PASSWORD.algorithm,
      },
      TEST_FAST: {
        hashBytes:
          overrides?.PBKDF2_PROFILES?.TEST_FAST?.hashBytes ??
          base.PBKDF2_PROFILES.TEST_FAST.hashBytes,
        iterations:
          overrides?.PBKDF2_PROFILES?.TEST_FAST?.iterations ??
          base.PBKDF2_PROFILES.TEST_FAST.iterations,
        saltBytes:
          overrides?.PBKDF2_PROFILES?.TEST_FAST?.saltBytes ??
          base.PBKDF2_PROFILES.TEST_FAST.saltBytes,
        algorithm:
          overrides?.PBKDF2_PROFILES?.TEST_FAST?.algorithm ??
          base.PBKDF2_PROFILES.TEST_FAST.algorithm,
      },
    },
    ECIES: {
      ...BaseECIES,
      ...(overrides?.ECIES ?? {}),
      SYMMETRIC: {
        ...BaseECIES.SYMMETRIC,
        ...(overrides?.ECIES?.SYMMETRIC ?? {}),
      },
      SIMPLE: {
        ...BaseECIES.SIMPLE,
        ...(overrides?.ECIES?.SIMPLE ?? {}),
      },
      SINGLE: {
        ...BaseECIES.SINGLE,
        ...(overrides?.ECIES?.SINGLE ?? {}),
      },
      MULTIPLE: {
        ...BaseECIES.MULTIPLE,
        ...(overrides?.ECIES?.MULTIPLE ?? {}),
      },
      ENCRYPTION_TYPE: {
        ...BaseECIES.ENCRYPTION_TYPE,
        ...(overrides?.ECIES?.ENCRYPTION_TYPE ?? {}),
      },
    },
    FEC: {
      ...base.FEC,
      ...(overrides?.FEC ?? {}),
    },
    WRAPPED_KEY: {
      SALT_SIZE:
        overrides?.WRAPPED_KEY?.SALT_SIZE ?? base.WRAPPED_KEY.SALT_SIZE,
      IV_SIZE: overrides?.WRAPPED_KEY?.IV_SIZE ?? base.WRAPPED_KEY.IV_SIZE,
      MASTER_KEY_SIZE:
        overrides?.WRAPPED_KEY?.MASTER_KEY_SIZE ??
        base.WRAPPED_KEY.MASTER_KEY_SIZE,
      MIN_ITERATIONS:
        overrides?.WRAPPED_KEY?.MIN_ITERATIONS ??
        base.WRAPPED_KEY.MIN_ITERATIONS,
    },
    VOTING: base.VOTING,
  };
  return Object.freeze(merged);
}

export function registerExpressRuntimeConfiguration(
  key: symbol,
  overrides?: DeepPartial<IConstants>,
): IConstants {
  const config = createExpressRuntimeConfiguration(overrides);
  registry.set(key, config);
  return config;
}

export function getExpressRuntimeConfiguration(
  key: symbol = EXPRESS_RUNTIME_CONFIGURATION_KEY,
): IConstants {
  return registry.get(key) ?? defaultConfig;
}
