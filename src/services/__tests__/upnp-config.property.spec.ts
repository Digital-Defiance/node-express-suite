/**
 * Property-Based Tests for UpnpConfig
 *
 * Feature: upnp-express-suite-migration
 * Uses fast-check to validate universal properties of the UPnP configuration
 * loader and validator across many randomly generated inputs.
 *
 * @module services/__tests__/upnp-config.property.spec
 */

import * as fc from 'fast-check';

import {
  IUpnpConfig,
  UPNP_CONFIG_DEFAULTS,
  UpnpProtocol,
} from '../../interfaces/network/upnpTypes';
import { UpnpConfig, UpnpConfigValidationError } from '../upnp-config';

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Arbitrary for valid port numbers (1-65535) */
const validPortArb = fc.integer({ min: 1, max: 65535 });

/** Arbitrary for valid TTL values (60-86400) */
const validTtlArb = fc.integer({ min: 60, max: 86400 });

/** Arbitrary for valid retry attempts (1-10) */
const validRetryAttemptsArb = fc.integer({ min: 1, max: 10 });

/** Arbitrary for valid retry delay (1000-60000) */
const validRetryDelayArb = fc.integer({ min: 1000, max: 60000 });

/** Arbitrary for valid UpnpProtocol values */
const validProtocolArb: fc.Arbitrary<UpnpProtocol> = fc.constantFrom(
  UpnpProtocol.UPNP,
  UpnpProtocol.NATPMP,
  UpnpProtocol.AUTO,
);

/**
 * Arbitrary for a valid IUpnpConfig where refreshInterval < ttl * 1000.
 * Generates ttl first, then constrains refreshInterval accordingly.
 */
const validConfigArb: fc.Arbitrary<IUpnpConfig> = validTtlArb.chain((ttl) =>
  fc.record({
    enabled: fc.boolean(),
    httpPort: validPortArb,
    websocketPort: validPortArb,
    ttl: fc.constant(ttl),
    refreshInterval: fc.integer({ min: 1, max: ttl * 1000 - 1 }),
    protocol: validProtocolArb,
    retryAttempts: validRetryAttemptsArb,
    retryDelay: validRetryDelayArb,
  }),
);

/**
 * Arbitrary that generates a subset of UPNP_* env var keys to include.
 * Each field is independently present or absent, but the generator ensures
 * that the resulting merged config (overrides + defaults) is valid.
 *
 * The key cross-field constraint is: refreshInterval < ttl * 1000.
 * When only one of ttl/refreshInterval is overridden, the other comes from
 * UPNP_CONFIG_DEFAULTS. The generator handles this by computing the
 * effective ttl and constraining refreshInterval accordingly.
 */
const envSubsetArb: fc.Arbitrary<{
  overrides: Partial<IUpnpConfig>;
  env: Record<string, string>;
}> = fc
  .record({
    includeEnabled: fc.boolean(),
    includeHttpPort: fc.boolean(),
    includeWebsocketPort: fc.boolean(),
    includeTtl: fc.boolean(),
    includeRefreshInterval: fc.boolean(),
    includeProtocol: fc.boolean(),
    includeRetryAttempts: fc.boolean(),
    includeRetryDelay: fc.boolean(),
    enabled: fc.boolean(),
    httpPort: validPortArb,
    websocketPort: validPortArb,
    ttl: validTtlArb,
    protocol: validProtocolArb,
    retryAttempts: validRetryAttemptsArb,
    retryDelay: validRetryDelayArb,
  })
  .chain((params) => {
    // Determine the effective TTL after merging with defaults
    const effectiveTtl = params.includeTtl
      ? params.ttl
      : UPNP_CONFIG_DEFAULTS.ttl;

    // If refreshInterval is NOT being overridden, the default refreshInterval
    // (1800000) must be valid for the effective TTL. If it isn't, we must
    // force includeRefreshInterval to true so we can generate a valid value.
    const defaultRefreshValid =
      UPNP_CONFIG_DEFAULTS.refreshInterval < effectiveTtl * 1000;
    const mustIncludeRefresh =
      !defaultRefreshValid && !params.includeRefreshInterval;
    const includeRefreshInterval =
      params.includeRefreshInterval || mustIncludeRefresh;

    // Generate a refreshInterval that is valid for the effective TTL
    const maxRefresh = effectiveTtl * 1000 - 1;
    const refreshArb = fc.integer({ min: 1, max: maxRefresh });

    return refreshArb.map((refreshInterval) => {
      const env: Record<string, string> = {};
      const overrides: Partial<IUpnpConfig> = {};

      if (params.includeEnabled) {
        env['UPNP_ENABLED'] = String(params.enabled);
        overrides.enabled = params.enabled;
      }
      if (params.includeHttpPort) {
        env['UPNP_HTTP_PORT'] = String(params.httpPort);
        overrides.httpPort = params.httpPort;
      }
      if (params.includeWebsocketPort) {
        env['UPNP_WEBSOCKET_PORT'] = String(params.websocketPort);
        overrides.websocketPort = params.websocketPort;
      }
      if (params.includeTtl) {
        env['UPNP_TTL'] = String(params.ttl);
        overrides.ttl = params.ttl;
      }
      if (includeRefreshInterval) {
        env['UPNP_REFRESH_INTERVAL'] = String(refreshInterval);
        overrides.refreshInterval = refreshInterval;
      }
      if (params.includeProtocol) {
        env['UPNP_PROTOCOL'] = params.protocol;
        overrides.protocol = params.protocol;
      }
      if (params.includeRetryAttempts) {
        env['UPNP_RETRY_ATTEMPTS'] = String(params.retryAttempts);
        overrides.retryAttempts = params.retryAttempts;
      }
      if (params.includeRetryDelay) {
        env['UPNP_RETRY_DELAY'] = String(params.retryDelay);
        overrides.retryDelay = params.retryDelay;
      }

      return { overrides, env };
    });
  });

