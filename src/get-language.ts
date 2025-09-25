import {
  GlobalActiveContext,
  IActiveContext,
  LanguageRegistry,
} from '@digitaldefiance/i18n-lib';
import {
  getSuiteCoreTranslation,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { debugLog } from './utils';

export function setGlobalActiveContextAdminLanguageFromProcessArgvOrEnv(): string {
  const consoleLanguageEnv = process.env['LANGUAGE'];
  const consoleLanguageArgv = process.argv.find((arg) =>
    arg.startsWith('--language='),
  );

  const context = GlobalActiveContext.getInstance<
    string,
    IActiveContext<string>
  >();

  // Prioritize command-line argument, then environment variable, then existing context
  const rawLanguage =
    (consoleLanguageArgv
      ? consoleLanguageArgv.split('=')[1]
      : consoleLanguageEnv) ?? context.adminLanguage;

  if (!rawLanguage) {
    return context.adminLanguage;
  }

  const consoleLanguage = rawLanguage.replace(/^['"]|['"]$/g, '');

  if (LanguageRegistry.hasLanguage(consoleLanguage)) {
    context.setAdminLanguage(consoleLanguage as string);
    return context.adminLanguage;
  }

  // If the language is invalid, log a warning and return the unchanged (default) language
  debugLog(
    true,
    'error',
    getSuiteCoreTranslation(
      SuiteCoreStringKey.Error_InvalidLanguageCodeTemplate,
      {
        LANGUAGE: consoleLanguage,
        DEFAULT_LANGUAGE: context.adminLanguage,
      },
    ),
  );
  return context.adminLanguage;
}
