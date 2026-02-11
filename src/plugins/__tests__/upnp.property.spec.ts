/**
 * Property-Based Tests for UpnpPlugin
 *
 * Feature: upnp-express-suite-migration
 * Uses fast-check to validate universal properties of the UPnP plugin
 * across many randomly generated inputs.
 *
 * @module plugins/__tests__/upnp.property.spec
 */

import * as fc from 'fast-check';
import * as natUpnp from 'nat-upnp';

import {
  IUpnpConfig,
  UPNP_CONFIG_DEFAULTS,
  UpnpProtocol,
} from '../../interfaces/network/upnpTypes';
import { UpnpService } from '../../services/upnp';
import { IApplication } from '../../interfaces/application';
import { UpnpPlugin } from '../upnp';

// ─── Mock nat-upnp ─────────────────────────────────────────────────────────

jest.mock('nat-upnp');

const mockCreateClient = natUpnp.createClient as jest.MockedFunction<
  typeof natUpnp.createClient
>;

/** Build a fresh mock client that succeeds on all operations */
function createSucceedingMockClient(
  externalIp = '203.0.113.1',
): jest.Mocked<natUpnp.Client> {
  return {
    externalIp: jest.fn((cb) => cb(null, externalIp)),
    portMapping: jest.fn((_opts, cb) => {
      if (cb) cb(null);
    }),
    portUnmapping: jest.fn((_opts, cb) => {
      if (cb) cb(null);
    }),
    getMappings: jest.fn(),
    findGateway: jest.fn(),
    close: jest.fn(),
  } as unknown as jest.Mocked<natUpnp.Client>;
}

