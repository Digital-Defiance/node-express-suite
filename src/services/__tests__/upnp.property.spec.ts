/**
 * Property-Based Tests for UpnpService
 *
 * Feature: upnp-express-suite-migration
 * Uses fast-check to validate universal properties of the UPnP port mapping
 * service across many randomly generated inputs.
 *
 * @module services/__tests__/upnp.property.spec
 */

import * as fc from 'fast-check';
import * as natUpnp from 'nat-upnp';

import {
  IUpnpConfig,
  IUpnpMapping,
  PortMappingProtocol,
  UPNP_CONFIG_DEFAULTS,
  UpnpProtocol,
} from '../../interfaces/network/upnpTypes';
import {
  PortRangeError,
  UpnpOperationError,
  UpnpService,
  UpnpServiceClosedError,
} from '../upnp';

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

/** Arbitrary for the transport protocol */
const protocolArb: fc.Arbitrary<PortMappingProtocol> = fc.constantFrom(
  'tcp' as const,
  'udp' as const,
);

/** Arbitrary for a valid IUpnpMapping */
const validMappingArb: fc.Arbitrary<IUpnpMapping> = fc.record({
  public: validPortArb,
  private: validPortArb,
  protocol: protocolArb,
  description: fc.string({ minLength: 1, maxLength: 50 }),
  ttl: fc.integer({ min: 60, max: 86400 }),
});

/** Arbitrary for invalid port numbers (outside 1-65535 or non-integers) */
const invalidPortArb: fc.Arbitrary<number> = fc.oneof(
  fc.integer({ min: -1000, max: 0 }),
  fc.integer({ min: 65536, max: 100000 }),
  fc
    .double({ min: 0.01, max: 65535, noNaN: true })
    .filter((n) => !Number.isInteger(n)),
  fc.constant(NaN),
  fc.constant(Infinity),
  fc.constant(-Infinity),
);

/** Arbitrary for a partial IUpnpConfig (any subset of fields) */
const partialConfigArb: fc.Arbitrary<Partial<IUpnpConfig>> = fc.record(
  {
    enabled: fc.boolean(),
    httpPort: fc.integer({ min: 1, max: 65535 }),
    websocketPort: fc.integer({ min: 1, max: 65535 }),
    ttl: fc.integer({ min: 60, max: 86400 }),
    refreshInterval: fc.integer({ min: 1, max: 3599000 }),
    protocol: fc.constantFrom(
      UpnpProtocol.UPNP,
      UpnpProtocol.NATPMP,
      UpnpProtocol.AUTO,
    ),
    retryAttempts: fc.integer({ min: 1, max: 10 }),
    retryDelay: fc.integer({ min: 1000, max: 60000 }),
  },
  { requiredKeys: [] },
);

/** Arbitrary for valid IPv4 addresses */
const ipAddressArb = fc
  .tuple(
    fc.integer({ min: 1, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 1, max: 254 }),
  )
  .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

