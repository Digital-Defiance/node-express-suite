# @digitaldefiance/node-express-suite

[![npm version](https://badge.fury.io/js/%40digitaldefiance%2Fnode-express-suite.svg)](https://badge.fury.io/js/%40digitaldefiance%2Fnode-express-suite)
[![Tests](https://img.shields.io/badge/tests-2541%20passing-brightgreen)]()
[![Coverage](https://img.shields.io/badge/coverage-57.86%25-yellow)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

An opinionated, secure, extensible Node.js/Express service framework built on Digital Defiance cryptography libraries, providing complete backend infrastructure for secure applications.

It is an 'out of the box' solution with a specific recipe (Mongo, Express, React, Node, (MERN) stack) with ejs templating, JWT authentication, role-based access control, custom multi-language support via @digitaldefiance/i18n-lib, and a dynamic model registry system. You might either find it limiting or freeing, depending on your use case. It includes mnemonic authentication, ECIES encryption/decryption, PBKDF2 key derivation, email token workflows, and more.

Part of [Express Suite](https://github.com/Digital-Defiance/express-suite)

## What's New in v3.12.0

✨ **Comprehensive Decorator API for Express Controllers** - A complete decorator-based API for defining controllers, routes, validation, and OpenAPI documentation with automatic spec generation.

**New Decorators:**

| Category | Decorators |
|----------|------------|
| Controller | `@Controller`, `@ApiController` |
| HTTP Methods | `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch` (enhanced with OpenAPI support) |
| Authentication | `@RequireAuth`, `@RequireCryptoAuth`, `@Public`, `@AuthFailureStatus` |
| Parameters | `@Param`, `@Body`, `@Query`, `@Header`, `@CurrentUser`, `@EciesUser`, `@Req`, `@Res`, `@Next` |
| Validation | `@ValidateBody`, `@ValidateParams`, `@ValidateQuery` (Zod & express-validator) |
| Response | `@Returns`, `@ResponseDoc`, `@RawJson`, `@Paginated` |
| Middleware | `@UseMiddleware`, `@CacheResponse`, `@RateLimit` |
| Transaction | `@Transactional` |
| OpenAPI | `@ApiOperation`, `@ApiTags`, `@ApiSummary`, `@ApiDescription`, `@Deprecated`, `@ApiOperationId`, `@ApiExample` |
| OpenAPI Params | `@ApiParam`, `@ApiQuery`, `@ApiHeader`, `@ApiRequestBody` |
| Lifecycle | `@OnSuccess`, `@OnError`, `@Before`, `@After` |
| Schema | `@ApiSchema`, `@ApiProperty` |

**Key Features:**
- **Full RouteConfig Parity**: Every feature available in manual `RouteConfig` has a decorator equivalent
- **Automatic OpenAPI Generation**: Decorators automatically generate complete OpenAPI 3.0.3 specifications
- **Zod Integration**: Zod schemas are automatically converted to OpenAPI request body schemas
- **Metadata Merging**: Multiple decorators on the same method merge their OpenAPI metadata
- **Class-Level Inheritance**: Class-level decorators (auth, tags, middleware) apply to all methods unless overridden
- **Parameter Injection**: Clean, typed parameter injection with `@Param`, `@Body`, `@Query`, `@Header`
- **Lifecycle Hooks**: `@Before`, `@After`, `@OnSuccess`, `@OnError` for request lifecycle management

**Documentation Middleware:**
- `SwaggerUIMiddleware` - Serve Swagger UI with customization options
- `ReDocMiddleware` - Serve ReDoc documentation
- `generateMarkdownDocs()` - Generate markdown documentation from OpenAPI spec

**Migration Support:**
- Full backward compatibility with existing `RouteConfig` approach
- Comprehensive migration guide in `docs/DECORATOR_MIGRATION.md`
- Mixed usage supported (decorated + manual routes in same controller)

## What's New in v3.11.25

✨ **String Key Enum Registration & i18n v4 Integration** - Upgraded to `@digitaldefiance/i18n-lib` v4.0.5 with branded enum translation support and `translateStringKey()` for automatic component ID resolution.

**New Features:**
- **Direct String Key Translation**: Use `translateStringKey()` without specifying component IDs
- **Automatic Component Routing**: Branded enums resolve to their registered components automatically
- **Safe Translation**: `safeTranslateStringKey()` returns placeholder on failure instead of throwing

**Dependencies:**
- `@digitaldefiance/ecies-lib`: 4.15.1 → 4.16.0
- `@digitaldefiance/i18n-lib`: 4.0.3 → 4.0.5
- `@digitaldefiance/node-ecies-lib`: 4.15.1 → 4.16.0
- `@digitaldefiance/suite-core-lib`: 3.9.1 → 3.10.0
- `@noble/curves`: 1.4.2 → 1.9.0
- `@noble/hashes`: 1.4.0 → 1.8.0

## What's New in v3.8.0

✨ **Dependency Upgrades & API Alignment** - Upgraded to `@digitaldefiance/ecies-lib` v4.13.0, `@digitaldefiance/node-ecies-lib` v4.13.0, and `@digitaldefiance/suite-core-lib` v3.7.0.

**Breaking Changes:**
- **Encryption API renamed**: `encryptSimpleOrSingle()` → `encryptBasic()` / `encryptWithLength()`
- **Decryption API renamed**: `decryptSimpleOrSingleWithHeader()` → `decryptBasicWithHeader()` / `decryptWithLengthAndHeader()`
- **Configuration change**: `registerNodeRuntimeConfiguration()` now requires a key parameter
- **XorService behavior change**: Now throws error when key is shorter than data (previously cycled the key)
- **Removed constants**: `OBJECT_ID_LENGTH` removed from `IConstants` - use `idProvider.byteLength` instead

**Interface Changes:**
- `IConstants` now extends both `INodeEciesConstants` and `ISuiteCoreConstants`
- Added `ECIES_CONFIG` to configuration
- Encryption mode constants renamed: `SIMPLE` → `BASIC`, `SINGLE` → `WITH_LENGTH`

## Features

- **🔐 ECIES Encryption/Decryption**: End-to-end encryption using elliptic curve cryptography
- **🔑 PBKDF2 Key Derivation**: Secure password hashing with configurable profiles
- **👥 Role-Based Access Control (RBAC)**: Flexible permission system with user roles
- **🌍 Multi-Language i18n**: Plugin-based internationalization with 8+ languages
- **📊 Dynamic Model Registry**: Extensible document model system
- **🔧 Runtime Configuration**: Override defaults at runtime for advanced use cases
- **🛡️ JWT Authentication**: Secure token-based authentication
- **📧 Email Token System**: Verification, password reset, and recovery workflows
- **💾 MongoDB Integration**: Full database layer with Mongoose schemas
- **🧪 Comprehensive Testing**: 100+ tests covering all major functionality
- **🏗️ Modern Architecture**: Service container, fluent builders, plugin system
- **⚡ Simplified Generics**: 87.5% reduction in type complexity
- **🔄 Automatic Transactions**: Decorator-based transaction management
- **🎨 Fluent APIs**: Validation, response, pipeline, and route builders

## Installation

```bash
npm install @digitaldefiance/node-express-suite
# or
yarn add @digitaldefiance/node-express-suite
```

## Quick Start

### Basic Server Setup

```typescript
import { Application, DatabaseInitializationService, emailServiceRegistry } from '@digitaldefiance/node-express-suite';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { EmailService } from './services/email'; // Your concrete implementation

// Create application instance
const app = new Application({
  port: 3000,
  mongoUri: 'mongodb://localhost:27017/myapp',
  jwtSecret: process.env.JWT_SECRET,
  defaultLanguage: LanguageCodes.EN_US
});

// Configure email service (required before using middleware)
emailServiceRegistry.setService(new EmailService(app));

// Initialize database with default users and roles
const initResult = await DatabaseInitializationService.initUserDb(app);

// Start server
await app.start();
console.log(`Server running on port ${app.environment.port}`);
```

### User Authentication

```typescript
import { JwtService, UserService } from '@digitaldefiance/node-express-suite';

// Create services
const jwtService = new JwtService(app);
const userService = new UserService(app);

// Sign in user
const user = await userService.findByUsername('alice');
const { token, roles } = await jwtService.signToken(user, app.environment.jwtSecret);

// Verify token
const tokenUser = await jwtService.verifyToken(token);
console.log(`User ${tokenUser.userId} authenticated with roles:`, tokenUser.roles);
```

## Core Components

### Dynamic Model Registry

The package uses a dynamic model registration system for extensibility:

```typescript
import { ModelRegistry } from '@digitaldefiance/node-express-suite';

// Register a custom model
ModelRegistry.instance.register({
  modelName: 'Organization',
  schema: organizationSchema,
  model: OrganizationModel,
  collection: 'organizations',
});

// Retrieve model anywhere in your app
const OrgModel = ModelRegistry.instance.get<IOrganizationDocument>('Organization').model;

// Use the model
const org = await OrgModel.findById(orgId);
```

### Built-in Models

The framework includes these pre-registered models:

- **User**: User accounts with authentication
- **Role**: Permission roles for RBAC
- **UserRole**: User-to-role associations
- **EmailToken**: Email verification and recovery tokens
- **Mnemonic**: Encrypted mnemonic storage
- **UsedDirectLoginToken**: One-time login token tracking

### Extending Models and Schemas

All model functions support generic type parameters for custom model names and collections:

```typescript
import { UserModel, EmailTokenModel } from '@digitaldefiance/node-express-suite';

// Use with default enums
const defaultUserModel = UserModel(connection);

// Use with custom model names and collections
const customUserModel = UserModel(
  connection,
  'CustomUser',
  'custom_users'
);
```

#### Extending Schemas

Clone and extend base schemas with additional fields:

```typescript
import { EmailTokenSchema } from '@digitaldefiance/node-express-suite';
import { Schema } from 'mongoose';

// Clone and extend the schema
const ExtendedEmailTokenSchema = EmailTokenSchema.clone();
ExtendedEmailTokenSchema.add({
  customField: { type: String, required: false },
  metadata: { type: Schema.Types.Mixed, required: false },
});

// Use with custom model
const MyEmailTokenModel = connection.model(
  'ExtendedEmailToken',
  ExtendedEmailTokenSchema,
  'extended_email_tokens'
);
```

#### Extending Model Functions

Create custom model functions that wrap extended schemas:

```typescript
import { IEmailTokenDocument } from '@digitaldefiance/node-express-suite';
import { Connection, Model } from 'mongoose';

// Extend the document interface
interface IExtendedEmailTokenDocument extends IEmailTokenDocument {
  customField?: string;
  metadata?: any;
}

// Create extended schema (as shown above)
const ExtendedEmailTokenSchema = EmailTokenSchema.clone();
ExtendedEmailTokenSchema.add({
  customField: { type: String },
  metadata: { type: Schema.Types.Mixed },
});

// Create custom model function
export function ExtendedEmailTokenModel<
  TModelName extends string = 'ExtendedEmailToken',
  TCollection extends string = 'extended_email_tokens'
>(
  connection: Connection,
  modelName: TModelName = 'ExtendedEmailToken' as TModelName,
  collection: TCollection = 'extended_email_tokens' as TCollection,
): Model<IExtendedEmailTokenDocument> {
  return connection.model<IExtendedEmailTokenDocument>(
    modelName,
    ExtendedEmailTokenSchema,
    collection,
  );
}

// Use the extended model
const model = ExtendedEmailTokenModel(connection);
const token = await model.create({
  userId,
  type: EmailTokenType.AccountVerification,
  token: 'abc123',
  email: 'user@example.com',
  customField: 'custom value',
  metadata: { source: 'api' },
});
```

#### Custom Enumerations

Extend the base enumerations for your application:

```typescript
import { BaseModelName, SchemaCollection } from '@digitaldefiance/node-express-suite';

// Extend base enums
enum MyModelName {
  User = BaseModelName.User,
  Role = BaseModelName.Role,
  Organization = 'Organization',
  Project = 'Project',
}

enum MyCollection {
  User = SchemaCollection.User,
  Role = SchemaCollection.Role,
  Organization = 'organizations',
  Project = 'projects',
}

// Use with model functions
const orgModel = UserModel<MyModelName, MyCollection>(
  connection,
  MyModelName.Organization,
  MyCollection.Organization
);
```

#### Complete Extension Example

Combining schemas, documents, and model functions:

```typescript
import { IUserDocument, UserSchema } from '@digitaldefiance/node-express-suite';
import { Connection, Model, Schema } from 'mongoose';

// 1. Extend document interface
interface IOrganizationUserDocument extends IUserDocument {
  organizationId: string;
  department?: string;
}

// 2. Extend schema
const OrganizationUserSchema = UserSchema.clone();
OrganizationUserSchema.add({
  organizationId: { type: String, required: true },
  department: { type: String },
});

// 3. Create model function
export function OrganizationUserModel(
  connection: Connection,
): Model<IOrganizationUserDocument> {
  return connection.model<IOrganizationUserDocument>(
    'OrganizationUser',
    OrganizationUserSchema,
    'organization_users',
  );
}

// 4. Use in application
const model = OrganizationUserModel(connection);
const user = await model.create({
  username: 'alice',
  email: 'alice@example.com',
  organizationId: 'org-123',
  department: 'Engineering',
});
```

### Services

#### ECIESService

Encryption and key management:

```typescript
import { ECIESService } from '@digitaldefiance/node-express-suite';

const eciesService = new ECIESService();

// Generate mnemonic
const mnemonic = eciesService.generateNewMnemonic();

// Encrypt data
const encrypted = await eciesService.encryptWithLength(
  recipientPublicKey,
  Buffer.from('secret message')
);

// Decrypt data
const decrypted = await eciesService.decryptWithLengthAndHeader(
  privateKey,
  encrypted
);
```

#### KeyWrappingService

Secure key storage and retrieval:

```typescript
import { KeyWrappingService } from '@digitaldefiance/node-express-suite';

const keyWrapping = new KeyWrappingService(app);

// Wrap a key with password
const wrapped = await keyWrapping.wrapKey(
  privateKey,
  password,
  salt
);

// Unwrap key
const unwrapped = await keyWrapping.unwrapKey(
  wrapped,
  password,
  salt
);
```

#### RoleService

Role and permission management:

```typescript
import { RoleService } from '@digitaldefiance/node-express-suite';

const roleService = new RoleService(app);

// Get user roles
const roles = await roleService.getUserRoles(userId);

// Check permissions
const hasPermission = await roleService.userHasRole(userId, 'admin');

// Create role
const adminRole = await roleService.createRole({
  name: 'admin',
  description: 'Administrator role',
  permissions: ['read', 'write', 'delete']
});
```

#### BackupCodeService

Backup code generation and validation:

```typescript
import { BackupCodeService } from '@digitaldefiance/node-express-suite';

const backupCodeService = new BackupCodeService(app);

// Generate backup codes
const codes = await backupCodeService.generateBackupCodes(userId);

// Validate code
const isValid = await backupCodeService.validateBackupCode(userId, userCode);

// Mark code as used
await backupCodeService.useBackupCode(userId, userCode);
```

### Database Initialization

Initialize database with default users and roles:

```typescript
import { DatabaseInitializationService } from '@digitaldefiance/node-express-suite';

// Initialize with default admin, member, and system users
const result = await DatabaseInitializationService.initUserDb(app);

if (result.success) {
  console.log('Admin user:', result.data.adminUsername);
  console.log('Admin password:', result.data.adminPassword);
  console.log('Admin mnemonic:', result.data.adminMnemonic);
  console.log('Backup codes:', result.data.adminBackupCodes);
}
```

### Middleware

#### Email Service Configuration

Before using middleware that requires email functionality, configure the email service:

```typescript
import { emailServiceRegistry, IEmailService } from '@digitaldefiance/node-express-suite';

// Implement the IEmailService interface
class MyEmailService implements IEmailService {
  async sendEmail(to: string, subject: string, text: string, html: string): Promise<void> {
    // Your email implementation (AWS SES, SendGrid, etc.)
  }
}

// Register at application startup
emailServiceRegistry.setService(new MyEmailService());
```

#### Authentication Middleware

```typescript
import { authMiddleware } from '@digitaldefiance/node-express-suite';

// Protect routes with JWT authentication
app.get('/api/protected', authMiddleware, (req, res) => {
  // req.user contains authenticated user info
  res.json({ user: req.user });
});
```

#### Role-Based Authorization

```typescript
import { requireRole } from '@digitaldefiance/node-express-suite';

// Require specific role
app.delete('/api/users/:id', 
  authMiddleware,
  requireRole('admin'),
  async (req, res) => {
    // Only admins can access this route
    await userService.deleteUser(req.params.id);
    res.json({ success: true });
  }
);
```

## Runtime Configuration Registry

Override defaults at runtime for advanced use cases:

```typescript
import {
  getExpressRuntimeConfiguration,
  registerExpressRuntimeConfiguration,
} from '@digitaldefiance/node-express-suite';

// Get current configuration
const config = getExpressRuntimeConfiguration();
console.log('Bcrypt rounds:', config.BcryptRounds);

// Register custom configuration
const customKey = Symbol('custom-express-config');
registerExpressRuntimeConfiguration(customKey, { 
  BcryptRounds: 12,
  JWT: {
    ALGORITHM: 'HS512',
    EXPIRATION_SEC: 7200
  }
});

// Use custom configuration
const customConfig = getExpressRuntimeConfiguration(customKey);
```

### Available Configuration Options

```typescript
interface IExpressRuntimeConfiguration {
  BcryptRounds: number;
  JWT: {
    ALGORITHM: string;
    EXPIRATION_SEC: number;
  };
  BACKUP_CODES: {
    Count: number;
    Length: number;
  };
  // ... more options
}
```

## Internationalization

Built-in support for multiple languages using the plugin-based i18n architecture:

```typescript
import { getGlobalI18nEngine, translateExpressSuite } from '@digitaldefiance/node-express-suite';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';

// Get the global i18n engine
const i18n = getGlobalI18nEngine();

// Translate strings using branded string keys (v3.11.0+)
// Component ID is automatically resolved from the branded enum
const message = translateExpressSuite(
  ExpressSuiteStringKey.Common_Ready,
  {},
  LanguageCodes.FR
);
// "Prêt"

// Change language globally
i18n.setLanguage(LanguageCodes.ES);
```

### Direct String Key Translation

Starting with v3.11.0, the library uses `translateStringKey()` internally for automatic component ID resolution from branded enums. This means you can also use the engine directly:

```typescript
import { getGlobalI18nEngine } from '@digitaldefiance/node-express-suite';
import { ExpressSuiteStringKey } from '@digitaldefiance/node-express-suite';

const engine = getGlobalI18nEngine();

// Direct translation - component ID resolved automatically
const text = engine.translateStringKey(ExpressSuiteStringKey.Common_Ready);

// Safe version returns placeholder on failure
const safe = engine.safeTranslateStringKey(ExpressSuiteStringKey.Common_Ready);
```

### Supported Languages

- English (US)
- Spanish
- French
- Mandarin Chinese
- Japanese
- German
- Ukrainian

## Error Handling

Comprehensive error types with localization:

```typescript
import { 
  TranslatableError,
  InvalidJwtTokenError,
  TokenExpiredError,
  UserNotFoundError
} from '@digitaldefiance/node-express-suite';

try {
  const user = await userService.findByEmail(email);
} catch (error) {
  if (error instanceof UserNotFoundError) {
    // Handle user not found
    res.status(404).json({ 
      error: error.message // Automatically localized
    });
  } else if (error instanceof TranslatableError) {
    // Handle other translatable errors
    res.status(400).json({ error: error.message });
  }
}
```

## Testing

Comprehensive test suite with 2541 passing tests:

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- database-initialization.spec.ts
npm test -- jwt.spec.ts
npm test -- role.spec.ts

# Run with coverage
npm test -- --coverage
```

### Test Utilities

Test helpers and mocks are available via the `/testing` entry point:

```typescript
// Import test utilities
import { 
  mockFunctions,
  setupTestEnv,
  // ... other test helpers
} from '@digitaldefiance/node-express-suite/testing';

// Use in your tests
beforeAll(async () => {
  await setupTestEnv();
});
```

**Note:** The `/testing` entry point requires `@faker-js/faker` as a peer dependency. Install it in your dev dependencies:

```bash
npm install -D @faker-js/faker
# or
yarn add -D @faker-js/faker
```

### Test Coverage (v2.1)

- **2541 tests** passing (100% success rate)
- **57.86%** overall coverage
- **11 modules** at 100% coverage
- All critical paths tested (validation, auth, services)

## Let's Encrypt (Automated TLS)

The package supports automated TLS certificate management via [Let's Encrypt](https://letsencrypt.org/) using `greenlock-express`. When enabled, the Application automatically obtains and renews certificates, serves your app over HTTPS on port 443, and redirects HTTP traffic from port 80 to HTTPS.

### Environment Variables

| Variable | Type | Default | Description |
|---|---|---|---|
| `LETS_ENCRYPT_ENABLED` | `boolean` | `false` | Set to `true` or `1` to enable Let's Encrypt certificate management |
| `LETS_ENCRYPT_EMAIL` | `string` | *(required when enabled)* | Contact email for your Let's Encrypt account (used for expiry notices and account recovery) |
| `LETS_ENCRYPT_HOSTNAMES` | `string` | *(required when enabled)* | Comma-separated list of hostnames to obtain certificates for (supports wildcards, e.g. `*.example.com`) |
| `LETS_ENCRYPT_STAGING` | `boolean` | `false` | Set to `true` or `1` to use the Let's Encrypt staging directory (recommended for testing) |
| `LETS_ENCRYPT_CONFIG_DIR` | `string` | `./greenlock.d` | Directory for Greenlock configuration and certificate storage |

### Example: Single Hostname

```env
LETS_ENCRYPT_ENABLED=true
LETS_ENCRYPT_EMAIL=admin@example.com
LETS_ENCRYPT_HOSTNAMES=example.com
LETS_ENCRYPT_STAGING=false
```

### Example: Multiple Hostnames with Wildcard

```env
LETS_ENCRYPT_ENABLED=true
LETS_ENCRYPT_EMAIL=admin@example.com
LETS_ENCRYPT_HOSTNAMES=example.com,*.example.com,api.example.com
LETS_ENCRYPT_STAGING=false
```

Wildcard hostnames (e.g. `*.example.com`) require DNS-01 challenge validation. Ensure your DNS provider supports programmatic record creation or configure the appropriate Greenlock plugin.

### Port Requirements

When Let's Encrypt is enabled, the Application binds to three ports:

- **Port 443** — HTTPS server with the auto-managed TLS certificate
- **Port 80** — HTTP redirect server (301 redirects all traffic to HTTPS, also serves ACME HTTP-01 challenges)
- **`environment.port`** (default 3000) — Primary HTTP server for internal or health-check traffic

Ports 80 and 443 are privileged ports on most systems. You may need elevated permissions to bind to them:

- **Linux**: Use `setcap` to grant the Node.js binary the capability without running as root:
  ```bash
  sudo setcap 'cap_net_bind_service=+ep' $(which node)
  ```
- **Docker**: Map the ports in your container configuration (containers typically run as root internally)
- **Reverse proxy**: Alternatively, run behind a reverse proxy (e.g. nginx) that handles ports 80/443 and forwards to your app

### Mutual Exclusivity with Dev-Certificate HTTPS

Let's Encrypt mode and the dev-certificate HTTPS mode (`HTTPS_DEV_CERT_ROOT`) are mutually exclusive at runtime. When `LETS_ENCRYPT_ENABLED=true`, the dev-certificate HTTPS block is automatically skipped to avoid port conflicts. You do not need to unset `HTTPS_DEV_CERT_ROOT` — the Application handles this internally.

- **Production**: Use `LETS_ENCRYPT_ENABLED=true` for real certificates
- **Development**: Use `HTTPS_DEV_CERT_ROOT` for self-signed dev certificates
- **Never enable both simultaneously** — Let's Encrypt takes precedence when enabled

## Best Practices

### Security

1. **Always use environment variables** for sensitive configuration:

   ```typescript
   const app = new Application({
     jwtSecret: process.env.JWT_SECRET,
     mongoUri: process.env.MONGO_URI,
   });
   ```

2. **Validate all user input** before processing:

   ```typescript
   import { EmailString } from '@digitaldefiance/ecies-lib';
   
   try {
     const email = new EmailString(userInput);
     // Email is validated
   } catch (error) {
     // Invalid email format
   }
   ```

3. **Use secure password hashing** with appropriate bcrypt rounds:

   ```typescript
   const config = getExpressRuntimeConfiguration();
   const hashedPassword = await bcrypt.hash(password, config.BcryptRounds);
   ```

### Performance

1. **Use async operations** to avoid blocking:

   ```typescript
   const [user, roles] = await Promise.all([
     userService.findById(userId),
     roleService.getUserRoles(userId)
   ]);
   ```

2. **Implement caching** for frequently accessed data:

   ```typescript
   const cachedRoles = await cache.get(`user:${userId}:roles`);
   if (!cachedRoles) {
     const roles = await roleService.getUserRoles(userId);
     await cache.set(`user:${userId}:roles`, roles, 3600);
   }
   ```

3. **Use database indexes** for common queries:

   ```typescript
   userSchema.index({ email: 1 }, { unique: true });
   userSchema.index({ username: 1 }, { unique: true });
   ```

## API Reference

### Application

- `new Application(config)` - Create application instance
- `start()` - Start the Express server
- `stop()` - Stop the server gracefully
- `environment` - Access configuration

### Services

- `ECIESService` - Encryption and key management
- `KeyWrappingService` - Secure key storage
- `JwtService` - JWT token operations
- `RoleService` - Role and permission management
- `UserService` - User account operations
- `BackupCodeService` - Backup code management
- `MnemonicService` - Mnemonic storage and retrieval
- `SystemUserService` - System user operations
- `DatabaseInitializationService` - Database initialization with default users and roles
- `DirectLoginTokenService` - One-time login token management
- `RequestUserService` - Extract user from request context
- `ChecksumService` - CRC checksum operations
- `SymmetricService` - Symmetric encryption operations
- `XorService` - XOR cipher operations
- `FecService` - Forward error correction
- `DummyEmailService` - Test email service implementation

### Utilities

- `ModelRegistry` - Dynamic model registration
- `debugLog()` - Conditional logging utility
- `withTransaction()` - MongoDB transaction wrapper

## Testing

### Testing Approach

The node-express-suite package uses comprehensive testing with 604 tests covering all services, middleware, controllers, and database operations.

**Test Framework**: Jest with TypeScript support  
**Property-Based Testing**: fast-check for validation properties  
**Coverage**: 57.86% overall, 100% on critical paths  
**Database**: MongoDB Memory Server for isolated testing

### Test Structure

```
tests/
  ├── unit/              # Unit tests for services and utilities
  ├── integration/       # Integration tests for multi-service flows
  ├── e2e/               # End-to-end API tests
  ├── middleware/        # Middleware tests
  └── fixtures/          # Test data and mocks
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test suite
npm test -- user-service.spec.ts

# Run in watch mode
npm test -- --watch
```

### Test Patterns

#### Testing Services

```typescript
import { UserService, Application } from '@digitaldefiance/node-express-suite';

describe('UserService', () => {
  let app: Application;
  let userService: UserService;

  beforeAll(async () => {
    app = new Application({
      mongoUri: 'mongodb://localhost:27017/test',
      jwtSecret: 'test-secret'
    });
    await app.start();
    userService = new UserService(app);
  });

  afterAll(async () => {
    await app.stop();
  });

  it('should create user', async () => {
    const user = await userService.create({
      username: 'alice',
      email: 'alice@example.com',
      password: 'SecurePass123!'
    });
    
    expect(user.username).toBe('alice');
  });
});
```

#### Testing Middleware

```typescript
import { authMiddleware } from '@digitaldefiance/node-express-suite';
import { Request, Response, NextFunction } from 'express';

describe('Auth Middleware', () => {
  it('should reject requests without token', async () => {
    const req = { headers: {} } as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await authMiddleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
```

#### Testing Controllers

```typescript
import { UserController } from '@digitaldefiance/node-express-suite';

describe('UserController', () => {
  it('should register new user', async () => {
    const controller = new UserController(app);
    const req = {
      body: {
        username: 'alice',
        email: 'alice@example.com',
        password: 'SecurePass123!'
      }
    } as Request;
    
    const result = await controller.register(req, res, next);
    
    expect(result.statusCode).toBe(201);
    expect(result.response.data.user).toBeDefined();
  });
});
```

#### Testing Database Operations

```typescript
import { connectMemoryDB, disconnectMemoryDB, clearMemoryDB } from '@digitaldefiance/express-suite-test-utils';
import { UserModel } from '@digitaldefiance/node-express-suite';

describe('User Model', () => {
  beforeAll(async () => {
    await connectMemoryDB();
  });

  afterAll(async () => {
    await disconnectMemoryDB();
  });

  afterEach(async () => {
    await clearMemoryDB();
  });

  it('should validate user schema', async () => {
    const User = UserModel(connection);
    const user = new User({
      username: 'alice',
      email: 'alice@example.com'
    });
    
    await expect(user.validate()).resolves.not.toThrow();
  });
});
```

### Testing Best Practices

1. **Use MongoDB Memory Server** for isolated database testing
2. **Test with transactions** to ensure data consistency
3. **Mock external services** like email providers
4. **Test error conditions** and edge cases
5. **Test middleware** in isolation and integration
6. **Test authentication** and authorization flows

### Cross-Package Testing

Testing integration with other Express Suite packages:

```typescript
import { Application } from '@digitaldefiance/node-express-suite';
import { ECIESService } from '@digitaldefiance/node-ecies-lib';
import { IBackendUser } from '@digitaldefiance/suite-core-lib';

describe('Cross-Package Integration', () => {
  it('should integrate ECIES with user management', async () => {
    const app = new Application({ /* config */ });
    const ecies = new ECIESService();
    
    // Create user with encrypted data
    const user = await app.services.get(ServiceKeys.USER).create({
      username: 'alice',
      email: 'alice@example.com',
      // ... encrypted fields
    });
    
    expect(user).toBeDefined();
  });
});
```

## Decorator API

The decorator API provides a declarative, type-safe approach to building Express APIs with automatic OpenAPI documentation generation. Decorators eliminate boilerplate while maintaining full feature parity with manual `RouteConfig`.

### Overview

| Category | Decorators | Purpose |
|----------|------------|---------|
| Controller | `@Controller`, `@ApiController` | Define controller base path and OpenAPI metadata |
| HTTP Methods | `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch` | Define route handlers with OpenAPI support |
| Authentication | `@RequireAuth`, `@RequireCryptoAuth`, `@Public`, `@AuthFailureStatus` | Control authentication requirements |
| Parameters | `@Param`, `@Body`, `@Query`, `@Header`, `@CurrentUser`, `@EciesUser`, `@Req`, `@Res`, `@Next` | Inject request data into handler parameters |
| Validation | `@ValidateBody`, `@ValidateParams`, `@ValidateQuery` | Validate request data with Zod or express-validator |
| Response | `@Returns`, `@ResponseDoc`, `@RawJson`, `@Paginated` | Document response types for OpenAPI |
| Middleware | `@UseMiddleware`, `@CacheResponse`, `@RateLimit` | Attach middleware to routes |
| Transaction | `@Transactional` | Wrap handlers in MongoDB transactions |
| OpenAPI | `@ApiOperation`, `@ApiTags`, `@ApiSummary`, `@ApiDescription`, `@Deprecated`, `@ApiOperationId`, `@ApiExample` | Add OpenAPI documentation |
| OpenAPI Params | `@ApiParam`, `@ApiQuery`, `@ApiHeader`, `@ApiRequestBody` | Document parameters with full OpenAPI metadata |
| Lifecycle | `@OnSuccess`, `@OnError`, `@Before`, `@After` | Hook into request lifecycle events |
| Handler Args | `@HandlerArgs` | Pass additional arguments to handlers |
| Schema | `@ApiSchema`, `@ApiProperty` | Register OpenAPI schemas from classes |

### Quick Start Example

```typescript
import {
  ApiController,
  Get,
  Post,
  Put,
  Delete,
  RequireAuth,
  Public,
  Param,
  Body,
  Query,
  ValidateBody,
  Returns,
  ApiTags,
  Transactional,
  DecoratorBaseController,
} from '@digitaldefiance/node-express-suite';
import { z } from 'zod';

// Define validation schema
const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(['admin', 'user']).optional(),
});

@RequireAuth() // All routes require authentication by default
@ApiTags('Users')
@ApiController('/api/users', {
  description: 'User management endpoints',
})
class UserController extends DecoratorBaseController {
  @Public() // Override class-level auth - this route is public
  @Returns(200, 'User[]', { description: 'List of users' })
  @Get('/')
  async listUsers(
    @Query('page', { schema: { type: 'integer' } }) page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.userService.findAll({ page, limit });
  }

  @Returns(200, 'User', { description: 'User details' })
  @Returns(404, 'ErrorResponse', { description: 'User not found' })
  @Get('/:id')
  async getUser(@Param('id', { description: 'User ID' }) id: string) {
    return this.userService.findById(id);
  }

  @ValidateBody(CreateUserSchema)
  @Transactional()
  @Returns(201, 'User', { description: 'Created user' })
  @Post('/')
  async createUser(@Body() data: z.infer<typeof CreateUserSchema>) {
    return this.userService.create(data);
  }

  @Transactional()
  @Returns(200, 'User', { description: 'Updated user' })
  @Put('/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() data: Partial<z.infer<typeof CreateUserSchema>>,
  ) {
    return this.userService.update(id, data);
  }

  @Transactional()
  @Returns(204, undefined, { description: 'User deleted' })
  @Delete('/:id')
  async deleteUser(@Param('id') id: string) {
    await this.userService.delete(id);
  }
}
```

### Controller Decorators

```typescript
// Basic controller (no OpenAPI metadata)
@Controller('/api/items')
class ItemController {}

// OpenAPI-enabled controller with metadata
@ApiController('/api/users', {
  tags: ['Users', 'Admin'],
  description: 'User management endpoints',
  deprecated: false,
  name: 'UserController', // Optional, defaults to class name
})
class UserController extends DecoratorBaseController {}
```

### HTTP Method Decorators

All HTTP method decorators support inline OpenAPI options:

```typescript
@Get('/users/:id', {
  summary: 'Get user by ID',
  description: 'Retrieves a user by their unique identifier',
  tags: ['Users'],
  operationId: 'getUserById',
  deprecated: false,
  auth: true,           // Shorthand for @RequireAuth()
  cryptoAuth: false,    // Shorthand for @RequireCryptoAuth()
  rawJson: false,       // Shorthand for @RawJson()
  transaction: false,   // Shorthand for @Transactional()
  middleware: [],       // Express middleware array
  validation: [],       // express-validator chains
  schema: zodSchema,    // Zod schema for body validation
})
async getUser() {}
```

### Authentication Decorators

```typescript
// Require JWT authentication
@RequireAuth()
@ApiController('/api/secure')
class SecureController {
  @Get('/data')
  getData() {} // Requires auth (inherited from class)

  @Public()
  @Get('/public')
  getPublic() {} // No auth required (overrides class-level)
}

// Require ECIES crypto authentication
@RequireCryptoAuth()
@Post('/encrypted')
async createEncrypted() {}

// Custom auth failure status code
@AuthFailureStatus(403)
@Get('/admin')
getAdmin() {} // Returns 403 instead of 401 on auth failure
```

### Parameter Injection Decorators

```typescript
@Get('/:id')
async getUser(
  // Path parameter with OpenAPI documentation
  @Param('id', { description: 'User ID', schema: { type: 'string', format: 'uuid' } }) id: string,
  
  // Query parameters
  @Query('include', { description: 'Fields to include' }) include?: string,
  
  // Header value
  @Header('X-Request-ID') requestId?: string,
  
  // Authenticated user from JWT
  @CurrentUser() user: AuthenticatedUser,
  
  // ECIES authenticated member
  @EciesUser() member: EciesMember,
  
  // Raw Express objects (use sparingly)
  @Req() req: Request,
  @Res() res: Response,
  @Next() next: NextFunction,
) {}

@Post('/')
async createUser(
  // Entire request body
  @Body() data: CreateUserDto,
  
  // Specific field from body
  @Body('email') email: string,
) {}
```

### Validation Decorators

```typescript
// Zod schema validation
const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

@ValidateBody(CreateUserSchema)
@Post('/')
async createUser(@Body() data: z.infer<typeof CreateUserSchema>) {}

// express-validator chains
@ValidateBody([
  body('name').isString().notEmpty(),
  body('email').isEmail(),
])
@Post('/')
async createUser() {}

// Language-aware validation with constants
@ValidateBody(function(lang) {
  return [
    body('username')
      .matches(this.constants.UsernameRegex)
      .withMessage(getTranslation(lang, 'invalidUsername')),
  ];
})
@Post('/')
async createUser() {}

// Validate path parameters
@ValidateParams(z.object({ id: z.string().uuid() }))
@Get('/:id')
async getUser() {}

// Validate query parameters
@ValidateQuery(z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().max(100).optional(),
}))
@Get('/')
async listUsers() {}
```

### Response Decorators

```typescript
// Document response types (stackable for multiple status codes)
@Returns(200, 'User', { description: 'User found' })
@Returns(404, 'ErrorResponse', { description: 'User not found' })
@Get('/:id')
async getUser() {}

// Inline schema for simple responses
@ResponseDoc(200, {
  description: 'Health check response',
  schema: {
    type: 'object',
    properties: {
      status: { type: 'string' },
      timestamp: { type: 'string', format: 'date-time' },
    },
  },
})
@Get('/health')
healthCheck() {}

// Raw JSON response (bypasses response wrapper)
@RawJson()
@Get('/raw')
getRawData() {}

// Paginated endpoint (adds page/limit query params to OpenAPI)
@Paginated({ defaultPageSize: 20, maxPageSize: 100 })
@Returns(200, 'User[]')
@Get('/')
async listUsers() {}

// Offset-based pagination
@Paginated({ useOffset: true, defaultPageSize: 20 })
@Get('/items')
async listItems() {}
```

### Middleware Decorators

```typescript
// Attach middleware (class or method level)
@UseMiddleware(loggerMiddleware)
@ApiController('/api/data')
class DataController {
  @UseMiddleware([validateMiddleware, sanitizeMiddleware])
  @Post('/')
  createData() {}
}

// Response caching
@CacheResponse({ ttl: 60 }) // Cache for 60 seconds
@Get('/static')
getStaticData() {}

@CacheResponse({
  ttl: 300,
  varyByUser: true,        // Different cache per user
  varyByQuery: ['page'],   // Different cache per query param
  keyPrefix: 'users',      // Custom cache key prefix
})
@Get('/user-data')
getUserData() {}

// Rate limiting (auto-adds 429 response to OpenAPI)
@RateLimit({ requests: 5, window: 60 }) // 5 requests per minute
@Post('/login')
login() {}

@RateLimit({
  requests: 100,
  window: 3600,
  byUser: true,                    // Limit per user instead of IP
  message: 'Hourly limit exceeded',
  keyGenerator: (req) => req.ip,   // Custom key generator
})
@Get('/api-data')
getApiData() {}
```

### Transaction Decorator

```typescript
// Basic transaction
@Transactional()
@Post('/')
async createOrder() {
  // this.session available automatically in DecoratorBaseController
  await this.orderService.create(data, this.session);
}

// Transaction with timeout
@Transactional({ timeout: 30000 }) // 30 second timeout
@Post('/bulk')
async bulkCreate() {}
```

### OpenAPI Operation Decorators

```typescript
// Full operation metadata
@ApiOperation({
  summary: 'Get user by ID',
  description: 'Retrieves a user by their unique identifier',
  tags: ['Users'],
  operationId: 'getUserById',
  deprecated: false,
})
@Get('/:id')
getUser() {}

// Individual decorators (composable)
@ApiSummary('Get user by ID')
@ApiDescription('Retrieves a user by their unique identifier')
@ApiTags('Users', 'Public')
@ApiOperationId('getUserById')
@Deprecated()
@Get('/:id')
getUser() {}

// Class-level tags apply to all methods
@ApiTags('Users')
@ApiController('/api/users')
class UserController {
  @ApiTags('Admin') // Adds to class tags: ['Users', 'Admin']
  @Get('/admin')
  adminEndpoint() {}
}

// Add examples
@ApiExample({
  name: 'validUser',
  summary: 'A valid user response',
  value: { id: '123', name: 'John Doe', email: 'john@example.com' },
  type: 'response',
  statusCode: 200,
})
@Get('/:id')
getUser() {}
```

### OpenAPI Parameter Decorators

```typescript
// Document path parameter with full metadata
@ApiParam('id', {
  description: 'User ID',
  schema: { type: 'string', format: 'uuid' },
  example: '123e4567-e89b-12d3-a456-426614174000',
})
@Get('/:id')
getUser(@Param('id') id: string) {}

// Document query parameters
@ApiQuery('page', {
  description: 'Page number',
  schema: { type: 'integer', minimum: 1 },
  required: false,
  example: 1,
})
@ApiQuery('sort', {
  description: 'Sort field',
  enum: ['name', 'date', 'id'],
})
@Get('/')
listUsers() {}

// Document headers
@ApiHeader('X-Request-ID', {
  description: 'Request tracking ID',
  schema: { type: 'string', format: 'uuid' },
  required: true,
})
@Get('/')
getData() {}

// Document request body
@ApiRequestBody({
  schema: 'CreateUserDto',  // Reference to registered schema
  description: 'User data to create',
  required: true,
  example: { name: 'John', email: 'john@example.com' },
})
@Post('/')
createUser() {}

// Or with Zod schema
@ApiRequestBody({
  schema: CreateUserSchema,  // Zod schema
  description: 'User data',
})
@Post('/')
createUser() {}
```

### Lifecycle Decorators

```typescript
// Execute after successful response
@OnSuccess(({ req, result }) => {
  console.log(`User ${req.params.id} fetched:`, result);
})
@Get('/:id')
getUser() {}

// Execute on error
@OnError(({ req, error }) => {
  logger.error(`Error on ${req.path}:`, error);
})
@Get('/:id')
getUser() {}

// Execute before handler
@Before(({ req }) => {
  console.log(`Incoming request to ${req.path}`);
})
@Get('/')
listUsers() {}

// Execute after handler (success or error)
@After(({ req, result, error }) => {
  metrics.recordRequest(req.path, error ? 'error' : 'success');
})
@Get('/')
listUsers() {}

// Class-level hooks apply to all methods
@OnError(({ error }) => logger.error(error))
@ApiController('/api/users')
class UserController {}
```

### Handler Args Decorator

```typescript
// Pass additional arguments to handler
@HandlerArgs({ maxItems: 100 })
@Get('/')
listItems(req: Request, config: { maxItems: number }) {
  // config.maxItems === 100
}

// Multiple arguments
@HandlerArgs('prefix', 42, { option: true })
@Post('/')
createItem(req: Request, prefix: string, count: number, options: object) {}
```

### Schema Decorators

```typescript
// Register class as OpenAPI schema
@ApiSchema({ description: 'User entity' })
class User {
  @ApiProperty({
    type: 'string',
    format: 'uuid',
    description: 'Unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    type: 'string',
    format: 'email',
    required: true,
  })
  email: string;

  @ApiProperty({
    type: 'integer',
    minimum: 0,
    maximum: 150,
  })
  age?: number;

  @ApiProperty({
    type: 'array',
    items: 'Role',  // Reference to another schema
  })
  roles: Role[];
}

// Inheritance is supported
@ApiSchema()
class AdminUser extends User {
  @ApiProperty({ type: 'string' })
  adminLevel: string;
}
```

### Decorator Composition and Stacking

Decorators can be freely composed and stacked. Order matters for some decorators:

```typescript
// Middleware executes top to bottom
@UseMiddleware(first)
@UseMiddleware(second)
@UseMiddleware(third)
@Get('/')
handler() {} // Executes: first → second → third → handler

// Multiple @Returns accumulate (don't replace)
@Returns(200, 'User')
@Returns(400, 'ValidationError')
@Returns(404, 'NotFoundError')
@Returns(500, 'ServerError')
@Get('/:id')
getUser() {}

// Tags merge (class + method)
@ApiTags('Users')
@ApiController('/api/users')
class UserController {
  @ApiTags('Admin')
  @Get('/admin')
  admin() {} // Tags: ['Users', 'Admin']
}

// Method-level overrides class-level for same field
@RequireAuth()
@ApiController('/api/data')
class DataController {
  @Get('/private')
  private() {} // Requires auth (inherited)

  @Public()
  @Get('/public')
  public() {} // No auth (overridden)
}
```

### Comparison: Manual RouteConfig vs Decorators

| RouteConfig Field | Decorator Equivalent |
|-------------------|---------------------|
| `method` | `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch` |
| `path` | Decorator path argument |
| `handlerKey` | Decorated method name (automatic) |
| `handlerArgs` | `@HandlerArgs(...args)` |
| `useAuthentication` | `@RequireAuth()` |
| `useCryptoAuthentication` | `@RequireCryptoAuth()` |
| `middleware` | `@UseMiddleware(...)` |
| `validation` | `@ValidateBody()`, `@ValidateParams()`, `@ValidateQuery()` |
| `rawJsonHandler` | `@RawJson()` |
| `authFailureStatusCode` | `@AuthFailureStatus(code)` |
| `useTransaction` | `@Transactional()` |
| `transactionTimeout` | `@Transactional({ timeout })` |
| `openapi.summary` | `@ApiSummary(text)` |
| `openapi.description` | `@ApiDescription(text)` |
| `openapi.tags` | `@ApiTags(...tags)` |
| `openapi.operationId` | `@ApiOperationId(id)` |
| `openapi.deprecated` | `@Deprecated()` |
| `openapi.requestBody` | `@ApiRequestBody(options)` |
| `openapi.responses` | `@Returns(code, schema)` |
| `openapi.parameters` | `@ApiParam()`, `@ApiQuery()`, `@ApiHeader()` |

### Decorator Options TypeScript Types

```typescript
// Controller options
interface ApiControllerOptions {
  tags?: string[];
  description?: string;
  deprecated?: boolean;
  name?: string;
}

// Route decorator options
interface RouteDecoratorOptions<TLanguage> {
  validation?: ValidationChain[] | ((lang: TLanguage) => ValidationChain[]);
  schema?: z.ZodSchema;
  middleware?: RequestHandler[];
  auth?: boolean;
  cryptoAuth?: boolean;
  rawJson?: boolean;
  transaction?: boolean;
  transactionTimeout?: number;
  summary?: string;
  description?: string;
  tags?: string[];
  operationId?: string;
  deprecated?: boolean;
  openapi?: OpenAPIRouteMetadata;
}

// Parameter decorator options
interface ParamDecoratorOptions {
  description?: string;
  example?: unknown;
  required?: boolean;
  schema?: OpenAPIParameterSchema;
}

// Cache options
interface CacheDecoratorOptions {
  ttl: number;              // Time to live in seconds
  keyPrefix?: string;
  varyByUser?: boolean;
  varyByQuery?: string[];
}

// Rate limit options
interface RateLimitDecoratorOptions {
  requests: number;         // Max requests
  window: number;           // Time window in seconds
  message?: string;
  byUser?: boolean;
  keyGenerator?: (req: Request) => string;
}

// Pagination options
interface PaginatedDecoratorOptions {
  defaultPageSize?: number;
  maxPageSize?: number;
  useOffset?: boolean;      // Use offset/limit instead of page/limit
}

// Transaction options
interface TransactionalDecoratorOptions {
  timeout?: number;         // Timeout in milliseconds
}
```

### Troubleshooting

**Decorators not working?**
- Ensure `experimentalDecorators: true` and `emitDecoratorMetadata: true` in tsconfig.json
- Import `reflect-metadata` at the top of your entry file
- Extend `DecoratorBaseController` for full decorator support

**OpenAPI metadata not appearing?**
- Use `@ApiController` instead of `@Controller` for OpenAPI support
- Ensure decorators are applied before HTTP method decorators (bottom-up execution)
- Check that schemas are registered with `@ApiSchema` or `OpenAPISchemaRegistry`

**Authentication not enforced?**
- Verify `@RequireAuth()` is applied at class or method level
- Check that `@Public()` isn't overriding at method level
- Ensure auth middleware is configured in your application

**Validation errors not returning 400?**
- Validation decorators automatically add 400 response to OpenAPI
- Ensure validation middleware is properly configured
- Check that Zod schemas or express-validator chains are valid

**Parameter injection not working?**
- Parameter decorators must be on method parameters, not properties
- Ensure the handler is called through the decorated controller
- Check parameter index matches the decorator position

For detailed migration instructions, see [docs/DECORATOR_MIGRATION.md](./docs/DECORATOR_MIGRATION.md).

## Documentation

📚 **Comprehensive documentation is available in the [`docs/`](./docs) directory.**

### Quick Links

- **[📚 Documentation Index](./docs/INDEX.md)** - Complete documentation index
- **[🏗️ Architecture](./docs/ARCHITECTURE.md)** - System design and architecture
- **[🎮 Controllers](./docs/CONTROLLERS.md)** - Controller system and decorators
- **[⚙️ Services](./docs/SERVICES.md)** - Business logic and service container
- **[📊 Models](./docs/MODELS.md)** - Data models and registry
- **[🔌 Middleware](./docs/MIDDLEWARE.md)** - Request pipeline
- **[💾 Transactions](./docs/TRANSACTIONS.md)** - Transaction management
- **[🔧 Plugins](./docs/PLUGINS.md)** - Plugin system

See the [full documentation index](./docs/INDEX.md) for all available documentation.

## License

MIT © Digital Defiance

## Related Packages

- `@digitaldefiance/ecies-lib` - Core ECIES encryption library
- `@digitaldefiance/node-ecies-lib` - Node.js ECIES implementation
- `@digitaldefiance/i18n-lib` - Internationalization framework
- `@digitaldefiance/suite-core-lib` - Core user management primitives

## Contributing

Contributions are welcome! Please read the contributing guidelines in the main repository.

## Support

For issues and questions:

- GitHub Issues: <https://github.com/Digital-Defiance/node-express-suite/issues>
- Email: <support@digitaldefiance.org>

## Plugin-Based Architecture

The framework uses a plugin-based architecture that separates database concerns from the core application. This replaces the old deep inheritance hierarchy (Mongo base → Application → concrete subclass) with a composable plugin pattern.

### Architecture Overview

```
BaseApplication<TID>          ← Database-agnostic base (accepts IDatabase)
  └── Application<TID>        ← HTTP/Express layer (server, routing, middleware)
        └── useDatabasePlugin()  ← Plug in any database backend

IDatabasePlugin<TID>          ← Plugin interface for database backends
  └── MongoDatabasePlugin     ← Mongoose/MongoDB implementation

MongoApplicationConcrete      ← Ready-to-use concrete class for testing/dev
```

### Core Classes

| Class | Purpose |
|-------|---------|
| `BaseApplication<TID>` | Database-agnostic base. Accepts an `IDatabase` instance and optional lifecycle hooks. Manages `PluginManager`, `ServiceContainer`, and environment. |
| `Application<TID>` | Extends `BaseApplication` with Express HTTP/HTTPS server, routing, CSP/Helmet config, and middleware. Database-agnostic — database backends are provided via `IDatabasePlugin`. |
| `MongoApplicationConcrete<TID>` | Concrete `Application` subclass for testing/development. Wires up `MongoDatabasePlugin` with default configuration, schema maps, and a dummy email service. Replaces the old concrete class. |

### IDatabasePlugin Interface

The `IDatabasePlugin<TID>` interface extends `IApplicationPlugin<TID>` with database-specific lifecycle hooks:

```typescript
interface IDatabasePlugin<TID> extends IApplicationPlugin<TID> {
  readonly database: IDatabase;
  readonly authenticationProvider?: IAuthenticationProvider<TID>;

  connect(uri?: string): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Optional dev/test store management
  setupDevStore?(): Promise<string>;
  teardownDevStore?(): Promise<void>;
  initializeDevStore?(): Promise<unknown>;
}
```

### MongoDatabasePlugin

`MongoDatabasePlugin` implements `IDatabasePlugin` for MongoDB/Mongoose:

```typescript
import { MongoDatabasePlugin } from '@digitaldefiance/node-express-suite';

const mongoPlugin = new MongoDatabasePlugin({
  schemaMapFactory: getSchemaMap,
  databaseInitFunction: DatabaseInitializationService.initUserDb.bind(DatabaseInitializationService),
  initResultHashFunction: DatabaseInitializationService.serverInitResultHash.bind(DatabaseInitializationService),
  environment,
  constants,
});
```

It wraps a `MongooseDocumentStore` and provides:
- Connection/disconnection lifecycle
- Dev database provisioning via `MongoMemoryReplSet`
- Authentication provider wiring
- Mongoose model and schema map access

### Application Constructor

The `Application` constructor accepts these parameters:

```typescript
constructor(
  environment: TEnvironment,
  apiRouterFactory: (app: IApplication<TID>) => BaseRouter<TID>,
  cspConfig?: ICSPConfig | HelmetOptions | IFlexibleCSP,
  constants?: TConstants,
  appRouterFactory?: (apiRouter: BaseRouter<TID>) => TAppRouter,
  customInitMiddleware?: typeof initMiddleware,
  database?: IDatabase,  // Optional — use useDatabasePlugin() instead
)
```

The `database` parameter is optional. When using a database plugin, the plugin's `database` property is used automatically.

### Registering a Database Plugin

Use `useDatabasePlugin()` to register a database plugin with the application:

```typescript
const app = new Application(environment, apiRouterFactory);
app.useDatabasePlugin(mongoPlugin);
await app.start();
```

`useDatabasePlugin()` stores the plugin as the application's database plugin AND registers it with the `PluginManager`, so it participates in the full plugin lifecycle (`init`, `stop`).

### Implementing a Custom Database Plugin (BrightChain Example)

To use a non-Mongo database, implement `IDatabasePlugin` directly. You do not need `IDocumentStore` or any Mongoose types:

```typescript
import type { IDatabasePlugin, IDatabase, IApplication } from '@digitaldefiance/node-express-suite';

class BrightChainDatabasePlugin implements IDatabasePlugin<Buffer> {
  readonly name = 'brightchain-database';
  readonly version = '1.0.0';

  private _connected = false;
  private _database: IDatabase;

  constructor(private config: BrightChainConfig) {
    this._database = new BrightChainDatabase(config);
  }

  get database(): IDatabase {
    return this._database;
  }

  // Optional: provide an auth provider if your DB manages authentication
  get authenticationProvider() {
    return undefined;
  }

  async connect(uri?: string): Promise<void> {
    await this._database.connect(uri ?? this.config.connectionString);
    this._connected = true;
  }

  async disconnect(): Promise<void> {
    await this._database.disconnect();
    this._connected = false;
  }

  isConnected(): boolean {
    return this._connected;
  }

  async init(app: IApplication<Buffer>): Promise<void> {
    // Wire up any app-level integrations after connection
    // e.g., register services, set auth provider, etc.
  }

  async stop(): Promise<void> {
    await this.disconnect();
  }
}

// Usage:
const app = new Application(environment, apiRouterFactory);
app.useDatabasePlugin(new BrightChainDatabasePlugin(config));
await app.start();
```

---

## Migration Guide: Inheritance → Plugin Architecture

This section covers migrating from the old inheritance-based hierarchy to the new plugin-based architecture.

### What Changed

| Before | After |
|--------|-------|
| Old Mongo base → `Application` → old concrete class | `BaseApplication` → `Application` + `IDatabasePlugin` |
| Database logic baked into the class hierarchy | Database logic provided via plugins |
| Old concrete class for testing/dev | `MongoApplicationConcrete` for testing/dev |
| Extending the old Mongo base for custom apps | Implementing `IDatabasePlugin` for custom databases |

### Before (Old Hierarchy)

```typescript
// Old: The concrete class extended Application which extended the Mongo base class
// Database logic was tightly coupled into the inheritance chain
import { /* old concrete class */ } from '@digitaldefiance/node-express-suite';

const app = new OldConcreteApp(environment);
await app.start();
```

### After (Plugin Architecture)

```typescript
// New: Application is database-agnostic, MongoDatabasePlugin provides Mongo support
import { MongoApplicationConcrete } from '@digitaldefiance/node-express-suite';

// For testing/development (drop-in replacement for the old concrete class):
const app = new MongoApplicationConcrete(environment);
await app.start();
```

Or for custom wiring:

```typescript
import { Application, MongoDatabasePlugin } from '@digitaldefiance/node-express-suite';

const app = new Application(environment, apiRouterFactory);

const mongoPlugin = new MongoDatabasePlugin({
  schemaMapFactory: getSchemaMap,
  databaseInitFunction: DatabaseInitializationService.initUserDb.bind(DatabaseInitializationService),
  initResultHashFunction: DatabaseInitializationService.serverInitResultHash.bind(DatabaseInitializationService),
  environment,
  constants,
});

app.useDatabasePlugin(mongoPlugin);
await app.start();
```

### Key Renames

| Old Name | New Name | Notes |
|----------|----------|-------|
| Old concrete class | `MongoApplicationConcrete` | Drop-in replacement for testing/dev |
| Old Mongo base class | *(removed)* | Functionality moved to `BaseApplication` + `MongoDatabasePlugin` |
| Old base file | `base-application.ts` | File renamed |
| Old concrete file | `mongo-application-concrete.ts` | File renamed |

### Migration Checklist

- [ ] Replace the old concrete class with `MongoApplicationConcrete`
- [ ] Replace any old Mongo base subclasses with `Application` + `useDatabasePlugin()`
- [ ] Update imports to use `base-application` (renamed from old base file)
- [ ] Update imports to use `mongo-application-concrete` (renamed from old concrete file)
- [ ] If you had a custom concrete subclass, convert it to use `MongoDatabasePlugin` or implement your own `IDatabasePlugin`

---

## Architecture Refactor (2025)

**Major improvements with large complexity reduction:**

### New Features

#### Service Container

```typescript
// Centralized dependency injection
const jwtService = app.services.get(ServiceKeys.JWT);
const userService = app.services.get(ServiceKeys.USER);
```

#### Simplified Generics

```typescript
// Before: IApplication<T, I, TBaseDoc, TEnv, TConst, ...>
// After: IApplication
const app: IApplication = ...;
```

#### Validation Builder

```typescript
validation: function(lang) {
  return ValidationBuilder.create(lang, this.constants)
    .for('email').isEmail().withMessage(key)
    .for('username').matches(c => c.UsernameRegex).withMessage(key)
    .build();
}
```

#### Transaction Decorator

```typescript
@Post('/register', { transaction: true })
async register() {
  // this.session available automatically
  await this.userService.create(data, this.session);
}
```

#### Response Builder

```typescript
return Response.created()
  .message(SuiteCoreStringKey.Registration_Success)
  .data({ user, mnemonic })
  .build();
```

#### Plugin System

```typescript
class MyPlugin implements IApplicationPlugin {
  async init(app: IApplication) { /* setup */ }
  async stop() { /* cleanup */ }
}
app.plugins.register(new MyPlugin());
```

#### Route Builder DSL

```typescript
RouteBuilder.create()
  .post('/register')
  .auth()
  .validate(validation)
  .transaction()
  .handle(this.register);
```

---

## Migration Guide (v1.x → v2.0)

### Overview

Version 2.0 introduces a major architecture refactor with **50% complexity reduction** while maintaining backward compatibility where possible. This guide helps you migrate from v1.x to v2.0.

### Breaking Changes

#### 1. Simplified Generic Parameters

**Before (v1.x):**

```typescript
class Application<T, I, TInitResults, TModelDocs, TBaseDocument, TEnvironment, TConstants, TAppRouter>
class UserController<I, D, S, A, TUser, TTokenRole, TTokenUser, TApplication, TLanguage>
```

**After (v2.0):**

```typescript
class Application  // No generic parameters
class UserController<TConfig extends ControllerConfig, TLanguage>
```

**Migration:**

- Remove all generic type parameters from Application instantiation
- Update controller signatures to use ControllerConfig interface
- Type information now inferred from configuration objects

#### 2. Service Instantiation

**Before (v1.x):**

```typescript
const jwtService = new JwtService(app);
const userService = new UserService(app);
const roleService = new RoleService(app);
```

**After (v2.0):**

```typescript
const jwtService = app.services.get(ServiceKeys.JWT);
const userService = app.services.get(ServiceKeys.USER);
const roleService = app.services.get(ServiceKeys.ROLE);
```

**Migration:**

- Replace direct service instantiation with container access
- Services are now singletons managed by the container
- Import ServiceKeys enum for type-safe service access

### Recommended Migrations (Non-Breaking)

#### 3. Transaction Handling

**Before (v1.x):**

```typescript
async register(req: Request, res: Response, next: NextFunction) {
  return await withTransaction(
    this.application.db.connection,
    this.application.environment.mongo.useTransactions,
    undefined,
    async (session) => {
      const user = await this.userService.create(data, session);
      const mnemonic = await this.mnemonicService.store(userId, session);
      return { statusCode: 201, response: { user, mnemonic } };
    }
  );
}
```

**After (v2.0):**

```typescript
@Post('/register', { transaction: true })
async register(req: Request, res: Response, next: NextFunction) {
  const user = await this.userService.create(data, this.session);
  const mnemonic = await this.mnemonicService.store(userId, this.session);
  return Response.created().data({ user, mnemonic }).build();
}
```

**Benefits:**

- 70% reduction in transaction boilerplate
- Automatic session management
- Cleaner, more readable code

#### 4. Response Construction

**Before (v1.x):**

```typescript
return {
  statusCode: 201,
  response: {
    message: getSuiteCoreTranslation(SuiteCoreStringKey.Registration_Success, undefined, lang),
    data: { user, mnemonic }
  }
};
```

**After (v2.0):**

```typescript
return Response.created()
  .message(SuiteCoreStringKey.Registration_Success)
  .data({ user, mnemonic })
  .build();
```

**Benefits:**

- 40% reduction in response boilerplate
- Fluent, chainable API
- Automatic translation handling

#### 5. Validation

**Before (v1.x):**

```typescript
protected getValidationRules(lang: TLanguage) {
  return [
    body('username')
      .matches(this.constants.UsernameRegex)
      .withMessage(getSuiteCoreTranslation(key, undefined, lang)),
    body('email')
      .isEmail()
      .withMessage(getSuiteCoreTranslation(key, undefined, lang))
  ];
}
```

**After (v2.0):**

```typescript
validation: function(lang: TLanguage) {
  return ValidationBuilder.create(lang, this.constants)
    .for('username').matches(c => c.UsernameRegex).withMessage(key)
    .for('email').isEmail().withMessage(key)
    .build();
}
```

**Benefits:**

- 50% reduction in validation code
- Constants automatically injected
- Type-safe field access
- Cleaner syntax

#### 6. Middleware Composition

**Before (v1.x):**

```typescript
router.post('/backup-codes',
  authMiddleware,
  authenticateCryptoMiddleware,
  validateSchema(backupCodeSchema),
  this.getBackupCodes.bind(this)
);
```

**After (v2.0):**

```typescript
@Post('/backup-codes', {
  pipeline: Pipeline.create()
    .use(Auth.token())
    .use(Auth.crypto())
    .use(Validate.schema(backupCodeSchema))
    .build()
})
async getBackupCodes() { /* ... */ }
```

**Benefits:**

- Explicit middleware ordering
- Reusable pipeline definitions
- Better readability

### Step-by-Step Migration

#### Step 1: Update Dependencies

```bash
npm install @digitaldefiance/node-express-suite@^2.0.0
# or
yarn add @digitaldefiance/node-express-suite@^2.0.0
```

#### Step 2: Update Application Initialization

**Before:**

```typescript
const app = new Application<MyTypes, MyIds, MyResults, MyModels, MyDoc, MyEnv, MyConst, MyRouter>({
  port: 3000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET
});
```

**After:**

```typescript
const app = new Application({
  port: 3000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET
});
```

#### Step 3: Update Service Access

Find and replace service instantiation:

```bash
# Find
new JwtService(app)
# Replace with
app.services.get(ServiceKeys.JWT)

# Find
new UserService(app)
# Replace with
app.services.get(ServiceKeys.USER)
```

#### Step 4: Migrate Controllers (Gradual)

Start with high-traffic endpoints:

1. Add transaction decorator to write operations
2. Replace response construction with Response builder
3. Update validation to use ValidationBuilder
4. Migrate middleware to Pipeline builder

#### Step 5: Test Thoroughly

```bash
# Run full test suite
npm test

# Run specific controller tests
npm test -- user-controller.spec.ts

# Check for deprecation warnings
DEBUG=* npm start
```

### Migration Checklist

- [ ] Update package to v2.0.0
- [ ] Remove generic parameters from Application
- [ ] Update service instantiation to use container
- [ ] Migrate transaction handling (high-priority endpoints)
- [ ] Migrate response construction (high-priority endpoints)
- [ ] Update validation rules (new endpoints first)
- [ ] Migrate middleware composition (optional)
- [ ] Run full test suite
- [ ] Check for deprecation warnings
- [ ] Update documentation
- [ ] Deploy to staging
- [ ] Monitor for issues
- [ ] Deploy to production

### Backward Compatibility

The following v1.x patterns still work in v2.0:

✅ Direct service instantiation (with deprecation warning)
✅ Manual transaction wrapping with withTransaction
✅ Manual response construction
✅ Traditional validation rules
✅ Direct middleware composition

### Performance Considerations

- Service container adds negligible overhead (~0.1ms per request)
- Transaction decorator has same performance as manual wrapping
- Response builder is optimized for common cases
- Validation builder compiles to same express-validator chains

### Troubleshooting

#### Issue: Type errors after upgrade

**Solution:** Remove generic type parameters from Application and controller signatures.

#### Issue: Services not found in container

**Solution:** Ensure services are registered during application initialization. Check ServiceKeys enum.

#### Issue: Transaction session undefined

**Solution:** Add `{ transaction: true }` to route decorator options.

#### Issue: Validation not working

**Solution:** Ensure ValidationBuilder.create receives correct language and constants.

### Getting Help

- **Documentation**: See REFACTOR_INDEX.md for complete refactor docs
- **Examples**: See REFACTOR_EXAMPLES.md for code examples
- **Issues**: Report bugs at GitHub Issues
- **Support**: Email <support@digitaldefiance.org>

### Additional Resources

- [Complete Refactor Summary](REFACTOR_COMPLETE_SUMMARY.md)
- [Quick Start Guide](REFACTOR_QUICKSTART.md)
- [Validation Examples](VALIDATION_BUILDER_EXAMPLES.md)
- [Architecture Plan](ARCHITECTURE_REFACTOR_PLAN.md)

---

## ChangeLog

### Version 3.12.0

**Comprehensive Decorator API for Express Controllers**

This release introduces a complete decorator-based API for defining controllers, routes, validation, and OpenAPI documentation. The decorator system provides a declarative, type-safe approach to building Express APIs with automatic OpenAPI 3.0.3 specification generation.

**New Decorator Categories:**

*Controller Decorators:*
- `@Controller(basePath)` - Define controller base path (existing, preserved for backward compatibility)
- `@ApiController(basePath, options?)` - Define controller with OpenAPI metadata (tags, description, deprecated)

*HTTP Method Decorators (Enhanced):*
- `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch` - Now support inline OpenAPI options (summary, description, tags, operationId, deprecated)

*Authentication Decorators:*
- `@RequireAuth()` - Require JWT authentication (auto-adds 401 response to OpenAPI)
- `@RequireCryptoAuth()` - Require ECIES crypto authentication
- `@Public()` - Mark route as public (overrides class-level auth)
- `@AuthFailureStatus(code)` - Set custom auth failure status code

*Parameter Injection Decorators:*
- `@Param(name, options?)` - Inject path parameter (auto-adds to OpenAPI)
- `@Body(field?)` - Inject request body or specific field
- `@Query(name, options?)` - Inject query parameter (auto-adds to OpenAPI)
- `@Header(name, options?)` - Inject header value (auto-adds to OpenAPI)
- `@CurrentUser()` - Inject authenticated user (`req.user`)
- `@EciesUser()` - Inject ECIES authenticated member (`req.eciesUser`)
- `@Req()`, `@Res()`, `@Next()` - Inject Express request/response/next

*Validation Decorators:*
- `@ValidateBody(schema)` - Validate request body with Zod or express-validator (auto-adds 400 response)
- `@ValidateParams(schema)` - Validate path parameters
- `@ValidateQuery(schema)` - Validate query parameters

*Response Decorators:*
- `@Returns(statusCode, schema, options?)` - Document response type (stackable for multiple status codes)
- `@ResponseDoc(responses)` - Document multiple responses at once
- `@RawJson()` - Bypass standard response wrapper
- `@Paginated(options?)` - Add pagination query parameters and response envelope

*Middleware Decorators:*
- `@UseMiddleware(...middleware)` - Attach Express middleware (class or method level)
- `@CacheResponse(options)` - Add response caching middleware
- `@RateLimit(options)` - Add rate limiting middleware (auto-adds 429 response)

*Transaction Decorator:*
- `@Transactional(options?)` - Wrap handler in MongoDB transaction with optional timeout

*OpenAPI Operation Decorators:*
- `@ApiOperation(metadata)` - Set full OpenAPI operation metadata
- `@ApiTags(...tags)` - Add tags (class or method level, additive)
- `@ApiSummary(text)` - Set operation summary
- `@ApiDescription(text)` - Set operation description
- `@Deprecated()` - Mark operation as deprecated
- `@ApiOperationId(id)` - Set unique operation ID
- `@ApiExample(example)` - Add request/response examples

*OpenAPI Parameter Decorators:*
- `@ApiParam(name, options)` - Document path parameter with full OpenAPI metadata
- `@ApiQuery(name, options)` - Document query parameter
- `@ApiHeader(name, options)` - Document header parameter
- `@ApiRequestBody(options)` - Document request body with schema, example, description

*Lifecycle Decorators:*
- `@OnSuccess(callback)` - Execute after successful response
- `@OnError(callback)` - Execute when error occurs
- `@Before(callback)` - Execute before handler
- `@After(callback)` - Execute after handler (success or error)

*Handler Args Decorator:*
- `@HandlerArgs(...args)` - Pass additional arguments to handler

*Schema Decorators:*
- `@ApiSchema(name?)` - Register class as OpenAPI schema
- `@ApiProperty(options)` - Add property metadata (type, description, required, example)

**New Documentation Middleware:**
- `SwaggerUIMiddleware(options)` - Serve Swagger UI with customization (title, favicon, CSS, JS)
- `ReDocMiddleware(options)` - Serve ReDoc documentation with customization
- `generateMarkdownDocs(spec)` - Generate markdown documentation from OpenAPI spec

**New Infrastructure:**
- `src/decorators/metadata-keys.ts` - Symbol constants for all decorator metadata
- `src/decorators/metadata-collector.ts` - Utility for metadata operations
- `src/interfaces/openApi/decoratorOptions.ts` - All decorator option interfaces
- Enhanced `DecoratorBaseController` with full metadata collection and parameter injection

**Zod Integration:**
- Comprehensive Zod to OpenAPI schema conversion
- Support for nested objects, arrays, unions, enums
- Automatic extraction of descriptions and examples from Zod schemas

**Key Features:**
- Full feature parity with manual `RouteConfig` approach
- Automatic OpenAPI 3.0.3 specification generation
- Metadata merging from multiple decorators
- Class-level decorator inheritance with method-level overrides
- Backward compatible - existing code continues to work unchanged

**Documentation:**
- Updated README with comprehensive Decorator API section
- New `docs/DECORATOR_MIGRATION.md` with complete migration guide
- Updated `docs/CONTROLLERS.md` featuring decorator-based approach
- JSDoc documentation on all public decorators and types

**Testing:**
- Property-based tests for decorator correctness properties
- Integration tests for full controller with all decorators
- E2E tests for HTTP requests to decorated endpoints

**Deprecations:**
- None. This release is fully backward compatible with existing code.

### Version 3.11.x (3.11.0 - 3.11.20)

**String Key Enum Registration & translateStringKey Support**

- Upgraded to `@digitaldefiance/i18n-lib` v4.0.5+ with branded enum translation support
- Upgraded to `@digitaldefiance/suite-core-lib` v3.10.0 with `registerStringKeyEnum()` and `translateStringKey()` support
- Upgraded to `@digitaldefiance/ecies-lib` v4.16.0 and `@digitaldefiance/node-ecies-lib` v4.16.0
- Updated `@noble/curves` to v1.9.0 and `@noble/hashes` to v1.8.0

**Dependencies:**
- `@digitaldefiance/ecies-lib`: 4.15.1 → 4.16.0
- `@digitaldefiance/i18n-lib`: 4.0.3 → 4.0.5
- `@digitaldefiance/node-ecies-lib`: 4.15.1 → 4.16.0
- `@digitaldefiance/suite-core-lib`: 3.9.1 → 3.10.0

### Version 3.10.x (3.10.1 - 3.10.5)

**Dependency Updates & Cleanup**

- Removed showcase yarn.lock files (moved to separate showcase directory)
- Updated dependencies for compatibility with suite-core-lib v3.9.x

### Version 3.9.0

**I18n v4 Upgrade & Branded Enum Support**

- Upgraded to `@digitaldefiance/i18n-lib` v4.0.3 with branded enum support
- Upgraded to `@digitaldefiance/suite-core-lib` v3.8.1 with improved i18n integration
- Upgraded to `@digitaldefiance/ecies-lib` v4.14.3 and `@digitaldefiance/node-ecies-lib` v4.14.2
- Added `build:prod` script for production builds
- Updated validation builder for i18n v4 compatibility
- Updated response builder for i18n v4 compatibility
- Updated base controller for i18n v4 compatibility
- Updated error classes for i18n v4 compatibility

**Dependencies:**
- `@digitaldefiance/ecies-lib`: 4.13.0 → 4.14.3
- `@digitaldefiance/i18n-lib`: 3.8.16 → 4.0.3
- `@digitaldefiance/node-ecies-lib`: 4.13.0 → 4.14.2
- `@digitaldefiance/suite-core-lib`: 3.7.0 → 3.8.1

### Version 3.8.x (3.8.1 - 3.8.9)

**Patch Releases**

- Various bug fixes and dependency updates between v3.8.0 and v3.9.0

### Version 3.8.0

**Breaking Changes:**
- Updated encryption API to match ecies-lib v4.13.0:
  - `encryptSimpleOrSingle(false, ...)` → `encryptWithLength(...)`
  - `decryptSimpleOrSingleWithHeader(false, ...)` → `decryptWithLengthAndHeader(...)`
  - `encryptSimpleOrSingle(true, ...)` → `encryptBasic(...)`
  - `decryptSimpleOrSingleWithHeader(true, ...)` → `decryptBasicWithHeader(...)`
- `registerNodeRuntimeConfiguration()` now requires a key parameter
- `XorService.xor()` now throws error when key is shorter than data
- Removed `OBJECT_ID_LENGTH` from `IConstants` interface

**Interface Updates:**
- `IConstants` now extends `INodeEciesConstants` and `ISuiteCoreConstants`
- Added `ECIES_CONFIG` to runtime configuration
- Encryption mode constants renamed: `SIMPLE` → `BASIC`, `SINGLE` → `WITH_LENGTH`

**Dependencies:**
- `@digitaldefiance/ecies-lib`: 4.12.8 → 4.13.0
- `@digitaldefiance/node-ecies-lib`: 4.12.8 → 4.13.0
- `@digitaldefiance/suite-core-lib`: 3.6.50 → 3.7.0

### Version 3.6.7

- Update mongoose-types

### Version 3.6.6

- Update suite-core
- Properly use @digitaldefiance/mongoose-types throughout
- Add models from suite-core-lib

### Version 3.6.2

- Use @digitaldefiance/mongoose-types to suppose mongoose generic types

### Version 3.6.1

- Fix mongoose schema to support generic ids

### Version 3.6.0

- Version updates to reduce circular dependency

### Version 3.5.8

- Library updates

### Version 3.5.7

- Library updates

### Version 3.5.0

**Type Safety Improvements**

- **ELIMINATED**: All unsafe `as any` type casts from production code
- **IMPROVED**: Mongoose query patterns - replaced projection objects with `.select()` method
- **ENHANCED**: Generic type handling in `SystemUserService` and `BackupCodeService`
- **FIXED**: Type compatibility between Mongoose documents and service interfaces
- **ADDED**: Explanatory comments for necessary type assertions
- **VERIFIED**: All 1164 tests passing with full type safety
- **VERIFIED**: Build successful with strict TypeScript checking

**Technical Details**

- Replaced `{ password: 0 } as any` with `.select('-password')` in authentication middleware
- Made `SystemUserService.setSystemUser` generic to accept different ID types
- Updated test mocks to support new query method chains
- Documented remaining `as unknown` casts (2 instances, both necessary for generic compatibility)

### Version 3.0.0

- Upgrade to `@digitaldefiance/suite-core-lib` v3.0.0
- Upgrade to `@digitaldefiance/ecies-lib` v4.1.0
- Upgrade to `@digitaldefiance/node-ecies-lib` v4.1.0

### Version 2.2.36

- Update suite-core-lib

### Version 2.2.35

- Update suite-core-lib

### Version 2.2.34

- Update suite-core-lib

### Version 2.2.33

- Update suite-core-lib

### Version 2.2.32

- Fourth attempt to fix roles on login

### Version 2.2.31

- Third attempt to fix roles on login

### Version 2.2.30

- Second attempt to fix roles on login

### Version 2.2.29

- Fix roles on login

### Version 2.2.28

- Update libs

### Version 2.2.27

- Update suite-core-lib

### Version 2.2.26

- Fix user controller direct/email login requestUserDTO response

### Version 2.2.25

- Fix user schema validation/tests

### Version 2.2.24

- Update user schema for currency
- Update request user function for currency

### Version 2.2.23

- Documentation, library updates

### Version 2.2.22

- Documentation, library updates
- Add settings endpoint

### Version 2.2.21

- Update libs

### Version 2.2.20

- Add darkMode endpoint
- Add user settings controller endpoint
- Add user settings service function

### Version 2.2.19

- Update suite-core-lib
- Fix default expectations for directChallenge

### Version 2.2.18

- Update suite-core-lib

### Version 2.2.17

- Update suite-core-lib

### Version 2.2.16

- Update suite-core-lib
- Clarify InvalidModelError/ModelNotRegisteredError

### Version 2.2.15

- Add this.name to errors
- Update suite-core-lib

### Version 2.2.14

- Enable directChallenge login by default

### Version 2.2.11

- Fix req.user serialization
- Update suite-core-lib

### Version 2.2.10

- Add darkMode user preference

### Version 2.2.9

- fix authenticateCrypto

### Version 2.2.8

- Changes to base controller

### Version 2.2.7

- Working on handleable error handling

### Version 2.2.6

- Working on handleable error handling

### Version 2.2.5

- Working on handleable error handling

### Version 2.2.4

- Working on handleable error handling

### Version 2.2.3

- Fix user controller

### Version 2.2.2

- Fix Handleable loop
- Print db init failures in application base

### Version 2.2.1

- Library upgrade for ecies, etc
- Testing improvements

### Version 2.1.67

- Print server init results on dev init

### Version 2.1.66

- Add host to HTTPS

### Version 2.1.65

- Clarify message

### Version 2.1.64

- Don't throw for devDatabase

### Version 2.1.63

- Improve EmailRegistry

### Version 2.1.62

- Upates to test utils

### Version 2.1.61

- Fixes to testing

### Version 2.1.60

- Add hostname to constants

### Version 2.1.59

- Improve database initialization prints

### Version 2.1.58

- Improve database initialization

### Version 2.1.57

- Update suite-core

### Version 2.1.56

- Update suite-core
- Add .env print to db init fcn

### Version 2.1.55

- Fix EnvNotSet error

### Version 2.1.47

- Add SiteEmailDomain

### Version 2.1.46

- Update suite-core for flags and ISuccessMessage

### Version 2.1.44

- Update suite-core for flags

### Version 2.1.43

- Upgrade suite-core for adding strings

### Version 2.1.42

- Upgrade ecies
- Add regexes to constants
- Add mnemonic encryption key regex/validation

### Version 2.1.40

- Alignment with Express Suite packages
- All packages updated to v2.1.40 (i18n, ecies-lib, node-ecies-lib, suite-core-lib, node-express-suite, express-suite-react-components)
- Test utilities remain at v1.0.7
- `/testing` entry point exports test utilities (mockFunctions, setupTestEnv, etc.)
- Requires `@faker-js/faker` as dev dependency for test utilities

### Version 2.1.35

- Upgrade i18n/bring config through

### Version 2.1.27

- Upgrade node-ecies, use new express-suite-test-utils

### Version 2.1.25

- Upgrade underlying libraries
- Improve test coverage

### Version 2.1.24

- Provide mocks/fixtures for use in testing
- Provide concrete/runnable MongoApplicationConcrete class
- Export DummyEmailService for testing
- Further streamline Application generics

### Version 2.1.22

- Updates from suite-core

### Version 2.1.21

- Continued bugfixes

### Version 2.1.20

- Minor bugfixes for database-initialization

### Version 2.1.19

- minor bugfix for translation in database-initialization

### Version 2.1.18

- minor bugfix for translation in database-initialization

### Version 2.1.17

- minor bugfix for translation in database-initialization

### Version 2.1.16

- Upgrade i18n

### Version 2.1.15

- Upgrade i18n

### Version 2.1.14

- Minor update to i18n area of node-express-suite in database initialization

### Version 2.1.13

- Update i18n

### Version 2.1.12

- Minor bump for node-ecies

### Version 2.1.11

- Minor change from suite-core for createSuiteCoreComponentConfig()

### Version 2.1.10

- Convergence bump/upgrades from i18n/ecies

### Version 2.1.7

- Minor version bump from suite-core-lib

### Version 2.1.6

- Minor version bump from i18n/ecies

### Version 2.1.5

- Minor version bump from i18n/ecies

### Version 2.1.3 (January 2025)

**Test Suite Stabilization**

- **FIXED**: i18n initialization using correct `initSuiteCoreI18nEngine()` function
- **FIXED**: Language registry duplicate registration errors in tests
- **FIXED**: Validation builder chain initialization before `withMessage()`
- **FIXED**: Translation mock signatures to match actual implementation
- **FIXED**: Environment timezone type expectations
- **ADDED**: 21 new tests for index exports coverage (604 total, 100% passing)
- **IMPROVED**: Code coverage from 53.35% to 57.86% (+4.51%)
- **IMPROVED**: 11 modules now at 100% coverage
- **ENHANCED**: Clean test output with proper console mocking

### Version 2.1.0 (November 2025)

**Quality & Stability Release**

- **UPGRADED**: All dependencies to latest stable versions
  - @digitaldefiance/suite-core-lib@2.1.3
  - @digitaldefiance/i18n-lib@2.1.1
  - @digitaldefiance/ecies-lib@2.1.3
  - @digitaldefiance/node-ecies-lib@2.1.3
- **IMPROVED**: Test suite with 604 passing tests (100% success rate)
- **IMPROVED**: Code coverage to 57.86% (+4.5% improvement)
- **IMPROVED**: 11 modules at 100% coverage
- **FIXED**: i18n initialization and language registry management
- **FIXED**: Validation builder chain initialization
- **FIXED**: Translation mock signatures in tests
- **ENHANCED**: Type safety throughout the codebase
- **ENHANCED**: Clean test output with proper console mocking

### Version 2.0.0 (Architecture Refactor)

- **BREAKING**: Simplified IApplication interface (removed 5 generic parameters)
- **NEW**: Service Container for centralized dependency injection
- **NEW**: ValidationBuilder with fluent API and constants injection
- **NEW**: Middleware Pipeline builder for explicit composition
- **NEW**: Route Builder DSL as alternative to decorators
- **NEW**: Automatic transaction management via decorators
- **NEW**: Response Builder with fluent API
- **NEW**: Application Builder for simplified construction
- **NEW**: Plugin System for extensibility
- **NEW**: Router Config separation
- **NEW**: Database Initializer interface
- **NEW**: Config Objects pattern throughout
- **IMPROVED**: 50% overall complexity reduction
- **IMPROVED**: 87.5% reduction in generic parameters
- **IMPROVED**: 70% reduction in transaction boilerplate
- **IMPROVED**: 40% reduction in response boilerplate
- **IMPROVED**: Better IDE support and type inference

### Version 1.3.28

- Bind this on controller validation

### Version 1.3.27

- Upgrade i18n, ecies, suite-core

### Version 1.3.26

- Refactor middlewares further

### Version 1.3.25

- Refactor middlewares to be more extensible

### Version 1.3.24

- AppRouter factory to make AppRouter extensible as well

### Version 1.3.23

- Make vars protected

### Version 1.3.22

- Overridable view rendering

### Version 1.3.21

- Minor fix on dist dir detection

### Version 1.3.20

- Version bump
- Wired the express-suite package to the shared constant stack: default exports now expose LocalhostConstants, and every service/schema/controller pulls constants from the application instance instead of hard-coding them.
- Propagated the richer constant set (keyring, wrapped-key, PBKDF2 profiles, encryption metadata) into createExpressRuntimeConfiguration, the checksum/FEC services, and type definitions so downstream apps share ECIES/node defaults.
- Updated system-user, backup-code, JWT, mnemonic, key-wrapping, and user flows to accept injected constants, including rewrapping logic and password/KDF validation paths.
- Tightened controller/router/service generics and typings, clarified validation guard rails, and swapped several equality checks to operate on Uint8Array for safer crypto comparisons.
- Refreshed mocks/tests to consume LocalhostConstants, fixed registry helpers, and expanded tsconfig.spec to compile the runtime sources so the new injections are covered.

### Version 1.3.18

- Make application factory pattern for api router

### Version 1.3.17

- Upgrade i18n with aliases for t() fn
- Handle database initialization errors

### Version 1.3.16

- Fix StringName strings
- Fix constatnts during database initialization

### Version 1.3.15

- Homogenize versions

### Version 1.0.26

- Update libs

### Version 1.0.25

- Properly export db-init-cache

### Version 1.0.24

- Re-release with js

### Version 1.0.23

- Upgrade to es2022/nx monorepo

### Version 1.0.22

- Update libs
- Upgrade various things to pluginI18nengine

### Version 1.0.21

- Update suite-core
- Update IApplication/Application so that IEnvironment is more extensible

### Version 1.0.20

- Update libs

### Version 1.0.19

- Pull in i18n registration updates up through suite-core-lib

### Version 1.0.18

- Update suite-core

### Version 1.0.17

- Update ecies/i18n/suite-core

### Version 1.0.16

- Update suite-core

### Version 1.0.15

- Update suite-core

### Version 1.0.14

- Use typed/handleable from i18n

### Version 1.0.13

- Update libs

### Version 1.0.12

- Update libs

### Version 1.0.11

- Update libs
- Add test

### Version 1.0.10

- Export api router

### Version 1.0.9

- Update suite-core-lib to include new error classes
- improve role/user services

### Version 1.0.8

- Export missing role schema

### Version 1.0.7

- Export missing enumeration

### Version 1.0.6

- Export enumerations

### Version 1.0.5

- Export schemas

### Version 1.0.4

- Update suite-core

### Version 1.0.3

- Update ecies libs

### Version 1.0.0

- Initial release with complete Express.js framework
- Dynamic model registry system
- JWT authentication and RBAC
- Multi-language i18n support
- Comprehensive service layer
- Database initialization utilities
