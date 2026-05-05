/**
 * @fileoverview Session-based crypto authentication middlewares.
 *
 * Two-step pattern that avoids requiring the mnemonic on every request:
 *
 *   POST /auth/session/establish   → useSessionEstablish
 *      body: { mnemonic | password }
 *      → unlocks the Member once, stores it in the in-process
 *        {@link CryptoSessionStore}, returns/sets an opaque session id
 *        cookie (`bc_session`). The unlocked private key never leaves
 *        the server.
 *
 *   * /api/...                     → useSessionUnlock
 *      Cookie/Header: bc_session=<sid>
 *      → looks up the unlocked member, slides the TTL forward, and
 *        attaches it to `req.eciesUser`. Subsequent crypto operations
 *        (signing, decryption) work transparently for the lifetime of
 *        the session.
 *
 * The session id is bound to the JWT user (`req.user.id`) — a stolen
 * session id used by a different account is rejected. Sessions are also
 * subject to a sliding TTL and an absolute cap.
 *
 * Compatibility note: when {@link useSessionUnlock} attaches an
 * eciesUser, it sets {@link CRYPTO_SESSION_OWNED} on the request so
 * {@link cleanupCrypto} knows the member is owned by the session store
 * and must not be disposed at end-of-request.
 *
 * @module middlewares/session-unlock
 */

import { SecureString } from '@digitaldefiance/ecies-lib';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  AccountStatus,
  getSuiteCoreTranslation,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { NextFunction, Request, Response } from 'express';
import { IApplication } from '../interfaces/application';
import type { CryptoSessionStore } from '../services/crypto-session-store';

/**
 * Symbol-keyed marker placed on the request when the attached
 * `eciesUser` is owned by a {@link CryptoSessionStore}. The cleanup
 * middleware checks this marker and skips disposal.
 */
export const CRYPTO_SESSION_OWNED: unique symbol = Symbol.for(
  '@digitaldefiance/node-express-suite/cryptoSessionOwned',
);

/** Default cookie name for the opaque session id. */
export const DEFAULT_SESSION_COOKIE_NAME = 'bc_session';

/**
 * Options shared by the session middlewares.
 */
export interface SessionMiddlewareOptions<TID extends PlatformID = Buffer> {
  /** The session store. Single instance per process. */
  store: CryptoSessionStore<TID>;
  /** Cookie name. Defaults to {@link DEFAULT_SESSION_COOKIE_NAME}. */
  cookieName?: string;
  /**
   * Whether to mark the cookie `Secure`. Defaults to `true` outside test
   * environments. Disable explicitly for local non-HTTPS development.
   */
  secureCookie?: boolean;
  /**
   * Account status considered "active" for the establish step.
   * Defaults to {@link AccountStatus.Active}.
   */
  activeStatusValue?: string;
}

function readSessionId(req: Request, cookieName: string): string | undefined {
  // Prefer cookie; fall back to X-BC-Session header for non-browser clients.
  const cookieJar = (req as Request & { cookies?: Record<string, unknown> })
    .cookies;
  const fromCookie = cookieJar?.[cookieName];
  if (typeof fromCookie === 'string' && fromCookie.length > 0) {
    return fromCookie;
  }
  const header = req.get('x-bc-session');
  if (typeof header === 'string' && header.length > 0) return header;
  return undefined;
}

/**
 * Build the `useSessionEstablish` middleware.
 *
 * Performs a one-shot crypto authentication using the supplied mnemonic
 * or password, stores the unlocked member in the session store, and
 * delivers an opaque session id to the client as a cookie (and as the
 * `X-BC-Session` response header for non-browser clients).
 *
 * Requires `req.user` to be set (i.e. mount AFTER the JWT middleware).
 */
export function useSessionEstablish<
  TID extends PlatformID = Buffer,
  TAccountStatus extends string = AccountStatus,
