import type { IDatabase } from '../interfaces/storage';

/**
 * Creates a no-op IDatabase instance.
 * Used when no database plugin is registered or when the plugin
 * manages its own connection lifecycle (e.g., MongoDatabasePlugin).
 */
export function createNoOpDatabase(): IDatabase {
  return {
    collection() {
      throw new Error('No database plugin registered');
    },
    startSession() {
      throw new Error('No database plugin registered');
    },
    withTransaction() {
      throw new Error('No database plugin registered');
    },
    listCollections() {
      return [];
    },
    async dropCollection() {
      return false;
    },
    async connect() {
      // no-op
    },
    async disconnect() {
      // no-op
    },
    isConnected() {
      return false;
    },
  };
}
