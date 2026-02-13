/**
 * Property-Based Tests for GreenlockManager HTTP redirect behavior
 *
 * Feature: letsencrypt-greenlock-support
 * Uses fast-check to validate the HTTP-to-HTTPS redirect correctness property
 * across many randomly generated host and path combinations.
 *
 * Since the actual redirect is handled internally by greenlock-express,
 * we test the redirect concept by creating a minimal Express app that
 * implements the same HTTP 301 redirect logic and verifying it with supertest.
 *
 * @module __tests__/greenlock-manager.spec
 */

import * as fc from 'fast-check';
import express from 'express';
import request from 'supertest';

// ─── Top-level mock for greenlock-express ───────────────────────────────────
// Must be at the top level so Jest hoists it before static imports in greenlock-manager.ts.
// The mockInit variable is reassigned in beforeEach for unit tests.
let mockInit = jest.fn();
jest.mock('greenlock-express', () => ({
  init: (...args: unknown[]) => mockInit(...args),
}));

// ─── Redirect handler (mirrors the behavior greenlock-express provides on port 80) ──

/**
 * Creates an Express app that redirects all HTTP requests to HTTPS
 * with a 301 status and the correct Location header.
 * This mirrors the redirect behavior that greenlock-express provides
 * on the HTTP redirect server (port 80).
 */
function createHttpRedirectApp(): express.Application {
  const app = express();
  app.use((req: express.Request, res: express.Response) => {
    const host = req.headers.host ?? 'localhost';
    const location = `https://${host}${req.url}`;
    res.redirect(301, location);
  });
  return app;
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Arbitrary for a valid DNS label (1-12 chars, alphanumeric + internal hyphens) */
const dnsLabelArb: fc.Arbitrary<string> = fc.stringMatching(
  /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,10}[a-zA-Z0-9])?$/,
);

/** Arbitrary for a valid TLD (2-6 alpha chars) */
const tldArb: fc.Arbitrary<string> = fc.stringMatching(/^[a-zA-Z]{2,6}$/);

/** Arbitrary for a valid hostname (one or more labels + TLD) */
const hostArb: fc.Arbitrary<string> = fc
  .tuple(fc.array(dnsLabelArb, { minLength: 1, maxLength: 3 }), tldArb)
  .map(([labels, tld]) => [...labels, tld].join('.'));

/** Arbitrary for a valid URL path segment (alphanumeric, hyphens, underscores) */
const pathSegmentArb: fc.Arbitrary<string> = fc.stringMatching(
  /^[a-zA-Z0-9_-]{1,20}$/,
);

/** Arbitrary for a valid URL path (starts with /, 0-4 segments) */
const pathArb: fc.Arbitrary<string> = fc
  .array(pathSegmentArb, { minLength: 0, maxLength: 4 })
  .map((segments) => '/' + segments.join('/'));

// ─── Property Tests ─────────────────────────────────────────────────────────

