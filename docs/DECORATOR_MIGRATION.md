# Decorator Migration Guide

This guide provides comprehensive instructions for migrating from manual `RouteConfig` definitions to the decorator-based API in `@digitaldefiance/node-express-suite`.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [1:1 Field Mapping Reference](#11-field-mapping-reference)
- [Before/After Examples](#beforeafter-examples)
- [Mixed Usage Patterns](#mixed-usage-patterns)
- [Incremental Migration Strategy](#incremental-migration-strategy)
- [Validation Migration](#validation-migration)
- [Zod Schema Migration](#zod-schema-migration)
- [OpenAPI Migration](#openapi-migration)
- [Migration Checklist](#migration-checklist)
- [Breaking Changes and Workarounds](#breaking-changes-and-workarounds)

---

## Overview

The decorator-based API provides a more declarative, type-safe approach to defining routes. Instead of manually constructing `RouteConfig` objects, you use TypeScript decorators directly on your controller methods.

### Benefits of Decorators

- **Declarative**: Route configuration lives directly on the method it configures
- **Type-safe**: Full TypeScript support with IntelliSense
- **Composable**: Stack multiple decorators to build up functionality
- **OpenAPI Integration**: Automatic OpenAPI documentation generation
- **Less Boilerplate**: No need to maintain separate route definition arrays

### Key Differences

| Aspect | Manual RouteConfig | Decorator API |
|--------|-------------------|---------------|
| Route Definition | Array in `initRouteDefinitions()` | Decorators on methods |
| Handler Reference | `handlerKey: 'methodName'` | Decorated method name |
| Base Class | `BaseController` | `DecoratorBaseController` |
| OpenAPI | Manual `openapi` object | Auto-generated from decorators |

---

## Quick Start

### Before (Manual RouteConfig)

```typescript
import { BaseController, RouteConfig } from '@digitaldefiance/node-express-suite';
import { body } from 'express-validator';

export class UserController extends BaseController<ApiResponse, UserHandlers, Language> {
  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      {
        method: 'get',
        path: '/:id',
        handlerKey: 'getUser',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get user by ID',
          tags: ['Users'],
        },
      },
      {
        method: 'post',
        path: '/',
        handlerKey: 'createUser',
        useAuthentication: true,
        useCryptoAuthentication: false,
        validation: [
          body('email').isEmail(),
          body('name').notEmpty(),
        ],
      },
    ];
  }

  async getUser(req: Request, res: Response, next: NextFunction) {
    const user = await this.userService.findById(req.params.id);
    return { statusCode: 200, response: { user } };
  }

  async createUser(req: Request, res: Response, next: NextFunction) {
    const user = await this.userService.create(req.body);
    return { statusCode: 201, response: { user } };
  }
}
```

### After (Decorator API)

```typescript
import {
  DecoratorBaseController,
  ApiController,
  Get,
  Post,
  RequireAuth,
  ValidateBody,
  ApiSummary,
  ApiTags,
  Param,
  Body,
  Returns,
} from '@digitaldefiance/node-express-suite';
import { body } from 'express-validator';

@RequireAuth()
@ApiController('/api/users', { tags: ['Users'] })
export class UserController extends DecoratorBaseController {
  @ApiSummary('Get user by ID')
  @Returns(200, 'User')
  @Get('/:id')
  async getUser(@Param('id') id: string) {
    const user = await this.userService.findById(id);
    return { statusCode: 200, response: { user } };
  }

  @ValidateBody([
    body('email').isEmail(),
    body('name').notEmpty(),
  ])
  @Returns(201, 'User')
  @Post('/')
  async createUser(@Body() data: CreateUserDto) {
    const user = await this.userService.create(data);
    return { statusCode: 201, response: { user } };
  }
}
```

---

## 1:1 Field Mapping Reference

Every `RouteConfig` field has a decorator equivalent:

| RouteConfig Field | Decorator Equivalent | Notes |
|-------------------|---------------------|-------|
| `method: 'get'` | `@Get(path)` | HTTP method decorators |
| `method: 'post'` | `@Post(path)` | |
| `method: 'put'` | `@Put(path)` | |
| `method: 'delete'` | `@Delete(path)` | |
| `method: 'patch'` | `@Patch(path)` | |
| `path` | Decorator path argument | e.g., `@Get('/users/:id')` |
| `handlerKey` | Decorated method name | Automatic from method |
| `handlerArgs` | `@HandlerArgs(...args)` | Pass extra args to handler |
| `useAuthentication: true` | `@RequireAuth()` | Class or method level |
| `useCryptoAuthentication: true` | `@RequireCryptoAuth()` | Class or method level |
| `middleware` | `@UseMiddleware(...)` | Class or method level |
| `validation` | `@ValidateBody()`, `@ValidateParams()`, `@ValidateQuery()` | Or inline `validation` option |
| `rawJsonHandler: true` | `@RawJson()` | Bypass response wrapper |
| `authFailureStatusCode` | `@AuthFailureStatus(code)` | Custom auth failure code |
| `useTransaction: true` | `@Transactional()` | MongoDB transaction |
| `transactionTimeout` | `@Transactional({ timeout })` | Transaction timeout |

### OpenAPI Field Mapping

| RouteConfig `openapi` Field | Decorator Equivalent |
|-----------------------------|---------------------|
| `openapi.summary` | `@ApiSummary(text)` |
| `openapi.description` | `@ApiDescription(text)` |
| `openapi.tags` | `@ApiTags(...tags)` |
| `openapi.operationId` | `@ApiOperationId(id)` |
| `openapi.deprecated` | `@Deprecated()` |
| `openapi.requestBody` | `@ApiRequestBody(options)` |
| `openapi.responses` | `@Returns(code, schema)` |
| `openapi.parameters` | `@ApiParam()`, `@ApiQuery()`, `@ApiHeader()` |
| Full `openapi` object | `@ApiOperation(options)` |

---

## Before/After Examples

### HTTP Method and Path

**Before:**
```typescript
{
  method: 'get',
  path: '/users/:id',
  handlerKey: 'getUser',
  useAuthentication: false,
  useCryptoAuthentication: false,
}
```

**After:**
```typescript
@Get('/users/:id')
async getUser(@Param('id') id: string) { }
```

### Authentication

**Before:**
```typescript
{
  method: 'get',
  path: '/profile',
  handlerKey: 'getProfile',
  useAuthentication: true,
  useCryptoAuthentication: false,
}
```

**After:**
```typescript
@RequireAuth()
@Get('/profile')
async getProfile() { }
```

### Crypto Authentication

**Before:**
```typescript
{
  method: 'post',
  path: '/secure',
  handlerKey: 'secureAction',
  useAuthentication: true,
  useCryptoAuthentication: true,
}
```

**After:**
```typescript
@RequireAuth()
@RequireCryptoAuth()
@Post('/secure')
async secureAction() { }
```

### Custom Auth Failure Status

**Before:**
```typescript
{
  method: 'get',
  path: '/admin',
  handlerKey: 'adminAction',
  useAuthentication: true,
  useCryptoAuthentication: false,
  authFailureStatusCode: 403,
}
```

**After:**
```typescript
@RequireAuth()
@AuthFailureStatus(403)
@Get('/admin')
async adminAction() { }
```

### Middleware

**Before:**
```typescript
{
  method: 'post',
  path: '/upload',
  handlerKey: 'upload',
  useAuthentication: true,
  useCryptoAuthentication: false,
  middleware: [multerMiddleware, validateFileMiddleware],
}
```

**After:**
```typescript
@RequireAuth()
@UseMiddleware([multerMiddleware, validateFileMiddleware])
@Post('/upload')
async upload() { }
```

### Validation with express-validator

**Before:**
```typescript
{
  method: 'post',
  path: '/register',
  handlerKey: 'register',
  useAuthentication: false,
  useCryptoAuthentication: false,
  validation: [
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
  ],
}
```

**After:**
```typescript
@ValidateBody([
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
])
@Post('/register')
async register(@Body() data: RegisterDto) { }
```

### Raw JSON Handler

**Before:**
```typescript
{
  method: 'get',
  path: '/raw-data',
  handlerKey: 'getRawData',
  useAuthentication: false,
  useCryptoAuthentication: false,
  rawJsonHandler: true,
}
```

**After:**
```typescript
@RawJson()
@Get('/raw-data')
async getRawData() { }
```

### Transaction Support

**Before:**
```typescript
{
  method: 'post',
  path: '/transfer',
  handlerKey: 'transfer',
  useAuthentication: true,
  useCryptoAuthentication: false,
  useTransaction: true,
  transactionTimeout: 30000,
}
```

**After:**
```typescript
@RequireAuth()
@Transactional({ timeout: 30000 })
@Post('/transfer')
async transfer() { }
```

### Handler Arguments

**Before:**
```typescript
{
  method: 'get',
  path: '/items',
  handlerKey: 'listItems',
  handlerArgs: [{ maxItems: 100 }],
  useAuthentication: false,
  useCryptoAuthentication: false,
}
```

**After:**
```typescript
@HandlerArgs({ maxItems: 100 })
@Get('/items')
async listItems(req: Request, config: { maxItems: number }) { }
```

### OpenAPI Metadata

**Before:**
```typescript
{
  method: 'get',
  path: '/users/:id',
  handlerKey: 'getUser',
  useAuthentication: true,
  useCryptoAuthentication: false,
  openapi: {
    summary: 'Get user by ID',
    description: 'Retrieves a user by their unique identifier',
    tags: ['Users'],
    operationId: 'getUserById',
    deprecated: false,
    responses: {
      200: { description: 'User found', schema: { $ref: '#/components/schemas/User' } },
      404: { description: 'User not found' },
    },
  },
}
```

**After:**
```typescript
@RequireAuth()
@ApiSummary('Get user by ID')
@ApiDescription('Retrieves a user by their unique identifier')
@ApiTags('Users')
@ApiOperationId('getUserById')
@Returns(200, 'User', { description: 'User found' })
@Returns(404, 'ErrorResponse', { description: 'User not found' })
@Get('/users/:id')
async getUser(@Param('id') id: string) { }
```

---

## Mixed Usage Patterns

You can use both decorated routes and manual `RouteConfig` in the same controller during migration.

### Hybrid Controller Example

```typescript
import {
  DecoratorBaseController,
  ApiController,
  Get,
  Post,
  RequireAuth,
} from '@digitaldefiance/node-express-suite';

@ApiController('/api/items')
export class ItemController extends DecoratorBaseController {
  // Decorated route (new style)
  @RequireAuth()
  @Get('/:id')
  async getItem(@Param('id') id: string) {
    return { statusCode: 200, response: { item: await this.itemService.findById(id) } };
  }

  // Manual route definition (legacy style) - still works!
  protected initRouteDefinitions(): void {
    // Call super to process decorators first
    super.initRouteDefinitions();
    
    // Add manual routes
    this.routeDefinitions.push({
      method: 'post',
      path: '/legacy',
      handlerKey: 'legacyCreate',
      useAuthentication: true,
      useCryptoAuthentication: false,
    });
  }

  async legacyCreate(req: Request, res: Response, next: NextFunction) {
    // Legacy handler
  }
}
```

### Important Notes for Mixed Usage

1. **Call `super.initRouteDefinitions()`** first to process decorators
2. **Avoid duplicate routes** - don't define the same path/method both ways
3. **Decorator routes take precedence** if there's a conflict
4. **Plan to fully migrate** - mixed usage is for transition, not permanent

---

## Incremental Migration Strategy

### Phase 1: Setup (1 day)

1. **Update imports** to include decorator exports:
   ```typescript
   import {
     DecoratorBaseController,
     ApiController,
     Get, Post, Put, Delete, Patch,
     RequireAuth, RequireCryptoAuth, Public,
     // ... other decorators
   } from '@digitaldefiance/node-express-suite';
   ```

2. **Change base class** from `BaseController` to `DecoratorBaseController`

3. **Add `@ApiController` decorator** with your base path:
   ```typescript
   @ApiController('/api/users')
   export class UserController extends DecoratorBaseController {
   ```

### Phase 2: Migrate Routes (per controller)

For each route in `routeDefinitions`:

1. **Add HTTP method decorator** to the handler method:
   ```typescript
   @Get('/:id')
   async getUser() { }
   ```

2. **Add auth decorators** if needed:
   ```typescript
   @RequireAuth()
   @Get('/:id')
   ```

3. **Add validation decorators** if needed:
   ```typescript
   @ValidateBody(schema)
   @Post('/')
   ```

4. **Add OpenAPI decorators** for documentation:
   ```typescript
   @ApiSummary('Get user')
   @Returns(200, 'User')
   ```

5. **Remove the route from `routeDefinitions` array**

6. **Test the endpoint** to verify it works

### Phase 3: Cleanup

1. **Remove empty `initRouteDefinitions()`** method if all routes are decorated
2. **Remove unused imports** (RouteConfig, etc.)
3. **Update tests** to use new patterns

### Migration Order Recommendation

1. Start with **simple GET endpoints** (no validation, no auth)
2. Move to **authenticated endpoints**
3. Then **endpoints with validation**
4. Finally **complex endpoints** (transactions, middleware, etc.)

---

## Validation Migration

### express-validator Chains

**Before:**
```typescript
{
  validation: [
    body('email').isEmail().withMessage('Invalid email'),
    body('name').notEmpty().withMessage('Name required'),
  ],
}
```

**After:**
```typescript
@ValidateBody([
  body('email').isEmail().withMessage('Invalid email'),
  body('name').notEmpty().withMessage('Name required'),
])
@Post('/')
async create() { }
```

### Language-Aware Validation with ValidationContext

The `ValidationContext` provides access to application constants within validation functions.

**Before:**
```typescript
{
  validation: function(lang) {
    return [
      body('username')
        .matches(this.constants.UsernameRegex)
        .withMessage(getTranslation('invalidUsername', lang)),
    ];
  },
}
```

**After:**
```typescript
@ValidateBody(function(this: ValidationContext<MyConstants>, lang: Language) {
  return [
    body('username')
      .matches(this.constants.UsernameRegex)
      .withMessage(getTranslation('invalidUsername', lang)),
  ];
})
@Post('/register')
async register() { }
```

### Validation for Different Request Parts

```typescript
// Validate path parameters
@ValidateParams([
  param('id').isMongoId().withMessage('Invalid ID format'),
])
@Get('/:id')
async getById(@Param('id') id: string) { }

// Validate query parameters
@ValidateQuery([
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
])
@Get('/')
async list(@Query('page') page?: number, @Query('limit') limit?: number) { }

// Validate request body
@ValidateBody([
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
])
@Post('/')
async create(@Body() data: CreateDto) { }
```

---

## Zod Schema Migration

### Basic Zod Schema

**Before (with `schema` option):**
```typescript
{
  method: 'post',
  path: '/',
  handlerKey: 'create',
  useAuthentication: true,
  useCryptoAuthentication: false,
  schema: CreateUserSchema,  // Zod schema
}
```

**After:**
```typescript
@RequireAuth()
@ValidateBody(CreateUserSchema)
@Post('/')
async create(@Body() data: z.infer<typeof CreateUserSchema>) { }
```

### Zod Schema with OpenAPI

Zod schemas are automatically converted to OpenAPI schemas:

```typescript
const CreateUserSchema = z.object({
  email: z.string().email().describe('User email address'),
  name: z.string().min(1).max(100).describe('User display name'),
  age: z.number().int().positive().optional().describe('User age'),
});

@ValidateBody(CreateUserSchema)
@ApiRequestBody({
  description: 'User creation data',
  required: true,
})
@Returns(201, 'User')
@Post('/')
async createUser(@Body() data: z.infer<typeof CreateUserSchema>) { }
```

### Complex Zod Schemas

```typescript
const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

@ValidateQuery(PaginationSchema)
@Paginated({ defaultPageSize: 20, maxPageSize: 100 })
@Get('/')
async list(
  @Query('page') page: number,
  @Query('limit') limit: number,
  @Query('sortBy') sortBy?: string,
  @Query('sortOrder') sortOrder?: string,
) { }
```

---

## OpenAPI Migration

### Controller-Level Tags

**Before:**
```typescript
// Had to add tags to each route's openapi object
```

**After:**
```typescript
@ApiController('/api/users', {
  tags: ['Users'],
  description: 'User management endpoints',
})
export class UserController extends DecoratorBaseController { }
```

### Method-Level Documentation

```typescript
@ApiSummary('Create a new user')
@ApiDescription('Creates a new user account with the provided information')
@ApiTags('Users', 'Registration')  // Adds to controller tags
@ApiOperationId('createUser')
@Returns(201, 'User', { description: 'User created successfully' })
@Returns(400, 'ValidationError', { description: 'Invalid input data' })
@Returns(409, 'ErrorResponse', { description: 'Email already exists' })
@Post('/')
async createUser(@Body() data: CreateUserDto) { }
```

### Deprecating Endpoints

```typescript
@Deprecated()
@ApiDescription('Use /v2/users/:id instead')
@Get('/legacy/:id')
async getLegacyUser(@Param('id') id: string) { }
```

### Request Body Documentation

```typescript
@ApiRequestBody({
  description: 'User update data',
  required: true,
  schema: 'UpdateUserRequest',
  example: {
    name: 'John Doe',
    email: 'john@example.com',
  },
})
@Put('/:id')
async updateUser(@Param('id') id: string, @Body() data: UpdateUserDto) { }
```

### Parameter Documentation

```typescript
@ApiParam('id', {
  description: 'User unique identifier',
  schema: { type: 'string', format: 'uuid' },
  example: '123e4567-e89b-12d3-a456-426614174000',
})
@ApiQuery('include', {
  description: 'Related resources to include',
  required: false,
  schema: { type: 'string', enum: ['profile', 'settings', 'posts'] },
})
@Get('/:id')
async getUser(
  @Param('id') id: string,
  @Query('include') include?: string,
) { }
```

### Response Examples

```typescript
@ApiExample({
  name: 'successResponse',
  summary: 'Successful user retrieval',
  value: {
    id: '123',
    name: 'John Doe',
    email: 'john@example.com',
  },
  type: 'response',
  statusCode: 200,
})
@Returns(200, 'User')
@Get('/:id')
async getUser(@Param('id') id: string) { }
```

---

## Migration Checklist

Use this checklist to verify your migration is complete:

### Per Controller

- [ ] Changed base class to `DecoratorBaseController`
- [ ] Added `@ApiController` decorator with base path
- [ ] Added controller-level `@ApiTags` if applicable
- [ ] Added controller-level `@RequireAuth` if all routes need auth

### Per Route

- [ ] Added HTTP method decorator (`@Get`, `@Post`, etc.)
- [ ] Added authentication decorator if needed (`@RequireAuth`, `@RequireCryptoAuth`)
- [ ] Added `@Public` if route overrides class-level auth
- [ ] Added validation decorator if needed (`@ValidateBody`, `@ValidateParams`, `@ValidateQuery`)
- [ ] Added `@Transactional` if route uses transactions
- [ ] Added `@UseMiddleware` if route has custom middleware
- [ ] Added `@RawJson` if route returns raw JSON
- [ ] Added `@HandlerArgs` if route has handler arguments
- [ ] Added OpenAPI decorators (`@ApiSummary`, `@Returns`, etc.)
- [ ] Removed route from `routeDefinitions` array
- [ ] Updated handler to use parameter injection decorators (`@Param`, `@Body`, etc.)
- [ ] Tested endpoint functionality
- [ ] Verified OpenAPI documentation is correct

### Final Cleanup

- [ ] Removed empty `initRouteDefinitions()` method
- [ ] Removed unused imports
- [ ] Updated unit tests
- [ ] Updated integration tests
- [ ] Verified all endpoints work correctly
- [ ] Verified OpenAPI spec is complete and accurate

---

## Breaking Changes and Workarounds

### No Breaking Changes

The decorator API is **fully backward compatible**. All existing `RouteConfig` functionality continues to work. You can:

- Keep using `BaseController` with manual route definitions
- Mix decorated and manual routes in `DecoratorBaseController`
- Gradually migrate at your own pace

### Behavioral Differences

#### 1. Handler Method Signature

**Manual RouteConfig:**
```typescript
async getUser(req: Request, res: Response, next: NextFunction) {
  const id = req.params.id;
}
```

**With Parameter Injection:**
```typescript
async getUser(@Param('id') id: string) {
  // id is already extracted
}
```

**Workaround:** You can still use `@Req()` to get the full request:
```typescript
async getUser(@Req() req: Request, @Param('id') id: string) {
  // Both available
}
```

#### 2. Validation Context Access

**Manual RouteConfig:**
```typescript
validation: function(lang) {
  // 'this' is automatically bound to ValidationContext
  return [body('x').matches(this.constants.Regex)];
}
```

**Decorator API:**
```typescript
@ValidateBody(function(this: ValidationContext<MyConstants>, lang) {
  // Same behavior, but TypeScript needs explicit type annotation
  return [body('x').matches(this.constants.Regex)];
})
```

#### 3. OpenAPI Auto-Generation

Decorators automatically add certain OpenAPI responses:

- `@RequireAuth()` adds 401 Unauthorized response
- `@ValidateBody()` adds 400 Bad Request response
- `@RateLimit()` adds 429 Too Many Requests response

If you don't want these auto-generated responses, you can override them with explicit `@Returns` decorators.

### Common Migration Issues

#### Issue: Route Not Found After Migration

**Cause:** Forgot to add HTTP method decorator or path is incorrect.

**Solution:** Ensure every handler has `@Get`, `@Post`, etc. with the correct path.

#### Issue: Authentication Not Working

**Cause:** Forgot to add `@RequireAuth()` decorator.

**Solution:** Add auth decorator at method or class level.

#### Issue: Validation Not Running

**Cause:** Using wrong validation decorator or schema type.

**Solution:** 
- Use `@ValidateBody` for request body
- Use `@ValidateParams` for path parameters
- Use `@ValidateQuery` for query parameters

#### Issue: OpenAPI Spec Missing Information

**Cause:** Decorators not added or in wrong order.

**Solution:** Add OpenAPI decorators (`@ApiSummary`, `@Returns`, etc.) and ensure they're applied before the HTTP method decorator.

#### Issue: Handler Arguments Not Received

**Cause:** Using `@HandlerArgs` but handler signature doesn't match.

**Solution:** Handler args come after the request parameter:
```typescript
@HandlerArgs({ config: true })
@Get('/')
async handler(req: Request, args: { config: boolean }) { }
```

---

## Need Help?

- Check the [README](../README.md) for decorator API overview
- See [CONTROLLERS.md](./CONTROLLERS.md) for controller documentation
- Review the source code in `src/decorators/` for implementation details
- Open an issue on GitHub for bugs or feature requests
