import { withConsoleMocks } from '@digitaldefiance/express-suite-test-utils';
import { GlobalActiveContext } from '@digitaldefiance/i18n-lib';
import { setGlobalActiveContextAdminLanguageFromProcessArgvOrEnv } from '../../src/get-language';

describe('get-language', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalArgv: string[];

  beforeEach(() => {
    originalEnv = { ...process.env };
    originalArgv = [...process.argv];
  });

  afterEach(() => {
    process.env = originalEnv;
    process.argv = originalArgv;
  });

  it('should use command-line argument over environment variable', () => {
    process.env['LANGUAGE'] = 'fr';
    process.argv = [...originalArgv, '--language=es'];
    const result = setGlobalActiveContextAdminLanguageFromProcessArgvOrEnv();
    expect(result).toBe('es');
  });

  it('should use environment variable when no command-line argument', () => {
    process.env['LANGUAGE'] = 'fr';
    const result = setGlobalActiveContextAdminLanguageFromProcessArgvOrEnv();
    expect(result).toBe('fr');
  });

  it('should return default language for invalid language code', () =>
    withConsoleMocks({ mute: true }, () => {
      const context = GlobalActiveContext.getInstance();
      const defaultLang = context.adminLanguage;
      process.env['LANGUAGE'] = 'invalid-lang';
      const result = setGlobalActiveContextAdminLanguageFromProcessArgvOrEnv();
      expect(result).toBe(defaultLang);
    }));

  it('should strip quotes from language code', () =>
    withConsoleMocks({ mute: true }, () => {
      process.argv = [...originalArgv, '--language="fr"'];
      const result = setGlobalActiveContextAdminLanguageFromProcessArgvOrEnv();
      expect(result).toBe('fr');
    }));
});
