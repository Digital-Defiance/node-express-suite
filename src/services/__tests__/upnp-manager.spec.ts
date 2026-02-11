/**
 * Unit tests for UpnpManager.
 *
 * Mocks nat-upnp to test the manager's lifecycle orchestration:
 * initialization, refresh, shutdown, signal handling, external endpoints,
 * and configurable description prefix.
 *
 * Requirements: 8.3, 8.5
 */

import * as natUpnp from 'nat-upnp';

import { IUpnpConfig, UpnpProtocol } from '../../interfaces/network/upnpTypes';
import { UpnpService } from '../upnp';
import { UpnpManager } from '../upnp-manager';

// ─── Mock nat-upnp ─────────────────────────────────────────────────────────

jest.mock('nat-upnp');

const mockCreateClient = natUpnp.createClient as jest.MockedFunction<
  typeof natUpnp.createClient
>;

/** Build a fresh mock client that succeeds on all operations */
function createMockClient(
  externalIp = '203.0.113.42',
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

/** Build a mock client whose externalIp call fails */
function createFailingMockClient(
  errorMessage: string,
): jest.Mocked<natUpnp.Client> {
  return {
    externalIp: jest.fn((cb) => cb(new Error(errorMessage), '')),
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function createTestConfig(overrides: Partial<IUpnpConfig> = {}): IUpnpConfig {
  return {
    enabled: true,
    httpPort: 3000,
    websocketPort: 3000,
    ttl: 3600,
    refreshInterval: 1800000,
    protocol: UpnpProtocol.AUTO,
    retryAttempts: 3,
    retryDelay: 5000,
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('UpnpManager', () => {
  let manager: UpnpManager;
  let config: IUpnpConfig;
  let mockClient: jest.Mocked<natUpnp.Client>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockClient = createMockClient();
    mockCreateClient.mockReturnValue(mockClient);
    jest.spyOn(UpnpService, 'sleep').mockResolvedValue(undefined);
    config = createTestConfig();
    manager = new UpnpManager(config);
  });

  afterEach(async () => {
    // Ensure shutdown to clean up signal handlers
    if (manager.isInitialized && !manager.isShuttingDown) {
      await manager.shutdown();
    }
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // ─── Initialization ───────────────────────────────────────────────────

  describe('initialize()', () => {
    it('should discover external IP and create HTTP port mapping', async () => {
      await manager.initialize();

      expect(mockClient.externalIp).toHaveBeenCalledTimes(1);
      expect(mockClient.portMapping).toHaveBeenCalledWith(
        expect.objectContaining({
          public: 3000,
          private: 3000,
          protocol: 'tcp',
          description: 'Express App HTTP',
          ttl: 3600,
        }),
        expect.any(Function),
      );
      expect(manager.isInitialized).toBe(true);
    });

    it('should not throw when UPnP initialization fails (non-fatal)', async () => {
      const failClient = createFailingMockClient('UPnP unavailable');
      mockCreateClient.mockReturnValue(failClient);
      manager = new UpnpManager(config);

      // Should not throw
      await expect(manager.initialize()).resolves.toBeUndefined();
      expect(manager.isInitialized).toBe(false);
    });

    it('should skip if already initialized', async () => {
      await manager.initialize();
      mockClient.externalIp.mockClear();

      await manager.initialize(); // second call

      // externalIp should not be called again
      expect(mockClient.externalIp).not.toHaveBeenCalled();
    });

    it('should log manual port forwarding instructions on failure', async () => {
      const failClient = createFailingMockClient('Router timeout');
      mockCreateClient.mockReturnValue(failClient);
      manager = new UpnpManager(config);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await manager.initialize();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Manual port forwarding required'),
      );
      warnSpy.mockRestore();
    });
  });

  // ─── Shutdown ─────────────────────────────────────────────────────────

  describe('shutdown()', () => {
    it('should close the UPnP service', async () => {
      await manager.initialize();

      await manager.shutdown();

      // close() on UpnpService calls removeAllMappings then client.close
      expect(mockClient.portUnmapping).toHaveBeenCalled();
      expect(manager.isShuttingDown).toBe(true);
    });

    it('should be idempotent (safe to call multiple times)', async () => {
      await manager.initialize();

      await manager.shutdown();
      const unmappingCallCount = mockClient.portUnmapping.mock.calls.length;

      await manager.shutdown();

      // No additional portUnmapping calls on second shutdown
      expect(mockClient.portUnmapping.mock.calls.length).toBe(
        unmappingCallCount,
      );
    });

    it('should not throw when service.close() fails', async () => {
      // Make portUnmapping fail during close
      mockClient.portUnmapping.mockImplementation((_opts, cb) => {
        if (cb) cb(new Error('close failed'));
      });
      await manager.initialize();

      await expect(manager.shutdown()).resolves.toBeUndefined();
    });
  });

  // ─── Refresh Timer ────────────────────────────────────────────────────

  describe('refresh timer', () => {
    it('should start a refresh timer after initialization', async () => {
      await manager.initialize();

      // After init, the service tracks the HTTP mapping in memory.
      // When refresh fires, it calls service.getMappings() (in-memory),
      // finds the tracked mapping, and re-creates it via portMapping.
      mockClient.portMapping.mockClear();

      // Advance past the refresh interval
      jest.advanceTimersByTime(config.refreshInterval);

      // Give the async refresh chain time to execute
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // Refresh should have re-created the mapping
      expect(mockClient.portMapping).toHaveBeenCalled();
    });

    it('should stop the refresh timer on shutdown', async () => {
      await manager.initialize();
      await manager.shutdown();

      mockClient.getMappings.mockClear();

      // Advance past the refresh interval — should NOT trigger refresh
      jest.advanceTimersByTime(config.refreshInterval * 2);
      await Promise.resolve();

      expect(mockClient.getMappings).not.toHaveBeenCalled();
    });
  });

  // ─── Refresh Logic ────────────────────────────────────────────────────

  describe('refresh()', () => {
    it('should recreate mapping when no active mappings found', async () => {
      // getMappings returns empty array during refresh
      mockClient.getMappings.mockImplementation((_opts, cb) => {
        if (cb) cb(null, []);
      });

      await manager.initialize();
      mockClient.portMapping.mockClear();

      // Trigger refresh
      jest.advanceTimersByTime(config.refreshInterval);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockClient.portMapping).toHaveBeenCalledWith(
        expect.objectContaining({
          public: 3000,
          protocol: 'tcp',
        }),
        expect.any(Function),
      );
    });

    it('should refresh existing mappings by re-creating them', async () => {
      // getMappings returns the existing mapping during refresh
      mockClient.getMappings.mockImplementation((_opts, cb) => {
        if (cb)
          cb(null, [
            {
              public: { host: '', port: 3000 },
              private: { host: '', port: 3000 },
              protocol: 'tcp',
              enabled: true,
            },
          ]);
      });

      await manager.initialize();
      mockClient.portMapping.mockClear();

      jest.advanceTimersByTime(config.refreshInterval);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockClient.portMapping).toHaveBeenCalledWith(
        expect.objectContaining({
          public: 3000,
          protocol: 'tcp',
        }),
        expect.any(Function),
      );
    });
  });

  // ─── Signal Handling ──────────────────────────────────────────────────

  describe('signal handling', () => {
    it('should register SIGTERM and SIGINT handlers on initialize', async () => {
      const onSpy = jest.spyOn(process, 'on');

      await manager.initialize();

      expect(onSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(onSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      onSpy.mockRestore();
    });

    it('should remove signal handlers on shutdown', async () => {
      const removeSpy = jest.spyOn(process, 'removeListener');

      await manager.initialize();
      await manager.shutdown();

      expect(removeSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      removeSpy.mockRestore();
    });
  });

  // ─── External Endpoints ───────────────────────────────────────────────

  describe('getExternalEndpoints()', () => {
    it('should return http and ws URLs when initialized', async () => {
      await manager.initialize();

      const endpoints = await manager.getExternalEndpoints();

      expect(endpoints).toEqual({
        http: 'http://203.0.113.42:3000',
        ws: 'ws://203.0.113.42:3000',
      });
    });

    it('should return null when not initialized', async () => {
      const endpoints = await manager.getExternalEndpoints();
      expect(endpoints).toBeNull();
    });

    it('should return null after shutdown', async () => {
      await manager.initialize();
      await manager.shutdown();

      const endpoints = await manager.getExternalEndpoints();
      expect(endpoints).toBeNull();
    });
  });

  // ─── State Getters ────────────────────────────────────────────────────

  describe('state getters', () => {
    it('isInitialized should be false before initialize()', () => {
      expect(manager.isInitialized).toBe(false);
    });

    it('isShuttingDown should be false before shutdown()', () => {
      expect(manager.isShuttingDown).toBe(false);
    });
  });
});

// ─── WebSocket Support ──────────────────────────────────────────────────────

describe('UpnpManager — WebSocket support', () => {
  let mockClient: jest.Mocked<natUpnp.Client>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockClient = createMockClient();
    mockCreateClient.mockReturnValue(mockClient);
    jest.spyOn(UpnpService, 'sleep').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // ─── Same-port mode ─────────────────────────────────────────────────

  describe('same-port mode (websocketPort === httpPort)', () => {
    it('should only create one mapping when ports are the same', async () => {
      const config = createTestConfig({ httpPort: 3000, websocketPort: 3000 });
      const manager = new UpnpManager(config);

      await manager.initialize();

      // Only the HTTP mapping should be created
      expect(mockClient.portMapping).toHaveBeenCalledTimes(1);
      expect(mockClient.portMapping).toHaveBeenCalledWith(
        expect.objectContaining({
          public: 3000,
          description: 'Express App HTTP',
        }),
        expect.any(Function),
      );

      await manager.shutdown();
    });

    it('should log that WebSocket uses same port', async () => {
      const config = createTestConfig({ httpPort: 3000, websocketPort: 3000 });
      const manager = new UpnpManager(config);
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      await manager.initialize();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('WebSocket using same port as HTTP'),
      );

      logSpy.mockRestore();
      await manager.shutdown();
    });
  });

  // ─── Separate-port mode ─────────────────────────────────────────────

  describe('separate-port mode (websocketPort !== httpPort)', () => {
    it('should create both HTTP and WebSocket mappings', async () => {
      const config = createTestConfig({ httpPort: 3000, websocketPort: 3001 });
      const manager = new UpnpManager(config);

      await manager.initialize();

      expect(mockClient.portMapping).toHaveBeenCalledTimes(2);
      expect(mockClient.portMapping).toHaveBeenCalledWith(
        expect.objectContaining({
          public: 3000,
          private: 3000,
          protocol: 'tcp',
          description: 'Express App HTTP',
        }),
        expect.any(Function),
      );
      expect(mockClient.portMapping).toHaveBeenCalledWith(
        expect.objectContaining({
          public: 3001,
          private: 3001,
          protocol: 'tcp',
          description: 'Express App WebSocket',
        }),
        expect.any(Function),
      );

      await manager.shutdown();
    });

    it('should log WebSocket mapping creation', async () => {
      const config = createTestConfig({ httpPort: 3000, websocketPort: 3001 });
      const manager = new UpnpManager(config);
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      await manager.initialize();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('WebSocket port mapping created'),
      );

      logSpy.mockRestore();
      await manager.shutdown();
    });

    it('should recreate both mappings during refresh when none active', async () => {
      const config = createTestConfig({ httpPort: 3000, websocketPort: 3001 });
      const manager = new UpnpManager(config);

      // getMappings returns empty during refresh
      mockClient.getMappings.mockImplementation((_opts, cb) => {
        if (cb) cb(null, []);
      });

      await manager.initialize();
      mockClient.portMapping.mockClear();

      // Trigger refresh
      jest.advanceTimersByTime(config.refreshInterval);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // Should recreate both HTTP and WebSocket mappings
      expect(mockClient.portMapping).toHaveBeenCalledWith(
        expect.objectContaining({
          public: 3000,
          description: 'Express App HTTP',
        }),
        expect.any(Function),
      );
      expect(mockClient.portMapping).toHaveBeenCalledWith(
        expect.objectContaining({
          public: 3001,
          description: 'Express App WebSocket',
        }),
        expect.any(Function),
      );

      await manager.shutdown();
    });

    it('should include WebSocket port in manual forwarding instructions on failure', async () => {
      const config = createTestConfig({ httpPort: 3000, websocketPort: 3001 });
      const failClient = createFailingMockClient('UPnP unavailable');
      mockCreateClient.mockReturnValue(failClient);
      const manager = new UpnpManager(config);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await manager.initialize();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Express App WebSocket'),
      );

      warnSpy.mockRestore();
      await manager.shutdown();
    });
  });
});

// ─── Configurable Description Prefix ────────────────────────────────────────

describe('UpnpManager — configurable description prefix', () => {
  let mockClient: jest.Mocked<natUpnp.Client>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockClient = createMockClient();
    mockCreateClient.mockReturnValue(mockClient);
    jest.spyOn(UpnpService, 'sleep').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('default prefix', () => {
    it('should use "Express App" as the default description prefix', async () => {
      const config = createTestConfig({ httpPort: 4000, websocketPort: 4001 });
      const manager = new UpnpManager(config);

      await manager.initialize();

      expect(mockClient.portMapping).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Express App HTTP' }),
        expect.any(Function),
      );
      expect(mockClient.portMapping).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Express App WebSocket' }),
        expect.any(Function),
      );

      await manager.shutdown();
    });

    it('should use "Express App" when options object has no descriptionPrefix', async () => {
      const config = createTestConfig({ httpPort: 4000, websocketPort: 4001 });
      const manager = new UpnpManager({ config });

      await manager.initialize();

      expect(mockClient.portMapping).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Express App HTTP' }),
        expect.any(Function),
      );

      await manager.shutdown();
    });
  });

  describe('custom prefix', () => {
    it('should use the provided descriptionPrefix for HTTP mappings', async () => {
      const config = createTestConfig({ httpPort: 5000, websocketPort: 5000 });
      const manager = new UpnpManager({
        config,
        descriptionPrefix: 'My Custom App',
      });

      await manager.initialize();

      expect(mockClient.portMapping).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'My Custom App HTTP' }),
        expect.any(Function),
      );

      await manager.shutdown();
    });

    it('should use the provided descriptionPrefix for WebSocket mappings', async () => {
      const config = createTestConfig({ httpPort: 5000, websocketPort: 5001 });
      const manager = new UpnpManager({
        config,
        descriptionPrefix: 'BrightChain Node',
      });

      await manager.initialize();

      expect(mockClient.portMapping).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'BrightChain Node HTTP' }),
        expect.any(Function),
      );
      expect(mockClient.portMapping).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'BrightChain Node WebSocket' }),
        expect.any(Function),
      );

      await manager.shutdown();
    });

    it('should use custom prefix in manual forwarding instructions on failure', async () => {
      const config = createTestConfig({ httpPort: 5000, websocketPort: 5001 });
      const failClient = createFailingMockClient('UPnP unavailable');
      mockCreateClient.mockReturnValue(failClient);
      const manager = new UpnpManager({
        config,
        descriptionPrefix: 'TestApp',
      });
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await manager.initialize();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('TestApp HTTP'),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('TestApp WebSocket'),
      );

      warnSpy.mockRestore();
      await manager.shutdown();
    });
  });

  describe('constructor overloads', () => {
    it('should accept IUpnpConfig directly (backward compatible)', async () => {
      const config = createTestConfig();
      const manager = new UpnpManager(config);

      await manager.initialize();

      expect(mockClient.portMapping).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Express App HTTP' }),
        expect.any(Function),
      );

      await manager.shutdown();
    });

    it('should accept UpnpManagerOptions with config and prefix', async () => {
      const config = createTestConfig({ httpPort: 8080, websocketPort: 8081 });
      const manager = new UpnpManager({
        config,
        descriptionPrefix: 'Widget Server',
      });

      await manager.initialize();

      expect(mockClient.portMapping).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Widget Server HTTP' }),
        expect.any(Function),
      );
      expect(mockClient.portMapping).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Widget Server WebSocket' }),
        expect.any(Function),
      );

      await manager.shutdown();
    });
  });
});
