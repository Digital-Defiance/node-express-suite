# Controllers

## Table of Contents

- [Overview](#overview)
- [Quick Start with Decorators](#quick-start-with-decorators)
- [Controller Decorators](#controller-decorators)
- [HTTP Method Decorators](#http-method-decorators)
- [Authentication Decorators](#authentication-decorators)
- [Parameter Injection Decorators](#parameter-injection-decorators)
- [Validation Decorators](#validation-decorators)
- [Response Decorators](#response-decorators)
- [Middleware Decorators](#middleware-decorators)
- [Transaction Decorator](#transaction-decorator)
- [OpenAPI Decorators](#openapi-decorators)
- [Lifecycle Decorators](#lifecycle-decorators)
- [Schema Decorators](#schema-decorators)
- [Decorator Composition and Best Practices](#decorator-composition-and-best-practices)
- [Creating Custom Controllers](#creating-custom-controllers)
- [Manual RouteConfig (Legacy)](#manual-routeconfig-legacy)
- [Testing Controllers](#testing-controllers)
- [Related Documentation](#related-documentation)

## Overview

Controllers in `@digitaldefiance/node-express-suite` handle HTTP requests and orchestrate the interaction between middleware, services, and responses. The framework provides a powerful **decorator-based API** as the primary approach for defining routes, validation, authentication, and OpenAPI documentation.

### Why Decorators?

The decorator API offers significant advantages over manual route configuration:

| Feature | Decorator API | Manual RouteConfig |
|---------|--------------|-------------------|
| Route Definition | Decorators on methods | Separate array |
| Type Safety | Full TypeScript support | Manual typing |
| OpenAPI Docs | Auto-generated | Manual configuration |
| Boilerplate | Minimal | Significant |
| Composability | Stack decorators | Nested objects |
| Readability | Self-documenting | Separate from handler |

### Base Classes

- **`DecoratorBaseController`** - Recommended base class with full decorator support
- **`BaseController`** - Legacy base class for manual route configuration

## Quick Start with Decorators

Here's a complete example of a decorated controller:

```typescript
import {
  ApiController,
  DecoratorBaseController,
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
  ApiSummary,
  ApiDescription,
  Transactional,
  Paginated,
} from '@digitaldefiance/node-express-suite';
import { z } from 'zod';

// Define validation schemas
const CreateProductSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().positive(),
  category: z.enum(['electronics', 'clothing', 'food']),
});

const UpdateProductSchema = CreateProductSchema.partial();

@RequireAuth() // All routes require authentication by default
@ApiTags('Products')
@ApiController('/api/products', {
  description: 'Product management endpoints',
})
export class ProductController extends DecoratorBaseController {
  @Public() // Override class-level auth - this route is public
  @ApiSummary('List all products')
  @Paginated({ defaultPageSize: 20, maxPageSize: 100 })
  @Returns(200, 'Product[]', { description: 'List of products' })
  @Get('/')
  async listProducts(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('category') category?: string,
  ) {
    const products = await this.productService.findAll({ page, limit, category });
    return { statusCode: 200, response: { products } };
  }

  @Public()
  @ApiSummary('Get product by ID')
  @Returns(200, 'Product', { description: 'Product details' })
  @Returns(404, 'ErrorResponse', { description: 'Product not found' })
  @Get('/:id')
  async getProduct(@Param('id', { description: 'Product ID' }) id: string) {
    const product = await this.productService.findById(id);
    if (!product) {
      return { statusCode: 404, response: { message: 'Product not found' } };
    }
    return { statusCode: 200, response: { product } };
  }

  @ValidateBody(CreateProductSchema)
  @Transactional()
  @ApiSummary('Create a new product')
  @Returns(201, 'Product', { description: 'Created product' })
  @Returns(400, 'ValidationError', { description: 'Invalid input' })
  @Post('/')
  async createProduct(@Body() data: z.infer<typeof CreateProductSchema>) {
    const product = await this.productService.create(data, this.session);
    return { statusCode: 201, response: { product } };
  }

  @ValidateBody(UpdateProductSchema)
  @Transactional()
  @ApiSummary('Update a product')
  @Returns(200, 'Product', { description: 'Updated product' })
  @Put('/:id')
  async updateProduct(
    @Param('id') id: string,
    @Body() data: z.infer<typeof UpdateProductSchema>,
  ) {
    const product = await this.productService.update(id, data, this.session);
    return { statusCode: 200, response: { product } };
  }

  @Transactional()
  @ApiSummary('Delete a product')
  @Returns(204, undefined, { description: 'Product deleted' })
  @Delete('/:id')
  async deleteProduct(@Param('id') id: string) {
    await this.productService.delete(id, this.session);
    return { statusCode: 204, response: {} };
  }

  private get productService() {
    return this.application.services.get(ServiceKeys.PRODUCT);
  }
}
```



## Controller Decorators

### @Controller

Basic controller decorator for non-OpenAPI use cases:

```typescript
@Controller('/api/items')
export class ItemController extends DecoratorBaseController {
  // Routes defined here
}
```

### @ApiController

OpenAPI-enabled controller with metadata support (recommended):

```typescript
@ApiController('/api/users', {
  tags: ['Users', 'Admin'],           // OpenAPI tags for all routes
  description: 'User management API', // Controller description
  deprecated: false,                  // Mark all routes as deprecated
  name: 'UserController',             // Optional, defaults to class name
})
export class UserController extends DecoratorBaseController {
  // Routes automatically documented in OpenAPI
}
```

### Controller Options

```typescript
interface ApiControllerOptions {
  tags?: string[];        // OpenAPI tags inherited by all routes
  description?: string;   // Controller description
  deprecated?: boolean;   // Mark all routes as deprecated
  name?: string;          // Controller name (defaults to class name)
}
```

## HTTP Method Decorators

Define routes with `@Get`, `@Post`, `@Put`, `@Delete`, and `@Patch`:

```typescript
@Get('/users')
async listUsers() { }

@Post('/users')
async createUser() { }

@Put('/users/:id')
async updateUser() { }

@Delete('/users/:id')
async deleteUser() { }

@Patch('/users/:id')
async patchUser() { }
```

### Inline Route Options

All HTTP method decorators accept optional configuration:

```typescript
@Get('/users/:id', {
  // Authentication
  auth: true,              // Shorthand for @RequireAuth()
  cryptoAuth: false,       // Shorthand for @RequireCryptoAuth()
  
  // Behavior
  rawJson: false,          // Shorthand for @RawJson()
  transaction: false,      // Shorthand for @Transactional()
  transactionTimeout: 30000,
  
  // Validation
  validation: [],          // express-validator chains
  schema: zodSchema,       // Zod schema for body validation
  
  // Middleware
  middleware: [],          // Express middleware array
  
  // OpenAPI (inline)
  summary: 'Get user by ID',
  description: 'Retrieves a user by their unique identifier',
  tags: ['Users'],
  operationId: 'getUserById',
  deprecated: false,
})
async getUser() { }
```

### Route Options Interface

```typescript
interface RouteDecoratorOptions<TLanguage> {
  // Authentication
  auth?: boolean;
  cryptoAuth?: boolean;
  
  // Behavior
  rawJson?: boolean;
  transaction?: boolean;
  transactionTimeout?: number;
  
  // Validation
  validation?: ValidationChain[] | ((lang: TLanguage) => ValidationChain[]);
  schema?: z.ZodSchema;
  
  // Middleware
  middleware?: RequestHandler[];
  
  // OpenAPI
  summary?: string;
  description?: string;
  tags?: string[];
  operationId?: string;
  deprecated?: boolean;
  openapi?: OpenAPIRouteMetadata;
}
```

## Authentication Decorators

### @RequireAuth

Require JWT authentication:

```typescript
// Class-level: all routes require auth
@RequireAuth()
@ApiController('/api/secure')
export class SecureController extends DecoratorBaseController {
  @Get('/data')
  getData() { } // Requires auth (inherited)
}

// Method-level
@RequireAuth()
@Get('/profile')
async getProfile() { }
```

### @RequireCryptoAuth

Require ECIES cryptographic authentication:

```typescript
@RequireAuth()
@RequireCryptoAuth()
@Post('/encrypted')
async createEncrypted() { }
```

### @Public

Override class-level authentication for specific routes:

```typescript
@RequireAuth()
@ApiController('/api/users')
export class UserController extends DecoratorBaseController {
  @Public() // No auth required for this route
  @Get('/public-info')
  getPublicInfo() { }

  @Get('/profile')
  getProfile() { } // Requires auth (inherited from class)
}
```

### @AuthFailureStatus

Customize the HTTP status code returned on authentication failure:

```typescript
@RequireAuth()
@AuthFailureStatus(403) // Return 403 instead of 401
@Get('/admin')
async adminOnly() { }
```

### Authentication and OpenAPI

Authentication decorators automatically add security requirements and responses to OpenAPI:

- `@RequireAuth()` adds `bearerAuth` security requirement and 401 response
- `@RequireCryptoAuth()` adds crypto authentication documentation

## Parameter Injection Decorators

Extract request data directly into handler parameters:

### @Param

Inject path parameters:

```typescript
@Get('/:id')
async getUser(
  @Param('id') id: string,
  @Param('id', { description: 'User ID', schema: { type: 'string', format: 'uuid' } }) id: string,
) { }
```

### @Body

Inject request body:

```typescript
@Post('/')
async createUser(
  @Body() data: CreateUserDto,           // Entire body
  @Body('email') email: string,          // Specific field
) { }
```

### @Query

Inject query parameters:

```typescript
@Get('/')
async listUsers(
  @Query('page') page: number = 1,
  @Query('limit', { description: 'Items per page' }) limit: number = 20,
) { }
```

### @Header

Inject header values:

```typescript
@Get('/')
async getData(
  @Header('X-Request-ID') requestId?: string,
  @Header('Authorization') auth?: string,
) { }
```

### @CurrentUser

Inject the authenticated user from JWT:

```typescript
@RequireAuth()
@Get('/profile')
async getProfile(@CurrentUser() user: AuthenticatedUser) {
  return { statusCode: 200, response: { user } };
}
```

### @EciesUser

Inject the ECIES authenticated member:

```typescript
@RequireCryptoAuth()
@Post('/secure')
async secureAction(@EciesUser() member: EciesMember) { }
```

### @Req, @Res, @Next

Inject raw Express objects (use sparingly):

```typescript
@Get('/')
async handler(
  @Req() req: Request,
  @Res() res: Response,
  @Next() next: NextFunction,
) { }
```

### Parameter Options

```typescript
interface ParamDecoratorOptions {
  description?: string;           // OpenAPI description
  example?: unknown;              // OpenAPI example
  required?: boolean;             // OpenAPI required flag
  schema?: OpenAPIParameterSchema; // OpenAPI schema
}
```

## Validation Decorators

### @ValidateBody

Validate request body with Zod schemas or express-validator:

```typescript
// Zod schema
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

@ValidateBody(CreateUserSchema)
@Post('/')
async createUser(@Body() data: z.infer<typeof CreateUserSchema>) { }

// express-validator chains
@ValidateBody([
  body('email').isEmail().withMessage('Invalid email'),
  body('name').notEmpty().withMessage('Name required'),
])
@Post('/')
async createUser() { }

// Language-aware validation with constants
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

### @ValidateParams

Validate path parameters:

```typescript
@ValidateParams(z.object({ id: z.string().uuid() }))
@Get('/:id')
async getUser(@Param('id') id: string) { }

@ValidateParams([
  param('id').isMongoId().withMessage('Invalid ID format'),
])
@Get('/:id')
async getUser() { }
```

### @ValidateQuery

Validate query parameters:

```typescript
@ValidateQuery(z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().max(100).optional(),
}))
@Get('/')
async listUsers() { }
```

### Validation and OpenAPI

- `@ValidateBody` with Zod automatically generates OpenAPI request body schema
- All validation decorators add 400 Bad Request response to OpenAPI

## Response Decorators

### @Returns

Document response types (stackable for multiple status codes):

```typescript
@Returns(200, 'User', { description: 'User found' })
@Returns(404, 'ErrorResponse', { description: 'User not found' })
@Returns(500, 'ServerError', { description: 'Internal error' })
@Get('/:id')
async getUser() { }
```

### @ResponseDoc

Inline schema for simple responses:

```typescript
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
healthCheck() { }
```

### @RawJson

Bypass the standard response wrapper:

```typescript
@RawJson()
@Get('/raw')
getRawData() {
  return { custom: 'response' }; // Sent as-is
}
```

### @Paginated

Add pagination query parameters to OpenAPI:

```typescript
@Paginated({ defaultPageSize: 20, maxPageSize: 100 })
@Returns(200, 'User[]')
@Get('/')
async listUsers() { }

// Offset-based pagination
@Paginated({ useOffset: true, defaultPageSize: 20 })
@Get('/items')
async listItems() { }
```

### Pagination Options

```typescript
interface PaginatedDecoratorOptions {
  defaultPageSize?: number;  // Default items per page
  maxPageSize?: number;      // Maximum items per page
  useOffset?: boolean;       // Use offset/limit instead of page/limit
}
```



## Middleware Decorators

### @UseMiddleware

Attach Express middleware at class or method level:

```typescript
// Class-level: applies to all routes
@UseMiddleware(loggerMiddleware)
@ApiController('/api/data')
export class DataController extends DecoratorBaseController {
  // Method-level: applies to this route only
  @UseMiddleware([validateMiddleware, sanitizeMiddleware])
  @Post('/')
  createData() { }
}
```

### @CacheResponse

Add response caching:

```typescript
@CacheResponse({ ttl: 60 }) // Cache for 60 seconds
@Get('/static')
getStaticData() { }

@CacheResponse({
  ttl: 300,
  varyByUser: true,        // Different cache per user
  varyByQuery: ['page'],   // Different cache per query param
  keyPrefix: 'users',      // Custom cache key prefix
})
@Get('/user-data')
getUserData() { }
```

### @RateLimit

Add rate limiting (auto-adds 429 response to OpenAPI):

```typescript
@RateLimit({ requests: 5, window: 60 }) // 5 requests per minute
@Post('/login')
login() { }

@RateLimit({
  requests: 100,
  window: 3600,
  byUser: true,                    // Limit per user instead of IP
  message: 'Hourly limit exceeded',
  keyGenerator: (req) => req.ip,   // Custom key generator
})
@Get('/api-data')
getApiData() { }
```

### Middleware Options

```typescript
interface CacheDecoratorOptions {
  ttl: number;              // Time to live in seconds
  keyPrefix?: string;       // Cache key prefix
  varyByUser?: boolean;     // Vary cache by user
  varyByQuery?: string[];   // Vary cache by query params
}

interface RateLimitDecoratorOptions {
  requests: number;         // Max requests
  window: number;           // Time window in seconds
  message?: string;         // Custom error message
  byUser?: boolean;         // Limit per user
  keyGenerator?: (req: Request) => string;
}
```

## Transaction Decorator

### @Transactional

Wrap handlers in MongoDB transactions:

```typescript
@Transactional()
@Post('/')
async createOrder() {
  // this.session is automatically available
  await this.orderService.create(data, this.session);
  await this.inventoryService.decrement(itemId, this.session);
  // Automatic commit on success, rollback on error
}

// With timeout
@Transactional({ timeout: 30000 }) // 30 second timeout
@Post('/bulk')
async bulkCreate() { }
```

### Transaction Options

```typescript
interface TransactionalDecoratorOptions {
  timeout?: number;  // Timeout in milliseconds
}
```

## OpenAPI Decorators

### Operation Decorators

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
getUser() { }

// Individual decorators (composable)
@ApiSummary('Get user by ID')
@ApiDescription('Retrieves a user by their unique identifier')
@ApiTags('Users', 'Public')
@ApiOperationId('getUserById')
@Deprecated()
@Get('/:id')
getUser() { }
```

### @ApiTags

Add tags at class or method level:

```typescript
@ApiTags('Users')
@ApiController('/api/users')
class UserController {
  @ApiTags('Admin') // Adds to class tags: ['Users', 'Admin']
  @Get('/admin')
  adminEndpoint() { }
}
```

### @ApiExample

Add request/response examples:

```typescript
@ApiExample({
  name: 'validUser',
  summary: 'A valid user response',
  value: { id: '123', name: 'John Doe', email: 'john@example.com' },
  type: 'response',
  statusCode: 200,
})
@Get('/:id')
getUser() { }
```

### Parameter Documentation

```typescript
@ApiParam('id', {
  description: 'User ID',
  schema: { type: 'string', format: 'uuid' },
  example: '123e4567-e89b-12d3-a456-426614174000',
})
@Get('/:id')
getUser() { }

@ApiQuery('page', {
  description: 'Page number',
  schema: { type: 'integer', minimum: 1 },
  required: false,
})
@ApiQuery('sort', {
  description: 'Sort field',
  enum: ['name', 'date', 'id'],
})
@Get('/')
listUsers() { }

@ApiHeader('X-Request-ID', {
  description: 'Request tracking ID',
  schema: { type: 'string', format: 'uuid' },
  required: true,
})
@Get('/')
getData() { }
```

### @ApiRequestBody

Document request body:

```typescript
@ApiRequestBody({
  schema: 'CreateUserDto',  // Reference to registered schema
  description: 'User data to create',
  required: true,
  example: { name: 'John', email: 'john@example.com' },
})
@Post('/')
createUser() { }

// With Zod schema
@ApiRequestBody({
  schema: CreateUserSchema,
  description: 'User data',
})
@Post('/')
createUser() { }
```

## Lifecycle Decorators

Hook into request lifecycle events:

### @Before

Execute before the handler:

```typescript
@Before(({ req }) => {
  console.log(`Incoming request to ${req.path}`);
})
@Get('/')
listUsers() { }
```

### @After

Execute after the handler (success or error):

```typescript
@After(({ req, result, error }) => {
  metrics.recordRequest(req.path, error ? 'error' : 'success');
})
@Get('/')
listUsers() { }
```

### @OnSuccess

Execute after successful response:

```typescript
@OnSuccess(({ req, result }) => {
  console.log(`User ${req.params.id} fetched:`, result);
})
@Get('/:id')
getUser() { }
```

### @OnError

Execute on error:

```typescript
@OnError(({ req, error }) => {
  logger.error(`Error on ${req.path}:`, error);
})
@Get('/:id')
getUser() { }
```

### Class-Level Lifecycle Hooks

```typescript
@OnError(({ error }) => logger.error(error))
@ApiController('/api/users')
class UserController extends DecoratorBaseController {
  // All methods inherit the error handler
}
```

### Lifecycle Context

```typescript
interface LifecycleContext {
  req: Request;
  res: Response;
  result?: unknown;  // Handler result (OnSuccess, After)
  error?: Error;     // Error (OnError, After)
}
```

## Schema Decorators

Register classes as OpenAPI schemas:

### @ApiSchema

```typescript
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
```

### Inheritance Support

```typescript
@ApiSchema()
class AdminUser extends User {
  @ApiProperty({ type: 'string' })
  adminLevel: string;
}
```

## Decorator Composition and Best Practices

### Decorator Order

Decorators execute bottom-to-top, but are applied top-to-bottom. For readability, follow this order:

```typescript
// 1. Class-level decorators (top)
@RequireAuth()                    // Authentication
@ApiTags('Users')                 // OpenAPI tags
@ApiController('/api/users')      // Controller definition
export class UserController extends DecoratorBaseController {

  // 2. Method decorators (top to bottom)
  @Public()                       // Auth override
  @ApiSummary('List users')       // OpenAPI summary
  @ApiDescription('...')          // OpenAPI description
  @Paginated()                    // Pagination
  @Returns(200, 'User[]')         // Response documentation
  @ValidateQuery(schema)          // Validation
  @UseMiddleware(middleware)      // Middleware
  @CacheResponse({ ttl: 60 })     // Caching
  @Get('/')                       // HTTP method (always last)
  async listUsers() { }
}
```

### Stacking Decorators

Multiple decorators of the same type accumulate:

```typescript
// Multiple @Returns accumulate
@Returns(200, 'User')
@Returns(400, 'ValidationError')
@Returns(404, 'NotFoundError')
@Returns(500, 'ServerError')
@Get('/:id')
getUser() { }

// Multiple @UseMiddleware execute in order
@UseMiddleware(first)
@UseMiddleware(second)
@UseMiddleware(third)
@Get('/')
handler() { } // Executes: first → second → third → handler

// Tags merge (class + method)
@ApiTags('Users')
@ApiController('/api/users')
class UserController {
  @ApiTags('Admin')
  @Get('/admin')
  admin() { } // Tags: ['Users', 'Admin']
}
```

### Method-Level Overrides

Method decorators override class-level decorators for the same field:

```typescript
@RequireAuth()
@ApiController('/api/data')
class DataController extends DecoratorBaseController {
  @Get('/private')
  private() { } // Requires auth (inherited)

  @Public()
  @Get('/public')
  public() { } // No auth (overridden)
}
```

### Best Practices

1. **Use class-level decorators for shared behavior**
   ```typescript
   @RequireAuth()
   @ApiTags('Users')
   @ApiController('/api/users')
   class UserController { }
   ```

2. **Keep handlers thin** - delegate to services
   ```typescript
   @Post('/')
   async create(@Body() data: CreateDto) {
     const result = await this.service.create(data);
     return { statusCode: 201, response: { result } };
   }
   ```

3. **Use parameter injection** instead of parsing `req`
   ```typescript
   // ✅ Good
   async getUser(@Param('id') id: string) { }
   
   // ❌ Avoid
   async getUser(req: Request) {
     const id = req.params.id;
   }
   ```

4. **Document all responses** for complete OpenAPI specs
   ```typescript
   @Returns(200, 'User')
   @Returns(400, 'ValidationError')
   @Returns(404, 'NotFoundError')
   @Get('/:id')
   ```

5. **Use Zod for validation** - auto-generates OpenAPI schemas
   ```typescript
   @ValidateBody(CreateUserSchema)
   @Post('/')
   ```

6. **Use transactions for write operations**
   ```typescript
   @Transactional()
   @Post('/')
   async create() {
     // this.session available
   }
   ```



## Creating Custom Controllers

### Step 1: Extend DecoratorBaseController

```typescript
import {
  DecoratorBaseController,
  ApiController,
  Get,
  Post,
  Put,
  Delete,
  RequireAuth,
  ValidateBody,
  Param,
  Body,
  Returns,
  Transactional,
} from '@digitaldefiance/node-express-suite';
import { IApplication } from '@digitaldefiance/node-express-suite';

@ApiController('/api/products', { tags: ['Products'] })
export class ProductController extends DecoratorBaseController {
  constructor(application: IApplication) {
    super(application);
  }
}
```

### Step 2: Define Routes with Decorators

```typescript
@ApiController('/api/products', { tags: ['Products'] })
export class ProductController extends DecoratorBaseController {
  @Returns(200, 'Product[]')
  @Get('/')
  async listProducts() {
    const products = await this.productService.findAll();
    return { statusCode: 200, response: { products } };
  }

  @RequireAuth()
  @ValidateBody(CreateProductSchema)
  @Transactional()
  @Returns(201, 'Product')
  @Post('/')
  async createProduct(@Body() data: CreateProductDto) {
    const product = await this.productService.create(data, this.session);
    return { statusCode: 201, response: { product } };
  }

  @Returns(200, 'Product')
  @Returns(404, 'ErrorResponse')
  @Get('/:id')
  async getProduct(@Param('id') id: string) {
    const product = await this.productService.findById(id);
    if (!product) {
      return { statusCode: 404, response: { message: 'Product not found' } };
    }
    return { statusCode: 200, response: { product } };
  }

  @RequireAuth()
  @Transactional()
  @Returns(200, 'Product')
  @Put('/:id')
  async updateProduct(
    @Param('id') id: string,
    @Body() data: UpdateProductDto,
  ) {
    const product = await this.productService.update(id, data, this.session);
    return { statusCode: 200, response: { product } };
  }

  @RequireAuth()
  @Transactional()
  @Returns(204)
  @Delete('/:id')
  async deleteProduct(@Param('id') id: string) {
    await this.productService.delete(id, this.session);
    return { statusCode: 204, response: {} };
  }
}
```

### Step 3: Access Services

```typescript
private get productService(): ProductService {
  return this.application.services.get(ServiceKeys.PRODUCT);
}
```

### Step 4: Access Validated Data

For handlers not using parameter injection:

```typescript
import { matchedData } from 'express-validator';

protected get validatedBody(): Record<string, unknown> {
  return matchedData(this.activeRequest!);
}
```

### Step 5: Handle Errors

```typescript
@Get('/:id')
async getProduct(@Param('id') id: string) {
  const product = await this.productService.findById(id);
  
  if (!product) {
    throw new ProductNotFoundError();
  }
  
  return { statusCode: 200, response: { product } };
}
```

### Complete Example

```typescript
import {
  ApiController,
  DecoratorBaseController,
  Get,
  Post,
  Put,
  Delete,
  RequireAuth,
  Public,
  Param,
  Body,
  Query,
  CurrentUser,
  ValidateBody,
  ValidateQuery,
  Returns,
  ApiSummary,
  ApiDescription,
  Transactional,
  Paginated,
  OnError,
} from '@digitaldefiance/node-express-suite';
import { z } from 'zod';

const CreateOrderSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  notes: z.string().max(500).optional(),
});

const ListOrdersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().max(100).default(20),
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
});

@RequireAuth()
@OnError(({ error }) => console.error('Order error:', error))
@ApiController('/api/orders', {
  tags: ['Orders'],
  description: 'Order management endpoints',
})
export class OrderController extends DecoratorBaseController {
  @ApiSummary('List user orders')
  @Paginated({ defaultPageSize: 20 })
  @ValidateQuery(ListOrdersSchema)
  @Returns(200, 'Order[]')
  @Get('/')
  async listOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('status') status?: string,
  ) {
    const orders = await this.orderService.findByUser(user.id, { page, limit, status });
    return { statusCode: 200, response: { orders } };
  }

  @ApiSummary('Get order details')
  @Returns(200, 'Order')
  @Returns(404, 'ErrorResponse')
  @Get('/:id')
  async getOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const order = await this.orderService.findById(id);
    if (!order || order.userId !== user.id) {
      return { statusCode: 404, response: { message: 'Order not found' } };
    }
    return { statusCode: 200, response: { order } };
  }

  @ApiSummary('Create a new order')
  @ApiDescription('Creates a new order for the authenticated user')
  @ValidateBody(CreateOrderSchema)
  @Transactional()
  @Returns(201, 'Order')
  @Returns(400, 'ValidationError')
  @Post('/')
  async createOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() data: z.infer<typeof CreateOrderSchema>,
  ) {
    const order = await this.orderService.create(
      { ...data, userId: user.id },
      this.session,
    );
    return { statusCode: 201, response: { order } };
  }

  @ApiSummary('Cancel an order')
  @Transactional()
  @Returns(200, 'Order')
  @Returns(404, 'ErrorResponse')
  @Delete('/:id')
  async cancelOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const order = await this.orderService.cancel(id, user.id, this.session);
    if (!order) {
      return { statusCode: 404, response: { message: 'Order not found' } };
    }
    return { statusCode: 200, response: { order } };
  }

  private get orderService() {
    return this.application.services.get(ServiceKeys.ORDER);
  }
}
```

## Manual RouteConfig (Legacy)

For backward compatibility, manual route configuration is still supported using `BaseController`.

### BaseController Class

```typescript
export abstract class BaseController<
  T extends ApiResponse,
  H extends object,
  TLanguage extends string
> {
  public readonly router: Router;
  public readonly application: IApplication;
  protected routeDefinitions: RouteConfig<H, TLanguage>[];
  protected handlers: H;
  protected transactionManager: TransactionManager;
}
```

### Defining Routes Manually

Override `initRouteDefinitions()` to define routes:

```typescript
import { BaseController, RouteConfig } from '@digitaldefiance/node-express-suite';

export class LegacyController extends BaseController<ApiResponse, Handlers, Language> {
  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      {
        method: 'get',
        path: '/profile',
        handlerKey: 'getProfile',
        useAuthentication: true,
        useCryptoAuthentication: false,
        validation: this.getProfileValidation(),
        openapi: {
          summary: 'Get user profile',
          tags: ['Users'],
        },
      },
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
      },
    ];
  }

  async getProfile(req: Request, res: Response, next: NextFunction) {
    const user = await this.userService.findById(req.user.id);
    return { statusCode: 200, response: { user } };
  }

  async register(req: Request, res: Response, next: NextFunction) {
    const user = await this.userService.create(req.body);
    return { statusCode: 201, response: { user } };
  }
}
```

### RouteConfig Interface

```typescript
interface RouteConfig<H, TLanguage> {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  path: string;
  handlerKey: keyof H;
  handlerArgs?: unknown[];
  useAuthentication: boolean;
  useCryptoAuthentication: boolean;
  middleware?: RequestHandler[];
  validation?: ValidationChain[] | ((lang: TLanguage) => ValidationChain[]);
  rawJsonHandler?: boolean;
  authFailureStatusCode?: number;
  useTransaction?: boolean;
  transactionTimeout?: number;
  openapi?: OpenAPIRouteMetadata;
}
```

### Migration to Decorators

For migrating from manual RouteConfig to decorators, see [DECORATOR_MIGRATION.md](./DECORATOR_MIGRATION.md).

### RouteConfig to Decorator Mapping

| RouteConfig Field | Decorator Equivalent |
|-------------------|---------------------|
| `method` | `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch` |
| `path` | Decorator path argument |
| `handlerKey` | Decorated method name |
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



## Testing Controllers

### Unit Testing with Decorators

```typescript
import { ProductController } from './product.controller';
import { createMockApplication } from '@digitaldefiance/express-suite-test-utils';

describe('ProductController', () => {
  let controller: ProductController;
  let mockApp: IApplication;
  let mockService: jest.Mocked<ProductService>;

  beforeEach(() => {
    mockService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ProductService>;

    mockApp = createMockApplication();
    mockApp.services.register(ServiceKeys.PRODUCT, mockService);
    
    controller = new ProductController(mockApp);
  });

  it('should list products', async () => {
    const products = [{ id: '1', name: 'Test Product' }];
    mockService.findAll.mockResolvedValue(products);

    const response = await request(controller.router)
      .get('/')
      .expect(200);

    expect(response.body.products).toEqual(products);
  });

  it('should create product with authentication', async () => {
    const token = await createTestToken(mockApp);
    const newProduct = { name: 'New Product', price: 99.99, category: 'electronics' };
    mockService.create.mockResolvedValue({ id: '1', ...newProduct });

    const response = await request(controller.router)
      .post('/')
      .set('Authorization', `Bearer ${token}`)
      .send(newProduct)
      .expect(201);

    expect(response.body.product).toHaveProperty('id');
  });

  it('should return 404 for non-existent product', async () => {
    mockService.findById.mockResolvedValue(null);

    await request(controller.router)
      .get('/non-existent-id')
      .expect(404);
  });
});
```

### Integration Testing

```typescript
import { Application } from '@digitaldefiance/node-express-suite';
import request from 'supertest';

describe('ProductController Integration', () => {
  let app: Application;

  beforeAll(async () => {
    app = await createTestApplication();
  });

  afterAll(async () => {
    await app.stop();
  });

  it('should create and retrieve product', async () => {
    const token = await createTestToken(app);
    
    // Create product
    const createResponse = await request(app.express)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Product', price: 49.99, category: 'electronics' })
      .expect(201);

    const productId = createResponse.body.product.id;

    // Retrieve product
    const getResponse = await request(app.express)
      .get(`/api/products/${productId}`)
      .expect(200);

    expect(getResponse.body.product.name).toBe('Test Product');
  });

  it('should validate request body', async () => {
    const token = await createTestToken(app);
    
    await request(app.express)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '', price: -10 }) // Invalid data
      .expect(400);
  });

  it('should require authentication for protected routes', async () => {
    await request(app.express)
      .post('/api/products')
      .send({ name: 'Test', price: 10, category: 'food' })
      .expect(401);
  });
});
```

### Testing OpenAPI Generation

```typescript
import { OpenAPIBuilder } from '@digitaldefiance/node-express-suite';

describe('OpenAPI Generation', () => {
  it('should generate valid OpenAPI spec from decorated controller', () => {
    const app = createTestApplication();
    const controller = new ProductController(app);
    
    const builder = new OpenAPIBuilder();
    const spec = builder.build();

    // Verify paths exist
    expect(spec.paths['/api/products']).toBeDefined();
    expect(spec.paths['/api/products/{id}']).toBeDefined();

    // Verify operations
    expect(spec.paths['/api/products'].get).toBeDefined();
    expect(spec.paths['/api/products'].post).toBeDefined();
    expect(spec.paths['/api/products/{id}'].get).toBeDefined();
    expect(spec.paths['/api/products/{id}'].put).toBeDefined();
    expect(spec.paths['/api/products/{id}'].delete).toBeDefined();

    // Verify tags
    expect(spec.paths['/api/products'].get.tags).toContain('Products');

    // Verify responses
    expect(spec.paths['/api/products/{id}'].get.responses['200']).toBeDefined();
    expect(spec.paths['/api/products/{id}'].get.responses['404']).toBeDefined();
  });
});
```

### Testing Validation

```typescript
describe('Validation', () => {
  it('should validate body with Zod schema', async () => {
    const token = await createTestToken(app);
    
    // Valid data
    await request(app.express)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Valid', price: 10, category: 'food' })
      .expect(201);

    // Invalid: missing required field
    await request(app.express)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 10, category: 'food' })
      .expect(400);

    // Invalid: wrong type
    await request(app.express)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test', price: 'not-a-number', category: 'food' })
      .expect(400);

    // Invalid: enum value
    await request(app.express)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test', price: 10, category: 'invalid-category' })
      .expect(400);
  });
});
```

### Testing Transactions

```typescript
describe('Transactions', () => {
  it('should rollback on error', async () => {
    const token = await createTestToken(app);
    
    // Mock service to throw after partial work
    mockService.create.mockImplementation(async (data, session) => {
      await somePartialWork(session);
      throw new Error('Simulated failure');
    });

    await request(app.express)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test', price: 10, category: 'food' })
      .expect(500);

    // Verify partial work was rolled back
    const products = await ProductModel.find({});
    expect(products).toHaveLength(0);
  });
});
```

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - System design and architecture
- [Services](./SERVICES.md) - Business logic and service container
- [Models](./MODELS.md) - Data models and registry
- [Middleware](./MIDDLEWARE.md) - Request pipeline
- [Transactions](./TRANSACTIONS.md) - Transaction management
- [Validation](./VALIDATION.md) - Input validation
- [Decorator Migration Guide](./DECORATOR_MIGRATION.md) - Migrating from RouteConfig to decorators
- [README](../README.md) - Package overview and quick start
