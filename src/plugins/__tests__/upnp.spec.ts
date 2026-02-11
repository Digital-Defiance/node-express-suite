/**
 * Unit tests for UpnpPlugin.
 *
 * Tests the plugin lifecycle: init with enabled/disabled config,
 * stop delegation to UpnpManager.shutdown, and getManager accessor.
 *
 * Requirements: 8.4, 8.5
 */

import * as natUpnp from 'nat-upnp';

import { UpnpService } from '../../services/upnp';
import { UpnpManager } from '../../services/upnp-manager';
import { IApplication } from '../../interfaces/application';
import { UpnpPlugin } from '../upnp';

// ─── Mock nat-upnp ─────────────────────────────────────────────────────────

jest.mock('nat-upnp');

const mockCreateClient = natUpnp.createClient as jest.MockedFunction<
  typeof natUpnp.createClient
>;

/** Build a fresh mock client that succeeds on all operations */
function createMockClient(
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

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('UpnpPlugin', () => {
  let mockClient: jest.Mocked<natUpnp.Client>;
  const savedEnv = process.env;

  beforeEach(() => {
    mockClient = createMockClient();
    mockCreateClient.mockReturnValue(mockClient);
    jest.spyOn(UpnpService, 'sleep').mockResolvedValue(undefined);
    jest.useFakeTimers();
    // Clear UPNP_ env vars for predictable defaults
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

  // ─── Plugin identity ──────────────────────────────────────────────────

  describe('plugin identity', () => {
    it('has name "upnp"', () => {
      const plugin = new UpnpPlugin();
      expect(plugin.name).toBe('upnp');
    });

    it('has version "1.0.0"', () => {
      const plugin = new UpnpPlugin();
      expect(plugin.version).toBe('1.0.0');
    });
  });

  // ─── getManager before init ───────────────────────────────────────────

  describe('getManager before init', () => {
    it('returns null before init is called', () => {
      const plugin = new UpnpPlugin();
      expect(plugin.getManager()).toBeNull();
    });

    it('returns null when constructed with options but not initialized', () => {
      const plugin = new UpnpPlugin({
        config: { enabled: true, httpPort: 8080 },
        descriptionPrefix: 'Test App',
      });
      expect(plugin.getManager()).toBeNull();
    });
  });

  // ─── init with disabled config ────────────────────────────────────────

  describe('init with disabled config', () => {
    it('skips initialization when enabled is false via config override', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const plugin = new UpnpPlugin({ config: { enabled: false } });
      const mockApp = createMockApp();

      await plugin.init(mockApp);

      expect(plugin.getManager()).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[UPnP Plugin] UPnP is disabled, skipping initialization',
      );
      // No nat-upnp calls should have been made
      expect(mockClient.externalIp).not.toHaveBeenCalled();
      expect(mockClient.portMapping).not.toHaveBeenCalled();
    });

    it('skips initialization when UPNP_ENABLED env var is not set (defaults to false)', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const plugin = new UpnpPlugin();
      const mockApp = createMockApp();

      await plugin.init(mockApp);

      expect(plugin.getManager()).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[UPnP Plugin] UPnP is disabled, skipping initialization',
      );
    });

    it('skips initialization when UPNP_ENABLED env var is "false"', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      process.env['UPNP_ENABLED'] = 'false';
      const plugin = new UpnpPlugin();
      const mockApp = createMockApp();

      await plugin.init(mockApp);

      expect(plugin.getManager()).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[UPnP Plugin] UPnP is disabled, skipping initialization',
      );
    });
  });

  // ─── init with enabled config ─────────────────────────────────────────

  describe('init with enabled config', () => {
    it('creates a UpnpManager when enabled via config override', async () => {
      jest.spyOn(console, 'log').mockImplementation();
      const plugin = new UpnpPlugin({
        config: { enabled: true, httpPort: 8080, websocketPort: 8080 },
      });
      const mockApp = createMockApp();

      await plugin.init(mockApp);

      expect(plugin.getManager()).not.toBeNull();
      expect(plugin.getManager()).toBeInstanceOf(UpnpManager);

      await plugin.stop();
      jest.runAllTimers();
    });

    it('creates a UpnpManager when UPNP_ENABLED env var is "true"', async () => {
      jest.spyOn(console, 'log').mockImplementation();
      process.env['UPNP_ENABLED'] = 'true';
      const plugin = new UpnpPlugin();
      const mockApp = createMockApp();

      await plugin.init(mockApp);

      expect(plugin.getManager()).not.toBeNull();
      expect(plugin.getManager()).toBeInstanceOf(UpnpManager);

      await plugin.stop();
      jest.runAllTimers();
    });

    it('calls nat-upnp to discover external IP and create port mappings', async () => {
      jest.spyOn(console, 'log').mockImplementation();
      const plugin = new UpnpPlugin({
        config: { enabled: true, httpPort: 4000, websocketPort: 4000 },
      });
      const mockApp = createMockApp();

      await plugin.init(mockApp);

      expect(mockClient.externalIp).toHaveBeenCalled();
      expect(mockClient.portMapping).toHaveBeenCalled();

      // Verify the HTTP mapping used the configured port
      const mappingOpts = mockClient.portMapping.mock.calls[0][0] as {
        public: number;
        private: number;
      };
      expect(mappingOpts.public).toBe(4000);
      expect(mappingOpts.private).toBe(4000);

      await plugin.stop();
      jest.runAllTimers();
    });

    it('creates separate WebSocket mapping when ports differ', async () => {
      jest.spyOn(console, 'log').mockImplementation();
      const plugin = new UpnpPlugin({
        config: { enabled: true, httpPort: 3000, websocketPort: 3001 },
      });
      const mockApp = createMockApp();

      await plugin.init(mockApp);

      // Should have 2 portMapping calls: HTTP + WebSocket
      expect(mockClient.portMapping).toHaveBeenCalledTimes(2);

      const httpOpts = mockClient.portMapping.mock.calls[0][0] as {
        public: number;
      };
      const wsOpts = mockClient.portMapping.mock.calls[1][0] as {
        public: number;
      };
      expect(httpOpts.public).toBe(3000);
      expect(wsOpts.public).toBe(3001);

      await plugin.stop();
      jest.runAllTimers();
    });

    it('passes descriptionPrefix to the UpnpManager', async () => {
      jest.spyOn(console, 'log').mockImplementation();
      const plugin = new UpnpPlugin({
        config: { enabled: true, httpPort: 5000, websocketPort: 5000 },
        descriptionPrefix: 'My Custom App',
      });
      const mockApp = createMockApp();

      await plugin.init(mockApp);

      // Verify the description in the port mapping call
      const mappingOpts = mockClient.portMapping.mock.calls[0][0] as {
        description: string;
      };
      expect(mappingOpts.description).toBe('My Custom App HTTP');

      await plugin.stop();
      jest.runAllTimers();
    });

    it('uses default description prefix when none provided', async () => {
      jest.spyOn(console, 'log').mockImplementation();
      const plugin = new UpnpPlugin({
        config: { enabled: true, httpPort: 5000, websocketPort: 5000 },
      });
      const mockApp = createMockApp();

      await plugin.init(mockApp);

      const mappingOpts = mockClient.portMapping.mock.calls[0][0] as {
        description: string;
      };
      expect(mappingOpts.description).toBe('Express App HTTP');

      await plugin.stop();
      jest.runAllTimers();
    });
  });

  // ─── stop delegates to manager shutdown ───────────────────────────────

  describe('stop', () => {
    it('delegates to manager.shutdown when initialized', async () => {
      jest.spyOn(console, 'log').mockImplementation();
      const plugin = new UpnpPlugin({
        config: { enabled: true, httpPort: 3000, websocketPort: 3000 },
      });
      const mockApp = createMockApp();

      await plugin.init(mockApp);

      const manager = plugin.getManager();
      expect(manager).not.toBeNull();

      const shutdownSpy = jest.spyOn(manager!, 'shutdown');

      await plugin.stop();
      jest.runAllTimers();

      expect(shutdownSpy).toHaveBeenCalledTimes(1);
    });

    it('sets manager to null after stop', async () => {
      jest.spyOn(console, 'log').mockImplementation();
      const plugin = new UpnpPlugin({
        config: { enabled: true, httpPort: 3000, websocketPort: 3000 },
      });
      const mockApp = createMockApp();

      await plugin.init(mockApp);
      expect(plugin.getManager()).not.toBeNull();

      await plugin.stop();
      jest.runAllTimers();

      expect(plugin.getManager()).toBeNull();
    });

    it('is a no-op when plugin was never initialized', async () => {
      const plugin = new UpnpPlugin();

      // Should not throw
      await expect(plugin.stop()).resolves.toBeUndefined();
    });

    it('is a no-op when UPnP was disabled during init', async () => {
      jest.spyOn(console, 'log').mockImplementation();
      const plugin = new UpnpPlugin({ config: { enabled: false } });
      const mockApp = createMockApp();

      await plugin.init(mockApp);

      // Should not throw
      await expect(plugin.stop()).resolves.toBeUndefined();
      expect(plugin.getManager()).toBeNull();
    });
  });

  // ─── init failure handling ────────────────────────────────────────────

  describe('init failure handling', () => {
    it('does not throw when UPnP initialization fails (graceful degradation)', async () => {
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'warn').mockImplementation();

      // Use a client that fails on externalIp
      const failingClient = {
        externalIp: jest.fn((cb) => cb(new Error('No UPnP gateway found'), '')),
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
      mockCreateClient.mockReturnValue(failingClient);

      const plugin = new UpnpPlugin({
        config: {
          enabled: true,
          httpPort: 3000,
          websocketPort: 3000,
          retryAttempts: 1,
        },
      });
      const mockApp = createMockApp();

      // UpnpManager.initialize catches errors and logs a warning
      // The plugin should not throw
      await expect(plugin.init(mockApp)).resolves.toBeUndefined();

      // Manager was created but initialization failed gracefully
      expect(plugin.getManager()).not.toBeNull();

      await plugin.stop();
      jest.runAllTimers();
    });
  });
});
