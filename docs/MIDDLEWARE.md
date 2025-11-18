# Middleware

## Table of Contents

- [Overview](#overview)
- [Authentication Middleware](#authentication-middleware)
- [Language Middleware](#language-middleware)
- [Error Handling](#error-handling)
- [Custom Middleware](#custom-middleware)
- [Best Practices](#best-practices)

## Overview

Middleware functions in `@digitaldefiance/node-express-suite` process requests before they reach route handlers. The framework provides authentication, language context, and error handling middleware.

## Authentication Middleware

### authenticateToken

Validates JWT tokens and populates `req.user` with authenticated user information.

```typescript
import { authenticateToken } from '@digitaldefiance/node-express-suite';

export async function authenticateToken(
  application: IApplication,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response>
```

#### Features

- Extracts Bearer token from Authorization header
- Verifies JWT signature and expiration
- Loads user from database
- Checks account status (must be Active)
- Populates user roles
- Sets language context from user preferences
- Handles token expiration gracefully

#### Usage

```typescript
// In controller decorator
@Get('/profile', { auth: true })
async getProfile(req: Request, res: Response) {
  // req.user is automatically populated
  return {
    statusCode: 200,
    response: { user: req.user }
  };
}

// Manual usage
app.get('/api/profile', 
  (req, res, next) => authenticateToken(application, req, res, next),
  (req, res) => {
    res.json({ user: req.user });
  }
);
```

#### Request User Object

```typescript
interface IRequestUserDTO {
  id: string;
  email: string;
  username: string;
  roles: ITokenRole[];
  timezone: string;
  currency: string;
  emailVerified: boolean;
  darkMode: boolean;
  siteLanguage: string;
  directChallenge: boolean;
  lastLogin?: Date;
}
```

#### Error Responses

```typescript
// 401 - Token missing
{ message: "Invalid token" }

// 403 - User not found or inactive
{ message: "User not found" }

// 401 - Token expired
{ 
  message: "Token has expired",
  error: TokenExpiredError
}

// 400 - Invalid token format
{
  message: "Invalid token",
  error: JsonWebTokenError
}
```

### authenticateCrypto

Validates cryptographic authentication using mnemonic or password to load user's private key.

```typescript
import { authenticateCrypto } from '@digitaldefiance/node-express-suite';

export async function authenticateCrypto(
  application: IApplication,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response>
```

#### Features

- Requires prior JWT authentication
- Accepts either mnemonic or password
- Unwraps user's private key
- Creates `BackendMember` instance with key
- Populates `req.eciesUser` for cryptographic operations
- Supports transaction context

#### Usage

```typescript
// In controller decorator
@Post('/backup-codes', { 
  auth: true,
  cryptoAuth: true 
})
async resetBackupCodes(req: Request, res: Response) {
  // req.eciesUser contains private key
  const codes = await this.backupCodeService.generate(
    req.eciesUser,
    this.systemUser
  );
  return {
    statusCode: 200,
    response: { backupCodes: codes }
  };
}
```

#### Request Body

```typescript
{
  // Either mnemonic or password required
  mnemonic?: string;  // 12-24 word phrase
  password?: string;  // User's password
}
```

#### ECIES User Object

```typescript
interface BackendMember {
  publicKey: Buffer;
  privateKey?: Buffer;
  address: string;
  hasPrivateKey: boolean;
}
```

### findAuthToken

Helper function to extract Bearer token from request headers.

```typescript
export function findAuthToken(
  headers: IncomingHttpHeaders
): string | null
```

#### Usage

```typescript
const token = findAuthToken(req.headers);
if (token) {
  const user = await jwtService.verifyToken(token);
}
```

## Language Middleware

### setGlobalContextLanguage

Sets the global language context from request user preferences.

```typescript
export function setGlobalContextLanguageFromRequest(
  req: Request
): void
```

#### Features

- Reads user's `siteLanguage` preference
- Sets `GlobalActiveContext.userLanguage`
- Falls back to system default if not authenticated
- Automatically called by `authenticateToken`

#### Usage

```typescript
// Automatic in authenticateToken
authenticateToken(app, req, res, next);
// User language now set

// Manual usage
@Get('/public-content')
async getContent(req: Request, res: Response) {
  setGlobalContextLanguageFromRequest(req);
  const content = translate(key); // Uses user's language
  return { statusCode: 200, response: { content } };
}
```

## Error Handling

### handleError

Centralized error handling middleware that formats errors consistently.

```typescript
export function handleError(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void
```

#### Features

- Catches all unhandled errors
- Formats error responses consistently
- Translates error messages
- Logs errors with context
- Returns appropriate HTTP status codes

#### Error Types Handled

```typescript
// HandleableError - Custom error with status code
class HandleableError extends Error {
  statusCode: number;
  constructor(message: string, options: { statusCode: number }) {
    super(message);
    this.statusCode = options.statusCode;
  }
}

// TranslatableError - Error with translation key
class TranslatableError extends Error {
  translationKey: string;
  translationParams?: Record<string, any>;
}

// ValidationError - Input validation errors
class ValidationError extends HandleableError {
  errors: ValidationError[];
}
```

#### Usage

```typescript
// In application setup
app.use(errorHandler);

// In route handler
@Post('/create')
async create(req: Request, res: Response) {
  if (!req.body.name) {
    throw new HandleableError('Name required', { statusCode: 400 });
  }
  // Process request
}
```

#### Response Format

```typescript
// Standard error response
{
  message: string;           // Translated error message
  error?: {
    name: string;           // Error class name
    message: string;        // Error message
    stack?: string;         // Stack trace (debug mode only)
  };
  statusCode: number;
}
```

## Custom Middleware

### Creating Custom Middleware

```typescript
import { Request, Response, NextFunction } from 'express';
import { IApplication } from '@digitaldefiance/node-express-suite';

export function customMiddleware(app: IApplication) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Pre-processing
      console.log(`${req.method} ${req.path}`);
      
      // Modify request
      req.customData = await processRequest(req);
      
      // Continue to next middleware
      next();
    } catch (error) {
      // Error handling
      next(error);
    }
  };
}
```

### Rate Limiting Middleware

```typescript
import rateLimit from 'express-rate-limit';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Usage
@Post('/login', {
  middleware: [loginRateLimiter]
})
async login(req: Request, res: Response) {
  // Login logic
}
```

### Request Logging Middleware

```typescript
import { debugLog } from '@digitaldefiance/node-express-suite';

export function requestLogger(app: IApplication) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      debugLog(
        app.environment.debug,
        `${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
      );
    });
    
    next();
  };
}
```

### CORS Middleware

```typescript
import cors from 'cors';

export const corsMiddleware = cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Usage
app.use(corsMiddleware);
```

### Body Parser Configuration

```typescript
import express from 'express';

// JSON body parser with size limit
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Custom verification
  }
}));

