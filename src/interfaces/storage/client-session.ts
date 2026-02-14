/**
 * Storage-agnostic client session interface for transaction support.
 *
 * Both brightchain-db's DbSession and mongoose-based session adapters
 * implement this interface, allowing transaction-aware code to work
 * with any database backend.
 */
export interface IClientSession {
  /** Unique session ID */
  readonly id: string;
  /** Whether a transaction is currently active */
  readonly inTransaction: boolean;
  /** Start a new transaction */
  startTransaction(): void;
  /** Commit the current transaction */
  commitTransaction(): Promise<void>;
  /** Abort the current transaction */
  abortTransaction(): Promise<void>;
  /** End the session */
  endSession(): void;
}
