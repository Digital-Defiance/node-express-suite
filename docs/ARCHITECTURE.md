# Architecture Overview

## Table of Contents

- [Introduction](#introduction)
- [Core Concepts](#core-concepts)
- [System Components](#system-components)
- [Data Flow](#data-flow)
- [Security Architecture](#security-architecture)
- [Extension Points](#extension-points)

## Introduction

`@digitaldefiance/node-express-suite` is a comprehensive, opinionated Express.js framework built around security, type safety, and extensibility. The architecture follows a layered approach with clear separation of concerns.

> **Package Split:** Starting with v5.0, the framework is split into two packages:
> - `@digitaldefiance/node-express-suite` — database-agnostic core (this package)
> - `@digitaldefiance/node-express-suite-mongo` — MongoDB/Mongoose extensions
>
> The core package defines interfaces (`IDatabasePlugin`, `IDatabase`) that database-specific packages implement. See [MONGO_SPLIT_MIGRATION.md](./MONGO_SPLIT_MIGRATION.md) for migration details.

## Core Concepts

### 1. Decorator-Based Controllers

Controllers use TypeScript decorators to define routes and middleware declaratively:

```typescript
@Controller()
export class UserController extends DecoratorBaseController {
  @Get('/profile', { auth: true })
  async getProfile(req: Request, res: Response) {
    // Handler implementation
  }
}
```

### 2. Service Container

Centralized dependency injection manages service lifecycle:

```typescript
const userService = app.services.get(ServiceKeys.USER);
```

### 3. Transaction Management

Automatic transaction handling via decorators:

```typescript
@Post('/register', { transaction: true })
async register(req: Request, res: Response) {
  // this.session available automatically
}
```

### 4. Dynamic Model Registry

Extensible document model system:

```typescript
ModelRegistry.instance.register({
  modelName: 'User',
  schema: UserSchema,
  collection: 'users'
});
```

## System Components

### Application Layer

```
┌─────────────────────────────────────┐
│         Application                 │
│  - Environment configuration        │
│  - Service container                │
│  - Plugin manager                   │
│  - Database connection              │
└─────────────────────────────────────┘
```

### Controller Layer

```
┌─────────────────────────────────────┐
│         Controllers                 │
│  - Route definitions                │
│  - Request validation               │
│  - Response formatting              │
│  - Transaction coordination         │
└─────────────────────────────────────┘
```

### Service Layer

```
┌─────────────────────────────────────┐
│          Services                   │
│  - Business logic                   │
│  - Data access                      │
│  - External integrations            │
│  - Encryption/security              │
└─────────────────────────────────────┘
```

### Data Layer

```
┌─────────────────────────────────────┐
│       Data Layer                    │
│  - MongoDB models                   │
│  - Schema definitions               │
│  - Document interfaces              │
│  - Model registry                   │
└─────────────────────────────────────┘
```

## Data Flow

### Request Flow

```
Request → Middleware Pipeline → Controller → Service → Database
                                     ↓
                                  Validation
                                     ↓
                                Authentication
                                     ↓
                                 Transaction
```

### Response Flow

```
Database → Service → Controller → Response Builder → Client
              ↓
         Transform
              ↓
          Translate
              ↓
           Format
```

## Security Architecture

### Encryption Layers

1. **Transport Security**: HTTPS/TLS for all communications
2. **Password Hashing**: PBKDF2 with configurable profiles
3. **ECIES Encryption**: End-to-end encryption for sensitive data
4. **JWT Tokens**: Secure authentication with role-based access

### Authentication Flow

```
┌──────────┐    Challenge    ┌──────────┐
│  Client  │ ──────────────> │  Server  │
└──────────┘                 └──────────┘
     │                            │
     │    Signature                │
     │ ──────────────────────────> │
     │                            │
     │                       Verify
     │                            │
     │        JWT Token           │
     │ <────────────────────────── │
     │                            │
```

### Authorization Model

```
User ──has──> Roles ──contain──> Permissions
  │
  └──validated by──> Middleware ──grants──> Access
```

## Extension Points

### 1. Custom Controllers

Extend `DecoratorBaseController` to create custom controllers with full decorator support.

### 2. Plugin System

Implement `IApplicationPlugin` to add functionality:

```typescript
class MyPlugin implements IApplicationPlugin {
  async init(app: IApplication) { /* setup */ }
  async stop() { /* cleanup */ }
}
```

### 3. Custom Models

Extend base schemas and register with ModelRegistry:

```typescript
const CustomSchema = UserSchema.clone();
CustomSchema.add({ customField: String });
ModelRegistry.instance.register({
  modelName: 'CustomUser',
  schema: CustomSchema,
  collection: 'custom_users'
});
```

### 4. Middleware Pipeline

Build custom middleware pipelines:

```typescript
const pipeline = Pipeline.create()
  .use(Auth.token())
  .use(Validate.schema(schema))
  .use(customMiddleware)
  .build();
```

### 5. Service Extensions

Register custom services in the container:

```typescript
app.services.register(MyServiceKey, new MyService(app));
```

## Best Practices

### 1. Separation of Concerns

- Controllers handle HTTP concerns only
- Services contain business logic
- Models define data structure
- Utilities provide reusable functions

### 2. Type Safety

- Use TypeScript throughout
- Define interfaces for all data structures
- Leverage generic types where appropriate
- Avoid `any` types

### 3. Error Handling

- Use custom error classes
- Implement proper error middleware
- Log errors with context
- Return appropriate HTTP status codes

### 4. Testing

- Unit test services independently
- Integration test controllers
- Mock external dependencies
- Test error paths

### 5. Security

- Validate all user input
- Use parameterized queries
- Implement rate limiting
- Enable CORS appropriately
- Keep dependencies updated

## Performance Considerations

### 1. Database

- Use indexes for common queries
- Implement connection pooling
- Use transactions judiciously
- Consider caching strategies

### 2. Async Operations

- Use `Promise.all()` for parallel operations
- Avoid blocking the event loop
- Implement timeouts
- Handle backpressure

### 3. Memory

- Clean up resources properly
- Use streams for large data
- Implement pagination
- Monitor memory usage

## Deployment Architecture

```
┌─────────────────────────────────────┐
│         Load Balancer               │
└─────────────────────────────────────┘
            │         │
    ┌───────┘         └───────┐
    ↓                         ↓
┌─────────┐             ┌─────────┐
│ Node 1  │             │ Node 2  │
└─────────┘             └─────────┘
    │                         │
    └───────┐         ┌───────┘
            ↓         ↓
    ┌─────────────────────┐
    │      MongoDB        │
    │   Replica Set       │
    └─────────────────────┘
```

## Related Documentation

- [Controllers](./CONTROLLERS.md) - Detailed controller documentation
- [Services](./SERVICES.md) - Service layer documentation
- [Models](./MODELS.md) - Data layer documentation
- [Middleware](./MIDDLEWARE.md) - Middleware documentation
- [Security](./SECURITY.md) - Security features documentation
