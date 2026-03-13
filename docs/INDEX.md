# Documentation Index

> **Note:** Starting with v5.0, all MongoDB/Mongoose-specific code has been extracted into
> [`@digitaldefiance/node-express-suite-mongo`](https://www.npmjs.com/package/@digitaldefiance/node-express-suite-mongo).
> Documentation for Mongoose documents, schemas, models, `MongoDatabasePlugin`, `DatabaseInitializationService`,
> `UserService`, `RoleService`, `ModelRegistry`, `TransactionManager`, and related types lives in that package's README.

## Core Documentation

### Architecture & Design

- **[Architecture Overview](./ARCHITECTURE.md)** — System design, data flow, plugin system, and extension points
- **[Controllers](./CONTROLLERS.md)** — Controller system, decorator API, request handling, and OpenAPI generation
- **[Decorator Migration](./DECORATOR_MIGRATION.md)** — Migrating from RouteConfig to the decorator-based controller API
- **[Services](./SERVICES.md)** — Business logic layer and service patterns
- **[Middleware](./MIDDLEWARE.md)** — Request pipeline, authentication, and middleware system

### Data Layer (Database-Agnostic)

- **[Schemas](./SCHEMAS.md)** — Schema patterns (base package provides the `ISchema` contract; Mongoose implementations are in the mongo package)
- **[Models](./MODELS.md)** — Model patterns and the `IDatabasePlugin` interface

### Migration & Upgrade

- **[Mongo Split Migration](./MONGO_SPLIT_MIGRATION.md)** — Migrating from pre-split versions to the two-package architecture
- **[i18n Migration](./i18n-MIGRATION.md)** — Internationalization migration guide

### UPnP (Let's Encrypt / TLS)

- **[UPnP Architecture](./UPnP_Architecture.md)** — Automated TLS certificate management design
- **[UPnP Configuration](./UPnP_Configuration.md)** — Environment variables and setup
- **[UPnP Manual Testing](./UPnP_Manual_Testing.md)** — Testing TLS locally

### Reference

- **[docs/README.md](./README.md)** — Quick-reference summary

## Quick Links

### Getting Started

1. Read the [Architecture Overview](./ARCHITECTURE.md)
2. Set up your [Application](../README.md#quick-start) with the plugin of your choice
3. Create [Controllers](./CONTROLLERS.md) using the decorator API
4. Implement [Services](./SERVICES.md) for business logic
5. If using MongoDB, install `@digitaldefiance/node-express-suite-mongo` and follow its README

### Common Tasks

- Adding authentication — see [Middleware](./MIDDLEWARE.md)
- Building decorator-based controllers — see [Controllers](./CONTROLLERS.md)
- Migrating to decorators — see [Decorator Migration](./DECORATOR_MIGRATION.md)
- Using a database plugin — see [Architecture](./ARCHITECTURE.md)
- Configuring Let's Encrypt — see [UPnP Configuration](./UPnP_Configuration.md)

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

---

Last Updated: March 2026