// Feature: letsencrypt-greenlock-support, Property 4: HTTP-to-HTTPS redirect correctness
describe('Property 4: HTTP-to-HTTPS redirect correctness', () => {
  /**
   * Validates: Requirements 3.2
   *
   * For any HTTP request with host h and path p, the HTTP redirect server
   * should respond with status 301 and a Location header equal to https://{h}{p}.
   */
  const redirectApp = createHttpRedirectApp();

  it('should respond with 301 and Location header https://{host}{path} for any host and path', async () => {
    await fc.assert(
      fc.asyncProperty(hostArb, pathArb, async (host: string, path: string) => {
        const response = await request(redirectApp)
          .get(path)
          .set('Host', host)
          .redirects(0);

        expect(response.status).toBe(301);
        expect(response.headers['location']).toBe(`https://${host}${path}`);
      }),
      { numRuns: 100 },
    );
  });

  it('should preserve the full path including nested segments', async () => {
    await fc.assert(
      fc.asyncProperty(
        hostArb,
        fc.array(pathSegmentArb, { minLength: 2, maxLength: 5 }),
        async (host: string, segments: string[]) => {
          const path = '/' + segments.join('/');
          const response = await request(redirectApp)
            .get(path)
            .set('Host', host)
            .redirects(0);

          expect(response.status).toBe(301);
          expect(response.headers['location']).toBe(`https://${host}${path}`);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should redirect root path correctly', async () => {
    await fc.assert(
      fc.asyncProperty(hostArb, async (host: string) => {
        const response = await request(redirectApp)
          .get('/')
          .set('Host', host)
          .redirects(0);

        expect(response.status).toBe(301);
        expect(response.headers['location']).toBe(`https://${host}/`);
      }),
      { numRuns: 100 },
    );
  });
});

import { determineChallengeTypes } from '../greenlock-manager';

// ─── Arbitraries for Property 5 ────────────────────────────────────────────

/** Arbitrary for a valid wildcard hostname: *.label.tld or *.label1.label2.tld */
const wildcardHostnameArb: fc.Arbitrary<string> = fc
  .tuple(fc.array(dnsLabelArb, { minLength: 1, maxLength: 3 }), tldArb)
  .map(([labels, tld]) => '*.' + [...labels, tld].join('.'));

/** Arbitrary for a valid non-wildcard (FQDN) hostname */
const fqdnHostnameArb: fc.Arbitrary<string> = hostArb;

// ─── Property Tests ─────────────────────────────────────────────────────────

// Feature: letsencrypt-greenlock-support, Property 5: Wildcard hostname triggers DNS-01 challenge
describe('Property 5: Wildcard hostname triggers DNS-01 challenge', () => {
  /**
   * Validates: Requirements 5.2
   *
   * For any hostname string matching the wildcard pattern *.domain.tld,
   * the Greenlock configuration should specify DNS-01 as the challenge type
   * for that hostname entry.
   */

  it('should include dns-01 challenge when any hostname is a wildcard', () => {
    fc.assert(
      fc.property(
        wildcardHostnameArb,
        fc.array(fqdnHostnameArb, { minLength: 0, maxLength: 5 }),
        (wildcard: string, fqdns: string[]) => {
          const hostnames = [...fqdns, wildcard];
          const challenges = determineChallengeTypes(hostnames);

          expect(challenges).toHaveProperty('dns-01');
          expect(challenges['dns-01'].module).toBe('acme-dns-01-cli');
          // http-01 should always be present as well
          expect(challenges).toHaveProperty('http-01');
          expect(challenges['http-01'].module).toBe('acme-http-01-standalone');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should not include dns-01 challenge when no hostname is a wildcard', () => {
    fc.assert(
      fc.property(
        fc.array(fqdnHostnameArb, { minLength: 1, maxLength: 5 }),
        (fqdns: string[]) => {
          const challenges = determineChallengeTypes(fqdns);

          expect(challenges).not.toHaveProperty('dns-01');
          // http-01 should always be present
          expect(challenges).toHaveProperty('http-01');
          expect(challenges['http-01'].module).toBe('acme-http-01-standalone');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should include dns-01 challenge when all hostnames are wildcards', () => {
    fc.assert(
      fc.property(
        fc.array(wildcardHostnameArb, { minLength: 1, maxLength: 5 }),
        (wildcards: string[]) => {
          const challenges = determineChallengeTypes(wildcards);

          expect(challenges).toHaveProperty('dns-01');
          expect(challenges['dns-01'].module).toBe('acme-dns-01-cli');
          expect(challenges).toHaveProperty('http-01');
          expect(challenges['http-01'].module).toBe('acme-http-01-standalone');
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Unit Tests for GreenlockManager ────────────────────────────────────────

import { EventEmitter } from 'events';
import { GreenlockManager } from '../greenlock-manager';
import { ILetsEncryptConfig } from '../interfaces/environment';

/**
 * Creates a mock Server object with listen, close, closeAllConnections, and on methods.
 * Extends EventEmitter so .on() works naturally.
 */
function createMockServer(): EventEmitter & {
  listen: jest.Mock;
  close: jest.Mock;
  closeAllConnections: jest.Mock;
} {
  const server = new EventEmitter() as EventEmitter & {
    listen: jest.Mock;
    close: jest.Mock;
    closeAllConnections: jest.Mock;
  };
  server.listen = jest.fn((_port: number, cb?: () => void) => {
    if (cb) cb();
  });
  server.close = jest.fn((cb?: (err?: Error) => void) => {
    if (cb) cb();
  });
  server.closeAllConnections = jest.fn();
  return server;
}

/** Default test config for GreenlockManager */
function makeTestConfig(
  overrides?: Partial<ILetsEncryptConfig>,
): ILetsEncryptConfig {
  return {
    enabled: true,
    maintainerEmail: 'admin@example.com',
    hostnames: ['example.com'],
    staging: true,
    configDir: './greenlock.d',
    ...overrides,
  };
}

describe('GreenlockManager unit tests', () => {
  let mockHttpsServer: ReturnType<typeof createMockServer>;
  let mockRedirectServer: ReturnType<typeof createMockServer>;
  let mockReady: jest.Mock;

  beforeEach(() => {
    mockHttpsServer = createMockServer();
    mockRedirectServer = createMockServer();

    mockReady = jest.fn((cb: (glx: Record<string, unknown>) => void) => {
      cb({
        httpsServer: jest.fn().mockReturnValue(mockHttpsServer),
        httpServer: jest.fn().mockReturnValue(mockRedirectServer),
      });
    });

    mockInit = jest.fn().mockReturnValue({
      serve: jest.fn(),
      ready: mockReady,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  // Requirements: 2.1
  describe('start() calls greenlock-express.init() with correct config', () => {
    it('should call init with maintainerEmail, staging, configDir, challenges, and sites', async () => {
      const config = makeTestConfig();
      const manager = new GreenlockManager(config);
      const fakeApp = {} as import('express').Application;

      await manager.start(fakeApp);

      expect(mockInit).toHaveBeenCalledTimes(1);
      const initArgs = mockInit.mock.calls[0][0] as Record<string, unknown>;
      expect(initArgs['maintainerEmail']).toBe('admin@example.com');
      expect(initArgs['staging']).toBe(true);
      expect(initArgs['configDir']).toBe('./greenlock.d');
      expect(initArgs['cluster']).toBe(false);

      // Challenges should include http-01 for non-wildcard hostnames
      const challenges = initArgs['challenges'] as Record<
        string,
        { module: string }
      >;
      expect(challenges['http-01']).toEqual({
        module: 'acme-http-01-standalone',
      });

      // Sites should have the correct subject and altnames
      const sites = initArgs['sites'] as Array<{
        subject: string;
        altnames: string[];
      }>;
      expect(sites).toHaveLength(1);
      expect(sites[0].subject).toBe('example.com');
      expect(sites[0].altnames).toEqual(['example.com']);
    });

    it('should include dns-01 challenge when hostnames contain a wildcard', async () => {
      const config = makeTestConfig({
        hostnames: ['example.com', '*.example.com'],
      });
      const manager = new GreenlockManager(config);
      const fakeApp = {} as import('express').Application;

      await manager.start(fakeApp);

      const initArgs = mockInit.mock.calls[0][0] as Record<string, unknown>;
      const challenges = initArgs['challenges'] as Record<
        string,
        { module: string }
      >;
      expect(challenges['http-01']).toEqual({
        module: 'acme-http-01-standalone',
      });
      expect(challenges['dns-01']).toEqual({ module: 'acme-dns-01-cli' });

      const sites = initArgs['sites'] as Array<{
        subject: string;
        altnames: string[];
      }>;
      expect(sites[0].subject).toBe('example.com');
      expect(sites[0].altnames).toEqual(['example.com', '*.example.com']);
    });
  });

  // Requirements: 3.4, 4.2
  describe('stop() closes both servers', () => {
    it('should call closeAllConnections() and close() on both servers', async () => {
      const config = makeTestConfig();
      const manager = new GreenlockManager(config);
      const fakeApp = {} as import('express').Application;

      await manager.start(fakeApp);
      await manager.stop();

      expect(mockHttpsServer.closeAllConnections).toHaveBeenCalledTimes(1);
      expect(mockHttpsServer.close).toHaveBeenCalledTimes(1);
      expect(mockRedirectServer.closeAllConnections).toHaveBeenCalledTimes(1);
      expect(mockRedirectServer.close).toHaveBeenCalledTimes(1);
    });

    it('should resolve cleanly when no servers were started', async () => {
      const config = makeTestConfig();
      const manager = new GreenlockManager(config);

      // stop() without start() should not throw
      await expect(manager.stop()).resolves.toBeUndefined();
    });
  });

  // Requirements: 2.1 (graceful degradation)
  describe('graceful degradation when greenlock init fails', () => {
    it('should log error and return without starting servers when init() throws', async () => {
      mockInit.mockImplementation(() => {
        throw new Error('Greenlock init failed');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const config = makeTestConfig();
      const manager = new GreenlockManager(config);
      const fakeApp = {} as import('express').Application;

      await expect(manager.start(fakeApp)).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to initialize greenlock-express:',
        expect.any(Error),
      );

      // Servers should not have been started
      expect(mockHttpsServer.listen).not.toHaveBeenCalled();
      expect(mockRedirectServer.listen).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // Runtime error paths inside ready() callback
  describe('server creation failures inside ready()', () => {
    it('should log error when glx.httpsServer() throws', async () => {
      // Make httpsServer() throw to simulate port 443 bind failure.
      // Mock process.exit to prevent Jest worker crash, and
      // set NODE_ENV to something other than 'test' so the code
      // takes the process.exit path instead of throw.
      const savedNodeEnv = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'production';
      const exitSpy = jest
        .spyOn(process, 'exit')
        .mockImplementation((() => {}) as never);

      mockReady.mockImplementationOnce(
        (cb: (glx: Record<string, unknown>) => void) => {
          cb({
            httpsServer: () => {
              throw new Error('EACCES: permission denied, bind port 443');
            },
            httpServer: jest.fn().mockReturnValue(mockRedirectServer),
          });
        },
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const config = makeTestConfig();
      const manager = new GreenlockManager(config);
      const fakeApp = {} as import('express').Application;

      await manager.start(fakeApp);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to start HTTPS server on port 443:',
        expect.any(Error),
      );
      expect(exitSpy).toHaveBeenCalledWith(1);

      consoleSpy.mockRestore();
      exitSpy.mockRestore();
      process.env['NODE_ENV'] = savedNodeEnv;
    });

    it('should log error and continue when glx.httpServer() throws', async () => {
      // Make httpServer() throw to simulate port 80 bind failure
      mockReady.mockImplementationOnce(
        (cb: (glx: Record<string, unknown>) => void) => {
          cb({
            httpsServer: jest.fn().mockReturnValue(mockHttpsServer),
            httpServer: () => {
              throw new Error('EACCES: permission denied, bind port 80');
            },
          });
        },
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const config = makeTestConfig();
      const manager = new GreenlockManager(config);
      const fakeApp = {} as import('express').Application;

      // Should resolve — redirect failure is non-fatal
      await expect(manager.start(fakeApp)).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to start HTTP redirect server on port 80:',
        expect.any(Error),
      );

      // HTTPS server should still have been started
      expect(mockHttpsServer.listen).toHaveBeenCalledWith(
        443,
        expect.any(Function),
      );

      consoleSpy.mockRestore();
      await manager.stop();
    });

    it('should log redirect server error event on port 80 without throwing', async () => {
      const config = makeTestConfig();
      const manager = new GreenlockManager(config);
      const fakeApp = {} as import('express').Application;

      await manager.start(fakeApp);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Emit an error event on the redirect server — should not throw
      const serverError = new Error('EADDRINUSE') as NodeJS.ErrnoException;
      serverError.code = 'EADDRINUSE';
      mockRedirectServer.emit('error', serverError);

      expect(consoleSpy).toHaveBeenCalledWith(
        'HTTP redirect server error on port 80:',
        serverError,
      );

      consoleSpy.mockRestore();
      await manager.stop();
    });
  });
});
