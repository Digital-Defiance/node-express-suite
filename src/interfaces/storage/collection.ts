/**
 * Storage-agnostic collection interface for document CRUD, query, index,
 * aggregation, schema validation, and lifecycle operations.
 *
 * Both brightchain-db's Collection and mongoose-based collection adapters
 * implement this interface, allowing collection-level code to work with
 * any database backend.
 */
import {
  AggregationStage,
  BsonDocument,
  BulkWriteOperation,
  BulkWriteOptions,
  BulkWriteResult,
  ChangeListener,
  CollectionSchema,
  DeleteResult,
  DocumentId,
  FilterQuery,
  FindOptions,
  IndexOptions,
  IndexSpec,
  InsertManyResult,
  InsertOneResult,
  ReadPreference,
  ReplaceResult,
  TextIndexOptions,
  UpdateOptions,
  UpdateQuery,
  UpdateResult,
  ValidationFieldError,
  WriteConcern,
  WriteOptions,
} from './document-types';

export interface ICollection<T extends BsonDocument = BsonDocument> {
  // ── CRUD ──

  /** Insert a single document. */
  insertOne(doc: T, options?: WriteOptions): Promise<InsertOneResult>;

  /** Insert multiple documents. */
  insertMany(docs: T[], options?: WriteOptions): Promise<InsertManyResult>;

  /** Find the first document matching the filter. */
  findOne(filter?: FilterQuery<T>, options?: FindOptions<T>): Promise<T | null>;

  /**
   * Find all documents matching the filter.
   *
   * Return type is `T[] | PromiseLike<T[]>` to accommodate both synchronous
   * in-memory results (brightchain-db Cursor, which is thenable) and async
   * mongoose queries.
   */
  find(
    filter?: FilterQuery<T>,
    options?: FindOptions<T>,
  ): T[] | PromiseLike<T[]>;

  /** Find a document by its `_id`. */
  findById(id: DocumentId): Promise<T | null>;

  /** Update the first document matching the filter. */
  updateOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options?: UpdateOptions,
  ): Promise<UpdateResult>;

  /** Update all documents matching the filter. */
  updateMany(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options?: UpdateOptions,
  ): Promise<UpdateResult>;

  /** Delete the first document matching the filter. */
  deleteOne(
    filter: FilterQuery<T>,
    options?: WriteOptions,
  ): Promise<DeleteResult>;

  /** Delete all documents matching the filter. */
  deleteMany(
    filter: FilterQuery<T>,
    options?: WriteOptions,
  ): Promise<DeleteResult>;

  /** Replace the first document matching the filter. */
  replaceOne(
    filter: FilterQuery<T>,
    doc: T,
    options?: UpdateOptions,
  ): Promise<ReplaceResult>;

  // ── Query ──

  /** Count documents matching the filter. */
  countDocuments(filter?: FilterQuery<T>): Promise<number>;

  /** Estimated total document count (may be faster than countDocuments). */
  estimatedDocumentCount(): Promise<number>;

  /** Return distinct values for a field, optionally filtered. */
  distinct<K extends keyof T>(
    field: K,
    filter?: FilterQuery<T>,
  ): Promise<Array<T[K]>>;

  /** Run an aggregation pipeline. */
  aggregate(pipeline: AggregationStage[]): Promise<BsonDocument[]>;

  // ── Indexes ──

  /** Create an index on the collection. Returns the index name. */
  createIndex(spec: IndexSpec, options?: IndexOptions): Promise<string>;

  /** Drop an index by name. */
  dropIndex(name: string): Promise<void>;

  /** List all index names on this collection. */
  listIndexes(): string[];

  // ── Bulk operations ──

  /** Execute multiple write operations in bulk. */
  bulkWrite(
    operations: BulkWriteOperation<T>[],
    options?: BulkWriteOptions,
  ): Promise<BulkWriteResult>;

  // ── Change streams ──

  /** Watch for changes on this collection. Returns an unsubscribe function. */
  watch(listener: ChangeListener<T>): () => void;

  // ── Schema validation ──

  /** Set a validation schema for this collection. */
  setSchema(schema: CollectionSchema): void;

  /** Get the current validation schema (if any). */
  getSchema(): CollectionSchema | undefined;

  /** Remove the validation schema. */
  removeSchema(): void;

  /** Validate a document against the current schema. */
  validateDoc(doc: T): ValidationFieldError[];

  // ── Write concern / Read preference ──

  /** Get the current write concern. */
  getWriteConcern(): WriteConcern;

  /** Set the write concern for this collection. */
  setWriteConcern(wc: WriteConcern): void;

  /** Get the current read preference. */
  getReadPreference(): ReadPreference;

  /** Set the read preference for this collection. */
  setReadPreference(rp: ReadPreference): void;

  // ── Text index ──

  /** Create a text index. Returns the index name. */
  createTextIndex(options: TextIndexOptions): string;

  /** Drop the text index. */
  dropTextIndex(): void;

  /** Whether a text index exists on this collection. */
  hasTextIndex(): boolean;

  // ── Lifecycle ──

  /** Drop this collection and all its data. */
  drop(): Promise<void>;
}
