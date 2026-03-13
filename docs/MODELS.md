# Models & Data Layer

## Overview

`@digitaldefiance/node-express-suite` provides a database-agnostic plugin interface for data access. The base package defines the contracts (`IDatabasePlugin`, `IDatabase`); concrete implementations live in database-specific packages.

## IDatabasePlugin

The `IDatabasePlugin` interface is the extension point for database integrations:

```typescript
interface IDatabasePlugin<TID> {
  readonly db?: unknown;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  init(application: IApplication<TID>): Promise<void>;
  getModel?<U>(modelName: string): U | undefined;
}
```

Register a plugin on your application:

```typescript
app.useDatabasePlugin(myPlugin);
```

## IDatabase

The `IDatabase` interface provides a minimal abstraction for database operations:

```typescript
interface IDatabase {
  collection(name: string): unknown;
  startSession(): Promise<IClientSession>;
  withTransaction<T>(callback: TransactionCallback<T>, options?: unknown): Promise<T>;
  listCollections(): unknown[];
  dropCollection(name: string): Promise<boolean>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}
```

## MongoDB / Mongoose

For Mongoose-specific models, schemas, documents, and the `ModelRegistry`, see [`@digitaldefiance/node-express-suite-mongo`](https://www.npmjs.com/package/@digitaldefiance/node-express-suite-mongo).

That package provides:
- `MongoDatabasePlugin` — implements `IDatabasePlugin` for Mongoose
- `ModelRegistry` — singleton for runtime model registration and retrieval
- Built-in document types: `UserDocument`, `RoleDocument`, `EmailTokenDocument`, `MnemonicDocument`, etc.
- Schema factories: `createUserSchema`, `createRoleSchema`, `createEmailTokenSchema`, etc.
- `BaseModelName` and `SchemaCollection` enumerations

## Other Databases

To integrate a different database (e.g., BrightDB, PostgreSQL), implement `IDatabasePlugin` and optionally `IDatabase`. See `@brightchain/node-express-suite` for an example of a non-Mongoose database plugin (`BrightDbDatabasePlugin`).
