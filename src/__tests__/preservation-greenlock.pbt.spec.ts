/**
 * Preservation Property-Based Tests — Greenlock (Bugfix: dev-database-and-greenlock-fix)
 *
 * Captures baseline Greenlock behavior on UNFIXED code to ensure no regressions.
 * These tests MUST PASS on unfixed code.
 *
 * Properties tested:
 *  - P5a: determineChallengeTypes always includes HTTP-01, adds DNS-01 iff wildcard
 *  - P5b: GreenlockManager passes staging boolean (not string) to greenlockExpress.init()
 *
 * Uses fast-check for property-based testing.
 */

import * as fc from 'fast-check';

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
import type { ILetsEncryptConfig } from '../interfaces/lets-encrypt-config';

// ─── fast-check arbitraries ─────────────────────────────────────────────────

/** Arbitrary for a valid DNS label */
const dnsLabelArb = fc.stringMatching(/^[a-z0-9][a-z0-9-]{0,9}[a-z0-9]$/);

/** Arbitrary for a valid TLD */
const tldArb = fc.stringMatching(/^[a-z]{2,6}$/);

/** Arbitrary for a valid FQDN hostname */
const fqdnHostnameArb = fc
  .tuple(fc.array(dnsLabelArb, { minLength: 1, maxLength: 3 }), tldArb)
  .map(([labels, tld]) => [...labels, tld].join('.'));

/** Arbitrary for a valid wildcard hostname */
const wildcardHostnameArb = fc
  .tuple(fc.array(dnsLabelArb, { minLength: 1, maxLength: 3 }), tldArb)
  .map(([labels, tld]) => '*.' + [...labels, tld].join('.'));

/** Arbitrary for a mixed hostname list (at least one entry) */
const hostnameListArb = fc
  .tuple(
    fc.array(fqdnHostnameArb, { minLength: 0, maxLength: 4 }),
    fc.array(wildcardHostnameArb, { minLength: 0, maxLength: 2 }),
  )
  .filter(([fqdns, wildcards]) => fqdns.length + wildcards.length > 0)
  .map(([fqdns, wildcards]) => [...fqdns, ...wildcards]);

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('Preservation PBT — Greenlock (dev-database-and-greenlock-fix)', () => {
  beforeEach(() => {
    capturedInitOptions = null;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Property 5a: determineChallengeTypes ──────────────────────────────────

  /**
   * **Validates: Requirements 3.4, 3.5, 3.6, 3.7**
   *
   * Property: for all hostname lists, determineChallengeTypes() always
   * includes HTTP-01 and adds DNS-01 if and only if a wildcard hostname
   * is present.
   */
  it('P5a: determineChallengeTypes always includes HTTP-01, adds DNS-01 iff wildcard present', () => {
    fc.assert(
      fc.property(hostnameListArb, (hostnames) => {
        const challenges = determineChallengeTypes(hostnames);
        const hasWildcard = hostnames.some((h) => h.startsWith('*.'));

        // HTTP-01 is always present
        expect(challenges).toHaveProperty('http-01');
        expect(challenges['http-01'].module).toBe('acme-http-01-standalone');

        // DNS-01 present iff wildcard exists
        if (hasWildcard) {
          expect(challenges).toHaveProperty('dns-01');
          expect(challenges['dns-01'].module).toBe('acme-dns-01-cli');
        } else {
          expect(challenges).not.toHaveProperty('dns-01');
        }
      }),
      { numRuns: 200 },
    );
  });

  /**
   * Additional: determineChallengeTypes with only FQDNs never includes DNS-01.
   */
  it('P5a-fqdn-only: FQDN-only lists never include DNS-01', () => {
    fc.assert(
      fc.property(
        fc.array(fqdnHostnameArb, { minLength: 1, maxLength: 5 }),
        (fqdns) => {
          const challenges = determineChallengeTypes(fqdns);
          expect(challenges).toHaveProperty('http-01');
          expect(challenges).not.toHaveProperty('dns-01');
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Additional: determineChallengeTypes with at least one wildcard always includes DNS-01.
   */
  it('P5a-wildcard: lists with wildcards always include DNS-01', () => {
    fc.assert(
      fc.property(
        wildcardHostnameArb,
        fc.array(fqdnHostnameArb, { minLength: 0, maxLength: 4 }),
        (wildcard, fqdns) => {
          const challenges = determineChallengeTypes([...fqdns, wildcard]);
          expect(challenges).toHaveProperty('http-01');
          expect(challenges).toHaveProperty('dns-01');
        },
      ),
      { numRuns: 100 },
    );
  });

  // ── Property 5b: GreenlockManager staging boolean propagation ─────────────

  /**
   * **Validates: Requirements 3.4, 3.9**
   *
   * Property: for all valid Let's Encrypt configs with staging: false,
   * GreenlockManager passes staging: false (boolean) to greenlockExpress.init().
   */
  it('P5b: GreenlockManager passes staging: false (boolean, not string) to init', async () => {
    await fc.assert(
      fc.asyncProperty(fqdnHostnameArb, async (hostname) => {
        const config: ILetsEncryptConfig = {
          enabled: true,
          maintainerEmail: 'test@example.com',
          hostnames: [hostname],
          staging: false,
          configDir: './greenlock.d',
        };

        const manager = new GreenlockManager(config);
        const fakeApp = {} as import('express').Application;

        await manager.start(fakeApp);

        expect(capturedInitOptions).not.toBeNull();
        // staging must be boolean false, not string "false" or undefined
        expect(capturedInitOptions!['staging']).toBe(false);
        expect(typeof capturedInitOptions!['staging']).toBe('boolean');

        await manager.stop();
      }),
      { numRuns: 20 },
    );
  });

  /**
   * Additional: staging: true also propagates as boolean true.
   */
  it('P5b-staging-true: GreenlockManager passes staging: true (boolean) to init', async () => {
    await fc.assert(
      fc.asyncProperty(fqdnHostnameArb, async (hostname) => {
        const config: ILetsEncryptConfig = {
          enabled: true,
          maintainerEmail: 'test@example.com',
          hostnames: [hostname],
          staging: true,
          configDir: './greenlock.d',
        };

        const manager = new GreenlockManager(config);
        const fakeApp = {} as import('express').Application;

        await manager.start(fakeApp);

        expect(capturedInitOptions).not.toBeNull();
        expect(capturedInitOptions!['staging']).toBe(true);
        expect(typeof capturedInitOptions!['staging']).toBe('boolean');

        await manager.stop();
      }),
      { numRuns: 20 },
    );
  });
});
