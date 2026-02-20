/**
 * @fileoverview Backward compatibility tests for BaseApplication and Application.
 * Verifies that the IDocumentStore (legacy) path continues to work identically
 * after the IDatabaseLifecycleHooks integration.
 *
 * Feature: restore-db-init-lifecycle
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4
 */
import { withConsoleMocks } from '@digitaldefiance/express-suite-test-utils';
import { MongoApplicationBase } from '../src/mongo-application-base';
import { Environment } from '../src/environment';
import { IDocumentStore } from '../src/interfaces/document-store';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal IDocumentStore mock that records calls for ordering verification. */
function createMockDocumentStore(callLog: string[]): IDocumentStore<string> {
  return {
    connect: jest.fn(async () => {
      callLog.push('connect');
    }),
    disconnect: jest.fn(async () => {
      callLog.push('disconnect');
    }),
    isConnected: jest.fn().mockReturnValue(true),
    getModel: jest.fn(),
    schemaMap: undefined,
    devDatabase: undefined,
    setupDevStore: jest.fn(async () => {
      callLog.push('setupDevStore');
      return 'mongodb://inmemory:27017/devdb';
    }),
    initializeDevStore: jest.fn(async () => {
      callLog.push('initializeDevStore');
      return { success: true, data: {} };
    }),
  } as unknown as IDocumentStore<string>;
}

function createTestEnv(devDatabase = false): Environment<string> {
  process.env.JWT_SECRET = 'a'.repeat(64);
  process.env.MNEMONIC_HMAC_SECRET = 'a'.repeat(64);
  process.env.MNEMONIC_ENCRYPTION_KEY = 'b'.repeat(64);
  process.env.API_DIST_DIR = '/tmp/test-api-dist';
  process.env.REACT_DIST_DIR = '/tmp/test-react-dist';
  if (devDatabase) {
    process.env.DEV_DATABASE = 'true';
  } else {
    delete process.env.DEV_DATABASE;
  }
  const fs = require('fs');
  if (!fs.existsSync('/tmp/test-api-dist'))
    fs.mkdirSync('/tmp/test-api-dist', { recursive: true });
  if (!fs.existsSync('/tmp/test-react-dist'))
    fs.mkdirSync('/tmp/test-react-dist', { recursive: true });
  return new Environment<string>(undefined, true);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Backward compatibility: MongoApplicationBase with IDocumentStore (no hooks)', () => {
  afterEach(() => {
    delete process.env.DEV_DATABASE;
  });

  /**
   * Validates: Requirements 5.2, 5.4
   * BaseApplication with IDocumentStore and no lifecycle hooks should behave identically.
   */
  it('should connect via IDocumentStore without lifecycle hooks', async () => {
    await withConsoleMocks({ mute: true }, async () => {
      const callLog: string[] = [];
      const store = createMockDocumentStore(callLog);
      const env = createTestEnv(false);

      const app = new MongoApplicationBase(env, store);
      await app.start('mongodb://example.com:27017/test');

      expect(store.connect).toHaveBeenCalledWith(
        'mongodb://example.com:27017/test',
      );
      expect(app.ready).toBe(true);
      expect(app.documentStore).toBe(store);
      // MongoApplicationBase with IDocumentStore uses a no-op IDatabase internally
      expect(app.database).toBeDefined();
    });
  });

  /**
   * Validates: Requirements 5.2
   * IDocumentStore path should call setupDevStore when devDatabase is enabled.
   */
  it('should call setupDevStore on IDocumentStore when devDatabase is enabled', async () => {
    await withConsoleMocks({ mute: true }, async () => {
      const callLog: string[] = [];
      const store = createMockDocumentStore(callLog);
      const env = createTestEnv(true);

      const app = new MongoApplicationBase(env, store);
      await app.start();

      expect(store.setupDevStore).toHaveBeenCalled();
      expect(callLog).toContain('setupDevStore');
    });
  });

  /**
   * Validates: Requirements 5.4
   * When lifecycle hooks are not provided, no hook invocations should occur.
   */
  it('should not invoke any lifecycle hooks on IDocumentStore path', async () => {
    await withConsoleMocks({ mute: true }, async () => {
      const callLog: string[] = [];
      const store = createMockDocumentStore(callLog);
      const env = createTestEnv(false);

      const app = new MongoApplicationBase(env, store);
      await app.start('mongodb://example.com:27017/test');
      await app.stop();

      // Only connect and disconnect should be in the log — no lifecycle hook calls
      expect(callLog).toEqual(['connect', 'disconnect']);
    });
  });

  /**
   * Validates: Requirements 5.3
   * Constructor signature remains backward compatible — no required new parameters.
   */
  it('should accept the same constructor parameters as before', () => {
    const env = createTestEnv(false);
    const callLog: string[] = [];
    const store = createMockDocumentStore(callLog);

    // Two-arg form (environment + store) — the original minimal signature
    const app1 = new MongoApplicationBase(env, store);
    expect(app1).toBeDefined();
    expect(app1.ready).toBe(false);

    // Three-arg form (environment + store + constants) — still works
    const app2 = new MongoApplicationBase(env, store, undefined);
    expect(app2).toBeDefined();
  });

  /**
   * Validates: Requirements 5.1
   * IDocumentStore disconnect is called on stop().
   */
  it('should disconnect via IDocumentStore on stop()', async () => {
    await withConsoleMocks({ mute: true }, async () => {
      const callLog: string[] = [];
      const store = createMockDocumentStore(callLog);
      const env = createTestEnv(false);

      const app = new MongoApplicationBase(env, store);
      await app.start('mongodb://example.com:27017/test');
      await app.stop();

      expect(store.disconnect).toHaveBeenCalled();
      expect(app.ready).toBe(false);
    });
  });
});
