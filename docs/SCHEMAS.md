# Schemas

## Overview

The base package defines the `ISchema` contract that database-specific packages implement. Mongoose schema definitions, factories, and built-in schemas have been moved to [`@digitaldefiance/node-express-suite-mongo`](https://www.npmjs.com/package/@digitaldefiance/node-express-suite-mongo).

## Base Package Contracts

The base package provides validation utilities and schema-related interfaces that are database-agnostic:

- Zod-based validation via `@ValidateBody`, `@ValidateParams`, `@ValidateQuery` decorators
- Express-validator integration
- `ISchema<TID, TDoc>` interface (defined in the mongo package for Mongoose implementations)

## Mongoose Schemas

For Mongoose schema definitions and factories, see the mongo package:

- `createUserSchema()`, `createRoleSchema()`, `createEmailTokenSchema()`, etc.
- `UserSchema`, `RoleSchema`, `EmailTokenSchema`, `MnemonicSchema`, `UserRoleSchema`, `UsedDirectLoginTokenSchema`
- `SchemaMap` type for mapping model names to schema entries
- `SchemaCollection` enumeration for collection names

## Extending Schemas

```typescript
import { createUserSchema } from '@digitaldefiance/node-express-suite-mongo';

const BaseUserSchema = createUserSchema(undefined, undefined, undefined, undefined, undefined, undefined, myConstants);
const MyUserSchema = BaseUserSchema.clone();
MyUserSchema.add({
  organizationId: { type: String, required: true },
});
```
