# Services

> **Note:** Several services have been moved to [`@digitaldefiance/node-express-suite-mongo`](https://www.npmjs.com/package/@digitaldefiance/node-express-suite-mongo):
> `UserService`, `RoleService`, `BackupCodeService`, `MnemonicService`, `RequestUserService`,
> `DatabaseInitializationService`, `MongoBaseService`, `MongoAuthenticationProvider`,
> `MongooseDatabase`, `MongooseCollection`, `MongooseDocumentStore`, `MongooseSessionAdapter`,
> `DirectLoginTokenService`, and `DbInitCache`.
>
> The services documented below that are marked **(moved)** are now in the mongo package.
> Services that remain in this package: `BaseService`, `JwtService`, `ECIESService`,
> `KeyWrappingService`, `SystemUserService`, `DummyEmailService`, `emailServiceRegistry`.

## Table of Contents

- [Overview](#overview)
- [Service Container](#service-container)
- [Core Services](#core-services)
- [Creating Custom Services](#creating-custom-services)
- [Best Practices](#best-practices)

## Overview

Services contain the business logic of your application. They are managed by the Service Container and can be injected into controllers, middleware, and other services.

## Service Container

### Overview

The Service Container manages service lifecycle and dependencies:

```typescript
export class ServiceContainer {
  register<T>(key: symbol | string, service: T): void
  get<T>(key: symbol | string): T
  has(key: symbol | string): boolean
  remove(key: symbol | string): void
}
```

### Usage

```typescript
// Register a service
app.services.register(ServiceKeys.USER, new UserService(app));

// Retrieve a service
const userService = app.services.get(ServiceKeys.USER);

// Check if service exists
if (app.services.has(ServiceKeys.USER)) {
  // Service is registered
}
```

### Service Keys

Define type-safe service keys:

```typescript
export const ServiceKeys = {
  JWT: Symbol('JwtService'),
  USER: Symbol('UserService'),
  ROLE: Symbol('RoleService'),
  BACKUP_CODE: Symbol('BackupCodeService'),
  ECIES: Symbol('ECIESService'),
  KEY_WRAPPING: Symbol('KeyWrappingService'),
  MNEMONIC: Symbol('MnemonicService'),
  EMAIL: Symbol('EmailService')
} as const;
```

## Core Services

### UserService

Manages user accounts, authentication, and settings.

#### Key Methods

```typescript
class UserService {
  // User creation
  async newUser(
    creator: BackendMember,
    userData: INewUserInput,
    roles?: string[],
    password?: string,
    session?: ClientSession
  ): Promise<INewUserResult>

  // User lookup
  async findUser(
    email?: string,
    username?: string,
    session?: ClientSession
  ): Promise<IUserDocument>

  async findUserById(
    userId: Types.ObjectId,
    includePassword?: boolean,
    session?: ClientSession
  ): Promise<IUserDocument>

  // Settings management
  async updateUserSettings(
    userId: string,
    settings: Partial<IUserSettings>,
    session?: ClientSession
  ): Promise<IRequestUserDTO>

  async updateSiteLanguage(
    userId: string,
    language: string,
    session?: ClientSession
  ): Promise<IRequestUserDTO>

  async updateDarkMode(
    userId: string,
    darkMode: boolean,
    session?: ClientSession
  ): Promise<IRequestUserDTO>

  // Password management
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    session?: ClientSession
  ): Promise<void>

  async resetPasswordWithToken(
    token: string,
    newPassword: string,
    credential: string,
    session?: ClientSession
  ): Promise<void>

  // Email tokens
  async createAndSendEmailToken(
    user: IUserDocument,
    type: EmailTokenType,
    session?: ClientSession,
    debug?: boolean
  ): Promise<void>

  async verifyEmailToken(
    token: string,
    type: EmailTokenType,
    session?: ClientSession
  ): Promise<IEmailTokenDocument>

  // Mnemonic recovery
  async recoverMnemonic(
    user: BackendMember,
    encryptedMnemonic: Buffer
  ): Promise<SecureString>

  // Direct login
  generateDirectLoginChallenge(): string

  async verifyDirectLoginChallenge(
    challenge: string,
    signature: Buffer,
    username?: string,
    email?: string,
    session?: ClientSession
  ): Promise<IDirectLoginResult>
}
```

### JwtService

Manages JWT token creation and verification.

```typescript
class JwtService {
  async signToken(
    user: IUserDocument,
    secret: string,
    language: string
  ): Promise<ISignTokenResult>

  async verifyToken(token: string): Promise<ITokenUser>

  async refreshToken(
    token: string,
    secret: string
  ): Promise<IRefreshTokenResult>
}
```

### RoleService

Manages roles and permissions.

```typescript
class RoleService {
  async createRole(
    roleData: IRoleInput,
    session?: ClientSession
  ): Promise<IRoleDocument>

  async getUserRoles(
    userId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<IRoleDocument[]>

  async assignRole(
    userId: string | Types.ObjectId,
    roleId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<void>

  async removeRole(
    userId: string | Types.ObjectId,
    roleId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<void>

  async userHasRole(
    userId: string | Types.ObjectId,
    roleName: string,
    session?: ClientSession
  ): Promise<boolean>

  rolesToTokenRoles(roles: IRoleDocument[]): ITokenRole[]
}
```

### BackupCodeService

Manages backup code generation, validation, and usage.

```typescript
class BackupCodeService {
  async generateBackupCodes(
    userId: string | Types.ObjectId,
    count?: number,
    session?: ClientSession
  ): Promise<SecureString[]>

  async validateBackupCode(
    userId: string | Types.ObjectId,
    code: string,
    session?: ClientSession
  ): Promise<boolean>

  async useBackupCode(
    userId: string | Types.ObjectId,
    code: string,
    session?: ClientSession
  ): Promise<void>

  async recoverKeyWithBackupCode(
    user: IUserDocument,
    code: string,
    newPassword?: SecureString,
    session?: ClientSession
  ): Promise<IBackupCodeRecoveryResult>

  async resetUserBackupCodes(
    user: BackendMember,
    systemUser: BackendMember,
    session?: ClientSession
  ): Promise<SecureString[]>
}
```

### ECIESService

Provides encryption and decryption functionality.

```typescript
class ECIESService {
  generateNewMnemonic(): string

  deriveKeyPairFromMnemonic(mnemonic: string): {
    privateKey: Buffer
    publicKey: Buffer
  }

  async encrypt(
    recipientPublicKey: Buffer,
    plaintext: Buffer
  ): Promise<Buffer>

  async decrypt(
    privateKey: Buffer,
    ciphertext: Buffer
  ): Promise<Buffer>

  sign(privateKey: Buffer, message: Buffer): Buffer

  verify(
    publicKey: Buffer,
    message: Buffer,
    signature: Buffer
  ): boolean
}
```

### KeyWrappingService

Securely wraps and unwraps cryptographic keys.

```typescript
class KeyWrappingService {
  async wrapKey(
    key: Buffer,
    password: string,
    salt: Buffer,
    profile?: string
  ): Promise<Buffer>

  async unwrapKey(
    wrappedKey: Buffer,
    password: string,
    salt: Buffer,
    profile?: string
  ): Promise<Buffer>

  async wrapKeyWithMnemonic(
    key: Buffer,
    mnemonic: string,
    salt: Buffer
  ): Promise<Buffer>

  async unwrapKeyWithMnemonic(
    wrappedKey: Buffer,
    mnemonic: string,
    salt: Buffer
  ): Promise<Buffer>
}
```

### MnemonicService

Manages encrypted mnemonic storage and retrieval.

```typescript
class MnemonicService {
  async storeMnemonic(
    userId: string | Types.ObjectId,
    mnemonic: string,
    encryptedWith: Buffer,
    session?: ClientSession
  ): Promise<IMnemonicDocument>

  async retrieveMnemonic(
    userId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<IMnemonicDocument>

  async updateMnemonic(
    userId: string | Types.ObjectId,
    newMnemonic: string,
    encryptedWith: Buffer,
    session?: ClientSession
  ): Promise<void>
}
```

### RequestUserService

Utility service for creating request user DTOs.

```typescript
class RequestUserService {
  static makeRequestUserDTO(
    user: IUserDocument,
    roles: ITokenRole[]
  ): IRequestUserDTO

  static enrichRequestUser(
    user: ITokenUser,
    userDoc: IUserDocument,
    roles: IRoleDocument[]
  ): IRequestUserDTO
}
```

### SystemUserService

Manages system user for internal operations.

```typescript
class SystemUserService {
  static getSystemUser(
    environment: Environment,
    constants: IConstants
  ): BackendMember

  static ensureSystemUser(
    app: IApplication,
    session?: ClientSession
  ): Promise<IUserDocument>
}
```

## Creating Custom Services

### Step 1: Define Service Interface

```typescript
export interface IProductService {
  findAll(): Promise<IProduct[]>
  findById(id: string): Promise<IProduct | null>
  create(data: IProductInput, session?: ClientSession): Promise<IProduct>
  update(id: string, data: Partial<IProductInput>, session?: ClientSession): Promise<IProduct>
  delete(id: string, session?: ClientSession): Promise<void>
}
```

### Step 2: Implement Service

```typescript
export class ProductService implements IProductService {
  private readonly app: IApplication;
  
  constructor(app: IApplication) {
    this.app = app;
  }

  async findAll(): Promise<IProduct[]> {
    const ProductModel = this.app.getModel<IProductDocument>(
      BaseModelName.Product
    );
    return await ProductModel.find({ deletedAt: null });
  }

  async findById(id: string): Promise<IProduct | null> {
    const ProductModel = this.app.getModel<IProductDocument>(
      BaseModelName.Product
    );
    return await ProductModel.findById(id);
  }

  async create(
    data: IProductInput,
    session?: ClientSession
  ): Promise<IProduct> {
    const ProductModel = this.app.getModel<IProductDocument>(
      BaseModelName.Product
    );
    
    const [product] = await ProductModel.create([data], { session });
    return product;
  }

  async update(
    id: string,
    data: Partial<IProductInput>,
    session?: ClientSession
  ): Promise<IProduct> {
    const ProductModel = this.app.getModel<IProductDocument>(
      BaseModelName.Product
    );
    
    const product = await ProductModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, session }
    );
    
    if (!product) {
      throw new ProductNotFoundError();
    }
    
    return product;
  }

  async delete(id: string, session?: ClientSession): Promise<void> {
    const ProductModel = this.app.getModel<IProductDocument>(
      BaseModelName.Product
    );
    
    await ProductModel.findByIdAndUpdate(
      id,
      { $set: { deletedAt: new Date() } },
      { session }
    );
  }
}
```

### Step 3: Register Service

```typescript
// Define service key
export const ServiceKeys = {
  ...existingKeys,
  PRODUCT: Symbol('ProductService')
} as const;

// Register during application initialization
app.services.register(
  ServiceKeys.PRODUCT,
  new ProductService(app)
);
```

### Step 4: Use in Controllers

```typescript
@Controller('/api/products')
export class ProductController extends DecoratorBaseController {
  private get productService(): ProductService {
    return this.application.services.get(ServiceKeys.PRODUCT);
  }

  @Get('/')
  async listProducts(req: Request, res: Response) {
    const products = await this.productService.findAll();
    return {
      statusCode: 200,
      response: { products }
    };
  }
}
```

## Best Practices

### 1. Single Responsibility

Each service should have one clear purpose:

```typescript
// ❌ Bad - Service does too much
class UserService {
  async createUser() { }
  async sendEmail() { }
  async processPayment() { }
  async generateReport() { }
}

// ✅ Good - Focused services
class UserService {
  async createUser() { }
  async updateUser() { }
}

class EmailService {
  async sendEmail() { }
}

class PaymentService {
  async processPayment() { }
}
```

### 2. Dependency Injection

Services receive dependencies through constructor:

```typescript
export class OrderService {
  private readonly app: IApplication;
  private readonly productService: ProductService;
  private readonly userService: UserService;

  constructor(app: IApplication) {
    this.app = app;
    this.productService = app.services.get(ServiceKeys.PRODUCT);
    this.userService = app.services.get(ServiceKeys.USER);
  }
}
```

### 3. Transaction Support

Services should accept optional session parameter:

```typescript
async create(
  data: IData,
  session?: ClientSession
): Promise<IResult> {
  const Model = this.app.getModel<IDocument>(ModelName);
  const [result] = await Model.create([data], { session });
  return result;
}
```

### 4. Error Handling

Throw domain-specific errors:

```typescript
async findById(id: string): Promise<IProduct> {
  const product = await ProductModel.findById(id);
  
  if (!product) {
    throw new ProductNotFoundError(id);
  }
  
  if (product.deletedAt) {
    throw new ProductDeletedError(id);
  }
  
  return product;
}
```

### 5. Validation

Validate input at service boundaries:

```typescript
async create(data: IProductInput): Promise<IProduct> {
  // Validate input
  if (!data.name || data.name.trim().length === 0) {
    throw new ValidationError('Product name is required');
  }
  
  if (data.price <= 0) {
    throw new ValidationError('Price must be positive');
  }
  
  // Proceed with creation
  return await this.createProduct(data);
}
```

### 6. Async/Await

Use async/await for all asynchronous operations:

```typescript
// ❌ Bad - Callback hell
getUserWithRoles(userId, (err, user) => {
  if (err) return callback(err);
  getRoles(user.id, (err, roles) => {
    if (err) return callback(err);
    callback(null, { user, roles });
  });
});

// ✅ Good - Clean async/await
async getUserWithRoles(userId: string) {
  const user = await this.userService.findById(userId);
  const roles = await this.roleService.getUserRoles(user.id);
  return { user, roles };
}
```

### 7. Logging

Add appropriate logging for debugging:

```typescript
async create(data: IProductInput): Promise<IProduct> {
  debugLog(this.app.environment.debug, 
    'Creating product:', 
    { name: data.name, price: data.price }
  );
  
  try {
    const product = await ProductModel.create([data]);
    debugLog(this.app.environment.debug, 
      'Product created:', 
      product.id
    );
    return product;
  } catch (error) {
    debugLog(this.app.environment.debug, 
      'Product creation failed:', 
      error
    );
    throw error;
  }
}
```

### 8. Testing

Write unit tests for all services:

```typescript
describe('ProductService', () => {
  let service: ProductService;
  let mockApp: IApplication;

  beforeEach(() => {
    mockApp = createMockApplication();
    service = new ProductService(mockApp);
  });

  describe('findById', () => {
    it('should return product when found', async () => {
      const mockProduct = { id: '1', name: 'Test' };
      mockFindById.mockResolvedValue(mockProduct);

      const result = await service.findById('1');

      expect(result).toEqual(mockProduct);
    });

    it('should throw when product not found', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(service.findById('1'))
        .rejects
        .toThrow(ProductNotFoundError);
    });
  });
});
```

## Service Patterns

### Repository Pattern

```typescript
interface IRepository<T> {
  findAll(): Promise<T[]>
  findById(id: string): Promise<T | null>
  create(data: Partial<T>): Promise<T>
  update(id: string, data: Partial<T>): Promise<T>
  delete(id: string): Promise<void>
}

class ProductRepository implements IRepository<IProduct> {
  // Implementation
}
```

### Factory Pattern

```typescript
class ProductFactory {
  static create(data: IProductInput): IProduct {
    return {
      id: new Types.ObjectId().toString(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}
```

### Strategy Pattern

```typescript
interface IPricingStrategy {
  calculatePrice(basePrice: number): number
}

class RegularPricingStrategy implements IPricingStrategy {
  calculatePrice(basePrice: number): number {
    return basePrice;
  }
}

class DiscountPricingStrategy implements IPricingStrategy {
  constructor(private discount: number) {}
  
  calculatePrice(basePrice: number): number {
    return basePrice * (1 - this.discount);
  }
}

class ProductService {
  constructor(
    private app: IApplication,
    private pricingStrategy: IPricingStrategy
  ) {}
}
```

## Related Documentation

- [Controllers](./CONTROLLERS.md)
- [Models](./MODELS.md)
- [Transactions](./TRANSACTIONS.md)
- [Testing](./TESTING.md)
