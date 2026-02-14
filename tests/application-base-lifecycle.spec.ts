/**
 * @fileoverview Unit tests for BaseApplication lifecycle hook integration.
 * Tests Properties 1-6, 9-11 from the design document.
 *
 * Feature: restore-db-init-lifecycle
 */
import {
  withConsoleMocks,
  spyContains,
} from '@digitaldefiance/express-suite-test-utils';
import type {
  IDatabase,
  IDatabaseLifecycleHooks,
} from '@brightchain/brightchain-lib';
import { TranslatableSuiteError } from '@digitaldefiance/suite-core-lib';
import { BaseApplication } from '../src/application-base';
import { Environment } from '../src/environment';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal IDatabase mock that records calls for ordering verification. */
function createMockDatabase(callLog: string[]): IDatabase {
  return {
    collection: jest.fn(),
    startSession: jest.fn(),
    withTransaction: jest.fn(),
    listCollections: jest.fn().mockReturnValue([]),
    dropCollection: jest.fn(),
    connect: jest.fn(async () => {
      callLog.push('connect');
    }),
    disconnect: jest.fn(async () => {
      callLog.push('disconnect');
    }),
    isConnected: jest.fn().mockReturnValue(true),
  } as unknown as IDatabase;
}

/** Create an Environment with devDatabase enabled. */
function createDevEnv(): Environment<string> {
  process.env.JWT_SECRET = 'a'.repeat(64);
  process.env.MNEMONIC_HMAC_SECRET = 'a'.repeat(64);
  process.env.MNEMONIC_ENCRYPTION_KEY = 'b'.repeat(64);
  process.env.API_DIST_DIR = '/tmp/test-api-dist';
  process.env.REACT_DIST_DIR = '/tmp/test-react-dist';
  process.env.DEV_DATABASE = 'true';
  const fs = require('fs');
  if (!fs.existsSync('/tmp/test-api-dist'))
    fs.mkdirSync('/tmp/test-api-dist', { recursive: true });
  if (!fs.existsSync('/tmp/test-react-dist'))
    fs.mkdirSync('/tmp/test-react-dist', { recursive: true });
  return new Environment<string>(undefined, true);
}