>(
  application: IApplication<TID>,
  options: SessionMiddlewareOptions<TID>,
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const cookieName = options.cookieName ?? DEFAULT_SESSION_COOKIE_NAME;
  const secureCookie =
    options.secureCookie ?? process.env['NODE_ENV'] !== 'test';
  const activeStatusValue = (options.activeStatusValue ??
    AccountStatus.Active) as TAccountStatus;

  return async (req, res, next) => {
    try {
      const authProvider = application.authProvider;
      if (!authProvider) {
        res.status(500).send('Authentication provider not configured');
        return;
      }
      if (!req.user) {
        res
          .status(401)
          .send(
            getSuiteCoreTranslation(SuiteCoreStringKey.Validation_InvalidToken),
          );
        return;
      }

      const body = (req.body ?? {}) as Record<string, unknown>;
      const mnemonic =
        typeof body['mnemonic'] === 'string'
          ? (body['mnemonic'] as string)
          : undefined;
      const password =
        typeof body['password'] === 'string'
          ? (body['password'] as string)
          : undefined;
      if (!mnemonic && !password) {
        res.status(400).send({
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_MnemonicOrPasswordRequired,
          ),
        });
        return;
      }

      const authenticatedUser = await authProvider.findUserById(req.user.id);
      if (
        !authenticatedUser ||
        (authenticatedUser.accountStatus as unknown as TAccountStatus) !==
          activeStatusValue
      ) {
        res
          .status(403)
          .send(
            getSuiteCoreTranslation(SuiteCoreStringKey.Validation_UserNotFound),
          );
        return;
      }
      if (authenticatedUser.id !== req.user.id) {
        res
          .status(403)
          .send(
            getSuiteCoreTranslation(
              SuiteCoreStringKey.Validation_InvalidCredentials,
            ),
          );
        return;
      }

      const email = authenticatedUser.email ?? req.user.email;
      if (!email) {
        res.status(400).send({
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_InvalidCredentials,
          ),
        });
        return;
      }

      let result;
      if (mnemonic) {
        if (!authProvider.authenticateWithMnemonic) {
          res
            .status(500)
            .send('Mnemonic authentication not supported by provider');
          return;
        }
        result = await authProvider.authenticateWithMnemonic(
          email,
          new SecureString(mnemonic),
        );
      } else if (password) {
        if (!authProvider.authenticateWithPassword) {
          res
            .status(500)
            .send('Password authentication not supported by provider');
          return;
        }
        result = await authProvider.authenticateWithPassword(email, password);
      } else {
        // Should be unreachable thanks to the earlier guard, but kept
        // for exhaustiveness.
        res.status(400).send({
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_MnemonicOrPasswordRequired,
          ),
        });
        return;
      }

      const sessionId = options.store.establish(
        result.userId,
        result.userMember,
      );

      res.cookie(cookieName, sessionId, {
        httpOnly: true,
        sameSite: 'strict',
        secure: secureCookie,
        path: '/',
      });
      res.set('X-BC-Session', sessionId);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Build the `useSessionUnlock` middleware.
 *
 * Looks up the session id (cookie or `X-BC-Session` header), validates
 * it against the JWT user, slides the TTL forward, and attaches the
 * unlocked member to `req.eciesUser`. If no valid session is found the
 * middleware simply calls `next()` without attaching anything — a
 * handler that requires crypto can then either fall back to the
 * full {@link authenticateCrypto} path or return 401.
 */
export function useSessionUnlock<TID extends PlatformID = Buffer>(
  options: SessionMiddlewareOptions<TID>,
): (req: Request, res: Response, next: NextFunction) => void {
  const cookieName = options.cookieName ?? DEFAULT_SESSION_COOKIE_NAME;
  return (req, res, next) => {
    if (!req.user) {
      next();
      return;
    }
    const sessionId = readSessionId(req, cookieName);
    if (!sessionId) {
      next();
      return;
    }
    const member = options.store.touch(sessionId, req.user.id);
    if (!member) {
      next();
      return;
    }
    // Cast through unknown — TID is constrained at the IApplication
    // boundary; the request type holds Member<PlatformID>.
    (req as unknown as { eciesUser?: unknown }).eciesUser = member;
    (req as unknown as Record<symbol, unknown>)[CRYPTO_SESSION_OWNED] = true;
    next();
  };
}

/**
 * Returns true when {@link useSessionUnlock} attached the eciesUser on
 * this request. Used by {@link cleanupCrypto} to avoid disposing a
 * session-owned member.
 */
export function isCryptoSessionOwned(req: Request): boolean {
  return (
    (req as unknown as Record<symbol, unknown>)[CRYPTO_SESSION_OWNED] === true
  );
}