// ─── Arbitraries for invalid configs ────────────────────────────────────────

/** Arbitrary for port numbers outside 1-65535 or non-integers */
const invalidPortArb: fc.Arbitrary<number> = fc.oneof(
  fc.integer({ min: -1000, max: 0 }),
  fc.integer({ min: 65536, max: 100000 }),
  fc
    .double({ min: 0.01, max: 65535, noNaN: true })
    .filter((n) => !Number.isInteger(n)),
);

/** Arbitrary for TTL values outside 60-86400 or non-integers */
const invalidTtlArb: fc.Arbitrary<number> = fc.oneof(
  fc.integer({ min: -1000, max: 59 }),
  fc.integer({ min: 86401, max: 200000 }),
  fc
    .double({ min: 0.01, max: 86400, noNaN: true })
    .filter((n) => !Number.isInteger(n)),
);

/** Arbitrary for retry attempts outside 1-10 or non-integers */
const invalidRetryAttemptsArb: fc.Arbitrary<number> = fc.oneof(
  fc.integer({ min: -100, max: 0 }),
  fc.integer({ min: 11, max: 100 }),
  fc
    .double({ min: 0.01, max: 10, noNaN: true })
    .filter((n) => !Number.isInteger(n)),
);

/** Arbitrary for retry delay outside 1000-60000 or non-integers */
const invalidRetryDelayArb: fc.Arbitrary<number> = fc.oneof(
  fc.integer({ min: -1000, max: 999 }),
  fc.integer({ min: 60001, max: 200000 }),
  fc
    .double({ min: 0.01, max: 60000, noNaN: true })
    .filter((n) => !Number.isInteger(n)),
);

/** Arbitrary for invalid protocol strings */
const invalidProtocolArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter(
    (s) =>
      !Object.values(UpnpProtocol)
        .map((v) => String(v))
        .includes(s.toLowerCase()),
  );

/**
 * Enum of which field to make invalid.
 * Used to generate configs with exactly one invalid field.
 */
enum InvalidField {
  HttpPort = 'httpPort',
  WebsocketPort = 'websocketPort',
  Ttl = 'ttl',
  RefreshIntervalNonPositive = 'refreshIntervalNonPositive',
  RefreshIntervalTooLarge = 'refreshIntervalTooLarge',
  RetryAttempts = 'retryAttempts',
  RetryDelay = 'retryDelay',
  Protocol = 'protocol',
}

/** Arbitrary that picks which field to invalidate */
const invalidFieldArb: fc.Arbitrary<InvalidField> = fc.constantFrom(
  ...Object.values(InvalidField),
);

/**
 * Generates a config with exactly one field invalid.
 * Starts from a valid config and replaces one field with an invalid value.
 */
