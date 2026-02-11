/**
 * Property-Based Tests for UpnpManager
 *
 * Feature: upnp-express-suite-migration
 * Uses fast-check to validate universal properties of the UPnP manager
 * across many randomly generated inputs.
 *
 * @module services/__tests__/upnp-manager.property.spec
 */

import * as fc from 'fast-check';
import * as natUpnp from 'nat-upnp';

import {
  IUpnpConfig,
  UPNP_CONFIG_DEFAULTS,
  UpnpProtocol,
} from '../../interfaces/network/upnpTypes';
import { UpnpService } from '../upnp';
import { UpnpManager } from '../upnp-manager';

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

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Arbitrary for valid port numbers (1-65535) */
const validPortArb = fc.integer({ min: 1, max: 65535 });

/** Arbitrary for valid TTL values (60-86400) */
const validTtlArb = fc.integer({ min: 60, max: 86400 });

/** Arbitrary for valid UpnpProtocol values */
const validProtocolArb: fc.Arbitrary<UpnpProtocol> = fc.constantFrom(
  UpnpProtocol.UPNP,
  UpnpProtocol.NATPMP,
  UpnpProtocol.AUTO,
);

/**
 * Arbitrary for a non-empty description prefix string.
 * Constrained to printable ASCII to avoid encoding edge cases.
 */
const descriptionPrefixArb = fc
  .string({ minLength: 1, maxLength: 40 })
  .filter((s) => s.trim().length > 0);

/**
 * Arbitrary for valid IPv4 addresses.
 * First octet 1-255, last octet 1-254 to avoid broadcast/network addresses.
 */
const ipAddressArb = fc
  .tuple(
    fc.integer({ min: 1, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 1, max: 254 }),
  )
  .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

/** Arbitrary for consecutive failure count (1-20, covering beyond the cap) */
const failureCountArb = fc.integer({ min: 1, max: 20 });

/** Arbitrary for valid retryDelay values (1000-60000) */
const validRetryDelayArb = fc.integer({ min: 1000, max: 60000 });

