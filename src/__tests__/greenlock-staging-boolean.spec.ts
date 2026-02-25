/**
 * Unit Tests — Greenlock Staging Boolean Propagation & Challenge Config
 *
 * Task 3.4: Verify that the staging boolean propagates correctly through
 * the full chain: Environment → ILetsEncryptConfig → GreenlockManager → greenlockExpress.init()
 *
 * These are focused unit tests (not PBT) that verify the specific bug condition:
 *   isGreenlockBugCondition where letsEncryptEnabled=true AND staging=false
 *   AND NOT greenlockInitCalledWithCorrectConfig
 *
 * **Validates: Requirements 2.4**
 */

import { mkdtempSync, rmdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// ─── Top-level mock for greenlock-express ───────────────────────────────────
let capturedInitOptions: Record<string, unknown> | null = null;
jest.mock('greenlock-express', () => ({
  init: (options: Record<string, unknown>) => {
    capturedInitOptions = options;
    return {
      serve: jest.fn(),
      ready: jest.fn((cb: (glx: Record<string, unknown>) => void) => {
        cb({
          httpsServer: jest.fn().mockReturnValue({
            listen: jest.fn((_p: number, cb2?: () => void) => cb2?.()),
            close: jest.fn((cb2?: () => void) => cb2?.()),
            closeAllConnections: jest.fn(),
            on: jest.fn(),
          }),
          httpServer: jest.fn().mockReturnValue({
            listen: jest.fn((_p: number, cb2?: () => void) => cb2?.()),
            close: jest.fn((cb2?: () => void) => cb2?.()),
            closeAllConnections: jest.fn(),
            on: jest.fn(),
          }),
        });
      }),
    };
  },
}));

import {
  determineChallengeTypes,
  GreenlockManager,
} from '../greenlock-manager';
import { Environment } from '../environment';
import type { ILetsEncryptConfig } from '../interfaces/lets-encrypt-config';
import type { Application as ExpressApplication } from 'express';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeBaseEnv(
  tmpApiDir: string,
  tmpReactDir: string,
): Record<string, string> {
  return {
    HOST: '0.0.0.0',
    PORT: '3000',
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

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('Greenlock staging boolean propagation & challenge config (Task 3.4)', () => {
  let tmpApiDir: string;
  let tmpReactDir: string;
  let savedEnv: NodeJS.ProcessEnv;

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
    capturedInitOptions = null;
  });

  afterEach(() => {
    process.env = savedEnv;
    jest.restoreAllMocks();
  });

  // ── Environment parses LETS_ENCRYPT_STAGING as boolean ────────────────────

  describe('Environment LETS_ENCRYPT_STAGING boolean parsing', () => {
    it('staging is false when LETS_ENCRYPT_STAGING is "false"', () => {
      process.env = {
        ...makeBaseEnv(tmpApiDir, tmpReactDir),
        LETS_ENCRYPT_STAGING: 'false',
      };
      const env = new Environment(undefined, true);
      expect(env.letsEncrypt.staging).toBe(false);
      expect(typeof env.letsEncrypt.staging).toBe('boolean');
    });

    it('staging is false when LETS_ENCRYPT_STAGING is absent', () => {
      process.env = { ...makeBaseEnv(tmpApiDir, tmpReactDir) };
      // Ensure LETS_ENCRYPT_STAGING is not set
      delete process.env['LETS_ENCRYPT_STAGING'];
      const env = new Environment(undefined, true);
      expect(env.letsEncrypt.staging).toBe(false);
      expect(typeof env.letsEncrypt.staging).toBe('boolean');
    });

    it('staging is false when LETS_ENCRYPT_STAGING is "0"', () => {
      process.env = {
        ...makeBaseEnv(tmpApiDir, tmpReactDir),
        LETS_ENCRYPT_STAGING: '0',
      };
      const env = new Environment(undefined, true);
      expect(env.letsEncrypt.staging).toBe(false);
    });

    it('staging is true when LETS_ENCRYPT_STAGING is "true"', () => {
      process.env = {
        ...makeBaseEnv(tmpApiDir, tmpReactDir),
        LETS_ENCRYPT_STAGING: 'true',
      };
      const env = new Environment(undefined, true);
      expect(env.letsEncrypt.staging).toBe(true);
      expect(typeof env.letsEncrypt.staging).toBe('boolean');
    });

    it('staging is true when LETS_ENCRYPT_STAGING is "1"', () => {
      process.env = {
        ...makeBaseEnv(tmpApiDir, tmpReactDir),
        LETS_ENCRYPT_STAGING: '1',
      };
      const env = new Environment(undefined, true);
      expect(env.letsEncrypt.staging).toBe(true);
    });
  });

  // ── GreenlockManager passes staging boolean to greenlockExpress.init() ────

  describe('GreenlockManager staging boolean propagation to init()', () => {
    const fakeApp = {} as ExpressApplication;

    it('passes staging: false (boolean) when config.staging is false', async () => {
      const config: ILetsEncryptConfig = {
        enabled: true,
        maintainerEmail: 'admin@example.com',
        hostnames: ['example.com'],
        staging: false,
        configDir: './greenlock.d',
      };

      const manager = new GreenlockManager(config);
      await manager.start(fakeApp);

      expect(capturedInitOptions).not.toBeNull();
      expect(capturedInitOptions!['staging']).toBe(false);
      expect(typeof capturedInitOptions!['staging']).toBe('boolean');
      // Must not be string "false" or undefined
      expect(capturedInitOptions!['staging']).not.toBe('false');
      expect(capturedInitOptions!['staging']).not.toBeUndefined();

      await manager.stop();
    });

    it('passes staging: true (boolean) when config.staging is true', async () => {
      const config: ILetsEncryptConfig = {
        enabled: true,
        maintainerEmail: 'admin@example.com',
        hostnames: ['example.com'],
        staging: true,
        configDir: './greenlock.d',
      };

      const manager = new GreenlockManager(config);
      await manager.start(fakeApp);

      expect(capturedInitOptions).not.toBeNull();
      expect(capturedInitOptions!['staging']).toBe(true);
      expect(typeof capturedInitOptions!['staging']).toBe('boolean');

      await manager.stop();
    });

    it('passes correct maintainerEmail and configDir alongside staging', async () => {
      const config: ILetsEncryptConfig = {
        enabled: true,
        maintainerEmail: 'ops@brightchain.org',
        hostnames: ['brightchain.org'],
        staging: false,
        configDir: '/etc/greenlock',
      };

      const manager = new GreenlockManager(config);
      await manager.start(fakeApp);

      expect(capturedInitOptions!['maintainerEmail']).toBe(
        'ops@brightchain.org',
      );
      expect(capturedInitOptions!['configDir']).toBe('/etc/greenlock');
      expect(capturedInitOptions!['staging']).toBe(false);
      expect(capturedInitOptions!['cluster']).toBe(false);

      await manager.stop();
    });
  });

  // ── determineChallengeTypes returns correct config ────────────────────────

  describe('determineChallengeTypes challenge config correctness', () => {
    it('returns HTTP-01 only for standard FQDN hostnames', () => {
      const challenges = determineChallengeTypes([
        'example.com',
        'api.example.com',
      ]);

      expect(challenges).toHaveProperty('http-01');
      expect(challenges['http-01'].module).toBe('acme-http-01-standalone');
      expect(challenges).not.toHaveProperty('dns-01');
    });

    it('returns HTTP-01 and DNS-01 when wildcards are present', () => {
      const challenges = determineChallengeTypes([
        'example.com',
        '*.example.com',
      ]);

      expect(challenges).toHaveProperty('http-01');
      expect(challenges['http-01'].module).toBe('acme-http-01-standalone');
      expect(challenges).toHaveProperty('dns-01');
      expect(challenges['dns-01'].module).toBe('acme-dns-01-cli');
    });

    it('returns HTTP-01 and DNS-01 for wildcard-only list', () => {
      const challenges = determineChallengeTypes(['*.example.com']);

      expect(challenges).toHaveProperty('http-01');
      expect(challenges).toHaveProperty('dns-01');
    });

    it('returns HTTP-01 for a single standard hostname', () => {
      const challenges = determineChallengeTypes(['brightchain.org']);

      expect(challenges).toHaveProperty('http-01');
      expect(challenges).not.toHaveProperty('dns-01');
    });
  });

  // ── End-to-end: Environment → GreenlockManager staging propagation ────────

  describe('End-to-end: Environment staging → GreenlockManager init()', () => {
    const fakeApp = {} as ExpressApplication;

    it('Environment staging=false propagates as boolean false to greenlockExpress.init()', async () => {
      process.env = {
        ...makeBaseEnv(tmpApiDir, tmpReactDir),
        LETS_ENCRYPT_ENABLED: 'true',
        LETS_ENCRYPT_EMAIL: 'admin@example.com',
        LETS_ENCRYPT_HOSTNAMES: 'example.com',
        LETS_ENCRYPT_STAGING: 'false',
      };

      const env = new Environment(undefined, true);
      expect(env.letsEncrypt.staging).toBe(false);

      // Pass the Environment's letsEncrypt config directly to GreenlockManager
      const manager = new GreenlockManager(env.letsEncrypt);
      await manager.start(fakeApp);

      expect(capturedInitOptions).not.toBeNull();
      expect(capturedInitOptions!['staging']).toBe(false);
      expect(typeof capturedInitOptions!['staging']).toBe('boolean');

      await manager.stop();
    });

    it('Environment staging absent propagates as boolean false to greenlockExpress.init()', async () => {
      process.env = {
        ...makeBaseEnv(tmpApiDir, tmpReactDir),
        LETS_ENCRYPT_ENABLED: 'true',
        LETS_ENCRYPT_EMAIL: 'admin@example.com',
        LETS_ENCRYPT_HOSTNAMES: 'example.com',
      };
      delete process.env['LETS_ENCRYPT_STAGING'];

      const env = new Environment(undefined, true);
      expect(env.letsEncrypt.staging).toBe(false);

      const manager = new GreenlockManager(env.letsEncrypt);
      await manager.start(fakeApp);

      expect(capturedInitOptions!['staging']).toBe(false);
      expect(typeof capturedInitOptions!['staging']).toBe('boolean');

      await manager.stop();
    });

    it('Environment with wildcards propagates correct challenges to init()', async () => {
      process.env = {
        ...makeBaseEnv(tmpApiDir, tmpReactDir),
        LETS_ENCRYPT_ENABLED: 'true',
        LETS_ENCRYPT_EMAIL: 'admin@example.com',
        LETS_ENCRYPT_HOSTNAMES: 'example.com,*.example.com',
        LETS_ENCRYPT_STAGING: 'false',
      };

      const env = new Environment(undefined, true);
      const manager = new GreenlockManager(env.letsEncrypt);
      await manager.start(fakeApp);

      const challenges = capturedInitOptions!['challenges'] as Record<
        string,
        { module: string }
      >;
      expect(challenges['http-01'].module).toBe('acme-http-01-standalone');
      expect(challenges['dns-01'].module).toBe('acme-dns-01-cli');

      const sites = capturedInitOptions!['sites'] as Array<{
        subject: string;
        altnames: string[];
      }>;
      expect(sites[0].subject).toBe('example.com');
      expect(sites[0].altnames).toEqual(['example.com', '*.example.com']);

      await manager.stop();
    });
  });
});
