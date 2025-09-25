import { GlobalActiveContext, IActiveContext, LanguageRegistry } from '@digitaldefiance/i18n-lib';
import { setGlobalContextLanguageFromRequest } from '../../src/middlewares/set-global-context-language';

function makeReq(
  opts: Partial<{
    user: { siteLanguage?: string };
    headers: Record<string, string>;
  }>,
) {
  return {
    user: opts.user,
    headers: opts.headers ?? {},
  } as unknown as import('express').Request;
}

function makeRes() {
  return {} as unknown as import('express').Response;
}

describe('setGlobalContextLanguageFromRequest', () => {
  let context: GlobalActiveContext<string, IActiveContext<string>>;
  beforeAll(() => {
    // Initialize LanguageRegistry with default language
    LanguageRegistry.registerLanguage({ id: 'en', code: 'en', name: 'English', isDefault: true });
    LanguageRegistry.registerLanguage({ id: 'fr', code: 'fr', name: 'French' });
    LanguageRegistry.registerLanguage({ id: 'es', code: 'es', name: 'Spanish' });
    LanguageRegistry.setDefaultLanguage('en');
  });
  
  beforeEach(() => {
    context = GlobalActiveContext.getInstance<string, IActiveContext<string>>();
    context.userLanguage = 'en-US';
    context.languageContextSpace = 'admin';
  });

  it('uses user.siteLanguage when no Accept-Language header', () => {
    const req = makeReq({ user: { siteLanguage: 'fr' } });
    const res = makeRes();
    const next = jest.fn();

    setGlobalContextLanguageFromRequest(req, res, next);

    expect(context.userLanguage).toBe('fr');
    expect(context.languageContextSpace).toBe('user');
    expect(next).toHaveBeenCalled();
  });

  it('overrides with Accept-Language header when valid', () => {
    const req = makeReq({
      user: { siteLanguage: 'es' },
      headers: { 'accept-language': 'en' },
    });
    const res = makeRes();
    const next = jest.fn();

    setGlobalContextLanguageFromRequest(req, res, next);

    expect(context.userLanguage).toBe('en');
    expect(context.languageContextSpace).toBe('user');
    expect(next).toHaveBeenCalled();
  });

  it('ignores invalid Accept-Language and falls back to user or default', () => {
    const req = makeReq({
      user: { siteLanguage: 'es' },
      headers: { 'accept-language': 'not-a-lang' },
    });
    const res = makeRes();
    const next = jest.fn();

    setGlobalContextLanguageFromRequest(req, res, next);

    expect(context.userLanguage).toBe('es');
    expect(context.languageContextSpace).toBe('user');
    expect(next).toHaveBeenCalled();
  });
});