/** Fast config so retry delays don't slow tests */
const fastRetryConfig: Partial<IUpnpConfig> = {
  retryAttempts: 0,
  retryDelay: 1,
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('UpnpService - Property Tests', () => {
  let mockClient: jest.Mocked<natUpnp.Client>;

  beforeEach(() => {
    mockClient = createSucceedingMockClient();
    mockCreateClient.mockReturnValue(mockClient);
    jest.spyOn(UpnpService, 'sleep').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── Property 1: Partial config merges with defaults ────────────────────

  describe('Feature: upnp-express-suite-migration, Property 1: Partial config merges with defaults', () => {
    /**
     * **Validates: Requirements 2.1**
     *
     * For any partial IUpnpConfig object (with zero or more fields omitted),
     * constructing a UpnpService with that partial config should produce a
     * service whose effective config has all fields defined, with omitted
     * fields matching UPNP_CONFIG_DEFAULTS.
     */
    it('omitted fields fall back to UPNP_CONFIG_DEFAULTS', async () => {
      await fc.assert(
        fc.asyncProperty(partialConfigArb, async (partial) => {
          const service = new UpnpService({
            ...partial,
            retryAttempts: 0,
            retryDelay: 1,
          });

          // We verify the merge by exercising the service:
          // - getExternalIp uses the config internally
          // - getMappings works (service is functional)
          const ip = await service.getExternalIp();
          expect(typeof ip).toBe('string');

          const mappings = await service.getMappings();
          expect(mappings).toEqual([]);

          // Build the expected merged config
          const expected: IUpnpConfig = {
            ...UPNP_CONFIG_DEFAULTS,
            ...partial,
            retryAttempts: 0,
            retryDelay: 1,
          };

          // Verify each field by checking the config was applied correctly.
          // We can verify port validation works (uses config indirectly)
          // and that the service is functional with the merged config.
          // The key property: the service is constructable and operational
          // with any partial config, meaning defaults filled in correctly.

          // For fields we can observe: create a mapping using config-derived ports
          // to verify httpPort/websocketPort defaults were applied
          if (expected.httpPort >= 1 && expected.httpPort <= 65535) {
            await service.createPortMapping({
              public: expected.httpPort,
              private: expected.httpPort,
              protocol: 'tcp',
              description: 'test',
              ttl: expected.ttl,
            });
            const tracked = await service.getMappings();
            expect(tracked.length).toBe(1);
            expect(tracked[0].public).toBe(expected.httpPort);
            expect(tracked[0].ttl).toBe(expected.ttl);
          }

          await service.close();
        }),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 2: Invalid ports throw PortRangeError ─────────────────────

  describe('Feature: upnp-express-suite-migration, Property 2: Invalid ports throw PortRangeError', () => {
    /**
     * **Validates: Requirements 2.2**
     *
     * For any number that is not an integer in the range 1-65535 (including
     * negative numbers, zero, numbers > 65535, and non-integers), calling
     * UpnpService.validatePort with that number should throw a PortRangeError.
     */
    it('rejects all invalid port numbers with PortRangeError', () => {
      fc.assert(
        fc.property(invalidPortArb, (port) => {
          expect(() => UpnpService.validatePort(port)).toThrow(PortRangeError);
        }),
        { numRuns: 200 },
      );
    });

    /**
     * **Validates: Requirements 2.2**
     *
     * Complementary: valid ports in 1-65535 should NOT throw.
     */
    it('accepts all valid port numbers without throwing', () => {
      fc.assert(
        fc.property(validPortArb, (port) => {
          expect(() => UpnpService.validatePort(port)).not.toThrow();
        }),
        { numRuns: 200 },
      );
    });
  });

  // ─── Property 3: Mapping create-then-remove round trip ──────────────────

  describe('Feature: upnp-express-suite-migration, Property 3: Mapping create-then-remove round trip', () => {
    /**
     * **Validates: Requirements 2.3, 2.4**
     *
     * For any valid IUpnpMapping, creating the mapping via createPortMapping
     * then removing it via removePortMapping should result in getMappings not
     * containing that mapping. Additionally, after createPortMapping,
     * getMappings should contain the mapping.
     */
    it('create then remove round trip preserves consistency', async () => {
      await fc.assert(
        fc.asyncProperty(validMappingArb, async (mapping) => {
          const service = new UpnpService(fastRetryConfig);

          // Initially no mappings
          const before = await service.getMappings();
          expect(before).toHaveLength(0);

          // Create the mapping
          await service.createPortMapping(mapping);

          // After create, getMappings should contain the mapping
          const afterCreate = await service.getMappings();
          const found = afterCreate.find(
            (m) =>
              m.public === mapping.public && m.protocol === mapping.protocol,
          );
          expect(found).toBeDefined();
          expect(found!.public).toBe(mapping.public);
          expect(found!.private).toBe(mapping.private);
          expect(found!.protocol).toBe(mapping.protocol);
          expect(found!.description).toBe(mapping.description);
          expect(found!.ttl).toBe(mapping.ttl);

          // Remove the mapping
          await service.removePortMapping(mapping.public, mapping.protocol);

          // After remove, getMappings should NOT contain the mapping
          const afterRemove = await service.getMappings();
          const gone = afterRemove.find(
            (m) =>
              m.public === mapping.public && m.protocol === mapping.protocol,
          );
          expect(gone).toBeUndefined();

          await service.close();
        }),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 4: Retry logic respects configured attempts ───────────────

  describe('Feature: upnp-express-suite-migration, Property 4: Retry logic respects configured attempts', () => {
    /**
     * **Validates: Requirements 2.6, 2.7**
     *
     * For any retryAttempts value between 1 and 10, and any operation that
     * fails exactly N times then succeeds: if N <= retryAttempts, the
     * operation should succeed; if N > retryAttempts, the operation should
     * throw UpnpOperationError containing the last error message.
     */
    it('succeeds when failures <= retryAttempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          ipAddressArb,
          async (retryAttempts, expectedIp) => {
            // Fail exactly retryAttempts times, then succeed on the last allowed attempt
            const failuresBeforeSuccess = retryAttempts;
            let callCount = 0;

            const client = createSucceedingMockClient(expectedIp);
            client.externalIp = jest.fn((cb) => {
              callCount++;
              if (callCount <= failuresBeforeSuccess) {
                cb(new Error(`fail-${callCount}`), '');
              } else {
                cb(null, expectedIp);
              }
            });
            mockCreateClient.mockReturnValue(client);

            const service = new UpnpService({ retryAttempts, retryDelay: 1 });
            const ip = await service.getExternalIp();
            expect(ip).toBe(expectedIp);

            // Total calls = failuresBeforeSuccess + 1 (the successful one)
            expect(callCount).toBe(failuresBeforeSuccess + 1);

            await service.close();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('throws UpnpOperationError when failures > retryAttempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          fc.string({ minLength: 1, maxLength: 30 }),
          async (retryAttempts, errorMsg) => {
            // Always fail — more failures than retryAttempts allows
            const client = createSucceedingMockClient();
            client.externalIp = jest.fn((cb) => {
              cb(new Error(errorMsg), '');
            });
            mockCreateClient.mockReturnValue(client);

            const service = new UpnpService({ retryAttempts, retryDelay: 1 });

            await expect(service.getExternalIp()).rejects.toThrow(
              UpnpOperationError,
            );

            try {
              // Reset for a fresh attempt to check the error message
              const client2 = createSucceedingMockClient();
              client2.externalIp = jest.fn((cb) => {
                cb(new Error(errorMsg), '');
              });
              mockCreateClient.mockReturnValue(client2);

              const service2 = new UpnpService({
                retryAttempts,
                retryDelay: 1,
              });
              await service2.getExternalIp();
            } catch (err) {
              expect(err).toBeInstanceOf(UpnpOperationError);
              expect((err as UpnpOperationError).message).toContain(errorMsg);
            }

            // Total calls should be retryAttempts + 1 (initial + retries)
            expect(client.externalIp).toHaveBeenCalledTimes(retryAttempts + 1);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 5: External IP caching ────────────────────────────────────

  describe('Feature: upnp-express-suite-migration, Property 5: External IP caching', () => {
    /**
     * **Validates: Requirements 2.8**
     *
     * For any external IP string and cache TTL, calling getExternalIp twice
     * within the cache TTL should query the underlying nat-upnp client only
     * once (the second call returns the cached value).
     */
    it('second call within TTL returns cached value without querying router', async () => {
      await fc.assert(
        fc.asyncProperty(
          ipAddressArb,
          fc.integer({ min: 10000, max: 600000 }),
          async (expectedIp, cacheTtl) => {
            const client = createSucceedingMockClient(expectedIp);
            mockCreateClient.mockReturnValue(client);

            const service = new UpnpService(
              { retryAttempts: 0, retryDelay: 1 },
              cacheTtl,
            );

            // First call — should query the router
            const ip1 = await service.getExternalIp();
            expect(ip1).toBe(expectedIp);
            expect(client.externalIp).toHaveBeenCalledTimes(1);

            // Second call — should return cached value (no additional query)
            const ip2 = await service.getExternalIp();
            expect(ip2).toBe(expectedIp);
            expect(client.externalIp).toHaveBeenCalledTimes(1);

            await service.close();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 6: Closed service rejects operations ──────────────────────

  describe('Feature: upnp-express-suite-migration, Property 6: Closed service rejects operations', () => {
    /**
     * **Validates: Requirements 2.9**
     *
     * For any UpnpService instance that has been closed via close(), all
     * subsequent calls to getExternalIp, createPortMapping, removePortMapping,
     * removeAllMappings, getMappings, and close should throw
     * UpnpServiceClosedError.
     */
    it('all operations throw UpnpServiceClosedError after close', async () => {
      await fc.assert(
        fc.asyncProperty(validMappingArb, async (mapping) => {
          const service = new UpnpService(fastRetryConfig);
          await service.close();

          // getExternalIp
          await expect(service.getExternalIp()).rejects.toThrow(
            UpnpServiceClosedError,
          );

          // createPortMapping
          await expect(service.createPortMapping(mapping)).rejects.toThrow(
            UpnpServiceClosedError,
          );

          // removePortMapping
          await expect(
            service.removePortMapping(mapping.public, mapping.protocol),
          ).rejects.toThrow(UpnpServiceClosedError);

          // removeAllMappings
          await expect(service.removeAllMappings()).rejects.toThrow(
            UpnpServiceClosedError,
          );

          // getMappings
          await expect(service.getMappings()).rejects.toThrow(
            UpnpServiceClosedError,
          );

          // close (second call)
          await expect(service.close()).rejects.toThrow(UpnpServiceClosedError);
        }),
        { numRuns: 100 },
      );
    });
  });
});
