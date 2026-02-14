/**
 * Storage-agnostic database interface for collection access, session/transaction
 * management, and connection lifecycle.
 *
 * Both brightchain-db's BrightChainDb and mongoose-based database adapters
 * implement this interface, allowing application code to work with any
 * database backend through a single contract.
 */
import { IClientSession } from './client-session';
import { ICollection } from './collection';
import { BsonDocument, CollectionOptions } from './document-types';

export interface IDatabase {
  /** Get or create a collection by name. */
  collection<T extends BsonDocument = BsonDocument>(
    name: string,
    options?: CollectionOptions,
  ): ICollection<T>;

  /** Start a client session for transaction support. */
  startSession(): IClientSession;

  /** Run a callback within a transaction (auto-commit/abort). */
  withTransaction<R>(fn: (session: IClientSession) => Promise<R>): Promise<R>;

  /** List all known collection names. */
  listCollections(): string[];

  /** Drop a collection by name. */
  dropCollection(name: string): Promise<boolean>;

  /** Connect to the backing store. URI may be ignored by non-network stores. */
  connect(uri?: string): Promise<void>;

  /** Disconnect from the backing store. */
  disconnect(): Promise<void>;

  /** Whether the store is currently connected. */
  isConnected(): boolean;
}
