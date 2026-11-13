import {
  GlobalActiveContext,
  IActiveContext,
  LanguageRegistry,
} from '@digitaldefiance/i18n-lib';
import {
  setGlobalContextLanguageFromRequest,
  resolveRequestLanguage,
} from '../../src/middlewares/set-global-context-language';
import { getRequestLanguage } from '../../src/request-context';

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
  return { locals: {} } as unknown as import('express').Response;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Runs the middleware and reports the language the rest of the request sees. */
function languageSeenDownstream(req: import('express').Request): {
  seen: string | undefined;
  next: jest.Mock;
  res: import('express').Response;
} {
  const res = makeRes();
  let seen: string | undefined;
  const next = jest.fn(() => {
    seen = getRequestLanguage();
  });
  setGlobalContextLanguageFromRequest(req, res, next);
  return { seen, next, res };
}

describe('setGlobalContextLanguageFromRequest', () => {
  let context: GlobalActiveContext<string, IActiveContext<string>>;
  function registerTestLanguages() {
    // Clear and initialize LanguageRegistry with default language
    LanguageRegistry.clear();
    LanguageRegistry.registerLanguage({
      id: 'en',
      code: 'en',
      name: 'English',
      isDefault: true,
    });
    LanguageRegistry.registerLanguage({ id: 'fr', code: 'fr', name: 'French' });
    LanguageRegistry.registerLanguage({
      id: 'es',
      code: 'es',
      name: 'Spanish',
    });
    LanguageRegistry.setDefaultLanguage('en');
  }

  beforeAll(registerTestLanguages);

  beforeEach(() => {
    context = GlobalActiveContext.getInstance<string, IActiveContext<string>>();
    context.userLanguage = 'en-US';
    context.languageContextSpace = 'admin';
  });

  it('uses user.siteLanguage when no Accept-Language header', () => {
    const { seen, next } = languageSeenDownstream(
      makeReq({ user: { siteLanguage: 'fr' } }),
    );

    expect(seen).toBe('fr');
    expect(context.languageContextSpace).toBe('user');
    expect(next).toHaveBeenCalled();
  });

  it('overrides with Accept-Language header when valid', () => {
    const { seen, next } = languageSeenDownstream(
      makeReq({
        user: { siteLanguage: 'es' },
        headers: { 'accept-language': 'en' },
      }),
    );

    expect(seen).toBe('en');
    expect(context.languageContextSpace).toBe('user');
    expect(next).toHaveBeenCalled();
  });

  it('ignores invalid Accept-Language and falls back to user or default', () => {
    const { seen, next } = languageSeenDownstream(
      makeReq({
        user: { siteLanguage: 'es' },
        headers: { 'accept-language': 'not-a-lang' },
      }),
    );

    expect(seen).toBe('es');
    expect(context.languageContextSpace).toBe('user');
    expect(next).toHaveBeenCalled();
  });

  it('matches a weighted header: fr-CA,fr;q=0.9,en-US;q=0.8 -> fr', () => {
    const { seen } = languageSeenDownstream(
      makeReq({
        headers: { 'accept-language': 'fr-CA,fr;q=0.9,en-US;q=0.8' },
      }),
    );
    expect(seen).toBe('fr');
  });

  it('honors q-values over header order', () => {
    expect(
      resolveRequestLanguage(
        makeReq({ headers: { 'accept-language': 'en;q=0.4, es;q=0.9' } }),
      ),
    ).toBe('es');
  });

  it('exposes the resolved language on res.locals', () => {
    const { res } = languageSeenDownstream(
      makeReq({ headers: { 'accept-language': 'es' } }),
    );
    expect(res.locals['language']).toBe('es');
  });

  it('does not write the request language into the shared GlobalActiveContext', () => {
    context.userLanguage = 'en-US';
    languageSeenDownstream(makeReq({ headers: { 'accept-language': 'fr' } }));
    expect(context.userLanguage).toBe('en-US');
  });

  it('is not visible outside the request', () => {
    languageSeenDownstream(makeReq({ headers: { 'accept-language': 'fr' } }));
    expect(getRequestLanguage()).toBeUndefined();
  });

  it('keeps overlapping requests on their own language across an await', async () => {
    const run = (header: string, pauseMs: number) =>
      new Promise<string[]>((resolve) => {
        const req = makeReq({ headers: { 'accept-language': header } });
        setGlobalContextLanguageFromRequest(req, makeRes(), () => {
          void (async () => {
            const before = getRequestLanguage() as string;
            await sleep(pauseMs);
            // a different request's middleware has run in the meantime
            resolve([before, getRequestLanguage() as string]);
          })();
        });
      });

    const [first, second] = await Promise.all([run('fr', 30), run('es', 5)]);
    expect(first).toEqual(['fr', 'fr']);
    expect(second).toEqual(['es', 'es']);
  });

  it('calls next without a language when no languages are registered', () => {
    try {
      LanguageRegistry.clear();
      const { seen, next } = languageSeenDownstream(makeReq({}));
      expect(next).toHaveBeenCalled();
      expect(seen).toBeUndefined();
    } finally {
      registerTestLanguages();
    }
  });
});

describe('request-scoped timezone', () => {
  const { GlobalActiveContext: GAC, Timezone } = jest.requireActual(
    '@digitaldefiance/i18n-lib',
  ) as typeof import('@digitaldefiance/i18n-lib');
  const { continueWithRequestLanguage } = jest.requireActual(
    '../../src/middlewares/set-global-context-language',
  ) as typeof import('../../src/middlewares/set-global-context-language');

  it('keeps overlapping requests on their own timezone without touching the shared one', async () => {
    const ctx = GAC.getInstance<string, IActiveContext<string>>();
    const shared = ctx.userTimezone;
    const tokyo = new Timezone('Asia/Tokyo');
    const paris = new Timezone('Europe/Paris');

    const run = (tz: InstanceType<typeof Timezone>, pauseMs: number) =>
      new Promise<unknown>((resolve) => {
        continueWithRequestLanguage(
          makeReq({}),
          makeRes(),
          () => {
            void (async () => {
              await sleep(pauseMs);
              resolve(ctx.userTimezone);
            })();
          },
          undefined,
          tz,
        );
      });

    const [a, b] = await Promise.all([run(tokyo, 30), run(paris, 5)]);
    expect(a).toBe(tokyo);
    expect(b).toBe(paris);
    expect(ctx.userTimezone).toBe(shared);
  });
});
