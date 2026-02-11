/**
 * Unit tests for UpnpService.
 *
 * Mocks the nat-upnp module to test port mapping creation/removal,
 * external IP discovery with caching, retry logic with exponential
 * backoff, error handling, and cleanup on close.
 *
 * Requirements: 8.1, 8.5
 */

import * as natUpnp from 'nat-upnp';

import { IUpnpMapping } from '../../interfaces/network/upnpTypes';
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

/** Build a fresh mock client satisfying the natUpnp.Client interface */
function createMockClient(): jest.Mocked<natUpnp.Client> {
  const mock: jest.Mocked<natUpnp.Client> = {
    externalIp: jest.fn(),
    portMapping: jest.fn(),
    portUnmapping: jest.fn(),
    getMappings: jest.fn(),
    findGateway: jest.fn(),
    close: jest.fn(),
  };
  return mock;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Default mapping used across tests */
const defaultMapping: IUpnpMapping = {
  public: 3000,
  private: 3000,
  protocol: 'tcp',
  description: 'Test Mapping',
  ttl: 3600,
};

/** Fast config so retry delays don't slow tests */
const fastRetryConfig = {
  retryAttempts: 2,
  retryDelay: 1, // 1ms base delay
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('UpnpService', () => {
  let mockClient: jest.Mocked<natUpnp.Client>;

  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true });
    mockClient = createMockClient();
    mockCreateClient.mockReturnValue(mockClient);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // ─── Static helpers ───────────────────────────────────────────────────

  describe('validatePort', () => {
    it('should accept port 1 (minimum)', () => {
      expect(() => UpnpService.validatePort(1)).not.toThrow();
    });

    it('should accept port 65535 (maximum)', () => {
      expect(() => UpnpService.validatePort(65535)).not.toThrow();
    });

    it('should reject port 0', () => {
      expect(() => UpnpService.validatePort(0)).toThrow(PortRangeError);
    });

    it('should reject negative port', () => {
      expect(() => UpnpService.validatePort(-1)).toThrow(PortRangeError);
    });

    it('should reject port above 65535', () => {
      expect(() => UpnpService.validatePort(65536)).toThrow(PortRangeError);
    });

    it('should reject non-integer port', () => {
      expect(() => UpnpService.validatePort(3.14)).toThrow(PortRangeError);
    });
  });

  describe('mappingKey', () => {
    it('should produce "port:protocol" format', () => {
      expect(UpnpService.mappingKey(8080, 'tcp')).toBe('8080:tcp');
      expect(UpnpService.mappingKey(9000, 'udp')).toBe('9000:udp');
    });
  });

  // ─── External IP discovery ────────────────────────────────────────────

  describe('getExternalIp', () => {
    it('should return the external IP from the client', async () => {
      mockClient.externalIp.mockImplementation((cb) => cb(null, '1.2.3.4'));

      const service = new UpnpService(fastRetryConfig);
      const ip = await service.getExternalIp();

      expect(ip).toBe('1.2.3.4');
      expect(mockClient.externalIp).toHaveBeenCalledTimes(1);
    });

    it('should cache the IP within the TTL window', async () => {
      mockClient.externalIp.mockImplementation((cb) => cb(null, '1.2.3.4'));

      const service = new UpnpService(fastRetryConfig, 60_000);
      await service.getExternalIp();
      const ip2 = await service.getExternalIp();

      expect(ip2).toBe('1.2.3.4');
      // Only one actual call — second was served from cache
      expect(mockClient.externalIp).toHaveBeenCalledTimes(1);
    });

    it('should refresh the IP after the cache TTL expires', async () => {
      let callCount = 0;
      mockClient.externalIp.mockImplementation((cb) => {
        callCount++;
        cb(null, callCount === 1 ? '1.2.3.4' : '5.6.7.8');
      });

      const service = new UpnpService(fastRetryConfig, 100);
      const ip1 = await service.getExternalIp();
      expect(ip1).toBe('1.2.3.4');

      // Advance past the cache TTL
      jest.advanceTimersByTime(150);

      const ip2 = await service.getExternalIp();
      expect(ip2).toBe('5.6.7.8');
      expect(mockClient.externalIp).toHaveBeenCalledTimes(2);
    });

    it('should reject when the client returns an error', async () => {
      mockClient.externalIp.mockImplementation((cb) =>
        cb(new Error('timeout')),
      );

      const service = new UpnpService(fastRetryConfig);
      await expect(service.getExternalIp()).rejects.toThrow(UpnpOperationError);
    });

    it('should reject when the client returns no IP', async () => {
      mockClient.externalIp.mockImplementation((cb) =>
        cb(null, undefined as unknown as string),
      );

      const service = new UpnpService(fastRetryConfig);
      await expect(service.getExternalIp()).rejects.toThrow(UpnpOperationError);
    });
  });

  // ─── Port mapping creation ────────────────────────────────────────────

  describe('createPortMapping', () => {
    it('should create a mapping and track it', async () => {
      mockClient.portMapping.mockImplementation((_opts, cb) => {
        if (cb) cb(null);
      });

      const service = new UpnpService(fastRetryConfig);
      await service.createPortMapping(defaultMapping);

      const mappings = await service.getMappings();
      expect(mappings).toHaveLength(1);
      expect(mappings[0]).toEqual(defaultMapping);
    });

    it('should pass correct options to the client', async () => {
      mockClient.portMapping.mockImplementation((_opts, cb) => {
        if (cb) cb(null);
      });

      const service = new UpnpService(fastRetryConfig);
      await service.createPortMapping(defaultMapping);

      expect(mockClient.portMapping).toHaveBeenCalledWith(
        expect.objectContaining({
          public: 3000,
          private: 3000,
          protocol: 'tcp',
          description: 'Test Mapping',
          ttl: 3600,
        }),
        expect.any(Function),
      );
    });

    it('should throw PortRangeError for invalid public port', async () => {
      const service = new UpnpService(fastRetryConfig);
      await expect(
        service.createPortMapping({ ...defaultMapping, public: 0 }),
      ).rejects.toThrow(PortRangeError);
    });

    it('should throw PortRangeError for invalid private port', async () => {
      const service = new UpnpService(fastRetryConfig);
      await expect(
        service.createPortMapping({ ...defaultMapping, private: 70000 }),
      ).rejects.toThrow(PortRangeError);
    });

    it('should throw UpnpOperationError when the client fails', async () => {
      mockClient.portMapping.mockImplementation((_opts, cb) => {
        if (cb) cb(new Error('conflict'));
      });

      const service = new UpnpService(fastRetryConfig);
      await expect(service.createPortMapping(defaultMapping)).rejects.toThrow(
        UpnpOperationError,
      );
    });
  });

  // ─── Port mapping removal ────────────────────────────────────────────

  describe('removePortMapping', () => {
    it('should remove a mapping and untrack it', async () => {
      mockClient.portMapping.mockImplementation((_opts, cb) => {
        if (cb) cb(null);
      });
      mockClient.portUnmapping.mockImplementation((_opts, cb) => {
        if (cb) cb(null);
      });

      const service = new UpnpService(fastRetryConfig);
      await service.createPortMapping(defaultMapping);
      expect(await service.getMappings()).toHaveLength(1);

      await service.removePortMapping(3000, 'tcp');
      expect(await service.getMappings()).toHaveLength(0);
    });

    it('should pass correct options to the client', async () => {
      mockClient.portUnmapping.mockImplementation((_opts, cb) => {
        if (cb) cb(null);
      });

      const service = new UpnpService(fastRetryConfig);
      await service.removePortMapping(8080, 'udp');

      expect(mockClient.portUnmapping).toHaveBeenCalledWith(
        expect.objectContaining({ public: 8080, protocol: 'udp' }),
        expect.any(Function),
      );
    });

    it('should throw PortRangeError for invalid port', async () => {
      const service = new UpnpService(fastRetryConfig);
      await expect(service.removePortMapping(0, 'tcp')).rejects.toThrow(
        PortRangeError,
      );
    });

    it('should throw UpnpOperationError when the client fails', async () => {
      mockClient.portUnmapping.mockImplementation((_opts, cb) => {
        if (cb) cb(new Error('not found'));
      });

      const service = new UpnpService(fastRetryConfig);
      await expect(service.removePortMapping(3000, 'tcp')).rejects.toThrow(
        UpnpOperationError,
      );
    });
  });

  // ─── Remove all mappings ──────────────────────────────────────────────

  describe('removeAllMappings', () => {
    it('should remove every tracked mapping', async () => {
      mockClient.portMapping.mockImplementation((_opts, cb) => {
        if (cb) cb(null);
      });
      mockClient.portUnmapping.mockImplementation((_opts, cb) => {
        if (cb) cb(null);
      });

      const service = new UpnpService(fastRetryConfig);
      await service.createPortMapping(defaultMapping);
      await service.createPortMapping({
        ...defaultMapping,
        public: 4000,
        private: 4000,
      });
      expect(await service.getMappings()).toHaveLength(2);

      await service.removeAllMappings();
      expect(await service.getMappings()).toHaveLength(0);
    });

    it('should throw UpnpOperationError on partial failure but still clear mappings', async () => {
      mockClient.portMapping.mockImplementation((_opts, cb) => {
        if (cb) cb(null);
      });
      // First mapping (port 3000) removal succeeds, second (port 5000) always fails
      mockClient.portUnmapping.mockImplementation((opts, cb) => {
        const port =
          typeof opts.public === 'number'
            ? opts.public
            : (opts.public?.port ?? 0);
        if (port === 5000) {
          if (cb) cb(new Error('network error'));
        } else {
          if (cb) cb(null);
        }
      });

      const service = new UpnpService(fastRetryConfig);
      await service.createPortMapping(defaultMapping);
      await service.createPortMapping({
        ...defaultMapping,
        public: 5000,
        private: 5000,
      });

      await expect(service.removeAllMappings()).rejects.toThrow(
        UpnpOperationError,
      );

      // Mappings should still be cleared even after partial failure
      expect(await service.getMappings()).toHaveLength(0);
    });
  });

  // ─── Retry logic ──────────────────────────────────────────────────────

  describe('retry logic', () => {
    it('should retry on failure and succeed on a later attempt', async () => {
      let callCount = 0;
      mockClient.externalIp.mockImplementation((cb) => {
        callCount++;
        if (callCount < 3) {
          cb(new Error('transient'));
        } else {
          cb(null, '1.2.3.4');
        }
      });

      const service = new UpnpService(fastRetryConfig);
      const ip = await service.getExternalIp();

      expect(ip).toBe('1.2.3.4');
      // 1 initial + 2 retries = 3 total calls
      expect(callCount).toBe(3);
    });

    it('should throw after exhausting all retry attempts', async () => {
      mockClient.externalIp.mockImplementation((cb) =>
        cb(new Error('persistent failure')),
      );

      const service = new UpnpService(fastRetryConfig);
      await expect(service.getExternalIp()).rejects.toThrow(UpnpOperationError);

      // 1 initial + 2 retries = 3 total calls
      expect(mockClient.externalIp).toHaveBeenCalledTimes(3);
    });

    it('should apply exponential backoff between retries', async () => {
      const sleepSpy = jest.spyOn(UpnpService, 'sleep').mockResolvedValue();
      mockClient.externalIp.mockImplementation((cb) => cb(new Error('fail')));

      const service = new UpnpService({ retryAttempts: 3, retryDelay: 100 });

      await expect(service.getExternalIp()).rejects.toThrow(UpnpOperationError);

      // Backoff: 100 * 2^0 = 100, 100 * 2^1 = 200, 100 * 2^2 = 400
      expect(sleepSpy).toHaveBeenCalledTimes(3);
      expect(sleepSpy).toHaveBeenNthCalledWith(1, 100);
      expect(sleepSpy).toHaveBeenNthCalledWith(2, 200);
      expect(sleepSpy).toHaveBeenNthCalledWith(3, 400);
    });
  });

  // ─── Error handling ───────────────────────────────────────────────────

  describe('error handling', () => {
    it('should wrap timeout errors in UpnpOperationError', async () => {
      mockClient.externalIp.mockImplementation((cb) =>
        cb(new Error('Timeout')),
      );

      const service = new UpnpService(fastRetryConfig);
      await expect(service.getExternalIp()).rejects.toThrow(UpnpOperationError);
    });

    it('should wrap conflict errors in UpnpOperationError', async () => {
      mockClient.portMapping.mockImplementation((_opts, cb) => {
        if (cb) cb(new Error('ConflictInMappingEntry'));
      });

      const service = new UpnpService(fastRetryConfig);
      await expect(service.createPortMapping(defaultMapping)).rejects.toThrow(
        UpnpOperationError,
      );
    });

    it('should wrap unavailable errors in UpnpOperationError', async () => {
      mockClient.externalIp.mockImplementation((cb) =>
        cb(new Error('No gateway device found')),
      );

      const service = new UpnpService(fastRetryConfig);
      await expect(service.getExternalIp()).rejects.toThrow(UpnpOperationError);
    });

    it('should include the cause in UpnpOperationError message', async () => {
      mockClient.externalIp.mockImplementation((cb) =>
        cb(new Error('specific cause')),
      );

      const service = new UpnpService(fastRetryConfig);
      await expect(service.getExternalIp()).rejects.toThrow(/specific cause/);
    });
  });

  // ─── Closed service behaviour ─────────────────────────────────────────

  describe('closed service', () => {
    function createClosedService(): UpnpService {
      mockClient.portUnmapping.mockImplementation((_opts, cb) => {
        if (cb) cb(null);
      });
      const service = new UpnpService(fastRetryConfig);
      return service;
    }

    it('should throw UpnpServiceClosedError on getExternalIp', async () => {
      const service = createClosedService();
      await service.close();
      await expect(service.getExternalIp()).rejects.toThrow(
        UpnpServiceClosedError,
      );
    });

    it('should throw UpnpServiceClosedError on createPortMapping', async () => {
      const service = createClosedService();
      await service.close();
      await expect(service.createPortMapping(defaultMapping)).rejects.toThrow(
        UpnpServiceClosedError,
      );
    });

    it('should throw UpnpServiceClosedError on removePortMapping', async () => {
      const service = createClosedService();
      await service.close();
      await expect(service.removePortMapping(3000, 'tcp')).rejects.toThrow(
        UpnpServiceClosedError,
      );
    });

    it('should throw UpnpServiceClosedError on removeAllMappings', async () => {
      const service = createClosedService();
      await service.close();
      await expect(service.removeAllMappings()).rejects.toThrow(
        UpnpServiceClosedError,
      );
    });

    it('should throw UpnpServiceClosedError on getMappings', async () => {
      const service = createClosedService();
      await service.close();
      await expect(service.getMappings()).rejects.toThrow(
        UpnpServiceClosedError,
      );
    });

    it('should throw UpnpServiceClosedError on double close', async () => {
      const service = createClosedService();
      await service.close();
      await expect(service.close()).rejects.toThrow(UpnpServiceClosedError);
    });
  });

  // ─── Cleanup on close ─────────────────────────────────────────────────

  describe('close', () => {
    it('should remove all mappings and close the client', async () => {
      mockClient.portMapping.mockImplementation((_opts, cb) => {
        if (cb) cb(null);
      });
      mockClient.portUnmapping.mockImplementation((_opts, cb) => {
        if (cb) cb(null);
      });

      const service = new UpnpService(fastRetryConfig);
      await service.createPortMapping(defaultMapping);

      await service.close();

      expect(mockClient.portUnmapping).toHaveBeenCalled();
      expect(mockClient.close).toHaveBeenCalled();
    });

    it('should close the client even if mapping removal fails', async () => {
      mockClient.portMapping.mockImplementation((_opts, cb) => {
        if (cb) cb(null);
      });
      mockClient.portUnmapping.mockImplementation((_opts, cb) => {
        if (cb) cb(new Error('removal failed'));
      });

      const service = new UpnpService(fastRetryConfig);
      await service.createPortMapping(defaultMapping);

      // close() swallows removeAllMappings errors
      await service.close();

      expect(mockClient.close).toHaveBeenCalled();
    });

    it('should clear the cached external IP', async () => {
      mockClient.externalIp.mockImplementation((cb) => cb(null, '1.2.3.4'));

      const service = new UpnpService(fastRetryConfig, 60_000);
      await service.getExternalIp();
      await service.close();

      // After close, any call should throw UpnpServiceClosedError
      await expect(service.getExternalIp()).rejects.toThrow(
        UpnpServiceClosedError,
      );
    });
  });

  // ─── getMappings ──────────────────────────────────────────────────────

  describe('getMappings', () => {
    it('should return empty array when no mappings exist', async () => {
      const service = new UpnpService(fastRetryConfig);
      const mappings = await service.getMappings();
      expect(mappings).toEqual([]);
    });

    it('should return copies of tracked mappings', async () => {
      mockClient.portMapping.mockImplementation((_opts, cb) => {
        if (cb) cb(null);
      });

      const service = new UpnpService(fastRetryConfig);
      await service.createPortMapping(defaultMapping);

      const mappings = await service.getMappings();
      expect(mappings).toHaveLength(1);
      expect(mappings[0]).toEqual(defaultMapping);
    });
  });

  // ─── Error class construction ─────────────────────────────────────────

  describe('error classes', () => {
    it('PortRangeError should have correct name and message', () => {
      const err = new PortRangeError(99999);
      expect(err.name).toBe('PortRangeError');
      expect(err.message).toContain('99999');
      expect(err).toBeInstanceOf(Error);
    });

    it('UpnpOperationError should include operation and cause', () => {
      const err = new UpnpOperationError('testOp', 'some cause');
      expect(err.name).toBe('UpnpOperationError');
      expect(err.message).toContain('testOp');
      expect(err.message).toContain('some cause');
    });

    it('UpnpOperationError should work without cause', () => {
      const err = new UpnpOperationError('testOp');
      expect(err.message).toContain('testOp');
      expect(err.message).not.toContain('undefined');
    });

    it('UpnpServiceClosedError should have correct name', () => {
      const err = new UpnpServiceClosedError();
      expect(err.name).toBe('UpnpServiceClosedError');
      expect(err).toBeInstanceOf(Error);
    });
  });
});
