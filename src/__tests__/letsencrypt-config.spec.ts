/**
 * Property-Based Tests for Let's Encrypt hostname validation and parsing
 *
 * Feature: letsencrypt-greenlock-support
 * Uses fast-check to validate universal properties of hostname validation
 * and comma-separated hostname parsing across many randomly generated inputs.
 *
 * @module __tests__/letsencrypt-config.spec
 */

import * as fc from 'fast-check';
import { mkdtempSync, rmdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { Environment } from '../environment';
import { isValidHostname, parseHostnames } from '../utils';

// ─── Regexes (mirrored from design.md for oracle comparison) ────────────────

const FQDN_REGEX =
  /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
const WILDCARD_REGEX =
  /^\*\.([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Arbitrary for a valid DNS label (1-63 chars, alphanumeric + internal hyphens) */
const dnsLabelArb: fc.Arbitrary<string> = fc.stringMatching(
  /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,10}[a-zA-Z0-9])?$/,
);

/** Arbitrary for a valid TLD (2-6 alpha chars) */
const tldArb: fc.Arbitrary<string> = fc.stringMatching(/^[a-zA-Z]{2,6}$/);

/** Arbitrary for a valid FQDN (one or more labels + TLD) */
const fqdnArb: fc.Arbitrary<string> = fc
  .tuple(fc.array(dnsLabelArb, { minLength: 1, maxLength: 3 }), tldArb)
  .map(([labels, tld]) => [...labels, tld].join('.'));

/** Arbitrary for a valid wildcard hostname (*.fqdn) */
const wildcardHostnameArb: fc.Arbitrary<string> = fqdnArb.map(
  (fqdn) => `*.${fqdn}`,
);

/** Arbitrary for any valid hostname (FQDN or wildcard) */
const validHostnameArb: fc.Arbitrary<string> = fc.oneof(
  fqdnArb,
  wildcardHostnameArb,
);

/** Arbitrary for strings that should be invalid hostnames */
const invalidHostnameArb: fc.Arbitrary<string> = fc.oneof(
  // Empty string
  fc.constant(''),
  // Starts with hyphen
  fc.tuple(dnsLabelArb, tldArb).map(([label, tld]) => `-${label}.${tld}`),
  // Ends with hyphen in a label
  fc.tuple(dnsLabelArb, tldArb).map(([label, tld]) => `${label}-.${tld}`),
  // Contains spaces
  fc.tuple(dnsLabelArb, tldArb).map(([label, tld]) => `${label} .${tld}`),
  // Single-char TLD (invalid)
  dnsLabelArb.map((label) => `${label}.a`),
  // Contains special characters
  fc.tuple(dnsLabelArb, tldArb).map(([label, tld]) => `${label}@.${tld}`),
  // Just a TLD with no dot-separated labels
  tldArb,
  // Double dots
  fc.tuple(dnsLabelArb, tldArb).map(([label, tld]) => `${label}..${tld}`),
  // Wildcard with no valid domain after
  fc.constant('*.'),
  // Wildcard with single-char TLD
  fc.constant('*.a'),
);

/** Arbitrary for whitespace (spaces and tabs) */
const whitespaceArb: fc.Arbitrary<string> = fc.stringMatching(/^[ \t]{0,3}$/);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe("Let's Encrypt hostname validation and parsing", () => {
  // Feature: letsencrypt-greenlock-support, Property 6: Hostname validation correctness
  describe('Property 6: Hostname validation correctness', () => {
    /**
     * Validates: Requirements 5.3
     *
     * For any string s, the hostname validator should accept s if and only if
     * s matches either the FQDN regex or the wildcard regex.
     */
    it('should accept a string iff it matches FQDN or wildcard regex', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            { weight: 3, arbitrary: validHostnameArb },
            { weight: 2, arbitrary: invalidHostnameArb },
            {
              weight: 2,
              arbitrary: fc.string({ minLength: 0, maxLength: 80 }),
            },
          ),
          (s: string) => {
            const expected = FQDN_REGEX.test(s) || WILDCARD_REGEX.test(s);
            const actual = isValidHostname(s);
            expect(actual).toBe(expected);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('should accept all generated valid FQDNs', () => {
      fc.assert(
        fc.property(fqdnArb, (hostname: string) => {
          expect(isValidHostname(hostname)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('should accept all generated valid wildcard hostnames', () => {
      fc.assert(
        fc.property(wildcardHostnameArb, (hostname: string) => {
          expect(isValidHostname(hostname)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('should reject all generated invalid hostnames', () => {
      fc.assert(
        fc.property(invalidHostnameArb, (hostname: string) => {
          expect(isValidHostname(hostname)).toBe(false);
        }),
        { numRuns: 100 },
      );
    });
  });

  // Feature: letsencrypt-greenlock-support, Property 2: Hostname list parsing round-trip
  describe('Property 2: Hostname list parsing round-trip', () => {
    /**
     * Validates: Requirements 1.4
     *
     * For any array of valid hostname strings, joining them with commas into
     * a single string and then parsing that string via the comma-separated
     * hostname parser should produce an array equal to the original array.
     */
    it('should round-trip: join with commas then parse back to the same array', () => {
      fc.assert(
        fc.property(
          fc.array(validHostnameArb, { minLength: 1, maxLength: 20 }),
          (hostnames: string[]) => {
            const joined = hostnames.join(',');
            const parsed = parseHostnames(joined);
            expect(parsed).toEqual(hostnames);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('should handle extra whitespace around hostnames', () => {
      fc.assert(
        fc.property(
          fc.array(validHostnameArb, { minLength: 1, maxLength: 10 }),
          fc.array(whitespaceArb, { minLength: 1, maxLength: 10 }),
          (hostnames: string[], spaces: string[]) => {
            // Add random whitespace around each hostname
            const withSpaces = hostnames.map(
              (h, i) =>
                (spaces[i % spaces.length] || '') +
                h +
                (spaces[(i + 1) % spaces.length] || ''),
            );
            const joined = withSpaces.join(',');
            const parsed = parseHostnames(joined);
            expect(parsed).toEqual(hostnames);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should produce empty array from empty string', () => {
      expect(parseHostnames('')).toEqual([]);
    });

    it('should filter out empty entries from consecutive commas', () => {
      fc.assert(
        fc.property(
          fc.array(validHostnameArb, { minLength: 1, maxLength: 5 }),
          (hostnames: string[]) => {
            // Join with extra commas to create empty entries
            const joined = hostnames.join(',,');
            const parsed = parseHostnames(joined);
            expect(parsed).toEqual(hostnames);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

// ─── Helpers for Environment-based property tests ───────────────────────────

/**
 * Creates a minimal set of process.env overrides that satisfy all
 * Environment constructor validations (with letsEncrypt disabled by default).
 */
function makeBaseEnv(
  tmpApiDir: string,
  tmpReactDir: string,
): Record<string, string> {
  return {
    HOST: '0.0.0.0',
    PORT: '3000',
    JWT_SECRET: 'a'.repeat(64),
    EMAIL_SENDER: 'test@example.com',
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

// ─── Property Tests for Environment Let's Encrypt parsing ───────────────────

describe("Let's Encrypt Environment parsing", () => {
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
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  // Feature: letsencrypt-greenlock-support, Property 1: Boolean environment variable parsing
  describe('Property 1: Boolean environment variable parsing', () => {
    /**
     * Validates: Requirements 1.2, 1.5
     *
     * For any environment variable value string v where v is one of
     * "true", "1", "false", "0", "", or undefined, parsing
     * LETS_ENCRYPT_ENABLED (or LETS_ENCRYPT_STAGING) with value v
     * should produce true if and only if v is "true" or "1".
     */

    /** Arbitrary that produces one of the valid boolean-like env var values */
    const boolEnvValueArb: fc.Arbitrary<string | undefined> = fc.oneof(
      fc.constant('true'),
      fc.constant('1'),
      fc.constant('false'),
      fc.constant('0'),
      fc.constant(''),
      fc.constant(undefined as string | undefined),
    );

    it('should parse LETS_ENCRYPT_ENABLED correctly for all boolean-like values', () => {
      fc.assert(
        fc.property(boolEnvValueArb, (v: string | undefined) => {
          // Reset process.env to base values
          const base = makeBaseEnv(tmpApiDir, tmpReactDir);
          process.env = { ...base };

          // Set the env var under test
          if (v !== undefined) {
            process.env['LETS_ENCRYPT_ENABLED'] = v;
          }

          const expected = v === 'true' || v === '1';

          // When enabled=true, validation requires email and hostnames
          if (expected) {
            process.env['LETS_ENCRYPT_EMAIL'] = 'test@example.com';
            process.env['LETS_ENCRYPT_HOSTNAMES'] = 'example.com';
          }

          const env = new Environment(undefined, true);
          expect(env.letsEncrypt.enabled).toBe(expected);
        }),
        { numRuns: 100 },
      );
    });

    it('should parse LETS_ENCRYPT_STAGING correctly for all boolean-like values', () => {
      fc.assert(
        fc.property(boolEnvValueArb, (v: string | undefined) => {
          // Reset process.env to base values
          const base = makeBaseEnv(tmpApiDir, tmpReactDir);
          process.env = { ...base };

          // Set the env var under test
          if (v !== undefined) {
            process.env['LETS_ENCRYPT_STAGING'] = v;
          }
          // Keep enabled=false to avoid validation errors

          const env = new Environment(undefined, true);
          const expected = v === 'true' || v === '1';
          expect(env.letsEncrypt.staging).toBe(expected);
        }),
        { numRuns: 100 },
      );
    });
  });

  // Feature: letsencrypt-greenlock-support, Property 3: Config directory default behavior
  describe('Property 3: Config directory default behavior', () => {
    /**
     * Validates: Requirements 1.6
     *
     * For any environment configuration, if LETS_ENCRYPT_CONFIG_DIR is
     * provided as a non-empty string d, then letsEncrypt.configDir should
     * equal d. If LETS_ENCRYPT_CONFIG_DIR is absent or empty, then
     * letsEncrypt.configDir should equal "./greenlock.d".
     */

    /** Arbitrary for non-empty config directory paths */
    const nonEmptyConfigDirArb: fc.Arbitrary<string> = fc.stringMatching(
      /^[a-zA-Z0-9_./-]{1,50}$/,
    );

    /** Arbitrary for absent-or-empty config dir values */
    const absentOrEmptyArb: fc.Arbitrary<string | undefined> = fc.oneof(
      fc.constant(undefined as string | undefined),
      fc.constant(''),
    );

    it('should use provided non-empty config dir value', () => {
      fc.assert(
        fc.property(nonEmptyConfigDirArb, (d: string) => {
          const base = makeBaseEnv(tmpApiDir, tmpReactDir);
          process.env = { ...base };
          process.env['LETS_ENCRYPT_CONFIG_DIR'] = d;

          const env = new Environment(undefined, true);
          expect(env.letsEncrypt.configDir).toBe(d);
        }),
        { numRuns: 100 },
      );
    });

    it('should default to "./greenlock.d" when config dir is absent or empty', () => {
      fc.assert(
        fc.property(absentOrEmptyArb, (v: string | undefined) => {
          const base = makeBaseEnv(tmpApiDir, tmpReactDir);
          process.env = { ...base };

          if (v !== undefined) {
            process.env['LETS_ENCRYPT_CONFIG_DIR'] = v;
          }
          // Otherwise, leave it absent

          const env = new Environment(undefined, true);
          expect(env.letsEncrypt.configDir).toBe('./greenlock.d');
        }),
        { numRuns: 100 },
      );
    });
  });
});

// ─── Imports for unit tests ─────────────────────────────────────────────────

import {
  TranslatableSuiteError,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';

// ─── Unit Tests for Environment validation edge cases ───────────────────────

describe("Let's Encrypt Environment validation edge cases", () => {
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
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  // Requirements: 1.7
  describe('enabled=true with missing email', () => {
    it('should throw TranslatableSuiteError when LETS_ENCRYPT_EMAIL is missing', () => {
      const base = makeBaseEnv(tmpApiDir, tmpReactDir);
      process.env = { ...base };
      process.env['LETS_ENCRYPT_ENABLED'] = 'true';
      process.env['LETS_ENCRYPT_HOSTNAMES'] = 'example.com';
      // LETS_ENCRYPT_EMAIL intentionally omitted

      expect(() => new Environment(undefined, true)).toThrow(
        TranslatableSuiteError,
      );
      try {
        new Environment(undefined, true);
      } catch (e) {
        expect(e).toBeInstanceOf(TranslatableSuiteError);
        expect((e as TranslatableSuiteError).StringName).toBe(
          SuiteCoreStringKey.Error_LetsEncryptMaintainerEmailRequired,
        );
      }
    });

    it('should throw TranslatableSuiteError when LETS_ENCRYPT_EMAIL is empty string', () => {
      const base = makeBaseEnv(tmpApiDir, tmpReactDir);
      process.env = { ...base };
      process.env['LETS_ENCRYPT_ENABLED'] = 'true';
      process.env['LETS_ENCRYPT_HOSTNAMES'] = 'example.com';
      process.env['LETS_ENCRYPT_EMAIL'] = '';

      expect(() => new Environment(undefined, true)).toThrow(
        TranslatableSuiteError,
      );
      try {
        new Environment(undefined, true);
      } catch (e) {
        expect(e).toBeInstanceOf(TranslatableSuiteError);
        expect((e as TranslatableSuiteError).StringName).toBe(
          SuiteCoreStringKey.Error_LetsEncryptMaintainerEmailRequired,
        );
      }
    });
  });

  // Requirements: 1.8
  describe('enabled=true with missing hostnames', () => {
    it('should throw TranslatableSuiteError when LETS_ENCRYPT_HOSTNAMES is missing', () => {
      const base = makeBaseEnv(tmpApiDir, tmpReactDir);
      process.env = { ...base };
      process.env['LETS_ENCRYPT_ENABLED'] = 'true';
      process.env['LETS_ENCRYPT_EMAIL'] = 'admin@example.com';
      // LETS_ENCRYPT_HOSTNAMES intentionally omitted

      expect(() => new Environment(undefined, true)).toThrow(
        TranslatableSuiteError,
      );
      try {
        new Environment(undefined, true);
      } catch (e) {
        expect(e).toBeInstanceOf(TranslatableSuiteError);
        expect((e as TranslatableSuiteError).StringName).toBe(
          SuiteCoreStringKey.Error_LetsEncryptHostnamesRequired,
        );
      }
    });

    it('should throw TranslatableSuiteError when LETS_ENCRYPT_HOSTNAMES is empty string', () => {
      const base = makeBaseEnv(tmpApiDir, tmpReactDir);
      process.env = { ...base };
      process.env['LETS_ENCRYPT_ENABLED'] = 'true';
      process.env['LETS_ENCRYPT_EMAIL'] = 'admin@example.com';
      process.env['LETS_ENCRYPT_HOSTNAMES'] = '';

      expect(() => new Environment(undefined, true)).toThrow(
        TranslatableSuiteError,
      );
      try {
        new Environment(undefined, true);
      } catch (e) {
        expect(e).toBeInstanceOf(TranslatableSuiteError);
        expect((e as TranslatableSuiteError).StringName).toBe(
          SuiteCoreStringKey.Error_LetsEncryptHostnamesRequired,
        );
      }
    });
  });

  // Requirements: 1.3 (hostname validation when enabled)
  describe('enabled=true with invalid hostname', () => {
    it('should throw TranslatableSuiteError for an invalid hostname', () => {
      const base = makeBaseEnv(tmpApiDir, tmpReactDir);
      process.env = { ...base };
      process.env['LETS_ENCRYPT_ENABLED'] = 'true';
      process.env['LETS_ENCRYPT_EMAIL'] = 'admin@example.com';
      process.env['LETS_ENCRYPT_HOSTNAMES'] = 'not-a-hostname';

      expect(() => new Environment(undefined, true)).toThrow(
        TranslatableSuiteError,
      );
      try {
        new Environment(undefined, true);
      } catch (e) {
        expect(e).toBeInstanceOf(TranslatableSuiteError);
        expect((e as TranslatableSuiteError).StringName).toBe(
          SuiteCoreStringKey.Error_LetsEncryptInvalidHostnameTemplate,
        );
      }
    });
  });

  // Requirements: 1.3, 1.7, 1.8 (disabled path)
  describe('enabled=false skips validation and uses defaults', () => {
    it('should succeed with defaults when LETS_ENCRYPT_ENABLED is not set', () => {
      const base = makeBaseEnv(tmpApiDir, tmpReactDir);
      process.env = { ...base };
      // No LETS_ENCRYPT_* vars set at all

      const env = new Environment(undefined, true);
      expect(env.letsEncrypt.enabled).toBe(false);
      expect(env.letsEncrypt.staging).toBe(false);
      expect(env.letsEncrypt.configDir).toBe('./greenlock.d');
      expect(env.letsEncrypt.hostnames).toEqual([]);
      expect(env.letsEncrypt.maintainerEmail).toBe('');
    });

    it('should succeed with defaults when LETS_ENCRYPT_ENABLED is "false"', () => {
      const base = makeBaseEnv(tmpApiDir, tmpReactDir);
      process.env = { ...base };
      process.env['LETS_ENCRYPT_ENABLED'] = 'false';

      const env = new Environment(undefined, true);
      expect(env.letsEncrypt.enabled).toBe(false);
      expect(env.letsEncrypt.staging).toBe(false);
      expect(env.letsEncrypt.configDir).toBe('./greenlock.d');
      expect(env.letsEncrypt.hostnames).toEqual([]);
      expect(env.letsEncrypt.maintainerEmail).toBe('');
    });
  });
});