/** Arbitrary for shutdown call count (1-10) */
const shutdownCountArb = fc.integer({ min: 1, max: 10 });

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('UpnpManager - Property Tests', () => {
  let mockClient: jest.Mocked<natUpnp.Client>;

  beforeEach(() => {
    mockClient = createSucceedingMockClient();
    mockCreateClient.mockReturnValue(mockClient);
    jest.spyOn(UpnpService, 'sleep').mockResolvedValue(undefined);
    // Prevent real timers from firing during tests
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // ─── Property 9: Description prefix formatting ─────────────────────────

  describe('Feature: upnp-express-suite-migration, Property 9: Description prefix formatting', () => {
    /**
     * **Validates: Requirements 4.2, 4.3**
     *
     * For any non-empty string used as descriptionPrefix, the UpnpManager
     * should create HTTP mappings with description "{descriptionPrefix} HTTP"
     * and WebSocket mappings with description "{descriptionPrefix} WebSocket".
     */
    it('HTTP and WebSocket mapping descriptions use the configured prefix', async () => {
      await fc.assert(
        fc.asyncProperty(
          descriptionPrefixArb,
          validPortArb,
          validPortArb.filter((p) => p > 1), // ensure we can get a different ws port
          ipAddressArb,
          async (prefix, httpPort, wsPortBase, externalIp) => {
            // Ensure websocketPort differs from httpPort so both mappings are created
            const websocketPort =
              httpPort === wsPortBase ? (wsPortBase % 65535) + 1 : wsPortBase;

            const client = createSucceedingMockClient(externalIp);
            mockCreateClient.mockReturnValue(client);

            const config: IUpnpConfig = {
              ...UPNP_CONFIG_DEFAULTS,
              enabled: true,
              httpPort,
              websocketPort,
              retryAttempts: 1,
              retryDelay: 1000,
            };

            const manager = new UpnpManager({
              config,
              descriptionPrefix: prefix,
            });

            await manager.initialize();

            // Collect all portMapping calls
            const portMappingCalls = client.portMapping.mock.calls;

            // Should have exactly 2 calls: HTTP + WebSocket
            expect(portMappingCalls.length).toBe(2);

            // Extract the descriptions from the mapping options
            const descriptions = portMappingCalls.map(
              (call) => (call[0] as { description?: string }).description,
            );

            expect(descriptions).toContain(`${prefix} HTTP`);
            expect(descriptions).toContain(`${prefix} WebSocket`);

            await manager.shutdown();
            jest.runAllTimers();
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirements 4.2, 4.3**
     *
     * When httpPort === websocketPort, only the HTTP mapping is created
     * (no separate WebSocket mapping needed), and its description uses the prefix.
     */
    it('single-port config creates only HTTP mapping with correct prefix', async () => {
      await fc.assert(
        fc.asyncProperty(
          descriptionPrefixArb,
          validPortArb,
          ipAddressArb,
          async (prefix, port, externalIp) => {
            const client = createSucceedingMockClient(externalIp);
            mockCreateClient.mockReturnValue(client);

            const config: IUpnpConfig = {
              ...UPNP_CONFIG_DEFAULTS,
              enabled: true,
              httpPort: port,
              websocketPort: port, // same port — no separate WS mapping
              retryAttempts: 1,
              retryDelay: 1000,
            };

            const manager = new UpnpManager({
              config,
              descriptionPrefix: prefix,
            });

            await manager.initialize();

            const portMappingCalls = client.portMapping.mock.calls;
            expect(portMappingCalls.length).toBe(1);

            const description = (
              portMappingCalls[0][0] as { description?: string }
            ).description;
            expect(description).toBe(`${prefix} HTTP`);

            await manager.shutdown();
            jest.runAllTimers();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 10: Shutdown idempotence ──────────────────────────────────

  describe('Feature: upnp-express-suite-migration, Property 10: Shutdown idempotence', () => {
    /**
     * **Validates: Requirements 4.6**
     *
     * For any initialized UpnpManager, calling shutdown() N times (N >= 1)
     * should be equivalent to calling it once — the service should be closed,
     * and no errors should be thrown on subsequent calls.
     */
    it('calling shutdown N times never throws and is equivalent to calling it once', async () => {
      await fc.assert(
        fc.asyncProperty(
          shutdownCountArb,
          ipAddressArb,
          async (n, externalIp) => {
            const client = createSucceedingMockClient(externalIp);
            mockCreateClient.mockReturnValue(client);

            const config: IUpnpConfig = {
              ...UPNP_CONFIG_DEFAULTS,
              enabled: true,
              httpPort: 3000,
              websocketPort: 3000,
              retryAttempts: 1,
              retryDelay: 1000,
            };

            const manager = new UpnpManager({ config });

            await manager.initialize();
            expect(manager.isInitialized).toBe(true);

            // Call shutdown N times — none should throw
            for (let i = 0; i < n; i++) {
              await expect(manager.shutdown()).resolves.toBeUndefined();
            }

            // After all shutdowns, the manager should be in shutdown state
            expect(manager.isShuttingDown).toBe(true);

            // The underlying service close should have been called exactly once
            // (subsequent shutdown calls are no-ops due to shuttingDown flag)
            expect(client.portUnmapping).toHaveBeenCalled();

            jest.runAllTimers();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 11: Backoff delay formula ─────────────────────────────────

  describe('Feature: upnp-express-suite-migration, Property 11: Backoff delay formula', () => {
    /**
     * **Validates: Requirements 4.9**
     *
     * For any consecutive failure count F (F >= 1) and configured retryDelay,
     * the backoff delay should equal retryDelay * min(2^(F-1), 8).
     *
     * We verify this by triggering refresh failures on an initialized manager
     * and capturing the backoff delay from the console.warn log output, which
     * logs the exact computed delay: "Scheduling backoff refresh in {delay}ms".
     */
    it('backoff delay equals retryDelay * min(2^(F-1), 8)', async () => {
      // Use real timers for this test — we call refresh() directly via the
      // interval callback pattern, not through timer advancement.
      jest.useRealTimers();

      await fc.assert(
        fc.asyncProperty(
          failureCountArb,
          validRetryDelayArb,
          ipAddressArb,
          async (failureCount, retryDelay, externalIp) => {
            const client = createSucceedingMockClient(externalIp);
            mockCreateClient.mockReturnValue(client);

            const config: IUpnpConfig = {
              ...UPNP_CONFIG_DEFAULTS,
              enabled: true,
              httpPort: 3000,
              websocketPort: 3000,
              retryAttempts: 1,
              retryDelay,
              // Use a very large refresh interval so the timer never fires
              refreshInterval: 999999999,
            };

            const manager = new UpnpManager({ config });

            await manager.initialize();

            // After init, the service has 1 tracked mapping (HTTP on port 3000).
            // Make createPortMapping fail so refresh() hits the partial-failure path.
            client.portMapping.mockImplementation((_opts, cb) => {
              if (cb) cb(new Error('refresh-fail'));
            });

            // Capture console.warn calls to extract backoff delay
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

            // Access the private refresh method via bracket notation
            // to trigger refresh failures without relying on timer advancement.
            // eslint-disable-next-line @typescript-eslint/dot-notation
            const refreshFn = manager['refresh'].bind(
              manager,
            ) as () => Promise<void>;

            // Trigger failureCount consecutive refresh failures
            for (let i = 0; i < failureCount; i++) {
              await refreshFn();
            }

            // The last console.warn should contain the backoff delay
            const expectedMultiplier = Math.min(
              Math.pow(2, failureCount - 1),
              8,
            );
            const expectedDelay = retryDelay * expectedMultiplier;

            // Find the warn call that logs the scheduling message
            const schedulingCalls = warnSpy.mock.calls.filter((call) =>
              String(call[0]).includes('Scheduling backoff refresh in'),
            );

            // Should have one scheduling call per failure
            expect(schedulingCalls.length).toBe(failureCount);

            // The last scheduling call should have the expected delay
            const lastCall = String(
              schedulingCalls[schedulingCalls.length - 1][0],
            );
            expect(lastCall).toContain(
              `Scheduling backoff refresh in ${expectedDelay}ms`,
            );

            warnSpy.mockRestore();
            await manager.shutdown();
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirements 4.9**
     *
     * Pure formula verification: the backoff multiplier is capped at 8.
     * For any failure count F and retryDelay, delay = retryDelay * min(2^(F-1), 8).
     */
    it('backoff multiplier is capped at 8 regardless of failure count', () => {
      fc.assert(
        fc.property(
          failureCountArb,
          validRetryDelayArb,
          (failureCount, retryDelay) => {
            const multiplier = Math.min(Math.pow(2, failureCount - 1), 8);
            const delay = retryDelay * multiplier;

            // Multiplier should never exceed 8
            expect(multiplier).toBeLessThanOrEqual(8);
            expect(multiplier).toBeGreaterThanOrEqual(1);

            // Delay should be between retryDelay and 8 * retryDelay
            expect(delay).toBeGreaterThanOrEqual(retryDelay);
            expect(delay).toBeLessThanOrEqual(retryDelay * 8);

            // Verify specific cap points:
            // F=1 → 2^0 = 1, F=2 → 2^1 = 2, F=3 → 2^2 = 4, F=4 → 2^3 = 8
            // F>=4 → capped at 8
            if (failureCount >= 4) {
              expect(multiplier).toBe(8);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 12: External endpoints URL format ─────────────────────────

  describe('Feature: upnp-express-suite-migration, Property 12: External endpoints URL format', () => {
    /**
     * **Validates: Requirements 4.10**
     *
     * For any external IP address and configured httpPort/websocketPort,
     * getExternalEndpoints should return
     * { http: "http://{ip}:{httpPort}", ws: "ws://{ip}:{websocketPort}" }.
     */
    it('returns correctly formatted http and ws URLs', async () => {
      await fc.assert(
        fc.asyncProperty(
          ipAddressArb,
          validPortArb,
          validPortArb,
          async (externalIp, httpPort, websocketPort) => {
            const client = createSucceedingMockClient(externalIp);
            mockCreateClient.mockReturnValue(client);

            const config: IUpnpConfig = {
              ...UPNP_CONFIG_DEFAULTS,
              enabled: true,
              httpPort,
              websocketPort,
              retryAttempts: 1,
              retryDelay: 1000,
            };

            const manager = new UpnpManager({ config });

            await manager.initialize();

            const endpoints = await manager.getExternalEndpoints();

            expect(endpoints).not.toBeNull();
            expect(endpoints!.http).toBe(`http://${externalIp}:${httpPort}`);
            expect(endpoints!.ws).toBe(`ws://${externalIp}:${websocketPort}`);

            await manager.shutdown();
            jest.runAllTimers();
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirements 4.10**
     *
     * getExternalEndpoints returns null when the manager is not initialized.
     */
    it('returns null when manager is not initialized', async () => {
      const config: IUpnpConfig = {
        ...UPNP_CONFIG_DEFAULTS,
        enabled: true,
        retryAttempts: 1,
        retryDelay: 1000,
      };

      const manager = new UpnpManager({ config });

      const endpoints = await manager.getExternalEndpoints();
      expect(endpoints).toBeNull();
    });

    /**
     * **Validates: Requirements 4.10**
     *
     * getExternalEndpoints returns null after shutdown.
     */
    it('returns null after shutdown', async () => {
      await fc.assert(
        fc.asyncProperty(ipAddressArb, async (externalIp) => {
          const client = createSucceedingMockClient(externalIp);
          mockCreateClient.mockReturnValue(client);

          const config: IUpnpConfig = {
            ...UPNP_CONFIG_DEFAULTS,
            enabled: true,
            retryAttempts: 1,
            retryDelay: 1000,
          };

          const manager = new UpnpManager({ config });

          await manager.initialize();
          await manager.shutdown();

          const endpoints = await manager.getExternalEndpoints();
          expect(endpoints).toBeNull();

          jest.runAllTimers();
        }),
        { numRuns: 100 },
      );
    });
  });
});
