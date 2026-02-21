/**
 * Property-based tests for Application + IDatabasePlugin integration.
 *
 * Feature: plugin-migration-cleanup
 * - Property 6: Application.start with plugin calls connect then init in order
 * - Property 7: Application.stop with plugin calls plugin stop
 * - Property 8: Application.useDatabasePlugin registers in both places
 * - Property 9: Application.start wires auth provider from plugin
 *
 * Validates: Requirements 7.1, 7.3, 7.4, 7.5
 *
 * @module tests/application-plugin-integration.property
 */

import * as fc from 'fast-check';
import { registerNodeRuntimeConfiguration } from '@digitaldefiance/node-ecies-lib';
import { Application } from '../src/application';
import { LocalhostConstants } from '../src/constants';
import { Environment } from '../src/environment';
import type { IApplication, IConstants } from '../src/interfaces';
import type { IAuthenticationProvider } from '../src/interfaces/authentication-provider';
import type { IDatabasePlugin } from '../src/plugins/database-plugin';
import { AppRouter } from '../src/routers/app';
import { BaseRouter } from '../src/routers/base';

/**
 * Concrete subclass of BaseRouter for testing purposes.
 */
class TestRouter extends BaseRouter {
  constructor(application: IApplication) {
    super(application);
  }
}

/** Minimal environment setup shared across tests. */
function setupEnv(): void {
  process.env.JWT_SECRET = 'a'.repeat(64);
  process.env.MNEMONIC_HMAC_SECRET = 'a'.repeat(64);
  process.env.MNEMONIC_ENCRYPTION_KEY = 'b'.repeat(64);
  process.env.API_DIST_DIR = '/tmp/test-api-dist';
  process.env.REACT_DIST_DIR = '/tmp/test-react-dist';
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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

// ─── Test Suite ───

describe('Application + IDatabasePlugin property-based tests', () => {
  beforeAll(() => {
    registerNodeRuntimeConfiguration('default-config', {});
  });

  beforeEach(() => {
    setupEnv();
    delete process.env.DEV_DATABASE;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── Property 6: Application.start with plugin calls connect then init in order ───

  describe('Feature: plugin-migration-cleanup, Property 6: Application.start with plugin calls connect then init in order', () => {
    /**
     * **Validates: Requirements 7.1**
     *
     * For any Application instance with a registered database plugin,
     * calling start() should invoke the plugin's connect() before init(),
     * and both should be called exactly once.
     */

    it('start() calls connect before init, each exactly once', async () => {
      await fc.assert(
        fc.asyncProperty(fc.boolean(), async (_seed: boolean) => {
          const env = new Environment(undefined, true);
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
          expect(plugin.connect).toHaveBeenCalledTimes(1);
          expect(plugin.init).toHaveBeenCalledTimes(1);

          // Cleanup: stop the app to reset state
          await app.stop();
          listenSpy.mockRestore();
        }),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 7: Application.stop with plugin calls plugin stop ───

  describe('Feature: plugin-migration-cleanup, Property 7: Application.stop with plugin calls plugin stop', () => {
    /**
     * **Validates: Requirements 7.3**
     *
     * For any Application instance with a registered database plugin,
     * calling stop() should invoke the plugin manager's stopAll()
     * which calls the plugin's stop() method.
     */

    it('stop() invokes plugin.stop() via PluginManager.stopAll()', async () => {
      await fc.assert(
        fc.asyncProperty(fc.boolean(), async (_seed: boolean) => {
          const env = new Environment(undefined, true);
          const { app, listenSpy } = createTestApplication(env);
          const plugin = createMockDatabasePlugin();

          app.useDatabasePlugin(plugin);
          await app.start();

          // Reset to track only stop calls
          (plugin.stop as jest.Mock).mockClear();

          await app.stop();

          expect(plugin.stop).toHaveBeenCalledTimes(1);

          listenSpy.mockRestore();
        }),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 8: Application.useDatabasePlugin registers in both places ───

  describe('Feature: plugin-migration-cleanup, Property 8: Application.useDatabasePlugin registers in both places', () => {
    /**
     * **Validates: Requirements 7.4**
     *
     * For any IDatabasePlugin passed to useDatabasePlugin(), the plugin
     * should be stored as _databasePlugin AND registered with the
     * PluginManager (retrievable via plugins.has(plugin.name)).
     */

    it('plugin is stored as databasePlugin and registered with PluginManager for any name', () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => s.trim().length > 0),
          (pluginName: string) => {
            const env = new Environment(undefined, true);
            const { app } = createTestApplication(env);
            const plugin = createMockDatabasePlugin({ name: pluginName });

            app.useDatabasePlugin(plugin);

            // Stored as databasePlugin
            expect(app.databasePlugin).toBe(plugin);

            // Registered with PluginManager
            expect(app.plugins.has(pluginName)).toBe(true);
            expect(app.plugins.get(pluginName)).toBe(plugin);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 9: Application.start wires auth provider from plugin ───

  describe('Feature: plugin-migration-cleanup, Property 9: Application.start wires auth provider from plugin', () => {
    /**
     * **Validates: Requirements 7.5**
     *
     * For any Application with a database plugin that provides an
     * authentication provider, after start() completes, the application's
     * authProvider should equal the plugin's authenticationProvider.
     */

    it('authProvider is wired from plugin when plugin has auth provider', async () => {
      await fc.assert(
        fc.asyncProperty(fc.boolean(), async (hasAuthProvider: boolean) => {
          const env = new Environment(undefined, true);
          const { app, listenSpy } = createTestApplication(env);
          const plugin = createMockDatabasePlugin({
            withAuthProvider: hasAuthProvider,
          });

          app.useDatabasePlugin(plugin);
          await app.start();

          if (hasAuthProvider) {
            expect(app.authProvider).toBe(plugin.authenticationProvider);
          } else {
            expect(app.authProvider).toBeUndefined();
          }

          await app.stop();
          listenSpy.mockRestore();
        }),
        { numRuns: 100 },
      );
    });
  });
});
