/**
 * Property-Based Tests and Unit Tests for authenticateToken middleware — TOTP Handling
 *
 * Feature: totp-2fa, Property 9: Pending Token Rejected on Protected Endpoints
 *
 * Verifies that a valid pending TOTP token (signed JWT with
 * `{ userId, pendingTotp: true }` and no `roles`) is rejected by the
 * authenticateToken middleware on any protected endpoint.
 *
 * The existing `AbstractJwtService.verifyToken()` checks for BOTH `userId`
 * AND `roles` in the decoded payload. A pending token has no `roles` claim,
 * so `verifyToken` returns `null`, causing the middleware to respond with 403.
 *
 * @module __tests__/totp-middleware.spec
 */

import * as fc from 'fast-check';
import express, { Request, Response, NextFunction } from 'express';
import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { authenticateToken } from '../middlewares/authenticate-token';
import { IAuthenticationProvider } from '../interfaces/authentication-provider';
import { TokenExpiredError } from '../errors/token-expired';

// ─── Helpers ────────────────────────────────────────────────────────────────

const JWT_SECRET = 'test-jwt-secret';
const JWT_ALGORITHM = 'HS256' as const;

/**
 * Creates a signed pending TOTP token — a JWT with `{ userId, pendingTotp: true }`
 * and NO `roles` claim, matching the structure defined in the design document.
 */
function signPendingTotpToken(userId: string): string {
  return sign({ userId, pendingTotp: true }, JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: 600,
  });
}

/**
 * Creates a mock application with an authProvider whose `verifyToken`
 * mirrors the real `AbstractJwtService.verifyToken` behavior:
 * it decodes the JWT and returns `null` when the `roles` claim is missing.
 *
 * This is the exact behavior that causes pending TOTP tokens to be rejected.
 */
function createMockApplication(): {
  application: ReturnType<typeof buildApplication>;
  mockAuthProvider: jest.Mocked<IAuthenticationProvider>;
} {
  const { SecureString } = jest.requireActual('@digitaldefiance/ecies-lib');
  const { LocalhostConstants } = jest.requireActual('../constants');
  const { verify: jwtVerify } = jest.requireActual('jsonwebtoken');

  const mockAuthProvider: jest.Mocked<IAuthenticationProvider> = {
    verifyToken: jest.fn().mockImplementation(async (token: string) => {
      // Replicate AbstractJwtService.verifyToken logic:
      // decode the JWT, check for userId AND roles — return null if roles missing
      try {
        const decoded = jwtVerify(token, JWT_SECRET, {
          algorithms: [JWT_ALGORITHM],
        });
        if (
          typeof decoded === 'object' &&
          decoded !== null &&
          'userId' in decoded &&
          'roles' in decoded
        ) {
          return {
            userId: decoded.userId as string,
            roles: decoded.roles,
          };
        }
        // Pending TOTP tokens land here — no `roles` claim → null
        return null;
      } catch {
        return null;
      }
    }),
    findUserById: jest.fn().mockResolvedValue(null),
    buildRequestUserDTO: jest.fn().mockResolvedValue(null),
  };

  const application = buildApplication(mockAuthProvider, SecureString, LocalhostConstants);
  return { application, mockAuthProvider };
}

function buildApplication(
  authProvider: jest.Mocked<IAuthenticationProvider>,
  SecureString: new (s: string) => { value: string },
  constants: Record<string, unknown>,
) {
  return {
    environment: {
      jwtSecret: new SecureString(JWT_SECRET),
      mnemonicHmacSecret: new SecureString('test-hmac-secret'),
      mnemonicEncryptionKey: new SecureString('test-encryption-key'),
      timezone: { value: 'UTC' },
      mongo: { useTransactions: false },
    },
    constants,
    db: {},
    database: undefined,
    authProvider,
    ready: true,
    start: jest.fn(),
    getModel: () => ({}),
    services: { get: jest.fn(), register: jest.fn() },
    plugins: { get: jest.fn(), register: jest.fn() },
  };
}

/**
 * Builds an Express app with a catch-all protected route that applies
 * the authenticateToken middleware to every request method and path.
 */
