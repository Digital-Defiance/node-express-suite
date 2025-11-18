# Documentation Index

## Core Documentation

### Architecture & Design
- **[Architecture Overview](./ARCHITECTURE.md)** - System design, data flow, and extension points
- **[Controllers](./CONTROLLERS.md)** - Controller system, decorators, and request handling
- **[Services](./SERVICES.md)** - Business logic layer and service container
- **[Models](./MODELS.md)** - Data models and model registry

### Infrastructure
- **[Application](./APPLICATION.md)** - Application setup and lifecycle
- **[Middleware](./MIDDLEWARE.md)** - Request pipeline and middleware system
- **[Transactions](./TRANSACTIONS.md)** - MongoDB transaction management
- **[Pipeline](./PIPELINE.md)** - Middleware pipeline builder

### Data Layer
- **[Documents](./DOCUMENTS.md)** - Document interfaces and types
- **[Schemas](./SCHEMAS.md)** - Mongoose schemas and validation
- **[Model Registry](./MODEL_REGISTRY.md)** - Dynamic model registration

### Extensibility
- **[Plugins](./PLUGINS.md)** - Plugin system and custom plugins
- **[Responses](./RESPONSES.md)** - Response builders and formatting
- **[Routers](./ROUTERS.md)** - Router configuration

### Utilities & Helpers
- **[Utils](./UTILS.md)** - Utility functions and helpers
- **[Constants](./CONSTANTS.md)** - Application constants
- **[Environment](./ENVIRONMENT.md)** - Environment configuration
- **[Types](./TYPES.md)** - TypeScript type definitions

### Migration & Upgrade
- **[i18n Migration](./i18n-MIGRATION.md)** - Internationalization migration guide
- **[V2 Migration Plan](./V2_MIGRATION_PLAN.md)** - Version 2.0 migration guide
- **[V2 Fixes Applied](./V2_FIXES_APPLIED.md)** - Applied fixes documentation
- **[i18n Instance Fix](./I18N_INSTANCE_FIX.md)** - i18n instance fixes

## Quick Links

### Getting Started
1. [Architecture Overview](./ARCHITECTURE.md#introduction)
2. [Creating Controllers](./CONTROLLERS.md#creating-custom-controllers)
3. [Implementing Services](./SERVICES.md#creating-custom-services)
4. [Defining Models](./MODELS.md#creating-custom-models)

### Common Tasks
- [Adding Authentication](./MIDDLEWARE.md#authentication)
- [Using Transactions](./TRANSACTIONS.md#usage)
- [Building Pipelines](./PIPELINE.md#pipeline-builder)
- [Creating Plugins](./PLUGINS.md#creating-plugins)

### Best Practices
- [Controller Best Practices](./CONTROLLERS.md#best-practices)
- [Service Best Practices](./SERVICES.md#best-practices)
- [Model Best Practices](./MODELS.md#best-practices)
- [Security Best Practices](./ARCHITECTURE.md#security-architecture)

## Documentation by Feature

### Authentication & Authorization
- [JWT Authentication](./MIDDLEWARE.md#authenticate-token)
- [Crypto Authentication](./MIDDLEWARE.md#authenticate-crypto)
- [Role-Based Access Control](./SERVICES.md#roleservice)
- [Backup Codes](./SERVICES.md#backupcodeservice)

### Data Management
- [User Management](./SERVICES.md#userservice)
- [CRUD Operations](./MODELS.md#built-in-models)
- [Transactions](./TRANSACTIONS.md)
- [Soft Deletes](./MODELS.md#soft-deletes)

### Encryption & Security
- [ECIES Encryption](./SERVICES.md#eciesservice)
- [Key Wrapping](./SERVICES.md#keywrappingservice)
- [Mnemonic Storage](./SERVICES.md#mnemonicservice)
- [Password Hashing](./UTILS.md#security-utils)

### Internationalization
- [Multi-language Support](./ARCHITECTURE.md#i18n)
- [Translation System](./SERVICES.md#request-user-service)
- [Language Context](./MIDDLEWARE.md#language-middleware)

### Testing
- [Controller Testing](./CONTROLLERS.md#testing-controllers)
- [Service Testing](./SERVICES.md#testing)
- [Model Testing](./MODELS.md#testing-models)
- [Integration Testing](../README.md#testing)

## API Reference

### Core Classes
- `Application` - Main application class
- `BaseController` - Controller base class
- `DecoratorBaseController` - Decorator-based controller
- `ServiceContainer` - Dependency injection container
- `ModelRegistry` - Model registration system
- `TransactionManager` - Transaction coordination

### Decorators
- `@Controller()` - Controller decorator
- `@Get()`, `@Post()`, `@Put()`, `@Delete()`, `@Patch()` - HTTP method decorators
- `@Auth()` - Authentication decorator
- `@Validate()` - Validation decorator

### Services
- `UserService` - User management
- `JwtService` - JWT tokens
- `RoleService` - Role management
- `BackupCodeService` - Backup codes
- `ECIESService` - Encryption
- `KeyWrappingService` - Key wrapping
- `MnemonicService` - Mnemonic storage

### Middleware
- `authenticateToken` - JWT authentication
- `authenticateCrypto` - Cryptographic authentication
- `setGlobalContextLanguage` - Language context
- `errorHandler` - Error handling

## Contributing to Documentation

### Documentation Standards
- Use clear, concise language
- Include code examples
- Add TypeScript type signatures
- Link to related documentation
- Include best practices section

### File Organization
```
docs/
├── ARCHITECTURE.md          # System architecture
├── CONTROLLERS.md           # Controller documentation
├── SERVICES.md              # Service documentation
├── MODELS.md                # Model documentation
├── MIDDLEWARE.md            # Middleware documentation
├── APPLICATION.md           # Application documentation
├── TRANSACTIONS.md          # Transaction documentation
├── PIPELINE.md              # Pipeline documentation
├── PLUGINS.md               # Plugin system
├── DOCUMENTS.md             # Document interfaces
├── SCHEMAS.md               # Schema definitions
├── RESPONSES.md             # Response builders
├── ROUTERS.md               # Router configuration
├── UTILS.md                 # Utility functions
├── CONSTANTS.md             # Constants
├── ENVIRONMENT.md           # Environment config
├── TYPES.md                 # Type definitions
├── MODEL_REGISTRY.md        # Model registry
└── INDEX.md                 # This file
```

### Updating Documentation
1. Keep examples up-to-date with code changes
2. Add new sections for new features
3. Update cross-references when files move
4. Maintain consistent formatting
5. Test all code examples

## Version History

### v2.2 (Current)
- User settings endpoints
- Dark mode support
- Direct challenge login
- Enhanced testing

### v2.1
- i18n improvements
- Test suite stabilization
- Coverage improvements

### v2.0
- Architecture refactor
- Service container
- Decorator system
- Plugin system

## Support & Resources

### Getting Help
- [GitHub Issues](https://github.com/Digital-Defiance/express-suite/issues)
- [Email Support](mailto:support@digitaldefiance.org)
- [Contributing Guide](../CONTRIBUTING.md)

### External Resources
- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

Last Updated: November 2025
