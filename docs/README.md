# Documentation Summary

This directory contains comprehensive documentation for `@digitaldefiance/node-express-suite`.

> **Note:** Starting with v5.0, all MongoDB/Mongoose-specific code has been extracted into
> [`@digitaldefiance/node-express-suite-mongo`](https://www.npmjs.com/package/@digitaldefiance/node-express-suite-mongo).
> See [MONGO_SPLIT_MIGRATION.md](./MONGO_SPLIT_MIGRATION.md) for migration details.

## Available Documentation

### Core Architecture

- **[INDEX.md](./INDEX.md)** — Complete documentation index
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — System architecture, plugin system, and design patterns
- **[CONTROLLERS.md](./CONTROLLERS.md)** — Controller system with decorator API
- **[SERVICES.md](./SERVICES.md)** — Business logic and service container
- **[MIDDLEWARE.md](./MIDDLEWARE.md)** — Request pipeline and middleware

### Data Layer (Database-Agnostic)

- **[MODELS.md](./MODELS.md)** — `IDatabasePlugin` interface and database patterns
- **[SCHEMAS.md](./SCHEMAS.md)** — Schema contract (`ISchema` lives in the mongo package)

### Migration & Upgrade

- **[MONGO_SPLIT_MIGRATION.md](./MONGO_SPLIT_MIGRATION.md)** — Migrating to the two-package architecture
- **[DECORATOR_MIGRATION.md](./DECORATOR_MIGRATION.md)** — Migrating from RouteConfig to the decorator API
- **[i18n-MIGRATION.md](./i18n-MIGRATION.md)** — Internationalization migration

### UPnP (Let's Encrypt / TLS)

- **[UPnP_Architecture.md](./UPnP_Architecture.md)** — Automated TLS certificate management design
- **[UPnP_Configuration.md](./UPnP_Configuration.md)** — Environment variables and setup
- **[UPnP_Manual_Testing.md](./UPnP_Manual_Testing.md)** — Testing TLS locally

## Quick Reference

| Component | Primary Documentation | Secondary Reference |
|-----------|----------------------|---------------------|
| Controllers | [CONTROLLERS.md](./CONTROLLERS.md) | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Services | [SERVICES.md](./SERVICES.md) | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Middleware | [MIDDLEWARE.md](./MIDDLEWARE.md) | [CONTROLLERS.md](./CONTROLLERS.md) |
| Authentication | [MIDDLEWARE.md](./MIDDLEWARE.md) | [SERVICES.md](./SERVICES.md) |
| Validation | [CONTROLLERS.md](./CONTROLLERS.md) | — |
| Decorators | [CONTROLLERS.md](./CONTROLLERS.md) | [DECORATOR_MIGRATION.md](./DECORATOR_MIGRATION.md) |
| Plugins | [ARCHITECTURE.md](./ARCHITECTURE.md) | — |
| Pipeline | [MIDDLEWARE.md](./MIDDLEWARE.md) | [CONTROLLERS.md](./CONTROLLERS.md) |
| Responses | [CONTROLLERS.md](./CONTROLLERS.md) | — |
| Constants | [ARCHITECTURE.md](./ARCHITECTURE.md) | — |
| Environment | [ARCHITECTURE.md](./ARCHITECTURE.md) | — |
| Database Plugin | [MODELS.md](./MODELS.md) | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Types | Throughout all documentation | — |

## What Lives Where

| This package (`node-express-suite`) | Mongo package (`node-express-suite-mongo`) |
|--------------------------------------|---------------------------------------------|
| `Application`, `BaseApplication` | `MongoDatabasePlugin` |
| `BaseController`, `DecoratorBaseController` | `MongoBaseController`, `UserController` |
| `BaseService` | `UserService`, `RoleService`, `BackupCodeService` |
| `Environment` | `IMongoEnvironment`, `IMongoTypedEnvironment` |
| `AppRouter`, `BaseRouter` | `ApiRouter` (Mongo-aware) |
| All decorators (`@Get`, `@Post`, etc.) | `DatabaseInitializationService` |
| Middleware, validation, responses | `ModelRegistry`, `TransactionManager` |
| `IDatabasePlugin`, `IDatabase` | Documents, schemas, models |
| `IApplication`, `IConstants`, `IEnvironment` | `IMongoApplication`, `ISchema`, `SchemaMap` |
| `createExpressConstants` | `BaseModelName`, `SchemaCollection` |
| `emailServiceRegistry`, `DummyEmailService` | `MongooseValidationError` and Mongo errors |
| i18n integration, builders, pipeline | Mongoose helper types |
| `withTransaction` (IDatabase overload) | `withTransaction` (Mongoose Connection overload) |

## Getting Started

1. **New Users**: Start with [INDEX.md](./INDEX.md) for an overview
2. **Architecture**: Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
3. **Controllers**: See [CONTROLLERS.md](./CONTROLLERS.md) for building endpoints
4. **Services**: Review [SERVICES.md](./SERVICES.md) for business logic
5. **Database**: Check [MODELS.md](./MODELS.md) for the `IDatabasePlugin` interface
6. **MongoDB Users**: Install `@digitaldefiance/node-express-suite-mongo` and follow its README

## Contributing to Documentation

When adding new features:

1. Update relevant documentation files
2. Add entries to [INDEX.md](./INDEX.md)
3. Update cross-references in related documents
4. Include code examples
5. Update this README.md summary

## Support

- GitHub Issues: <https://github.com/Digital-Defiance/express-suite/issues>
- Email: <support@digitaldefiance.org>

---

Last Updated: March 2026
