/**
 * @fileoverview Backward compatibility tests for BaseApplication and Application.
 * Verifies that the IDatabase path and the plugin-based architecture
 * continue to work correctly.
 *
 * Feature: plugin-based-database
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4
 */
import { withConsoleMocks } from '@digitaldefiance/express-suite-test-utils';
import { BaseApplication } from '../src/base-application';
import { Environment } from '../src/environment';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal IDatabase mock that records calls for ordering verification. */
function createMockDatabase(callLog: string[]) {
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
  };
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

describe('Backward compatibility: BaseApplication with IDatabase (no hooks)', () => {
  afterEach(() => {
    delete process.env.DEV_DATABASE;
  });

  /**
   * Validates: Requirements 5.2, 5.4
   * BaseApplication with IDatabase and no lifecycle hooks should behave identically.
   */
  it('should connect via IDatabase without lifecycle hooks', async () => {
    await withConsoleMocks({ mute: true }, async () => {
      const callLog: string[] = [];
      const db = createMockDatabase(callLog);
      const env = createTestEnv(false);

      const app = new BaseApplication(env, db as never);
      await app.start('mongodb://example.com:27017/test');

      expect(db.connect).toHaveBeenCalledWith(
        'mongodb://example.com:27017/test',
      );
      expect(app.ready).toBe(true);
      expect(app.database).toBeDefined();
    });
  });

  /**
   * Validates: Requirements 5.4
   * When lifecycle hooks are not provided, no hook invocations should occur.
   */
  it('should not invoke any lifecycle hooks on IDatabase path', async () => {
    await withConsoleMocks({ mute: true }, async () => {
      const callLog: string[] = [];
      const db = createMockDatabase(callLog);
      const env = createTestEnv(false);

      const app = new BaseApplication(env, db as never);
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
    const db = createMockDatabase(callLog);

    // Two-arg form (environment + database) — the minimal signature
    const app1 = new BaseApplication(env, db as never);
    expect(app1).toBeDefined();
    expect(app1.ready).toBe(false);

    // Three-arg form (environment + database + constants) — still works
    const app2 = new BaseApplication(env, db as never, undefined);
    expect(app2).toBeDefined();
  });

  /**
   * Validates: Requirements 5.1
   * IDatabase disconnect is called on stop().
   */
  it('should disconnect via IDatabase on stop()', async () => {
    await withConsoleMocks({ mute: true }, async () => {
      const callLog: string[] = [];
      const db = createMockDatabase(callLog);
      const env = createTestEnv(false);

      const app = new BaseApplication(env, db as never);
      await app.start('mongodb://example.com:27017/test');
      await app.stop();

      expect(db.disconnect).toHaveBeenCalled();
      expect(app.ready).toBe(false);
    });
  });
});
