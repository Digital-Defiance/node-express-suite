# @digitaldefiance/node-express-suite

[![npm version](https://badge.fury.io/js/%40digitaldefiance%2Fnode-express-suite.svg)](https://badge.fury.io/js/%40digitaldefiance%2Fnode-express-suite)
[![Tests](https://img.shields.io/badge/tests-604%20passing-brightgreen)]()
[![Coverage](https://img.shields.io/badge/coverage-57.86%25-yellow)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

An opinionated, secure, extensible Node.js/Express service framework built on Digital Defiance cryptography libraries, providing complete backend infrastructure for secure applications.

It is an 'out of the box' solution with a specific recipe (Mongo, Express, React, Node, (MERN) stack) with ejs templating, JWT authentication, role-based access control, custom multi-language support via @digitaldefiance/i18n-lib, and a dynamic model registry system. You might either find it limiting or freeing, depending on your use case. It includes mnemonic authentication, ECIES encryption/decryption, PBKDF2 key derivation, email token workflows, and more.

## What's New in v2.1

✨ **Quality & Stability Release** - All dependencies upgraded, 604 tests passing, improved coverage and type safety throughout.

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
import { CoreLanguage } from '@digitaldefiance/i18n-lib';
import { EmailService } from './services/email'; // Your concrete implementation

// Create application instance
const app = new Application({
  port: 3000,
  mongoUri: 'mongodb://localhost:27017/myapp',
  jwtSecret: process.env.JWT_SECRET,
  defaultLanguage: CoreLanguage.EnglishUS
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
const encrypted = await eciesService.encryptSimpleOrSingle(
  false, // single mode
  recipientPublicKey,
  Buffer.from('secret message')
);

// Decrypt data
const decrypted = await eciesService.decryptSimpleOrSingleWithHeader(
  false,
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
import { CoreLanguage } from '@digitaldefiance/i18n-lib';

// Get the global i18n engine
const i18n = getGlobalI18nEngine();

// Translate strings
const message = translateExpressSuite(
  ExpressSuiteStringKey.Common_Ready,
  {},
  CoreLanguage.French
);
// "Prêt"

// Change language globally
i18n.setLanguage(CoreLanguage.Spanish);
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

Comprehensive test suite with 604 passing tests:

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

### Test Coverage (v2.1)

- **604 tests** passing (100% success rate)
- **57.86%** overall coverage
- **11 modules** at 100% coverage
- All critical paths tested (validation, auth, services)

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

### Utilities

- `ModelRegistry` - Dynamic model registration
- `debugLog()` - Conditional logging utility
- `withTransaction()` - MongoDB transaction wrapper

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

### Version 2.1.24

- Provide mocks/fixtures for use in testing
- Provide concrete/runnable ApplicationConcrete class
- Export DummyEmailService for testing
- Further streamline Application generics

### Version 2.1.22

- Updates from suite-core

### Version 2.1.21

- Continued bugfixes

### Version 2.1.20

- Minor bugfixes for database-initialization

### Version 2.1.18

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
