/**
 * Unit tests for TOTP feature flag environment variable and APP_CONFIG injection.
 *
 * Validates:
 * - Requirements 16.1: IEnvironment includes totpAvailable (boolean, default false)
 * - Requirements 16.2: Environment parses TOTP_AVAILABLE env var
 * - Requirements 16.3: APP_CONFIG includes totpAvailable sourced from environment
 *
 * @module __tests__/totp-feature-flag.spec
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { Environment } from '../environment';
import { AppRouter } from '../routers/app';
import { IApplication } from '../interfaces/application';
import { LocalhostConstants } from '../constants';
import { BaseRouter } from '../routers/base';
import type { Request, Response } from 'express';

jest.mock('fs');

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockReaddirSync = readdirSync as jest.MockedFunction<typeof readdirSync>;
const mockReadFileSync = readFileSync as jest.MockedFunction<
  typeof readFileSync
>;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Sets up the minimal process.env required to construct an Environment instance.
 */
function setMinimalEnv(): void {
  // test fixture values — not real credentials
  // amazonq-ignore-next-line
  process.env['JWT_SECRET'] =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  process.env['HOST'] = '0.0.0.0';
  process.env['PORT'] = '3000';
  process.env['EMAIL_SENDER'] = 'test@example.com';
  process.env['SYSTEM_PUBLIC_KEY'] = 'test-public-key';
  process.env['API_DIST_DIR'] = '/tmp/test-api-dist';
  process.env['REACT_DIST_DIR'] = '/tmp/test-react-dist';
  // amazonq-ignore-next-line
  process.env['MNEMONIC_HMAC_SECRET'] =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  // amazonq-ignore-next-line
  process.env['MNEMONIC_ENCRYPTION_KEY'] =
    'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
  process.env['NODE_ENV'] = 'test';
}

describe('TOTP Feature Flag', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Clear TOTP_AVAILABLE so each test controls it explicitly
    delete process.env['TOTP_AVAILABLE'];
    // fs mocks: existsSync returns true so Environment constructor doesn't throw on dist dirs
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([]);
    mockReadFileSync.mockReturnValue('');
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  // ─── Requirement 16.2: Environment parses TOTP_AVAILABLE ──────────────

  describe('Environment.totpAvailable', () => {
    it('should default to false when TOTP_AVAILABLE is absent', () => {
      setMinimalEnv();
      delete process.env['TOTP_AVAILABLE'];

      const env = new Environment(undefined, true);

      expect(env.totpAvailable).toBe(false);
    });

    it('should be true when TOTP_AVAILABLE is "true"', () => {
      setMinimalEnv();
      process.env['TOTP_AVAILABLE'] = 'true';

      const env = new Environment(undefined, true);

      expect(env.totpAvailable).toBe(true);
    });

    it('should be true when TOTP_AVAILABLE is "1"', () => {
      setMinimalEnv();
      process.env['TOTP_AVAILABLE'] = '1';

      const env = new Environment(undefined, true);

      expect(env.totpAvailable).toBe(true);
    });

    it('should be false when TOTP_AVAILABLE is "false"', () => {
      setMinimalEnv();
      process.env['TOTP_AVAILABLE'] = 'false';

      const env = new Environment(undefined, true);

      expect(env.totpAvailable).toBe(false);
    });

    it('should be false when TOTP_AVAILABLE is an arbitrary string', () => {
      setMinimalEnv();
      process.env['TOTP_AVAILABLE'] = 'yes';

      const env = new Environment(undefined, true);

      expect(env.totpAvailable).toBe(false);
    });
  });

  // ─── Requirement 16.3: APP_CONFIG includes totpAvailable ──────────────

  describe('APP_CONFIG injection via applyIndexReplacements', () => {
    let appRouter: AppRouter;
    let mockEnvironment: Environment;

    beforeEach(() => {
      setMinimalEnv();
      mockEnvironment = new Environment(undefined, true);

      const mockApplication: jest.Mocked<IApplication> = {
        environment: mockEnvironment,
        constants: LocalhostConstants,
        expressApp: {} as never,
      } as never;

      const mockBaseRouter: jest.Mocked<BaseRouter> = {
        application: mockApplication,
      } as never;

      appRouter = new AppRouter(mockBaseRouter);
    });

    it('should include totpAvailable=false in APP_CONFIG when env var is absent', () => {
      const html =
        '<script>window.APP_CONFIG = window.APP_CONFIG || {};</script>';
      const locals = {
        cspNonce: '',
        title: 'Test',
        tagline: 'tagline',
        description: 'desc',
        server: 'http://localhost:3000',
        siteUrl: 'http://localhost:3000',
        baseHref: '/',
        hostname: 'localhost',
        siteTitle: 'Test',
        emailDomain: 'example.com',
        totpAvailable: false,
      };

      const result = (appRouter as never)['applyIndexReplacements'](
        html,
        locals,
      );

      expect(result).toContain('"totpAvailable":false');
    });

    it('should include totpAvailable=true in APP_CONFIG when env var is set', () => {
      const html =
        '<script>window.APP_CONFIG = window.APP_CONFIG || {};</script>';
      const locals = {
        cspNonce: '',
        title: 'Test',
        tagline: 'tagline',
        description: 'desc',
        server: 'http://localhost:3000',
        siteUrl: 'http://localhost:3000',
        baseHref: '/',
        hostname: 'localhost',
        siteTitle: 'Test',
        emailDomain: 'example.com',
        totpAvailable: true,
      };

      const result = (appRouter as never)['applyIndexReplacements'](
        html,
        locals,
      );

      expect(result).toContain('"totpAvailable":true');
    });

    it('should source totpAvailable from environment in getIndexLocals', () => {
      setMinimalEnv();
      process.env['TOTP_AVAILABLE'] = 'true';
      const envWithTotp = new Environment(undefined, true);

      const mockApp: jest.Mocked<IApplication> = {
        environment: envWithTotp,
        constants: LocalhostConstants,
        expressApp: {} as never,
      } as never;

      const mockBase: jest.Mocked<BaseRouter> = {
        application: mockApp,
      } as never;

      const router = new AppRouter(mockBase);

      const mockReq = {
        hostname: 'localhost',
        protocol: 'http',
        socket: { localPort: 3000 },
      } as Request;

      const mockRes = {
        locals: { cspNonce: 'nonce' },
      } as Response;

      const locals = (router as never)['getIndexLocals'](mockReq, mockRes);

      expect(locals.totpAvailable).toBe(true);
    });
  });
});