/** Create a minimal mock IApplication for plugin init */
function createMockApp(): IApplication {
  return {
    environment: {} as IApplication['environment'],
    constants: {} as IApplication['constants'],
    db: {} as IApplication['db'],
    ready: true,
    services: {} as IApplication['services'],
    plugins: {} as IApplication['plugins'],
    start: jest.fn(),
    getModel: jest.fn(),
  } as unknown as IApplication;
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Arbitrary for valid port numbers (1-65535) */
const validPortArb = fc.integer({ min: 1, max: 65535 });

/**
 * Arbitrary for valid TTL values (60-86400).
 * Constrained to 120-86400 so that refreshInterval can always be < ttl * 1000.
 */
const validTtlArb = fc.integer({ min: 120, max: 86400 });

/** Arbitrary for valid UpnpProtocol values */
const validProtocolArb: fc.Arbitrary<UpnpProtocol> = fc.constantFrom(
  UpnpProtocol.UPNP,
  UpnpProtocol.NATPMP,
  UpnpProtocol.AUTO,
);

/** Arbitrary for valid retryAttempts (1-10) */
const validRetryAttemptsArb = fc.integer({ min: 1, max: 10 });

/** Arbitrary for valid retryDelay (1000-60000) */
const validRetryDelayArb = fc.integer({ min: 1000, max: 60000 });

/**
 * Arbitrary for valid IPv4 addresses.
 */
const ipAddressArb = fc
  .tuple(
    fc.integer({ min: 1, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 1, max: 254 }),
  )
  .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

/**
 * Arbitrary for a valid, internally-consistent partial IUpnpConfig override.
 *
 * Generates a random subset of IUpnpConfig fields, all with valid values.
 * The refreshInterval is always consistent with the ttl to avoid validation errors.
 */
const validPartialConfigArb: fc.Arbitrary<{
  override: Partial<IUpnpConfig>;
  expectedConfig: IUpnpConfig;
}> = fc
  .record(
    {
      includeEnabled: fc.boolean(),
      includeHttpPort: fc.boolean(),
      includeWebsocketPort: fc.boolean(),
      includeTtl: fc.boolean(),
      includeProtocol: fc.boolean(),
      includeRetryAttempts: fc.boolean(),
      includeRetryDelay: fc.boolean(),
      enabled: fc.constant(true), // always enabled so init actually runs
      httpPort: validPortArb,
      websocketPort: validPortArb,
      ttl: validTtlArb,
      protocol: validProtocolArb,
      retryAttempts: validRetryAttemptsArb,
      retryDelay: validRetryDelayArb,
    },
    { requiredKeys: undefined },
  )
  .map((r) => {
    // Build the partial override — only include fields flagged for inclusion
    const override: Partial<IUpnpConfig> = {};
    // Always include enabled: true so the plugin actually initializes
    override.enabled = true;

    if (r.includeHttpPort) override.httpPort = r.httpPort;
    if (r.includeWebsocketPort) override.websocketPort = r.websocketPort;
    if (r.includeTtl) override.ttl = r.ttl;
    if (r.includeProtocol) override.protocol = r.protocol;
    if (r.includeRetryAttempts) override.retryAttempts = r.retryAttempts;
    if (r.includeRetryDelay) override.retryDelay = r.retryDelay;

    // Compute the expected merged config: override fields win, rest are defaults
    const expectedConfig: IUpnpConfig = {
      enabled: true,
      httpPort: override.httpPort ?? UPNP_CONFIG_DEFAULTS.httpPort,
      websocketPort:
        override.websocketPort ?? UPNP_CONFIG_DEFAULTS.websocketPort,
      ttl: override.ttl ?? UPNP_CONFIG_DEFAULTS.ttl,
      refreshInterval: UPNP_CONFIG_DEFAULTS.refreshInterval,
      protocol: override.protocol ?? UPNP_CONFIG_DEFAULTS.protocol,
      retryAttempts:
        override.retryAttempts ?? UPNP_CONFIG_DEFAULTS.retryAttempts,
      retryDelay: override.retryDelay ?? UPNP_CONFIG_DEFAULTS.retryDelay,
    };

    // Ensure refreshInterval is valid relative to the effective ttl
    // refreshInterval must be < ttl * 1000
    const effectiveTtl = expectedConfig.ttl;
    if (expectedConfig.refreshInterval >= effectiveTtl * 1000) {
      // Adjust to half the ttl in ms
      expectedConfig.refreshInterval = Math.floor((effectiveTtl * 1000) / 2);
      override.refreshInterval = expectedConfig.refreshInterval;
    }

    return { override, expectedConfig };
  });

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('UpnpPlugin - Property Tests', () => {
  let mockClient: jest.Mocked<natUpnp.Client>;
  const savedEnv = process.env;

  beforeEach(() => {
    mockClient = createSucceedingMockClient();
    mockCreateClient.mockReturnValue(mockClient);
    jest.spyOn(UpnpService, 'sleep').mockResolvedValue(undefined);
    jest.useFakeTimers();
    // Clear any UPNP_ env vars so defaults are predictable
    process.env = { ...savedEnv };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('UPNP_')) {
        delete process.env[key];
      }
    }
  });

  afterEach(() => {
    process.env = savedEnv;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // ─── Property 13: Plugin config override ──────────────────────────────

  describe('Feature: upnp-express-suite-migration, Property 13: Plugin config override', () => {
    /**
     * **Validates: Requirements 5.4**
     *
     * For any partial IUpnpConfig provided as UpnpPluginOptions.config,
     * the resulting UpnpManager should use the overridden values instead
     * of the environment defaults for those fields.
     *
     * We verify this by observing the port mapping calls made to the
     * mock nat-upnp client — the ports used in the mappings reflect
     * the httpPort and websocketPort from the effective config.
     */
    it('overridden config values reach the UpnpManager via port mapping calls', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPartialConfigArb,
          ipAddressArb,
          async ({ override, expectedConfig }, externalIp) => {
            const client = createSucceedingMockClient(externalIp);
            mockCreateClient.mockReturnValue(client);

            const plugin = new UpnpPlugin({ config: override });
            const mockApp = createMockApp();

            await plugin.init(mockApp);

            const manager = plugin.getManager();
            expect(manager).not.toBeNull();

            // Verify the HTTP port mapping was created with the expected port
            const portMappingCalls = client.portMapping.mock.calls;
            expect(portMappingCalls.length).toBeGreaterThanOrEqual(1);

            // First call is always the HTTP mapping
            const httpMappingOpts = portMappingCalls[0][0] as {
              public: number;
              private: number;
              ttl: number;
            };

            expect(httpMappingOpts.public).toBe(expectedConfig.httpPort);
            expect(httpMappingOpts.private).toBe(expectedConfig.httpPort);
            expect(httpMappingOpts.ttl).toBe(expectedConfig.ttl);

            // If websocketPort differs from httpPort, there should be a second mapping
            if (expectedConfig.websocketPort !== expectedConfig.httpPort) {
              expect(portMappingCalls.length).toBe(2);
              const wsMappingOpts = portMappingCalls[1][0] as {
                public: number;
                private: number;
                ttl: number;
              };
              expect(wsMappingOpts.public).toBe(expectedConfig.websocketPort);
              expect(wsMappingOpts.private).toBe(expectedConfig.websocketPort);
              expect(wsMappingOpts.ttl).toBe(expectedConfig.ttl);
            }

            // Clean up
            await plugin.stop();
            jest.runAllTimers();
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirements 5.4**
     *
     * When no config override is provided, the plugin uses environment
     * defaults. We verify by checking that the default httpPort (3000)
     * appears in the port mapping call.
     */
    it('without config override, defaults are used', async () => {
      const client = createSucceedingMockClient('203.0.113.1');
      mockCreateClient.mockReturnValue(client);

      // Set UPNP_ENABLED=true in env so the plugin initializes
      process.env['UPNP_ENABLED'] = 'true';

      const plugin = new UpnpPlugin();
      const mockApp = createMockApp();

      await plugin.init(mockApp);

      const manager = plugin.getManager();
      expect(manager).not.toBeNull();

      const portMappingCalls = client.portMapping.mock.calls;
      expect(portMappingCalls.length).toBeGreaterThanOrEqual(1);

      const httpMappingOpts = portMappingCalls[0][0] as {
        public: number;
        private: number;
        ttl: number;
      };

      // Should use UPNP_CONFIG_DEFAULTS values
      expect(httpMappingOpts.public).toBe(UPNP_CONFIG_DEFAULTS.httpPort);
      expect(httpMappingOpts.private).toBe(UPNP_CONFIG_DEFAULTS.httpPort);
      expect(httpMappingOpts.ttl).toBe(UPNP_CONFIG_DEFAULTS.ttl);

      await plugin.stop();
      jest.runAllTimers();
    });

    /**
     * **Validates: Requirements 5.4**
     *
     * Overriding only a single field (httpPort) should use the override
     * for that field and defaults for everything else.
     */
    it('single-field override applies only to that field', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPortArb,
          ipAddressArb,
          async (httpPort, externalIp) => {
            const client = createSucceedingMockClient(externalIp);
            mockCreateClient.mockReturnValue(client);

            const plugin = new UpnpPlugin({
              config: { enabled: true, httpPort },
            });
            const mockApp = createMockApp();

            await plugin.init(mockApp);

            const portMappingCalls = client.portMapping.mock.calls;
            expect(portMappingCalls.length).toBeGreaterThanOrEqual(1);

            const httpMappingOpts = portMappingCalls[0][0] as {
              public: number;
              private: number;
              ttl: number;
            };

            // httpPort should be the overridden value
            expect(httpMappingOpts.public).toBe(httpPort);
            expect(httpMappingOpts.private).toBe(httpPort);

            // ttl should still be the default since we didn't override it
            expect(httpMappingOpts.ttl).toBe(UPNP_CONFIG_DEFAULTS.ttl);

            await plugin.stop();
            jest.runAllTimers();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
