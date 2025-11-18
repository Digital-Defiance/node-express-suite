# Controllers

## Table of Contents

- [Overview](#overview)
- [Base Controller](#base-controller)
- [Decorator System](#decorator-system)
- [User Controller](#user-controller)
- [Creating Custom Controllers](#creating-custom-controllers)
- [Best Practices](#best-practices)

## Overview

Controllers in `@digitaldefiance/node-express-suite` handle HTTP requests and orchestrate the interaction between middleware, services, and responses. The framework provides a powerful decorator-based system for defining routes and middleware.

## Base Controller

### BaseController Class

The `BaseController` is the foundation for all controllers in the framework.

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

#### Key Features

1. **Router Management**: Automatic Express router creation and configuration
2. **Transaction Support**: Built-in transaction management via `TransactionManager`
3. **Validation**: Integration with express-validator
4. **Error Handling**: Centralized error handling and response formatting
5. **Authentication**: Built-in support for JWT and crypto authentication
6. **Language Support**: Multi-language support via i18n integration

#### Core Methods

##### `initRouteDefinitions()`

Override this method to define routes programmatically:

```typescript
protected initRouteDefinitions(): void {
  this.routeDefinitions = [
    {
      method: 'get',
      path: '/profile',
      handlerKey: 'getProfile',
      useAuthentication: true,
      validation: this.getProfileValidation()
    }
  ];
}
```

##### `registerValidationFunctions()`

Register validation functions in the allowlist to prevent code injection:

```typescript
protected registerValidationFunctions(): void {
  // Register custom validators
}
```

##### `initializeRoutes()`

Automatically called during construction to set up all routes with proper middleware chains.

#### Protected Properties

- `activeRequest`: Current request being processed
- `activeResponse`: Current response object
- `activeSession`: Active MongoDB session for transactions
- `constants`: Application constants
- `pluginEngine`: i18n plugin engine instance

#### Transaction Support

Access the current transaction session:

```typescript
protected get session(): ClientSession | undefined {
  return this.activeSession;
}
```

Execute code within a transaction:

```typescript
protected async withTransaction<TResult>(
  callback: TransactionCallback<TResult>,
  options?: TransactionOptions
): Promise<TResult> {
  return await this.transactionManager.withTransaction(callback, options);
}
```

## Decorator System

### Controller Decorator

Mark a class as a controller:

```typescript
@Controller('/api/users')
export class UserController extends DecoratorBaseController {
  // Routes defined here
}
```

### HTTP Method Decorators

#### @Get

Define a GET route:

```typescript
@Get('/profile', { auth: true })
async getProfile(req: Request, res: Response, next: NextFunction) {
  // Implementation
}
```

#### @Post

Define a POST route:

```typescript
@Post('/register', {
  validation: function(lang) {
    return [
      body('username').notEmpty(),
      body('email').isEmail()
    ];
  }
})
async register(req: Request, res: Response, next: NextFunction) {
  // Implementation
}
```

#### @Put, @Delete, @Patch

Similar to @Get and @Post with respective HTTP methods.

### Route Options

```typescript
interface RouteOptions<TLanguage, TConstants> {
  validation?: ValidationChain[] | ((this: ValidationContext<TConstants>, lang: TLanguage) => ValidationChain[]);
  schema?: z.ZodSchema;
  middleware?: RequestHandler[];
  auth?: boolean;
  cryptoAuth?: boolean;
  rawJson?: boolean;
  transaction?: boolean;
  transactionTimeout?: number;
}
```

#### Option Details

- **validation**: Express-validator chains or function returning chains
- **schema**: Zod schema for automatic validation
- **middleware**: Additional middleware to run before the handler
- **auth**: Require JWT authentication
- **cryptoAuth**: Require cryptographic authentication
- **rawJson**: Send raw JSON without wrapping
- **transaction**: Automatically wrap handler in MongoDB transaction
- **transactionTimeout**: Transaction timeout in milliseconds

### Validation Context

Validation functions have access to application constants via `this`:

```typescript
validation: function(lang) {
  return [
    body('username')
      .matches(this.constants.UsernameRegex)
      .withMessage(getSuiteCoreTranslation(key, undefined, lang))
  ];
}
```

### DecoratorBaseController

The `DecoratorBaseController` extends `BaseController` and automatically processes decorators:

```typescript
export abstract class DecoratorBaseController<
  TLanguage extends CoreLanguageCode = CoreLanguageCode
> extends BaseController<ApiResponse, Record<string, any>, TLanguage> {
  protected initRouteDefinitions(): void {
    // Automatically reads @Get, @Post, etc. decorators
    const routes = Reflect.getMetadata(ROUTES_METADATA, this.constructor);
    // Processes and registers routes
  }
}
```

#### Features

1. **Automatic Route Discovery**: Reads decorators via reflection
2. **Zod Schema Conversion**: Converts Zod schemas to express-validator
3. **Validation Binding**: Binds validation functions with proper context
4. **Handler Binding**: Ensures handler methods have correct `this` context

## User Controller

The `UserController` provides a comprehensive example of controller implementation with authentication, validation, and transaction support.

### Key Endpoints

#### Authentication

```typescript
@Post('/register', {
  schema: RegisterSchema,
  validation: function(validationLanguage) {
    return [
      body('username').matches(this.constants.UsernameRegex),
      body('email').isEmail(),
      body('timezone').custom(value => isValidTimezone(value))
    ];
  }
})
async register(req: Request, res: Response, next: NextFunction)
```

#### User Settings

```typescript
@Get('/settings', { auth: true })
async getSettings(req: Request, res: Response, next: NextFunction)

@Post('/settings', {
  auth: true,
  validation: function(validationLanguage) {
    return [
      body('email').optional().isEmail(),
      body('timezone').optional().custom(value => isValidTimezone(value)),
      body('darkMode').optional().isBoolean()
    ];
  }
})
async updateSettings(req: Request, res: Response, next: NextFunction)
```

#### Token Management

```typescript
@Get('/verify', { auth: true })
async tokenVerifiedResponse(req: Request, res: Response, next: NextFunction)

@Get('/refresh-token', { auth: true })
async refreshToken(req: Request, res: Response, next: NextFunction)
```

#### Backup Codes

```typescript
@Get('/backup-codes', { auth: true })
async getBackupCodeCount(req: Request, res: Response, next: NextFunction)

@Post('/backup-codes', {
  auth: true,
  cryptoAuth: true,
  validation: function(validationLanguage) {
    return [
      body('password').optional().notEmpty(),
      body('mnemonic').optional().matches(this.constants.MnemonicRegex)
    ];
  }
})
async resetBackupCodes(req: Request, res: Response, next: NextFunction)
```

### Response Pattern

Controllers return a standardized response:

```typescript
return {
  statusCode: 200,
  response: {
    message: getSuiteCoreTranslation(key),
    user: userDTO
  },
  headers?: {
    Authorization: `Bearer ${token}`
  }
};
```

## Creating Custom Controllers

### Step 1: Extend DecoratorBaseController

```typescript
import { DecoratorBaseController } from '@digitaldefiance/node-express-suite';
import { Controller, Get, Post } from '@digitaldefiance/node-express-suite';

@Controller('/api/products')
export class ProductController extends DecoratorBaseController {
  constructor(application: IApplication) {
    super(application);
  }
}
```

### Step 2: Define Routes with Decorators

```typescript
@Get('/', { auth: false })
async listProducts(req: Request, res: Response, next: NextFunction) {
  const products = await this.productService.findAll();
  return {
    statusCode: 200,
    response: {
      products
    }
  };
}

@Post('/', {
  auth: true,
  validation: function(lang) {
    return [
      body('name').notEmpty().isString(),
      body('price').isNumeric().custom(value => value > 0)
    ];
  },
  transaction: true
})
async createProduct(req: Request, res: Response, next: NextFunction) {
  const { name, price } = this.validatedBody;
  const product = await this.productService.create(
    { name, price },
    this.session
  );
  return {
    statusCode: 201,
    response: {
      message: 'Product created successfully',
      product
    }
  };
}
```

### Step 3: Access Validated Data

```typescript
protected get validatedBody(): Record<string, any> {
  return matchedData(this.activeRequest!);
}
```

### Step 4: Use Services

```typescript
private get productService(): ProductService {
  return this.application.services.get(ServiceKeys.PRODUCT);
}
```

### Step 5: Handle Errors

```typescript
@Get('/:id', { auth: false })
async getProduct(req: Request, res: Response, next: NextFunction) {
  const product = await this.productService.findById(req.params.id);
  
  if (!product) {
    throw new ProductNotFoundError();
  }
  
  return {
    statusCode: 200,
    response: { product }
  };
}
```

## Best Practices

### 1. Keep Controllers Thin

Controllers should orchestrate, not implement business logic:

```typescript
// ❌ Bad
@Post('/calculate')
async calculate(req: Request, res: Response) {
  const result = req.body.a + req.body.b * req.body.c; // Business logic in controller
  return { statusCode: 200, response: { result } };
}

// ✅ Good
@Post('/calculate')
async calculate(req: Request, res: Response) {
  const { a, b, c } = this.validatedBody;
  const result = await this.calculatorService.calculate(a, b, c);
  return { statusCode: 200, response: { result } };
}
```

### 2. Use Transactions for Write Operations

```typescript
@Post('/transfer', { transaction: true })
async transfer(req: Request, res: Response) {
  // this.session is automatically available
  await this.accountService.debit(fromId, amount, this.session);
  await this.accountService.credit(toId, amount, this.session);
  // Automatic commit on success, rollback on error
}
```

### 3. Validate All Input

```typescript
@Post('/create', {
  validation: function(lang) {
    return [
      body('email').isEmail().normalizeEmail(),
      body('age').isInt({ min: 0, max: 120 }),
      body('role').isIn(['user', 'admin', 'moderator'])
    ];
  }
})
```

### 4. Use Appropriate HTTP Status Codes

```typescript
// 200 OK - Successful GET/PUT/PATCH
return { statusCode: 200, response: data };

// 201 Created - Successful POST
return { statusCode: 201, response: newResource };

// 204 No Content - Successful DELETE
return { statusCode: 204, response: {} };

// 400 Bad Request - Validation error
throw new ValidationError();

// 401 Unauthorized - Authentication required
throw new UnauthorizedError();

// 404 Not Found - Resource not found
throw new NotFoundError();
```

### 5. Document Your Endpoints

```typescript
/**
 * Get user profile
 * 
 * @route GET /api/user/profile
 * @auth Required
 * @returns {IApiRequestUserResponse} User profile data
 * @throws {UserNotFoundError} If user doesn't exist
 */
@Get('/profile', { auth: true })
async getProfile(req: Request, res: Response, next: NextFunction)
```

### 6. Use Type-Safe Responses

```typescript
interface IProductResponse {
  message: string;
  product: IProduct;
}

return {
  statusCode: 200,
  response: {
    message: 'Product retrieved successfully',
    product
  } as IProductResponse
};
```

### 7. Leverage Middleware

```typescript
const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

@Post('/login', {
  middleware: [rateLimitMiddleware],
  validation: loginValidation
})
async login(req: Request, res: Response)
```

## Testing Controllers

### Unit Testing

```typescript
describe('ProductController', () => {
  let controller: ProductController;
  let mockApp: IApplication;
  let mockService: jest.Mocked<ProductService>;

  beforeEach(() => {
    mockService = {
      findAll: jest.fn(),
      create: jest.fn()
    } as any;

    mockApp = createMockApplication();
    mockApp.services.register(ServiceKeys.PRODUCT, mockService);
    
    controller = new ProductController(mockApp);
  });

  it('should list products', async () => {
    const products = [{ id: '1', name: 'Test' }];
    mockService.findAll.mockResolvedValue(products);

    const response = await request(controller.router)
      .get('/')
      .expect(200);

    expect(response.body.products).toEqual(products);
  });
});
```

### Integration Testing

```typescript
describe('ProductController Integration', () => {
  let app: Application;

  beforeAll(async () => {
    app = await createTestApplication();
  });

  afterAll(async () => {
    await app.stop();
  });

  it('should create product with authentication', async () => {
    const token = await createTestToken(app);
    
    const response = await request(app.express)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Product', price: 99.99 })
      .expect(201);

    expect(response.body.product).toHaveProperty('id');
  });
});
```

## Related Documentation

- [Base Application](./APPLICATION.md)
- [Services](./SERVICES.md)
- [Middleware](./MIDDLEWARE.md)
- [Validation](./VALIDATION.md)
