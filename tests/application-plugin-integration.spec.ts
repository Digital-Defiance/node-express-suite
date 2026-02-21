/**
 * Integration tests for Application with IDatabasePlugin.
 * Verifies plugin wiring: start/stop lifecycle, useDatabasePlugin registration,
 * and auth provider propagation.
 *
 * @module tests/application-plugin-integration
 */

import { registerNodeRuntimeConfiguration } from '@digitaldefiance/node-ecies-lib';
import { Application } from '../src/application';
import { BaseApplication } from '../src/base-application';
import { LocalhostConstants } from '../src/constants';
import { Environment } from '../src/environment';
import type { IApplication, IConstants } from '../src/interfaces';
import type { IAuthenticationProvider } from '../src/interfaces/authentication-provider';
import type { IDatabasePlugin } from '../src/plugins/database-plugin';
import { AppRouter } from '../src/routers/app';
import { BaseRouter } from '../src/routers/base';

/**
 * Concrete subclass of BaseRouter for testing purposes.
 * BaseRouter has a protected constructor, so we expose it here.
 */
class TestRouter extends BaseRouter {
  constructor(application: IApplication) {
    super(application);
  }
}

// Minimal environment setup shared across tests
function setupEnv(): void {
  process.env.JWT_SECRET = 'a'.repeat(64);
  process.env.MNEMONIC_HMAC_SECRET = 'a'.repeat(64);
  process.env.MNEMONIC_ENCRYPTION_KEY = 'b'.repeat(64);
  process.env.API_DIST_DIR = '/tmp/test-api-dist';
  process.env.REACT_DIST_DIR = '/tmp/test-react-dist';
  const fs = require('fs');
  if (!fs.existsSync('/tmp/test-api-dist')) {
    fs.mkdirSync('/tmp/test-api-dist', { recursive: true });
  }
  if (!fs.existsSync('/tmp/test-react-dist')) {
    fs.mkdirSync('/tmp/test-react-dist', { recursive: true });
  }
}

/**
 * Creates a mock IDatabasePlugin with jest.fn() stubs.
 * Optionally provides an authenticationProvider.
 */
