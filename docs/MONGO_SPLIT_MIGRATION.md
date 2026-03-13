# Migrating to the Mongo Package Split

Starting with v5.0, all MongoDB/Mongoose-specific code has been extracted into a separate package: `@digitaldefiance/node-express-suite-mongo`.

The base package (`@digitaldefiance/node-express-suite`) is now database-agnostic.

## Install the Mongo Package

```bash
npm install @digitaldefiance/node-express-suite-mongo
# or
yarn add @digitaldefiance/node-express-suite-mongo
```

## Update Imports

Move Mongo-specific symbols from `@digitaldefiance/node-express-suite` to `@digitaldefiance/node-express-suite-mongo`.

### Symbols That Moved

| Category | Symbols |
|----------|---------|
| Documents | `BaseDocument`, `UserDocument`, `RoleDocument`, `EmailTokenDocument`, `MnemonicDocument`, `UserRoleDocument`, `UsedDirectLoginTokenDocument` |
| Schemas | All `*Schema` exports and `create*Schema` factory functions |
| Models | All model factory functions |
| Services | `UserService`, `RoleService`, `BackupCodeService`, `DatabaseInitializationService`, `MongoBaseService`, `MongoAuthenticationProvider`, `MongooseDatabase`, `MongooseCollection`, `MongooseDocumentStore`, `MongooseSessionAdapter`, `DirectLoginTokenService`, `MnemonicService`, `RequestUserService`, `DbInitCache` |
| Controllers | `UserController`, `MongoBaseController` |
| Plugins | `MongoDatabasePlugin` |
| Transactions | `TransactionManager` |
| Routers | `ApiRouter` (Mongo-aware) |
| Interfaces | `IMongoApplication`, `IMongoEnvironment`, `IMongoTypedEnvironment`, `ISchema`, `IMongoErrors`, `IApiMongoValidationErrorResponse`, `IMongooseDocumentStore`, `IDatabaseInitResultTx`, `IDbInitResult`, `IDiscriminatorCollections` |
| Enumerations | `BaseModelName`, `SchemaCollection` |
| Errors | `MongooseValidationError`, `ModelNotRegisteredError`, `InvalidModelError` |
| Types | `MongoTransactionCallback`, `SchemaMap`, Mongoose helper types |
| Utilities | `ModelRegistry`, `MongoApplicationConcrete`, `defaultMongoUriValidator`, `isValidStringObjectId`, `sendApiMongoValidationErrorResponse`, `getSchemaMap` |

### Symbols That Stay in the Base Package

`Application`, `BaseApplication`, `BaseController`, `DecoratorBaseController`, `BaseService`, `Environment`, `AppRouter`, `BaseRouter`, all decorators, middleware, validation, responses, builders, i18n integration, `IApplication`, `IConstants`, `IEnvironment`, `IDatabasePlugin`, `IAuthenticationProvider`, `createExpressConstants`, `emailServiceRegistry`, `DummyEmailService`, `withTransaction` (IDatabase overload), `sendApiErrorResponse`, `sendApiMessageResponse`, etc.

## Example

Before:
```typescript
import {
  Application,
  MongoDatabasePlugin,
  DatabaseInitializationService,
  BaseModelName,
  UserDocument,
} from '@digitaldefiance/node-express-suite';
```

After:
```typescript
import { Application } from '@digitaldefiance/node-express-suite';
import {
  MongoDatabasePlugin,
  DatabaseInitializationService,
  BaseModelName,
  UserDocument,
} from '@digitaldefiance/node-express-suite-mongo';
```
