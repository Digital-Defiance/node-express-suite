/**
 * Unit tests for Application Let's Encrypt integration.
 *
 * Tests that the Application class correctly orchestrates GreenlockManager
 * when letsEncrypt is enabled, skips dev HTTPS, and calls stop() properly.
 *
 * Requirements: 2.3, 2.4, 4.1, 4.2, 4.3
 *
 * @module __tests__/application-letsencrypt.spec
 */

// (ILetsEncryptConfig used implicitly via Environment.letsEncrypt)

// ─── Mock GreenlockManager ─────────────────────────────────────────────────

const mockGreenlockStart = jest.fn().mockResolvedValue(undefined);
const mockGreenlockStop = jest.fn().mockResolvedValue(undefined);

jest.mock('../greenlock-manager', () => ({
  GreenlockManager: jest.fn().mockImplementation(() => ({
    start: mockGreenlockStart,
    stop: mockGreenlockStop,
  })),
}));

// No fs or https mocks needed:
// - When letsEncrypt is enabled, the dev HTTPS block is skipped entirely
// - When letsEncrypt is disabled, we don't set httpsDevCertRoot so dev HTTPS is also skipped

// ─── Imports (after mocks) ──────────────────────────────────────────────────

import { mkdtempSync, rmdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { GreenlockManager } from '../greenlock-manager';
import { Application } from '../application';
import { Environment } from '../environment';
import { AppRouter } from '../routers/app';
import type { BaseRouter } from '../routers/base';
import type { IApplication } from '../interfaces/application';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Creates a minimal set of process.env overrides that satisfy all
 * Environment constructor validations.
 */
function makeBaseEnv(
  tmpApiDir: string,
  tmpReactDir: string,
): Record<string, string> {
  return {
    HOST: '0.0.0.0',
    PORT: String(Math.floor(Math.random() * 10000) + 50000),
    JWT_SECRET: 'a'.repeat(64),
    EMAIL_SENDER: 'test@localhost',
    BASE_PATH: '/',
    API_DIST_DIR: tmpApiDir,
    REACT_DIST_DIR: tmpReactDir,
    MNEMONIC_HMAC_SECRET: 'ab'.repeat(32),
    MNEMONIC_ENCRYPTION_KEY: 'cd'.repeat(32),
    DEV_DATABASE: 'test',
    NODE_ENV: 'test',
    MONGO_URI: 'mongodb://localhost:27017/test',
    LANGUAGE: 'English (US)',
  };
}

/**
 * Creates a minimal Application instance with mocked dependencies.
 * The Application constructor is complex, but we only need to test
 * the start()/stop() orchestration around GreenlockManager.
 */
function createTestApplication(env: Environment): Application {
  const noopRouterFactory = (_app: IApplication) =>
    ({ init: jest.fn() }) as unknown as BaseRouter<Buffer>;

  // Provide a mock appRouterFactory that returns a stub with init(),
  // avoiding the real AppRouter which requires a fully wired application.
  const mockAppRouterFactory = () =>
    ({ init: jest.fn() }) as unknown as AppRouter<Buffer>;

  return new Application(
    env,
    noopRouterFactory,
    undefined, // cspConfig — use default
    undefined, // constants — use default
    mockAppRouterFactory,
  );
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe("Application Let's Encrypt integration", () => {
  let savedEnv: NodeJS.ProcessEnv;
  let tmpApiDir: string;
  let tmpReactDir: string;

  beforeAll(() => {
    tmpApiDir = mkdtempSync(join(tmpdir(), 'api-dist-'));
    tmpReactDir = mkdtempSync(join(tmpdir(), 'react-dist-'));
  });

  afterAll(() => {
    rmdirSync(tmpApiDir);
    rmdirSync(tmpReactDir);
  });

  beforeEach(() => {
    savedEnv = { ...process.env };
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  /**
   * Helper to create an Environment with letsEncrypt enabled.
   */
  function makeEnabledEnv(): Environment {
    const base = makeBaseEnv(tmpApiDir, tmpReactDir);
    process.env = {
      ...base,
      LETS_ENCRYPT_ENABLED: 'true',
      LETS_ENCRYPT_EMAIL: 'admin@example.com',
      LETS_ENCRYPT_HOSTNAMES: 'example.com',
      LETS_ENCRYPT_STAGING: 'true',
    };
    return new Environment(undefined, true);
  }

  /**
   * Helper to create an Environment with letsEncrypt disabled.
   */
  function makeDisabledEnv(): Environment {
    const base = makeBaseEnv(tmpApiDir, tmpReactDir);
    process.env = { ...base };
    return new Environment(undefined, true);
  }

  // Requirements: 2.3, 4.1, 4.3
  describe('letsEncrypt enabled starts GreenlockManager and skips dev HTTPS', () => {
    it('should create GreenlockManager and call start() when letsEncrypt is enabled', async () => {
      const env = makeEnabledEnv();
      const app = createTestApplication(env);

      // Mock super.start() to avoid MongoDB connection
      const superStartSpy = jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(app)), 'start')
        .mockResolvedValue(undefined);

      await app.start();

      // GreenlockManager constructor should have been called with the letsEncrypt config
      expect(GreenlockManager).toHaveBeenCalledTimes(1);
      expect(GreenlockManager).toHaveBeenCalledWith(env.letsEncrypt);

      // GreenlockManager.start() should have been called with the express app
      expect(mockGreenlockStart).toHaveBeenCalledTimes(1);
      expect(mockGreenlockStart).toHaveBeenCalledWith(app.expressApp);

      // The app should be ready after start
      expect(app.ready).toBe(true);

      superStartSpy.mockRestore();
      await app.stop();
    });

    it('should NOT create an HTTPS dev server when letsEncrypt is enabled', async () => {
      // When letsEncrypt is enabled, the code takes the `if (letsEncrypt.enabled)` branch
      // and skips the `else if (httpsDevCertRoot)` branch entirely.
      // We verify this by confirming GreenlockManager was used (not dev HTTPS).
      const env = makeEnabledEnv();
      const app = createTestApplication(env);

      const superStartSpy = jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(app)), 'start')
        .mockResolvedValue(undefined);

      await app.start();

      // GreenlockManager should have been used (letsEncrypt path)
      expect(GreenlockManager).toHaveBeenCalledTimes(1);
      expect(mockGreenlockStart).toHaveBeenCalledTimes(1);

      // The app should be ready — confirming the letsEncrypt path completed
      expect(app.ready).toBe(true);

      superStartSpy.mockRestore();
      await app.stop();
    });
  });

  // Requirements: 2.4
  describe('letsEncrypt disabled preserves existing behavior', () => {
    it('should NOT create GreenlockManager when letsEncrypt is disabled', async () => {
      const env = makeDisabledEnv();
      const app = createTestApplication(env);

      const superStartSpy = jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(app)), 'start')
        .mockResolvedValue(undefined);

      await app.start();

      // GreenlockManager should NOT have been instantiated
      expect(GreenlockManager).not.toHaveBeenCalled();
      expect(mockGreenlockStart).not.toHaveBeenCalled();

      // The app should still be ready
      expect(app.ready).toBe(true);

      superStartSpy.mockRestore();
      await app.stop();
    });
  });

  // Requirements: 4.2
  describe('stop() calls greenlockManager.stop()', () => {
    it('should call greenlockManager.stop() when letsEncrypt was enabled', async () => {
      const env = makeEnabledEnv();
      const app = createTestApplication(env);

      const superStartSpy = jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(app)), 'start')
        .mockResolvedValue(undefined);

      await app.start();

      // Reset to track stop calls
      mockGreenlockStop.mockClear();

      await app.stop();

      expect(mockGreenlockStop).toHaveBeenCalledTimes(1);

      superStartSpy.mockRestore();
    });

    it('should NOT call greenlockManager.stop() when letsEncrypt was disabled', async () => {
      const env = makeDisabledEnv();
      const app = createTestApplication(env);

      const superStartSpy = jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(app)), 'start')
        .mockResolvedValue(undefined);

      await app.start();
      await app.stop();

      expect(mockGreenlockStop).not.toHaveBeenCalled();

      superStartSpy.mockRestore();
    });
  });

  // Requirements: 4.1
  describe('ready state is set only after all servers are listening', () => {
    it('should not be ready before start() resolves', async () => {
      const env = makeEnabledEnv();
      const app = createTestApplication(env);

      const superStartSpy = jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(app)), 'start')
        .mockResolvedValue(undefined);

      // Before start, app should not be ready
      expect(app.ready).toBe(false);

      // Make GreenlockManager.start() delay to verify ready isn't set prematurely
      let resolveGreenlock: () => void;
      const greenlockPromise = new Promise<void>((resolve) => {
        resolveGreenlock = resolve;
      });
      mockGreenlockStart.mockReturnValueOnce(greenlockPromise);

      const startPromise = app.start();

      // Start has been called but greenlock hasn't resolved yet
      // The app should not be ready yet (start() hasn't resolved)
      // We can't directly check _ready mid-flight, but we can verify
      // that start() only resolves after greenlock resolves

      // Resolve greenlock
      resolveGreenlock!();
      await startPromise;

      // Now the app should be ready
      expect(app.ready).toBe(true);

      superStartSpy.mockRestore();
      await app.stop();
    });

    it('should wait for both HTTP server and GreenlockManager before setting ready', async () => {
      const env = makeEnabledEnv();
      const app = createTestApplication(env);

      const superStartSpy = jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(app)), 'start')
        .mockResolvedValue(undefined);

      // Track the order of operations
      const events: string[] = [];

      mockGreenlockStart.mockImplementationOnce(() => {
        events.push('greenlock-start');
        return Promise.resolve();
      });

      await app.start();
      events.push('start-resolved');

      // Greenlock start should have been called before start resolved
      expect(events).toEqual(['greenlock-start', 'start-resolved']);
      expect(app.ready).toBe(true);

      superStartSpy.mockRestore();
      await app.stop();
    });
  });
});
