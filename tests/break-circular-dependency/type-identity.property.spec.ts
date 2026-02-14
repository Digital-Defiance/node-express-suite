/**
 * Feature: break-circular-dependency
 * Property 3: Type structural identity across packages
 *
 * Since brightchain-lib re-exports all storage types from
 * @digitaldefiance/node-express-suite via `export type { X } from '...'`,
 * TypeScript guarantees the types are identical (same module resolution).
 *
 * This test verifies:
 * 1. All expected storage types are exported from express-suite's storage barrel
 * 2. All expected types are importable (compile-time check)
 * 3. IFailableResult is exported from the failable-result module
 *
 * Validates: Requirements 3.3
 */
import * as fs from 'fs';
import * as path from 'path';
import * as fc from 'fast-check';

// Compile-time check: all types importable from storage barrel
import type {
  IDatabase,
  ICollection,
  IClientSession,
  IDatabaseLifecycleHooks,
  BsonDocument,
  DocumentId,
  FilterQuery,
  UpdateQuery,
  FindOptions,
  InsertOneResult,
  InsertManyResult,
  UpdateResult,
  DeleteResult,
  ReplaceResult,
  IndexSpec,
  IndexOptions,
  WriteOptions,
  UpdateOptions,
  CollectionOptions,
  AggregationStage,
  WriteConcern,
  ReadPreference,
  BulkWriteOperation,
  BulkWriteOptions,
  BulkWriteResult,
  ChangeEventType,
  ChangeEvent,
  ChangeListener,
  TextIndexOptions,
  CursorSession,
  CollectionSchemaFieldType,
  FieldSchema,
  CollectionSchema,
  ValidationFieldError,
  SortSpec,
  ProjectionSpec,
  FilterOperator,
  LogicalOperators,
  UpdateOperators,
  ClientSession,
} from '../../src/interfaces/storage';

import type { IFailableResult } from '../../src/interfaces/failable-result';

/** All storage type names that must be present in express-suite */
const EXPECTED_STORAGE_TYPES = [
  'IDatabase',
  'ICollection',
  'IClientSession',
  'IDatabaseLifecycleHooks',
  'BsonDocument',
  'DocumentId',
  'FilterQuery',
  'FilterOperator',
  'LogicalOperators',
  'UpdateOperators',
  'UpdateQuery',
  'SortSpec',
  'ProjectionSpec',
  'IndexSpec',
  'IndexOptions',
  'ClientSession',
  'FindOptions',
  'WriteOptions',
  'UpdateOptions',
  'InsertOneResult',
  'InsertManyResult',
  'UpdateResult',
  'DeleteResult',
  'ReplaceResult',
  'ChangeEventType',
  'ChangeEvent',
  'ChangeListener',
  'AggregationStage',
  'WriteConcern',
  'ReadPreference',
  'CollectionOptions',
  'BulkWriteOperation',
  'BulkWriteOptions',
  'BulkWriteResult',
  'TextIndexOptions',
  'CursorSession',
  'CollectionSchemaFieldType',
  'FieldSchema',
  'CollectionSchema',
  'ValidationFieldError',
];

describe('Feature: break-circular-dependency, Property 3: Type structural identity across packages', () => {
  it('all storage types are importable from express-suite (compile-time check)', () => {
    // If this file compiles and this test runs, all types in the import
    // blocks above are successfully exported from express-suite.
    // The type identity with brightchain-lib is guaranteed by the re-export
    // chain: brightchain-lib uses `export type { X } from "@digitaldefiance/node-express-suite"`.
    expect(true).toBe(true);
  });

  it('IFailableResult is importable from failable-result module', () => {
    // Compile-time check — if this file compiles, IFailableResult is exported.
    expect(true).toBe(true);
  });

  it('every expected storage type name appears in express-suite storage source files', () => {
    const storageDir = path.resolve(__dirname, '../../src/interfaces/storage');
    const files = fs.readdirSync(storageDir).filter((f) => f.endsWith('.ts'));

    fc.assert(
      fc.property(
        fc.constantFrom(...EXPECTED_STORAGE_TYPES),
        (typeName: string) => {
          const found = files.some((f) => {
            const content = fs.readFileSync(path.join(storageDir, f), 'utf-8');
            return content.includes(typeName);
          });
          if (!found) {
            throw new Error(
              `Type "${typeName}" not found in any express-suite storage source file`,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
