# Models

## Table of Contents

- [Overview](#overview)
- [Model Registry](#model-registry)
- [Built-in Models](#built-in-models)
- [Creating Custom Models](#creating-custom-models)
- [Model Functions](#model-functions)
- [Best Practices](#best-practices)

## Overview

Models in `@digitaldefiance/node-express-suite` provide a dynamic, extensible system for working with MongoDB collections. The framework uses a model registry pattern that allows runtime model registration and retrieval with full TypeScript support.

## Model Registry

### ModelRegistry Class

The `ModelRegistry` is a singleton that manages all models in the application:

```typescript
export class ModelRegistry {
  static readonly instance: ModelRegistry;
  
  register(config: IModelConfig): void
  get<T extends IBaseDocument>(modelName: string): IRegisteredModel<T>
  has(modelName: string): boolean
  remove(modelName: string): void
  clear(): void
}
```

### Registration

Register models during application initialization:

```typescript
ModelRegistry.instance.register({
  modelName: BaseModelName.User,
  schema: UserSchema,
  collection: SchemaCollection.User,
  connection: mongoose.connection
});
```

### Retrieval

Retrieve registered models anywhere in your application:

```typescript
const { model, schema, collection } = ModelRegistry.instance.get<IUserDocument>(
  BaseModelName.User
);

const users = await model.find({ accountStatus: 'Active' });
```

### Model Configuration

```typescript
interface IModelConfig {
  modelName: string;
  schema: Schema;
  collection: string;
  connection: Connection;
}

interface IRegisteredModel<T extends IBaseDocument> {
  model: Model<T>;
  schema: Schema;
  collection: string;
}
```

## Built-in Models

### User Model

Manages user accounts and authentication.

```typescript
const UserModel = app.getModel<IUserDocument>(BaseModelName.User);

// Create user
const user = await UserModel.create({
  username: 'alice',
  email: 'alice@example.com',
  timezone: 'America/New_York',
  accountStatus: AccountStatus.Active
});

// Find user
const user = await UserModel.findOne({ email: 'alice@example.com' });

// Update user
await UserModel.findByIdAndUpdate(userId, {
  $set: { siteLanguage: 'es' }
});
```

### Role Model

Manages roles for RBAC.

```typescript
const RoleModel = app.getModel<IRoleDocument>(BaseModelName.Role);

// Create role
const adminRole = await RoleModel.create({
  name: 'admin',
  description: 'Administrator role',
  admin: true
});

// Find roles
const roles = await RoleModel.find({ admin: false });
```

### UserRole Model

Associates users with roles.

```typescript
const UserRoleModel = app.getModel<IUserRoleDocument>(BaseModelName.UserRole);

// Assign role to user
await UserRoleModel.create({
  userId: user._id,
  roleId: adminRole._id
});

// Get user roles
const userRoles = await UserRoleModel.find({ userId: user._id });
```

### EmailToken Model

Manages email verification and password reset tokens.

```typescript
const EmailTokenModel = app.getModel<IEmailTokenDocument>(
  BaseModelName.EmailToken
);

// Create token
const token = await EmailTokenModel.create({
  userId: user._id,
  token: generateToken(),
  type: EmailTokenType.AccountVerification,
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
});

// Find and validate token
const tokenDoc = await EmailTokenModel.findOne({
  token: providedToken,
  type: EmailTokenType.AccountVerification,
  expiresAt: { $gt: new Date() }
});
```

### Mnemonic Model

Stores encrypted mnemonics for key recovery.

```typescript
const MnemonicModel = app.getModel<IMnemonicDocument>(
  BaseModelName.Mnemonic
);

// Store mnemonic
await MnemonicModel.create({
  userId: user._id,
  encryptedMnemonic: encryptedData,
  encryptedWith: publicKey
});
```

### UsedDirectLoginToken Model

Tracks used one-time login tokens.

```typescript
const UsedDirectLoginTokenModel = app.getModel<IUsedDirectLoginTokenDocument>(
  BaseModelName.UsedDirectLoginToken
);

// Mark token as used
await UsedDirectLoginTokenModel.create({
  userId: user._id,
  tokenHash: hashToken(token),
  usedAt: new Date()
});

// Check if token used
const used = await UsedDirectLoginTokenModel.findOne({
  tokenHash: hashToken(token)
});
```

## Creating Custom Models

### Step 1: Define Document Interface

```typescript
import { IBaseDocument } from '@digitaldefiance/node-express-suite';

export interface IProductDocument extends IBaseDocument<Types.ObjectId> {
  name: string;
  description?: string;
  price: number;
  category: string;
  inventory: number;
  active: boolean;
}
```

### Step 2: Create Schema

```typescript
import { Schema } from 'mongoose';

export const ProductSchema = new Schema<IProductDocument>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: false
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  inventory: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  active: {
    type: Boolean,
    required: true,
    default: true,
    index: true
  },
  deletedAt: {
    type: Date,
    required: false,
    default: null
  }
}, {
  timestamps: true
});

// Add indexes
ProductSchema.index({ name: 'text', description: 'text' });
ProductSchema.index({ category: 1, active: 1 });
```

### Step 3: Create Model Function

```typescript
import { Connection, Model } from 'mongoose';

export function ProductModel(
  connection: Connection,
  modelName: string = 'Product',
  collection: string = 'products',
  schema: Schema<IProductDocument> = ProductSchema
): Model<IProductDocument> {
  return connection.model<IProductDocument>(modelName, schema, collection);
}
```

### Step 4: Extend Model Name Enum

```typescript
export enum CustomModelName {
  User = BaseModelName.User,
  Role = BaseModelName.Role,
  // ... other base models
  Product = 'Product',
  Order = 'Order'
}

export enum CustomCollection {
  User = SchemaCollection.User,
  Role = SchemaCollection.Role,
  // ... other base collections
  Product = 'products',
  Order = 'orders'
}
```

### Step 5: Register Model

```typescript
// In application initialization
ModelRegistry.instance.register({
  modelName: CustomModelName.Product,
  schema: ProductSchema,
  collection: CustomCollection.Product,
  connection: app.db.connection
});
```

### Step 6: Use Model

```typescript
// In service or controller
const ProductModel = app.getModel<IProductDocument>(
  CustomModelName.Product
);

const products = await ProductModel.find({
  active: true,
  inventory: { $gt: 0 }
});
```

## Model Functions

### Generic Model Functions

Model functions support generic type parameters for flexibility:

```typescript
export function UserModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection
>(
  connection: Connection,
  modelName: TModelName = BaseModelName.User as TModelName,
  collection: TCollection = SchemaCollection.User as TCollection,
  schema: Schema<IUserDocument> = UserSchema
): Model<IUserDocument> {
  return connection.model<IUserDocument>(modelName, schema, collection);
}
```

### Usage Examples

```typescript
// Default usage
const UserModel = UserModel(connection);

// Custom model name and collection
const CustomUserModel = UserModel(
  connection,
  'CustomUser',
  'custom_users'
);

// With custom schema
const ExtendedUserSchema = UserSchema.clone();
ExtendedUserSchema.add({ customField: String });

const ExtendedUserModel = UserModel(
  connection,
  'ExtendedUser',
  'extended_users',
  ExtendedUserSchema
);
```

## Best Practices

### 1. Use Indexes

Add indexes for frequently queried fields:

```typescript
ProductSchema.index({ category: 1, active: 1 });
ProductSchema.index({ name: 'text', description: 'text' });
ProductSchema.index({ createdAt: -1 });
```

### 2. Soft Deletes

Implement soft deletes instead of hard deletes:

```typescript
// Add deletedAt field
deletedAt: {
  type: Date,
  required: false,
  default: null
}

// Soft delete
await ProductModel.findByIdAndUpdate(id, {
  $set: { deletedAt: new Date() }
});

// Query non-deleted
const products = await ProductModel.find({
  deletedAt: null
});
```

### 3. Timestamps

Enable automatic timestamps:

```typescript
new Schema<IProductDocument>({
  // fields
}, {
  timestamps: true // Adds createdAt and updatedAt
});
```

### 4. Validation

Add validation at the schema level:

```typescript
price: {
  type: Number,
  required: true,
  min: [0, 'Price cannot be negative'],
  validate: {
    validator: (v: number) => v <= 1000000,
    message: 'Price cannot exceed 1,000,000'
  }
}
```

### 5. Virtual Fields

Add computed fields:

```typescript
ProductSchema.virtual('priceWithTax').get(function() {
  return this.price * 1.08; // 8% tax
});

ProductSchema.virtual('inStock').get(function() {
  return this.inventory > 0 && this.active;
});
```

### 6. Pre/Post Hooks

Add middleware for common operations:

```typescript
// Pre-save hook
ProductSchema.pre('save', function(next) {
  if (this.inventory < 0) {
    this.inventory = 0;
  }
  next();
});

// Post-find hook
ProductSchema.post('find', function(docs) {
  docs.forEach(doc => {
    // Process each document
  });
});
```

### 7. Static Methods

Add custom static methods:

```typescript
ProductSchema.statics.findByCategory = function(category: string) {
  return this.find({ category, active: true, deletedAt: null });
};

ProductSchema.statics.findInStock = function() {
  return this.find({ 
    active: true,
    inventory: { $gt: 0 },
    deletedAt: null
  });
};

// Usage
const electronics = await ProductModel.findByCategory('electronics');
const inStock = await ProductModel.findInStock();
```

### 8. Instance Methods

Add methods to document instances:

```typescript
ProductSchema.methods.applyDiscount = function(percent: number) {
  this.price = this.price * (1 - percent / 100);
  return this.save();
};

// Usage
const product = await ProductModel.findById(id);
await product.applyDiscount(10); // 10% discount
```

### 9. Population

Use populate for references:

```typescript
// In schema
orderBy: {
  type: Schema.Types.ObjectId,
  ref: 'User',
  required: true
}

// Query with population
const orders = await OrderModel.find()
  .populate('orderBy', 'username email')
  .exec();
```

### 10. Lean Queries

Use lean() for read-only queries:

```typescript
// Returns plain JavaScript objects (faster)
const products = await ProductModel
  .find({ active: true })
  .lean()
  .exec();
```

## Testing Models

### Unit Tests

```typescript
describe('ProductModel', () => {
  let connection: Connection;

  beforeAll(async () => {
    connection = await mongoose.createConnection(mongoUri);
  });

  afterAll(async () => {
    await connection.close();
  });

  describe('validation', () => {
    it('should require name', async () => {
      const product = new ProductModel(connection)({
        price: 9.99
      });

      await expect(product.save())
        .rejects
        .toThrow('name is required');
    });

    it('should validate price is positive', async () => {
      const product = new ProductModel(connection)({
        name: 'Test',
        price: -1
      });

      await expect(product.save())
        .rejects
        .toThrow('Price cannot be negative');
    });
  });

  describe('methods', () => {
    it('should apply discount correctly', async () => {
      const product = await ProductModel(connection).create({
        name: 'Test Product',
        price: 100,
        category: 'test'
      });

      await product.applyDiscount(10);

      expect(product.price).toBe(90);
    });
  });
});
```

## Related Documentation

- [Documents](./DOCUMENTS.md)
- [Schemas](./SCHEMAS.md)
- [Services](./SERVICES.md)
- [Application](./APPLICATION.md)
