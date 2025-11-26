import { ClientSession, Connection } from '@digitaldefiance/mongoose-types';

export interface TransactionOptions {
  timeoutMs?: number;
  maxRetries?: number;
}

export class TransactionManager {
  constructor(
    private connection: Connection,
    private useTransactions: boolean,
  ) {}

  async execute<T>(
    callback: (session: ClientSession | undefined) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    if (!this.useTransactions) {
      return callback(undefined);
    }

    const session = await this.connection.startSession();
    try {
      return await session.withTransaction(
        (sess: ClientSession) => callback(sess),
        {
          readConcern: { level: 'snapshot' },
          writeConcern: { w: 'majority' },
          readPreference: 'primary',
          maxCommitTimeMS: options?.timeoutMs,
        },
      );
    } finally {
      await session.endSession();
    }
  }
}
