import { EciesStringKey, TranslatableError } from '@digitaldefiance/ecies-lib';
import { I18nEngine } from '@digitaldefiance/i18n-lib';
import { MissingValidatedDataError } from './errors/missing-validated-data';
import { RequiredStringKeys } from './interfaces/required-string-keys';

export function createTranslatableError<
  TStringKey extends keyof RequiredStringKeys,
>(
  stringKey: TStringKey,
  otherVars?: Record<string, string | number>,
  language?: any,
): TranslatableError {
  const engine =
    I18nEngine.getInstance<I18nEngine<EciesStringKey, any, any, any>>();
  return new TranslatableError(
    stringKey as EciesStringKey,
    engine,
    otherVars,
    language,
  );
}

export function createMissingValidatedDataError(
  data?: string | string[],
): MissingValidatedDataError<any, any> {
  return new MissingValidatedDataError(data);
}
