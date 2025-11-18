# Schemas

## Table of Contents

- [Overview](#overview)
- [Built-in Schemas](#built-in-schemas)
- [Creating Custom Schemas](#creating-custom-schemas)
- [Schema Features](#schema-features)
- [Best Practices](#best-practices)

## Overview

Schemas define the structure, validation rules, and behavior of MongoDB documents using Mongoose. The framework provides pre-built schemas for core functionality and supports extensive customization.

## Built-in Schemas

### UserSchema

Defines user accounts with authentication and preferences.

```typescript
export const UserSchema = new Schema<IUserDocument>({
  username: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: (v: string) => constants.UsernameRegex.test(v),
      message: () => getSuiteCoreTranslation(
        SuiteCoreStringKey.Validation_UsernameRegexErrorTemplate
      )
    }
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: {
      validator: (v: string) => validator.isEmail(v),
      message: () => getSuiteCoreTranslation(
        SuiteCoreStringKey.Validation_InvalidEmail
      )
    }
  },
  password: {
    type: String,
    required: false,
    select: false
  },
  passwordWrappedPrivateKey: {
    type: Buffer,
    required: false
  },
  mnemonicWrappedPrivateKey: {
    type: Buffer,
    required: true
  },
  mnemonicRecovery: {
    type: Buffer,
    required: true
  },
  publicKey: {
    type: Buffer,
    required: true
  },
  salt: {
    type: Buffer,
    required: true
  },
  backupCodes: [{
    type: String,
    required: true
  }],
  accountStatus: {
    type: String,
    enum: Object.values(AccountStatus),
    default: AccountStatus.PendingVerification
  },
  timezone: {
    type: String,
    required: true,
    validate: {
      validator: isValidTimezone,
      message: () => getSuiteCoreTranslation(
        SuiteCoreStringKey.Validation_TimezoneInvalid
      )
    }
  },
  currency: {
    type: String,
    required: false,
    default: 'USD'
  },
  siteLanguage: {
    type: String,
    required: true,
    enum: supportedLanguages,
    default: LanguageCodes.EN_US
  },
  emailVerified: {
    type: Boolean,
    required: true,
    default: false
  },
  darkMode: {
    type: Boolean,
    required: true,
    default: false
  },
  directChallenge: {
    type: Boolean,
    required: true,
    default: true
  },
  lastLogin: {
    type: Date,
    required: false
  },
  deletedAt: {
    type: Date,
    required: false,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ accountStatus: 1 });
UserSchema.index({ deletedAt: 1 });
```

### RoleSchema

Defines roles for role-based access control.

```typescript
export const RoleSchema = new Schema<IRoleDocument>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: false
  },
  admin: {
    type: Boolean,
    required: true,
    default: false
  },
  deletedAt: {
    type: Date,
    required: false,
    default: null
  }
}, {
  timestamps: true
});

RoleSchema.index({ name: 1 }, { unique: true });
RoleSchema.index({ admin: 1 });
```

### UserRoleSchema

Associates users with roles (many-to-many).

```typescript
export const UserRoleSchema = new Schema<IUserRoleDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: BaseModelName.User,
    required: true
  },
  roleId: {
    type: Schema.Types.ObjectId,
    ref: BaseModelName.Role,
    required: true
  },
  deletedAt: {
    type: Date,
    required: false,
    default: null
  }
}, {
  timestamps: true
});

UserRoleSchema.index({ userId: 1, roleId: 1 }, { unique: true });
UserRoleSchema.index({ userId: 1 });
UserRoleSchema.index({ roleId: 1 });
```

### EmailTokenSchema

Email verification and password reset tokens.

```typescript
export const EmailTokenSchema = new Schema<IEmailTokenDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: BaseModelName.User,
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: Object.values(EmailTokenType),
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  usedAt: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
});

EmailTokenSchema.index({ token: 1 }, { unique: true });
EmailTokenSchema.index({ userId: 1, type: 1 });
EmailTokenSchema.index({ expiresAt: 1 });
```

### MnemonicSchema

Encrypted mnemonic storage.

```typescript
export const MnemonicSchema = new Schema<IMnemonicDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: BaseModelName.User,
    required: true,
    unique: true
  },
  encryptedMnemonic: {
    type: Buffer,
    required: true
  },
  encryptedWith: {
    type: Buffer,
    required: true
  }
}, {
  timestamps: true
});

MnemonicSchema.index({ userId: 1 }, { unique: true });
```

### UsedDirectLoginTokenSchema

One-time login token tracking.

```typescript
export const UsedDirectLoginTokenSchema = new Schema<IUsedDirectLoginTokenDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: BaseModelName.User,
    required: true
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  usedAt: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  timestamps: true
});

UsedDirectLoginTokenSchema.index({ tokenHash: 1 }, { unique: true });
UsedDirectLoginTokenSchema.index({ usedAt: 1 });
```

## Creating Custom Schemas

### Basic Custom Schema

```typescript
import { Schema } from 'mongoose';
import { IBaseDocument } from '@digitaldefiance/node-express-suite';

interface IProductDocument extends IBaseDocument<Types.ObjectId> {
  name: string;
  description?: string;
  price: number;
  category: string;
  inventory: number;
  active: boolean;
}

export const ProductSchema = new Schema<IProductDocument>({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    minlength: [3, 'Name must be at least 3 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: false,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative'],
    validate: {
      validator: (v: number) => v <= 1000000,
      message: 'Price cannot exceed 1,000,000'
    }
  },
  category: {
    type: String,
    required: true,
    enum: {
      values: ['electronics', 'clothing', 'books', 'food'],
      message: '{VALUE} is not a valid category'
    },
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
```

### Adding Indexes

```typescript
// Single field indexes
ProductSchema.index({ name: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ createdAt: -1 });

// Compound indexes
ProductSchema.index({ category: 1, active: 1 });
ProductSchema.index({ active: 1, inventory: 1 });

// Text search index
ProductSchema.index({ 
  name: 'text', 
  description: 'text' 
});

// Unique indexes
ProductSchema.index({ sku: 1 }, { unique: true });

// Sparse indexes (only index documents with the field)
ProductSchema.index({ featuredUntil: 1 }, { sparse: true });

// TTL index (auto-delete after expiration)
ProductSchema.index({ expiresAt: 1 }, { 
  expireAfterSeconds: 0 
});
```

### Virtual Fields

```typescript
// Computed field
ProductSchema.virtual('priceWithTax').get(function() {
  return this.price * 1.08;
});

// Boolean computed field
ProductSchema.virtual('inStock').get(function() {
  return this.inventory > 0 && this.active;
});

// Formatted field
ProductSchema.virtual('formattedPrice').get(function() {
  return `$${this.price.toFixed(2)}`;
});

// Population virtual
ProductSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'productId'
});
```

### Instance Methods

```typescript
ProductSchema.methods.applyDiscount = function(percent: number) {
  if (percent < 0 || percent > 100) {
    throw new Error('Discount must be between 0 and 100');
  }
  this.price = this.price * (1 - percent / 100);
  return this.save();
};

ProductSchema.methods.decrementInventory = async function(quantity: number) {
  if (this.inventory < quantity) {
    throw new Error('Insufficient inventory');
  }
  this.inventory -= quantity;
  return this.save();
};

ProductSchema.methods.isAvailable = function() {
  return this.active && this.inventory > 0 && !this.deletedAt;
};
```

### Static Methods

```typescript
ProductSchema.statics.findByCategory = function(category: string) {
  return this.find({ 
    category, 
    active: true, 
    deletedAt: null 
  });
};

ProductSchema.statics.findInStock = function() {
  return this.find({
    active: true,
    inventory: { $gt: 0 },
    deletedAt: null
  });
};

ProductSchema.statics.searchByName = function(query: string) {
  return this.find({
    $text: { $search: query },
    active: true,
    deletedAt: null
  }).sort({ score: { $meta: 'textScore' } });
};
```

### Query Helpers

```typescript
ProductSchema.query.active = function() {
  return this.where({ active: true, deletedAt: null });
};

ProductSchema.query.inStock = function() {
  return this.where({ inventory: { $gt: 0 } });
};

ProductSchema.query.byCategory = function(category: string) {
  return this.where({ category });
};

// Usage
const products = await ProductModel
  .find()
  .active()
  .inStock()
  .byCategory('electronics');
```

## Schema Features

### Pre/Post Hooks

#### Pre-Save Hook

```typescript
ProductSchema.pre('save', function(next) {
  // Normalize name
  if (this.name) {
    this.name = this.name.trim();
  }
  
  // Ensure inventory not negative
  if (this.inventory < 0) {
    this.inventory = 0;
  }
  
  // Auto-deactivate if out of stock
  if (this.inventory === 0) {
    this.active = false;
  }
  
  next();
});
```

#### Post-Save Hook

```typescript
ProductSchema.post('save', function(doc, next) {
  console.log(`Product ${doc.name} saved`);
  
  // Trigger external systems
  if (doc.inventory < 10) {
    notifyLowInventory(doc);
  }
  
  next();
});
```

#### Pre-Remove Hook

```typescript
ProductSchema.pre('remove', async function(next) {
  // Soft delete instead
  this.deletedAt = new Date();
  await this.save();
  next();
});
```

#### Query Hooks

```typescript
// Automatically exclude deleted documents
ProductSchema.pre(/^find/, function(next) {
  this.where({ deletedAt: null });
  next();
});

// Log queries
ProductSchema.post(/^find/, function(result, next) {
  console.log(`Found ${result?.length || 0} documents`);
  next();
});
```

### Validation

#### Built-in Validators

```typescript
const schema = new Schema({
  // Required
  name: { type: String, required: true },
  
  // String validators
  username: {
    type: String,
    minlength: 3,
    maxlength: 30,
    lowercase: true,
    trim: true,
    match: /^[a-zA-Z0-9_]+$/
  },
  
  // Number validators
  age: {
    type: Number,
    min: 0,
    max: 120
  },
  
  // Enum
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending']
  },
  
  // Date validators
  birthDate: {
    type: Date,
    min: '1900-01-01',
    max: Date.now
  }
});
```

#### Custom Validators

```typescript
const schema = new Schema({
  email: {
    type: String,
    validate: {
      validator: function(v: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} is not a valid email`
    }
  },
  
  price: {
    type: Number,
    validate: [
      {
        validator: (v: number) => v >= 0,
        message: 'Price cannot be negative'
      },
      {
        validator: (v: number) => v <= 1000000,
        message: 'Price too high'
      }
    ]
  }
});
```

#### Async Validators

```typescript
const schema = new Schema({
  username: {
    type: String,
    validate: {
      validator: async function(v: string) {
        const count = await this.constructor.countDocuments({ 
          username: v,
          _id: { $ne: this._id }
        });
        return count === 0;
      },
      message: 'Username already taken'
    }
  }
});
```

## Best Practices

### 1. Use TypeScript Interfaces

```typescript
interface IProductDocument extends IBaseDocument<Types.ObjectId> {
  name: string;
  price: number;
  // ... other fields
}

const ProductSchema = new Schema<IProductDocument>({
  // Schema definition
});
```

### 2. Add Appropriate Indexes

```typescript
// Frequently queried fields
schema.index({ userId: 1 });

// Compound queries
schema.index({ category: 1, active: 1 });

// Text search
schema.index({ name: 'text', description: 'text' });
```

### 3. Enable Timestamps

```typescript
const schema = new Schema({
  // fields
}, {
  timestamps: true // Adds createdAt and updatedAt
});
```

### 4. Implement Soft Deletes

```typescript
deletedAt: {
  type: Date,
  required: false,
  default: null
}

// Pre-find hook
schema.pre(/^find/, function() {
  this.where({ deletedAt: null });
});
```

### 5. Validate at Schema Level

```typescript
// ✅ Good - Schema validation
price: {
  type: Number,
  required: true,
  min: 0
}

// ❌ Bad - Application validation only
price: Number
// Validate in code
```

### 6. Use Virtuals for Computed Fields

```typescript
// ✅ Good
schema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// ❌ Bad - Store computed value
fullName: String
```

### 7. Optimize Queries

```typescript
// Use lean() for read-only
const products = await ProductModel
  .find()
  .lean()
  .exec();

// Select only needed fields
const products = await ProductModel
  .find()
  .select('name price')
  .exec();
```

## Related Documentation

- [Models](./MODELS.md)
- [Documents](./DOCUMENTS.md)
- [Services](./SERVICES.md)
- [Application](./APPLICATION.md)
