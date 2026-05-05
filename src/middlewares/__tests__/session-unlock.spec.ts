/**
 * @fileoverview Unit tests for the session-unlock middleware family.
 *
 * Covers:
 *  - useSessionUnlock attaches eciesUser when the session lookup succeeds
 *  - the CRYPTO_SESSION_OWNED marker is set so cleanupCrypto skips disposal
 *  - useSessionUnlock no-ops when req.user is missing, sid is missing, or
 *    the store rejects (mismatched user / expired session)
 *  - isCryptoSessionOwned reflects the marker accurately
 *  - cleanupCrypto integration: a session-owned member is NOT disposed
 *    at end-of-request, but a non-session-owned member IS
 */

import { describe, expect, it, jest } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';
import type { Member, PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  CRYPTO_SESSION_OWNED,
  isCryptoSessionOwned,
  useSessionUnlock,
} from '../session-unlock';
import { cleanupCrypto } from '../cleanup-crypto';

type StubMember = Member<PlatformID> & { dispose: jest.Mock };

function makeMember(): StubMember {
  return { dispose: jest.fn() } as unknown as StubMember;
}

function makeReq(overrides: Partial<Request> = {}): Request {
  const headers: Record<string, string> = {};
  return {
    user: undefined,
    cookies: {},
    get: (name: string) => headers[name.toLowerCase()],
    ...overrides,
  } as unknown as Request;
}

function makeRes(): Response {
  return {} as Response;
}

describe('useSessionUnlock', () => {
  it('no-ops when req.user is missing', () => {
    const store = {
      touch: jest.fn(),
    } as unknown as Parameters<typeof useSessionUnlock>[0]['store'];
    const next = jest.fn() as unknown as NextFunction;
    useSessionUnlock({ store })(makeReq(), makeRes(), next);
    expect(store.touch).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('no-ops when no session id is present', () => {
    const store = {
      touch: jest.fn(),
    } as unknown as Parameters<typeof useSessionUnlock>[0]['store'];
    const req = makeReq({ user: { id: 'u1' } as Request['user'] });
    const next = jest.fn() as unknown as NextFunction;
    useSessionUnlock({ store })(req, makeRes(), next);
    expect(store.touch).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect((req as unknown as { eciesUser?: unknown }).eciesUser).toBeUndefined();
  });

  it('no-ops when store.touch returns undefined (expired or wrong user)', () => {
    const store = {
      touch: jest.fn().mockReturnValue(undefined),
    } as unknown as Parameters<typeof useSessionUnlock>[0]['store'];
    const req = makeReq({
      user: { id: 'u1' } as Request['user'],
      cookies: { bc_session: 'abc' },
    });
    const next = jest.fn() as unknown as NextFunction;
    useSessionUnlock({ store })(req, makeRes(), next);
    expect(store.touch).toHaveBeenCalledWith('abc', 'u1');
    expect((req as unknown as { eciesUser?: unknown }).eciesUser).toBeUndefined();
    expect(isCryptoSessionOwned(req)).toBe(false);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('attaches eciesUser and marks session-owned when touch succeeds', () => {
    const member = makeMember();
    const store = {
      touch: jest.fn().mockReturnValue(member),
    } as unknown as Parameters<typeof useSessionUnlock>[0]['store'];
    const req = makeReq({
      user: { id: 'u1' } as Request['user'],
      cookies: { bc_session: 'abc' },
    });
    const next = jest.fn() as unknown as NextFunction;
    useSessionUnlock({ store })(req, makeRes(), next);
    expect((req as unknown as { eciesUser?: unknown }).eciesUser).toBe(member);
    expect(isCryptoSessionOwned(req)).toBe(true);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('reads session id from X-BC-Session header when cookie is absent', () => {
    const member = makeMember();
    const store = {
      touch: jest.fn().mockReturnValue(member),
    } as unknown as Parameters<typeof useSessionUnlock>[0]['store'];
    const headers: Record<string, string> = { 'x-bc-session': 'header-sid' };
    const req = makeReq({
      user: { id: 'u1' } as Request['user'],
      cookies: {},
      get: ((name: string) => headers[name.toLowerCase()]) as Request['get'],
    });
    const next = jest.fn() as unknown as NextFunction;
    useSessionUnlock({ store })(req, makeRes(), next);
    expect(store.touch).toHaveBeenCalledWith('header-sid', 'u1');
    expect((req as unknown as { eciesUser?: unknown }).eciesUser).toBe(member);
  });

  it('honours a custom cookie name', () => {
    const member = makeMember();
    const store = {
      touch: jest.fn().mockReturnValue(member),
    } as unknown as Parameters<typeof useSessionUnlock>[0]['store'];
    const req = makeReq({
      user: { id: 'u1' } as Request['user'],
      cookies: { custom_name: 'xyz' },
    });
    const next = jest.fn() as unknown as NextFunction;
    useSessionUnlock({ store, cookieName: 'custom_name' })(
      req,
      makeRes(),
      next,
    );
    expect(store.touch).toHaveBeenCalledWith('xyz', 'u1');
  });
});

describe('isCryptoSessionOwned', () => {
  it('returns false on a fresh request', () => {
    expect(isCryptoSessionOwned(makeReq())).toBe(false);
  });

  it('returns true when the marker symbol is present and === true', () => {
    const req = makeReq();
    (req as unknown as Record<symbol, unknown>)[CRYPTO_SESSION_OWNED] = true;
    expect(isCryptoSessionOwned(req)).toBe(true);
  });

  it('returns false for any non-true value at the marker symbol', () => {
    const req = makeReq();
    (req as unknown as Record<symbol, unknown>)[CRYPTO_SESSION_OWNED] = 'true';
    expect(isCryptoSessionOwned(req)).toBe(false);
  });
});

describe('cleanupCrypto + session-unlock interaction', () => {
  function runCleanup(req: Request): { res: Response } {
    const res = {
      end: jest.fn().mockReturnValue(undefined),
    } as unknown as Response;
    const next = jest.fn() as unknown as NextFunction;
    cleanupCrypto(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    // Trigger response end so the wrapped end() runs the cleanup logic.
    (res.end as unknown as () => void)();
    return { res };
  }

  it('does NOT dispose a session-owned eciesUser', () => {
    const member = makeMember();
    const req = makeReq();
    (req as unknown as { eciesUser?: unknown }).eciesUser = member;
    (req as unknown as Record<symbol, unknown>)[CRYPTO_SESSION_OWNED] = true;

    runCleanup(req);

    expect(member.dispose).not.toHaveBeenCalled();
    expect((req as unknown as { eciesUser?: unknown }).eciesUser).toBe(member);
  });

  it('disposes a non-session-owned eciesUser', () => {
    const member = makeMember();
    const req = makeReq();
    (req as unknown as { eciesUser?: unknown }).eciesUser = member;

    runCleanup(req);

    expect(member.dispose).toHaveBeenCalledTimes(1);
    expect((req as unknown as { eciesUser?: unknown }).eciesUser).toBeUndefined();
  });
});
