import { ECIES as BaseECIES } from '@digitaldefiance/ecies-lib';
import { Constants as CoreConstants } from '@digitaldefiance/suite-core-lib';
import { CHECKSUM, ECIES, FEC, JWT } from './constants';
import { IConstants } from './interfaces/constants';
import { DeepPartial } from './interfaces/deep-partial';

export const EXPRESS_RUNTIME_CONFIGURATION_KEY = Symbol.for(
  'digitaldefiance.node.express.defaults',
);

const defaultConfig: IConstants = Object.freeze({
  ...CoreConstants,
  CHECKSUM: CHECKSUM,
  JWT: JWT,
  ECIES: ECIES,
  FEC: FEC,
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
    UsernameRegex: (overrides?.UsernameRegex ?? base.UsernameRegex) as RegExp,
    PasswordRegex: (overrides?.PasswordRegex ?? base.PasswordRegex) as RegExp,
    MnemonicRegex: (overrides?.MnemonicRegex ?? base.MnemonicRegex) as RegExp,
    HmacRegex: (overrides?.HmacRegex ?? base.HmacRegex) as RegExp,
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