// URL-encoded body parser
app.use(express.urlencoded({ 
  extended: true,
  limit: '10mb'
}));

// Raw body for webhooks
app.use('/webhooks', express.raw({ type: 'application/json' }));
```

### File Upload Middleware

```typescript
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Usage
@Post('/upload', {
  middleware: [upload.single('file')]
})
async uploadFile(req: Request, res: Response) {
  const file = req.file;
  return {
    statusCode: 200,
    response: { filename: file.filename }
  };
}
```

## Best Practices

### 1. Middleware Order

Order matters! Apply middleware in this sequence:

```typescript
// 1. Logging (first to capture all requests)
app.use(requestLogger(app));

// 2. Security headers
app.use(helmet());

// 3. CORS
app.use(corsMiddleware);

// 4. Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5. Session/cookies (if using)
app.use(session(sessionConfig));

// 6. Authentication (after body parsing)
app.use('/api', authenticateToken);

// 7. Routes
app.use('/api', routes);

// 8. Error handling (last)
app.use(errorHandler);
```

### 2. Error Propagation

Always call `next(error)` for error handling:

```typescript
// ❌ Bad - Swallows error
async function middleware(req, res, next) {
  try {
    await someAsyncOperation();
    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
}

// ✅ Good - Propagates to error handler
async function middleware(req, res, next) {
  try {
    await someAsyncOperation();
    next();
  } catch (error) {
    next(error);
  }
}
```

### 3. Async Middleware

Wrap async middleware to catch promise rejections:

```typescript
function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Usage
app.use(asyncHandler(async (req, res, next) => {
  await someAsyncOperation();
  next();
}));
```

### 4. Conditional Middleware

Apply middleware conditionally:

```typescript
// Skip middleware for certain paths
app.use((req, res, next) => {
  if (req.path.startsWith('/public')) {
    return next();
  }
  authenticateToken(app, req, res, next);
});

// Skip middleware based on method
app.use((req, res, next) => {
  if (req.method === 'GET') {
    return next();
  }
  validateCSRF(req, res, next);
});
```

### 5. Middleware Composition

Compose multiple middleware:

```typescript
function compose(...middlewares: RequestHandler[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    let index = 0;
    
    const dispatch = (i: number): void => {
      if (i >= middlewares.length) {
        return next();
      }
      
      const middleware = middlewares[i];
      middleware(req, res, (err?: any) => {
        if (err) {
          return next(err);
        }
        dispatch(i + 1);
      });
    };
    
    dispatch(0);
  };
}

// Usage
const authStack = compose(
  authenticateToken,
  checkPermissions,
  loadUserPreferences
);

app.use('/admin', authStack);
```

### 6. Performance

Optimize middleware performance:

```typescript
// Cache expensive operations
const cache = new Map();

function cachedMiddleware(req, res, next) {
  const key = `${req.user?.id}:${req.path}`;
  
  if (cache.has(key)) {
    req.cachedData = cache.get(key);
    return next();
  }
  
  const data = expensiveOperation();
  cache.set(key, data);
  req.cachedData = data;
  next();
}

// Clear cache periodically
setInterval(() => cache.clear(), 60 * 60 * 1000); // 1 hour
```

### 7. Testing Middleware

```typescript
describe('authenticateToken', () => {
  let app: IApplication;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    app = createMockApplication();
    req = {
      headers: {},
      user: undefined
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  it('should authenticate valid token', async () => {
    const token = await createTestToken(app);
    req.headers = { authorization: `Bearer ${token}` };

    await authenticateToken(app, req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
  });

  it('should reject missing token', async () => {
    await authenticateToken(app, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
```

## Related Documentation

- [Controllers](./CONTROLLERS.md)
- [Authentication](./SERVICES.md#jwtservice)
- [Pipeline](./PIPELINE.md)
- [Application](./APPLICATION.md)