const invalidConfigArb: fc.Arbitrary<{
  config: IUpnpConfig;
  invalidField: InvalidField;
}> = validConfigArb.chain((baseConfig) =>
  invalidFieldArb.chain(
    (
      field,
    ): fc.Arbitrary<{
      config: IUpnpConfig;
      invalidField: InvalidField;
    }> => {
      switch (field) {
        case InvalidField.HttpPort:
          return invalidPortArb.map((port) => ({
            config: { ...baseConfig, httpPort: port },
            invalidField: field,
          }));
        case InvalidField.WebsocketPort:
          return invalidPortArb.map((port) => ({
            config: { ...baseConfig, websocketPort: port },
            invalidField: field,
          }));
        case InvalidField.Ttl:
          return invalidTtlArb.map((ttl) => ({
            config: { ...baseConfig, ttl, refreshInterval: 1 },
            invalidField: field,
          }));
        case InvalidField.RefreshIntervalNonPositive:
          return fc.integer({ min: -10000, max: 0 }).map((refreshInterval) => ({
            config: { ...baseConfig, refreshInterval },
            invalidField: field,
          }));
        case InvalidField.RefreshIntervalTooLarge:
          // refreshInterval >= ttl * 1000
          return fc
            .integer({
              min: baseConfig.ttl * 1000,
              max: baseConfig.ttl * 1000 + 100000,
            })
            .map((refreshInterval) => ({
              config: { ...baseConfig, refreshInterval },
              invalidField: field,
            }));
        case InvalidField.RetryAttempts:
          return invalidRetryAttemptsArb.map((retryAttempts) => ({
            config: { ...baseConfig, retryAttempts },
            invalidField: field,
          }));
        case InvalidField.RetryDelay:
          return invalidRetryDelayArb.map((retryDelay) => ({
            config: { ...baseConfig, retryDelay },
            invalidField: field,
          }));
        case InvalidField.Protocol:
          return invalidProtocolArb.map((protocol) => ({
            config: { ...baseConfig, protocol: protocol as UpnpProtocol },
            invalidField: field,
          }));
      }
    },
  ),
);

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('UpnpConfig - Property Tests', () => {
  // ─── Property 7: Config environment fallback to defaults ────────────────

  describe('Feature: upnp-express-suite-migration, Property 7: Config environment fallback to defaults', () => {
    /**
     * **Validates: Requirements 3.1**
     *
     * For any subset of UPNP_* environment variables (where some are present
     * and some are absent), calling UpnpConfig.fromEnvironment should produce
     * a config where present variables override defaults and absent variables
     * match UPNP_CONFIG_DEFAULTS.
     */
    it('present env vars override defaults, absent vars match UPNP_CONFIG_DEFAULTS', () => {
      fc.assert(
        fc.property(envSubsetArb, ({ overrides, env }) => {
          const config = UpnpConfig.fromEnvironment(env);

          // Build expected: defaults merged with overrides
          const expected: IUpnpConfig = {
            ...UPNP_CONFIG_DEFAULTS,
            ...overrides,
          };

          expect(config.enabled).toBe(expected.enabled);
          expect(config.httpPort).toBe(expected.httpPort);
          expect(config.websocketPort).toBe(expected.websocketPort);
          expect(config.ttl).toBe(expected.ttl);
          expect(config.refreshInterval).toBe(expected.refreshInterval);
          expect(config.protocol).toBe(expected.protocol);
          expect(config.retryAttempts).toBe(expected.retryAttempts);
          expect(config.retryDelay).toBe(expected.retryDelay);
        }),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 8: Config validation rejects out-of-range values ──────────

  describe('Feature: upnp-express-suite-migration, Property 8: Config validation rejects out-of-range values', () => {
    /**
     * **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**
     *
     * For any IUpnpConfig object where at least one field is outside its
     * valid range (httpPort/websocketPort outside 1-65535, ttl outside
     * 60-86400, refreshInterval >= ttl*1000 or <= 0, retryAttempts outside
     * 1-10, retryDelay outside 1000-60000, or invalid protocol), calling
     * UpnpConfig.validate should throw UpnpConfigValidationError.
     */
    it('rejects configs with at least one out-of-range field', () => {
      fc.assert(
        fc.property(invalidConfigArb, ({ config }) => {
          expect(() => UpnpConfig.validate(config)).toThrow(
            UpnpConfigValidationError,
          );
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**
     *
     * Complementary: valid configs should NOT throw.
     */
    it('accepts all valid configs without throwing', () => {
      fc.assert(
        fc.property(validConfigArb, (config) => {
          expect(() => UpnpConfig.validate(config)).not.toThrow();
        }),
        { numRuns: 100 },
      );
    });
  });
});
