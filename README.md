# @digitaldefiance/node-express-suite

An opinionated, secure, extensible Node.js/Express service framework built on Digital Defiance cryptography libraries, providing complete backend infrastructure for secure applications.

It is an 'out of the box' solution with a specific recipe (Mongo, Express, React, Node, (MERN) stack) with ejs templating, JWT authentication, role-based access control, custom multi-language support via @digitaldefiance/i18n-lib, and a dynamic model registry system. You might either find it limiting or freeing, depending on your use case. It includes mnemonic authentication, ECIES encryption/decryption, PBKDF2 key derivation, email token workflows, and more.

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

Comprehensive test suite with 100+ tests:

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

## ChangeLog

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

### Version 1.0.0 (Current)

- Initial release with complete Express.js framework
- Dynamic model registry system
- JWT authentication and RBAC
- Multi-language i18n support
- Comprehensive service layer
- Database initialization utilities