function createMockDatabasePlugin(
  options: {
    withAuthProvider?: boolean;
    name?: string;
  } = {},
): jest.Mocked<IDatabasePlugin<Buffer>> {
  const authProvider = options.withAuthProvider
    ? ({
        findUserById: jest.fn(),
        buildRequestUserDTO: jest.fn(),
        verifyToken: jest.fn(),
      } as jest.Mocked<IAuthenticationProvider<Buffer>>)
    : undefined;

  return {
    name: options.name ?? 'mock-database',
    version: '1.0.0',
    database: {
      collection: jest.fn(),
      startSession: jest.fn(),
      withTransaction: jest.fn(),
      listCollections: jest.fn().mockReturnValue([]),
      dropCollection: jest.fn().mockResolvedValue(false),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(false),
    },
    authenticationProvider: authProvider,
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(false),
    init: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Creates an Application instance with mocked Express listen to avoid real HTTP servers.
 * Returns the application and a spy on expressApp.listen.
 */
function createTestApplication(env: Environment): {
  app: Application<Buffer, Environment, IConstants, AppRouter>;
  listenSpy: jest.SpyInstance;
} {
  const apiRouterFactory = jest.fn((a: IApplication) => new TestRouter(a));
  const appRouterFactory = (apiRouter: BaseRouter) => {
    const router = new AppRouter(apiRouter);
    jest.spyOn(router, 'init').mockImplementation(() => {});
    return router;
  };

  const app = new Application(
    env,
    apiRouterFactory,
    {
      corsWhitelist: [],
      csp: {
        defaultSrc: [],
        imgSrc: [],
        connectSrc: [],
        scriptSrc: [],
        styleSrc: [],
        fontSrc: [],
        frameSrc: [],
      },
    },
    LocalhostConstants,
    appRouterFactory,
  );

  // Mock express listen to avoid real HTTP server startup.
  // We need to use a function cast to match the overloaded listen signature.
  const mockListenImpl = (
    _port: number,
    _host: string,
    callback: () => void,
  ) => {
    callback();
    return {
      close: jest.fn((cb: (err?: Error) => void) => cb()),
      closeAllConnections: jest.fn(),
    };
  };
  const listenSpy = jest
    .spyOn(app.expressApp, 'listen')
    .mockImplementation(mockListenImpl as never);

  return { app, listenSpy };
}

/**
 * Helper to access private/internal fields on Application for test assertions.
 * Uses Reflect to avoid unsafe casts.
 */
function getPrivateField<T>(obj: object, field: string): T {
  return Reflect.get(obj, field) as T;
}

function setPrivateField(obj: object, field: string, value: unknown): void {
  Reflect.set(obj, field, value);
}

describe('Application + IDatabasePlugin integration', () => {
  let env: Environment;

  beforeAll(() => {
    registerNodeRuntimeConfiguration('default-config', {});
  });

  beforeEach(() => {
    setupEnv();
    delete process.env.DEV_DATABASE;
    env = new Environment(undefined, true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Req 7.1: start() with plugin calls connect then init in order', () => {
    it('should call plugin.connect() before plugins.initAll()', async () => {
      const { app, listenSpy } = createTestApplication(env);
      const plugin = createMockDatabasePlugin();

      const callOrder: string[] = [];
      plugin.connect.mockImplementation(async () => {
        callOrder.push('connect');
      });
      plugin.init.mockImplementation(async () => {
        callOrder.push('init');
      });

      app.useDatabasePlugin(plugin);
      await app.start();

      expect(callOrder).toEqual(['connect', 'init']);

      listenSpy.mockRestore();
    });

    it('should call connect exactly once', async () => {
      const { app, listenSpy } = createTestApplication(env);
      const plugin = createMockDatabasePlugin();

      app.useDatabasePlugin(plugin);
      await app.start();

      expect(plugin.connect).toHaveBeenCalledTimes(1);

      listenSpy.mockRestore();
    });

    it('should call init exactly once (via PluginManager.initAll)', async () => {
      const { app, listenSpy } = createTestApplication(env);
      const plugin = createMockDatabasePlugin();

      app.useDatabasePlugin(plugin);
      await app.start();

      expect(plugin.init).toHaveBeenCalledTimes(1);

      listenSpy.mockRestore();
    });

    it('should pass the application instance to init', async () => {
      const { app, listenSpy } = createTestApplication(env);
      const plugin = createMockDatabasePlugin();

      app.useDatabasePlugin(plugin);
      await app.start();

      expect(plugin.init).toHaveBeenCalledWith(app);

      listenSpy.mockRestore();
    });

    it('should set ready to true after successful start', async () => {
      const { app, listenSpy } = createTestApplication(env);
      const plugin = createMockDatabasePlugin();

      app.useDatabasePlugin(plugin);
      await app.start();

      expect(app.ready).toBe(true);

      listenSpy.mockRestore();
    });

    it('should propagate connect errors in test environment', async () => {
      const { app, listenSpy } = createTestApplication(env);
      const plugin = createMockDatabasePlugin();
      plugin.connect.mockRejectedValue(new Error('Connection refused'));

      app.useDatabasePlugin(plugin);

      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      await expect(app.start()).rejects.toThrow('Connection refused');

      process.env.NODE_ENV = originalEnv;
      listenSpy.mockRestore();
    });
  });

  describe('Req 7.2: start() without plugin uses base IDatabase path', () => {
    it('should call super.start() when no database plugin is registered', async () => {
      const { app, listenSpy } = createTestApplication(env);

      // Spy on BaseApplication.prototype.start to verify delegation
      const baseSpy = jest
        .spyOn(BaseApplication.prototype, 'start')
        .mockResolvedValue(undefined);

      await app.start();

      expect(baseSpy).toHaveBeenCalled();
      expect(app.ready).toBe(true);

      baseSpy.mockRestore();
      listenSpy.mockRestore();
    });

    it('should not call any plugin methods when no plugin is registered', async () => {
      const { app, listenSpy } = createTestApplication(env);

      // Spy on BaseApplication.prototype.start to avoid real DB connection
      const baseSpy = jest
        .spyOn(BaseApplication.prototype, 'start')
        .mockResolvedValue(undefined);

      await app.start();

      // No plugin registered, so databasePlugin should be null
      expect(app.databasePlugin).toBeNull();

      baseSpy.mockRestore();
      listenSpy.mockRestore();
    });
  });

  describe('Req 7.3: stop() with plugin calls plugin stop', () => {
    it('should call plugins.stopAll() which invokes plugin.stop()', async () => {
      const { app, listenSpy } = createTestApplication(env);
      const plugin = createMockDatabasePlugin();

      app.useDatabasePlugin(plugin);
      await app.start();

      await app.stop();

      expect(plugin.stop).toHaveBeenCalled();

      listenSpy.mockRestore();
    });

    it('should shut down the HTTP server during stop', async () => {
      const { app, listenSpy } = createTestApplication(env);
      const plugin = createMockDatabasePlugin();

      app.useDatabasePlugin(plugin);
      await app.start();

      // Grab the server reference before stop() nulls it
      const server = getPrivateField<{
        close: jest.Mock;
        closeAllConnections: jest.Mock;
      } | null>(app, 'server');

      await app.stop();

      expect(server).not.toBeNull();
      expect(server!.close).toHaveBeenCalled();
      expect(server!.closeAllConnections).toHaveBeenCalled();

      listenSpy.mockRestore();
    });

    it('should set ready to false after stop', async () => {
      const { app, listenSpy } = createTestApplication(env);
      const plugin = createMockDatabasePlugin();

      app.useDatabasePlugin(plugin);
      await app.start();

      expect(app.ready).toBe(true);

      await app.stop();

      expect(app.ready).toBe(false);

      listenSpy.mockRestore();
    });

    it('should handle stop when server is null', async () => {
      const { app, listenSpy } = createTestApplication(env);
      const plugin = createMockDatabasePlugin();

      app.useDatabasePlugin(plugin);

      // Manually set state as if started but server is null
      setPrivateField(app, 'server', null);
      setPrivateField(app, '_ready', true);

      await expect(app.stop()).resolves.not.toThrow();
      expect(plugin.stop).toHaveBeenCalled();
      expect(app.ready).toBe(false);

      listenSpy.mockRestore();
    });
  });

  describe('Req 7.4: useDatabasePlugin() registers in both places', () => {
    it('should set _databasePlugin field', () => {
      const { app } = createTestApplication(env);
      const plugin = createMockDatabasePlugin();

      app.useDatabasePlugin(plugin);

      expect(app.databasePlugin).toBe(plugin);
    });

    it('should register plugin with PluginManager', () => {
      const { app } = createTestApplication(env);
      const plugin = createMockDatabasePlugin();

      app.useDatabasePlugin(plugin);

      expect(app.plugins.has(plugin.name)).toBe(true);
    });

    it('should make plugin retrievable via PluginManager.get()', () => {
      const { app } = createTestApplication(env);
      const plugin = createMockDatabasePlugin();

      app.useDatabasePlugin(plugin);

      expect(app.plugins.get(plugin.name)).toBe(plugin);
    });

    it('should return the application for chaining', () => {
      const { app } = createTestApplication(env);
      const plugin = createMockDatabasePlugin();

      const result = app.useDatabasePlugin(plugin);

      expect(result).toBe(app);
    });
  });

  describe('Req 7.5: start() with plugin wires auth provider', () => {
    it('should set authProvider from plugin when app has no prior auth provider', async () => {
      const { app, listenSpy } = createTestApplication(env);
      const plugin = createMockDatabasePlugin({ withAuthProvider: true });

      app.useDatabasePlugin(plugin);
      await app.start();

      expect(app.authProvider).toBe(plugin.authenticationProvider);

      listenSpy.mockRestore();
    });

    it('should not set authProvider when plugin has no auth provider', async () => {
      const { app, listenSpy } = createTestApplication(env);
      const plugin = createMockDatabasePlugin({ withAuthProvider: false });

      app.useDatabasePlugin(plugin);
      await app.start();

      expect(app.authProvider).toBeUndefined();

      listenSpy.mockRestore();
    });

    it('should not overwrite existing authProvider', async () => {
      const { app, listenSpy } = createTestApplication(env);
      const existingProvider = {
        findUserById: jest.fn(),
        buildRequestUserDTO: jest.fn(),
        verifyToken: jest.fn(),
      } as jest.Mocked<IAuthenticationProvider<Buffer>>;

      app.authProvider = existingProvider;

      const plugin = createMockDatabasePlugin({ withAuthProvider: true });
      app.useDatabasePlugin(plugin);
      await app.start();

      // Existing provider should remain
      expect(app.authProvider).toBe(existingProvider);

      listenSpy.mockRestore();
    });
  });
});