function makeProtectedApp(
  application: ReturnType<typeof buildApplication>,
) {
  const app = express();
  app.use(express.json());

  app.use(
    (req: Request, res: Response, next: NextFunction) =>
      authenticateToken(application as never, req, res, next),
  );
  app.use((_req: Request, res: Response) =>
    res.status(200).json({ ok: true }),
  );

  return app;
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Arbitrary for valid MongoDB-style ObjectId hex strings (24 hex chars). */
const userIdArb = fc
  .array(fc.constantFrom(...'0123456789abcdef'.split('')), {
    minLength: 24,
    maxLength: 24,
  })
  .map((chars) => chars.join(''));

/** HTTP methods commonly used on protected endpoints. */
const httpMethodArb = fc.constantFrom('GET', 'POST', 'PUT', 'PATCH', 'DELETE');

/**
 * Arbitrary for protected endpoint paths — any path that is NOT
 * `POST /user/totp/verify`. We generate realistic API-style paths.
 */
const protectedPathArb = fc.constantFrom(
  '/protected',
  '/user/profile',
  '/user/settings',
  '/api/data',
  '/user/totp/setup',
  '/user/totp/confirm',
  '/user/totp/disable',
  '/user/totp/reset',
  '/documents',
  '/members',
  '/admin/users',
);

// ─── Property Test ──────────────────────────────────────────────────────────

describe('Feature: totp-2fa, Property 9: Pending Token Rejected on Protected Endpoints', () => {
  /**
   * **Validates: Requirements 6.8, 12.1**
   *
   * For any protected API endpoint other than `POST /user/totp/verify`,
   * a request bearing a valid pending TOTP token (with `pendingTotp: true`
   * and no `roles`) SHALL be rejected with HTTP 403.
   *
   * The rejection happens because `AbstractJwtService.verifyToken()` returns
   * `null` for tokens missing the `roles` claim, and the middleware responds
   * with 403 when `verifyToken` returns `null`.
   */
  it('pending TOTP token is rejected on any protected endpoint', async () => {
    const { application } = createMockApplication();
    const app = makeProtectedApp(application);

    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        httpMethodArb,
        protectedPathArb,
        async (userId, method, path) => {
          // Skip the one endpoint that should accept pending tokens
          if (method === 'POST' && path === '/user/totp/verify') {
            return; // vacuously true — this combination is excluded
          }

          const pendingToken = signPendingTotpToken(userId);

          const res = await request(app)
            [method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete'](path)
            .set('Authorization', `Bearer ${pendingToken}`);

          // The middleware must reject the request.
          // verifyToken returns null (no roles claim) → middleware sends 403.
          expect(res.status).toBe(403);
          // Must NOT reach the protected handler
          expect(res.body.ok).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ─── Unit Tests ─────────────────────────────────────────────────────────────

describe('Auth middleware TOTP unit tests', () => {
  /**
   * **Validates: Requirements 6.8, 12.1, 12.2**
   *
   * Unit tests for specific TOTP-related middleware behaviors:
   * - Pending token rejected on a specific protected endpoint
   * - Full JWT with roles works normally
   * - Expired pending token returns appropriate error
   */

  it('pending token is rejected on GET /user/settings (403)', async () => {
    const { application } = createMockApplication();
    const app = makeProtectedApp(application);

    const pendingToken = signPendingTotpToken('aabbccddeeff00112233aabb');

    const res = await request(app)
      .get('/user/settings')
      .set('Authorization', `Bearer ${pendingToken}`);

    // verifyToken returns null for tokens without roles → middleware sends 403
    expect(res.status).toBe(403);
    expect(res.body.ok).toBeUndefined();
  });

  it('full JWT with roles works normally (200)', async () => {
    const userId = 'aabbccddeeff00112233aabb';
    const { application, mockAuthProvider } = createMockApplication();

    // Override verifyToken to return a valid user (simulating a full JWT with roles)
    mockAuthProvider.verifyToken.mockResolvedValue({
      userId,
      roles: [],
    });

    // Override buildRequestUserDTO to return a valid user DTO
    mockAuthProvider.buildRequestUserDTO.mockResolvedValue({
      id: userId,
      email: 'test@example.com',
      username: 'testuser',
      roles: [],
      rolePrivileges: {
        admin: false,
        member: true,
        child: false,
        system: false,
      },
      emailVerified: true,
      timezone: 'UTC',
      siteLanguage: 'en',
      darkMode: false,
      currency: 'USD',
      directChallenge: false,
    } as never);

    const app = makeProtectedApp(application);

    // Sign a full JWT with roles (not a pending token)
    const fullToken = sign(
      { userId, roles: [] },
      JWT_SECRET,
      { algorithm: JWT_ALGORITHM, expiresIn: 3600 },
    );

    const res = await request(app)
      .get('/user/settings')
      .set('Authorization', `Bearer ${fullToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(mockAuthProvider.verifyToken).toHaveBeenCalledWith(fullToken);
    expect(mockAuthProvider.buildRequestUserDTO).toHaveBeenCalledWith(userId);
  });

  it('expired pending token returns 401', async () => {
    const { application, mockAuthProvider } = createMockApplication();

    // Override verifyToken to throw TokenExpiredError for expired tokens,
    // matching the real AbstractJwtService.verifyToken behavior
    mockAuthProvider.verifyToken.mockRejectedValue(new TokenExpiredError());

    const app = makeProtectedApp(application);

    // Sign a pending token that is already expired (expiresIn: 0 seconds ago)
    const expiredToken = sign(
      { userId: 'aabbccddeeff00112233aabb', pendingTotp: true },
      JWT_SECRET,
      { algorithm: JWT_ALGORITHM, expiresIn: 0 },
    );

    const res = await request(app)
      .get('/user/settings')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBeTruthy();
  });
});
