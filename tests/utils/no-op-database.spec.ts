/**
 * Feature: plugin-migration-cleanup
 * Property 2: createNoOpDatabase implements IDatabase contract
 *
 * For any method defined on the IDatabase interface, the object returned by
 * createNoOpDatabase() should have that method defined. Methods that are no-ops
 * should not throw, and methods that represent unsupported operations should
 * throw descriptive errors.
 *
 * Validates: Requirements 2.3
 */
import * as fc from 'fast-check';
import { createNoOpDatabase } from '../../src/utils/no-op-database';
import type { IDatabase } from '../../src/interfaces/storage';

/** All method names defined on the IDatabase interface. */
const IDATABASE_METHODS: (keyof IDatabase)[] = [
  'collection',
  'startSession',
  'withTransaction',
  'listCollections',
  'dropCollection',
  'connect',
  'disconnect',
  'isConnected',
];

/** Methods that should throw with a descriptive error (unsupported operations). */
const THROWING_METHODS: (keyof IDatabase)[] = [
  'collection',
  'startSession',
  'withTransaction',
];

/** Async no-op methods that resolve without throwing. */
const ASYNC_NOOP_METHODS: (keyof IDatabase)[] = ['connect', 'disconnect'];

/** Sync no-op methods that return a value without throwing. */
const SYNC_NOOP_METHODS: (keyof IDatabase)[] = [
  'listCollections',
  'isConnected',
];

describe('createNoOpDatabase', () => {
  let db: IDatabase;

  beforeEach(() => {
    db = createNoOpDatabase();
  });

  // ── Unit Tests ──────────────────────────────────────────────────────

  describe('unit tests', () => {
    it('returns an object', () => {
      expect(db).toBeDefined();
      expect(typeof db).toBe('object');
    });

    it('has all IDatabase methods defined', () => {
      for (const method of IDATABASE_METHODS) {
        expect(typeof db[method]).toBe('function');
      }
    });

    // -- Throwing methods --

    it('collection() throws descriptive error', () => {
      expect(() => db.collection('test')).toThrow(
        'No database plugin registered',
      );
    });

    it('startSession() throws descriptive error', () => {
      expect(() => db.startSession()).toThrow('No database plugin registered');
    });

    it('withTransaction() throws descriptive error', () => {
      expect(() =>
        db.withTransaction(async () => {
          /* noop */
        }),
      ).toThrow('No database plugin registered');
    });

    // -- No-op methods --

    it('connect() resolves without throwing', async () => {
      await expect(db.connect()).resolves.toBeUndefined();
    });

    it('disconnect() resolves without throwing', async () => {
      await expect(db.disconnect()).resolves.toBeUndefined();
    });

    it('listCollections() returns empty array', () => {
      expect(db.listCollections()).toEqual([]);
    });

    it('dropCollection() resolves to false', async () => {
      await expect(db.dropCollection('any')).resolves.toBe(false);
    });

    it('isConnected() returns false', () => {
      expect(db.isConnected()).toBe(false);
    });
  });

  // ── Property-Based Tests ───────────────────────────────────────────

  describe('Feature: plugin-migration-cleanup, Property 2: createNoOpDatabase implements IDatabase contract', () => {
    it('every IDatabase method is a function on the returned object', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...IDATABASE_METHODS),
          (methodName: keyof IDatabase) => {
            const noOpDb = createNoOpDatabase();
            expect(typeof noOpDb[methodName]).toBe('function');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('unsupported-operation methods always throw a descriptive error', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...THROWING_METHODS),
          (methodName: keyof IDatabase) => {
            const noOpDb = createNoOpDatabase();
            try {
              (noOpDb[methodName] as (...args: unknown[]) => unknown)(
                'dummy-arg',
              );
              // Should not reach here
              return false;
            } catch (err) {
              expect(err).toBeInstanceOf(Error);
              expect((err as Error).message).toContain(
                'No database plugin registered',
              );
              return true;
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('async no-op methods resolve without throwing for any input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ASYNC_NOOP_METHODS),
          fc.option(fc.string(), { nil: undefined }),
          async (methodName: keyof IDatabase, arg: string | undefined) => {
            const noOpDb = createNoOpDatabase();
            const result = await (
              noOpDb[methodName] as (...args: unknown[]) => Promise<unknown>
            )(arg);
            expect(result).toBeUndefined();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('sync no-op methods do not throw and return expected defaults', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SYNC_NOOP_METHODS),
          (methodName: keyof IDatabase) => {
            const noOpDb = createNoOpDatabase();
            const fn = noOpDb[methodName] as () => unknown;
            expect(() => fn()).not.toThrow();

            const result = fn();
            if (methodName === 'listCollections') {
              expect(result).toEqual([]);
            } else if (methodName === 'isConnected') {
              expect(result).toBe(false);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('dropCollection returns false for any collection name', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string(), async (collectionName: string) => {
          const noOpDb = createNoOpDatabase();
          const result = await noOpDb.dropCollection(collectionName);
          expect(result).toBe(false);
        }),
        { numRuns: 100 },
      );
    });
  });
});