/** Create an Environment without devDatabase. */
function createProdEnv(): Environment<string> {
  process.env.JWT_SECRET = 'a'.repeat(64);
  process.env.MNEMONIC_HMAC_SECRET = 'a'.repeat(64);
  process.env.MNEMONIC_ENCRYPTION_KEY = 'b'.repeat(64);
  process.env.API_DIST_DIR = '/tmp/test-api-dist';
  process.env.REACT_DIST_DIR = '/tmp/test-react-dist';
  delete process.env.DEV_DATABASE;
  return new Environment<string>(undefined, true);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

/** Test subclass that exposes protected fields for verification. */
class TestableBaseApplication extends BaseApplication<
  string,
  Record<string, never>,
  unknown
> {
  get lifecycleHooks() {
    return this._lifecycleHooks;
  }
  get devStoreProvisioned() {
    return this._devStoreProvisioned;
  }
}

describe('BaseApplication lifecycle hooks (IDatabase path)', () => {
  afterEach(() => {
    delete process.env.DEV_DATABASE;
  });

  /**
   * Feature: restore-db-init-lifecycle, Property 1: Constructor stores lifecycle hooks
   * Validates: Requirements 2.1
   */
  describe('Property 1: Constructor stores lifecycle hooks', () => {
    it('should store lifecycle hooks when IDatabase is provided', () => {
      const callLog: string[] = [];
      const db = createMockDatabase(callLog);
      const env = createProdEnv();
      const hooks: IDatabaseLifecycleHooks = {
        validateUri: jest.fn(),
      };

      const app = new TestableBaseApplication(env, db, undefined, hooks);

      // Access via test subclass getter
      expect(app.lifecycleHooks).toBe(hooks);
    });

    it('should not store lifecycle hooks when IDocumentStore is provided', () => {
      // IDocumentStore path: hooks should be ignored
      const env = createProdEnv();
      // Minimal IDocumentStore mock (not IDatabase — no 'startSession')
      const store = {
        connect: jest.fn(),
        disconnect: jest.fn(),
        schemaMap: undefined,
        devDatabase: undefined,
      };
      const hooks: IDatabaseLifecycleHooks = { validateUri: jest.fn() };

      const app = new TestableBaseApplication(
        env,
        store as never,
        undefined,
        hooks,
      );

      expect(app.lifecycleHooks).toBeUndefined();
    });
  });

  /**
   * Feature: restore-db-init-lifecycle, Property 2: URI validation occurs before connect on IDatabase path
   * Validates: Requirements 2.3
   */
  describe('Property 2: URI validation occurs before connect', () => {
    it('should call validateUri before connect', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const callLog: string[] = [];
        const db = createMockDatabase(callLog);
        const env = createProdEnv();
        const hooks: IDatabaseLifecycleHooks = {
          validateUri: jest.fn(() => {
            callLog.push('validateUri');
          }),
        };

        const app = new TestableBaseApplication(env, db, undefined, hooks);
        await app.start('mongodb://example.com:27017/test');

        expect(callLog.indexOf('validateUri')).toBeLessThan(
          callLog.indexOf('connect'),
        );
        expect(hooks.validateUri).toHaveBeenCalledWith(
          'mongodb://example.com:27017/test',
        );
      });
    });
  });

  /**
   * Feature: restore-db-init-lifecycle, Property 3: Dev store setup provisions URI and forwards to connect
   * Validates: Requirements 2.4, 6.1, 6.2
   */
  describe('Property 3: Dev store setup provisions URI and forwards to connect', () => {
    it('should call setupDevStore and pass returned URI to connect', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const callLog: string[] = [];
        const db = createMockDatabase(callLog);
        const env = createDevEnv();
        const devUri = 'mongodb://inmemory:27017/devdb';
        const hooks: IDatabaseLifecycleHooks = {
          setupDevStore: jest.fn(async () => {
            callLog.push('setupDevStore');
            return devUri;
          }),
          validateUri: jest.fn(() => {
            callLog.push('validateUri');
          }),
        };

        const app = new TestableBaseApplication(env, db, undefined, hooks);
        await app.start();

        // setupDevStore called before connect
        expect(callLog.indexOf('setupDevStore')).toBeLessThan(
          callLog.indexOf('connect'),
        );
        // The URI from setupDevStore was passed to connect
        expect(db.connect).toHaveBeenCalledWith(devUri);
        // devStoreProvisioned flag set
        expect(app.devStoreProvisioned).toBe(true);
      });
    });
  });

  /**
   * Feature: restore-db-init-lifecycle, Property 4: Database initialization invoked after connect in dev mode
   * Validates: Requirements 3.1
   */
  describe('Property 4: Database initialization invoked after connect in dev mode', () => {
    it('should call initializeDatabase after connect when devDatabase is truthy', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const callLog: string[] = [];
        const db = createMockDatabase(callLog);
        const env = createDevEnv();
        const hooks: IDatabaseLifecycleHooks = {
          validateUri: jest.fn(),
          initializeDatabase: jest.fn(async () => {
            callLog.push('initializeDatabase');
            return { success: true, data: { seeded: true } };
          }),
        };

        const app = new TestableBaseApplication(env, db, undefined, hooks);
        await app.start('mongodb://example.com:27017/test');

        expect(callLog.indexOf('connect')).toBeLessThan(
          callLog.indexOf('initializeDatabase'),
        );
      });
    });

    it('should NOT call initializeDatabase when devDatabase is falsy', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const callLog: string[] = [];
        const db = createMockDatabase(callLog);
        const env = createProdEnv();
        const initFn = jest.fn(async () => ({
          success: true,
          data: {},
        }));
        const hooks: IDatabaseLifecycleHooks = {
          validateUri: jest.fn(),
          initializeDatabase: initFn,
        };

        const app = new TestableBaseApplication(env, db, undefined, hooks);
        await app.start('mongodb://example.com:27017/test');

        expect(initFn).not.toHaveBeenCalled();
      });
    });
  });

  /**
   * Feature: restore-db-init-lifecycle, Property 5: Successful init with detailedDebug logs hash
   * Validates: Requirements 3.3
   */
  describe('Property 5: Successful init with detailedDebug logs hash', () => {
    it('should call hashInitResults and log when detailedDebug is enabled', async () => {
      await withConsoleMocks({ mute: true }, async (spies) => {
        const callLog: string[] = [];
        const db = createMockDatabase(callLog);
        // Enable both devDatabase and detailedDebug
        process.env.DEV_DATABASE = 'true';
        process.env.DETAILED_DEBUG = 'true';
        const env = new Environment<string>(undefined, true);
        const hooks: IDatabaseLifecycleHooks = {
          validateUri: jest.fn(),
          initializeDatabase: jest.fn(async () => ({
            success: true,
            data: { data: 'test-seed' },
          })),
          hashInitResults: jest.fn(() => 'abc123hash'),
        };

        const app = new TestableBaseApplication(env, db, undefined, hooks);
        await app.start('mongodb://example.com:27017/test');

        expect(hooks.hashInitResults).toHaveBeenCalledWith({
          data: 'test-seed',
        });
        expect(spyContains(spies.log, 'abc123hash')).toBe(true);

        delete process.env.DETAILED_DEBUG;
      });
    });
  });

  /**
   * Feature: restore-db-init-lifecycle, Property 6: Failed init result throws error
   * Validates: Requirements 3.4
   */
  describe('Property 6: Failed init result throws error', () => {
    it('should throw TranslatableSuiteError when initializeDatabase returns failure', async () => {
      const callLog: string[] = [];
      const db = createMockDatabase(callLog);
      const env = createDevEnv();
      const hooks: IDatabaseLifecycleHooks = {
        validateUri: jest.fn(),
        initializeDatabase: jest.fn(async () => ({
          success: false,
          error: 'seed failed',
        })),
      };

      const app = new TestableBaseApplication(env, db, undefined, hooks);

      await expect(
        app.start('mongodb://example.com:27017/test'),
      ).rejects.toThrow(TranslatableSuiteError);
    });
  });

  /**
   * Feature: restore-db-init-lifecycle, Property 9: Custom validateUri replaces default
   * Validates: Requirements 4.4
   */
  describe('Property 9: Custom validateUri replaces default', () => {
    it('should use custom validateUri and not call default validator', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const callLog: string[] = [];
        const db = createMockDatabase(callLog);
        const env = createProdEnv();
        // A custom validator that accepts anything
        const customValidator = jest.fn();
        const hooks: IDatabaseLifecycleHooks = {
          validateUri: customValidator,
        };

        const app = new TestableBaseApplication(env, db, undefined, hooks);
        // This URI would be rejected by the default validator in production
        // but the custom validator accepts it
        await app.start('mongodb://localhost:27017/test');

        expect(customValidator).toHaveBeenCalledWith(
          'mongodb://localhost:27017/test',
        );
      });
    });

    it('should use default validator when no custom validateUri is provided', async () => {
      // Create environment in production mode, then restore NODE_ENV for test throw path
      process.env.NODE_ENV = 'production';
      process.env.SYSTEM_PUBLIC_KEY = '04' + '00'.repeat(64);
      const prodEnv = new Environment<string>(undefined, false);
      process.env.NODE_ENV = 'test';
      delete process.env.SYSTEM_PUBLIC_KEY;

      const callLog: string[] = [];
      const db = createMockDatabase(callLog);
      const hooks: IDatabaseLifecycleHooks = {};

      const app = new TestableBaseApplication(prodEnv, db, undefined, hooks);

      // Default validator rejects localhost in production
      await expect(app.start('mongodb://localhost:27017/test')).rejects.toThrow(
        TranslatableSuiteError,
      );
    });
  });

  /**
   * Feature: restore-db-init-lifecycle, Property 10: Teardown called on stop when dev store was provisioned
   * Validates: Requirements 6.3
   */
  describe('Property 10: Teardown called on stop when dev store was provisioned', () => {
    it('should call teardownDevStore on stop when dev store was provisioned', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const callLog: string[] = [];
        const db = createMockDatabase(callLog);
        const env = createDevEnv();
        const teardownFn = jest.fn(async () => {
          callLog.push('teardownDevStore');
        });
        const hooks: IDatabaseLifecycleHooks = {
          setupDevStore: jest.fn(async () => 'mongodb://inmemory:27017/dev'),
          teardownDevStore: teardownFn,
          validateUri: jest.fn(),
        };

        const app = new TestableBaseApplication(env, db, undefined, hooks);
        await app.start();
        await app.stop();

        expect(teardownFn).toHaveBeenCalled();
      });
    });

    it('should NOT call teardownDevStore when dev store was not provisioned', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const callLog: string[] = [];
        const db = createMockDatabase(callLog);
        const env = createProdEnv();
        const teardownFn = jest.fn();
        const hooks: IDatabaseLifecycleHooks = {
          teardownDevStore: teardownFn,
          validateUri: jest.fn(),
        };

        const app = new TestableBaseApplication(env, db, undefined, hooks);
        await app.start('mongodb://example.com:27017/test');
        await app.stop();

        expect(teardownFn).not.toHaveBeenCalled();
      });
    });

    it('should not prevent other cleanup if teardownDevStore throws', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const callLog: string[] = [];
        const db = createMockDatabase(callLog);
        const env = createDevEnv();
        const hooks: IDatabaseLifecycleHooks = {
          setupDevStore: jest.fn(async () => 'mongodb://inmemory:27017/dev'),
          teardownDevStore: jest.fn(async () => {
            throw new Error('teardown boom');
          }),
          validateUri: jest.fn(),
        };

        const app = new TestableBaseApplication(env, db, undefined, hooks);
        await app.start();

        // stop() should not throw even though teardown fails
        await expect(app.stop()).resolves.toBeUndefined();
        // disconnect should still have been called
        expect(db.disconnect).toHaveBeenCalled();
      });
    });
  });

  /**
   * Feature: restore-db-init-lifecycle, Property 11: Only provided hooks are invoked
   * Validates: Requirements 5.4, 7.2
   */
  describe('Property 11: Only provided hooks are invoked', () => {
    it('should work with empty hooks object (no hooks provided)', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const callLog: string[] = [];
        const db = createMockDatabase(callLog);
        const env = createDevEnv();
        const hooks: IDatabaseLifecycleHooks = {};

        const app = new TestableBaseApplication(env, db, undefined, hooks);
        // Should not throw — default URI validator is used, no init, no dev store
        await app.start('mongodb://example.com:27017/test');
        await app.stop();

        expect(app.ready).toBe(false);
      });
    });

    it('should work with no hooks parameter at all', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const callLog: string[] = [];
        const db = createMockDatabase(callLog);
        const env = createDevEnv();

        const app = new TestableBaseApplication(env, db);
        await app.start('mongodb://example.com:27017/test');
        await app.stop();

        expect(app.ready).toBe(false);
      });
    });

    it('should invoke only the subset of hooks that are provided', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const callLog: string[] = [];
        const db = createMockDatabase(callLog);
        const env = createDevEnv();
        // Only provide validateUri — no setupDevStore, no initializeDatabase
        const hooks: IDatabaseLifecycleHooks = {
          validateUri: jest.fn(() => {
            callLog.push('validateUri');
          }),
        };

        const app = new TestableBaseApplication(env, db, undefined, hooks);
        await app.start('mongodb://example.com:27017/test');

        expect(callLog).toContain('validateUri');
        expect(callLog).toContain('connect');
        // No setupDevStore or initializeDatabase in the log
        expect(callLog).not.toContain('setupDevStore');
        expect(callLog).not.toContain('initializeDatabase');
      });
    });
  });
});
