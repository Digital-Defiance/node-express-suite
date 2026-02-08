/**
 * @fileoverview Middleware decorators for Express Suite.
 * Provides @UseMiddleware, @CacheResponse, and @RateLimit decorators.
 * Supports both class-level and method-level application.
 * @module decorators/middleware
 */

import 'reflect-metadata';
import { RequestHandler, Request, Response, NextFunction } from 'express';
import {
  CacheDecoratorOptions,
  RateLimitDecoratorOptions,
} from '../interfaces/openApi/decoratorOptions';
import {
  CACHE_METADATA,
  MIDDLEWARE_METADATA,
  RATE_LIMIT_METADATA,
  RESPONSE_METADATA,
} from './metadata-keys';
import {
  appendToMetadataArray,
  getMetadata,
  getMetadataOrDefault,
  setMetadata,
} from './metadata-collector';

/**
 * Response metadata for 429 Too Many Requests response.
 */
const TOO_MANY_REQUESTS_RESPONSE = {
  statusCode: 429,
  description: 'Too Many Requests - Rate limit exceeded',
  schema: 'ErrorResponse',
};

/**
 * In-memory cache store for @CacheResponse decorator.
 * In production, this should be replaced with Redis or similar.
 */
const cacheStore = new Map<string, { data: unknown; expiry: number }>();

/**
 * In-memory rate limit store for @RateLimit decorator.
 * In production, this should be replaced with Redis or similar.
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Generic constructor type for class decorators.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor = new (...args: any[]) => object;

/**
 * Creates a decorator that can be applied to both classes and methods.
 * @param applyMetadata - Function to apply the metadata
 * @returns A decorator function
 */
function createMiddlewareDecorator(
  applyMetadata: (target: object, propertyKey?: string | symbol) => void,
): ClassDecorator & MethodDecorator {
  function decorator<TFunction extends Constructor>(
    target: TFunction,
  ): TFunction | void;
  function decorator(
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor | void;
  function decorator<TFunction extends Constructor>(
    target: TFunction | object,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ): TFunction | PropertyDescriptor | void {
    if (propertyKey !== undefined && descriptor !== undefined) {
      // Method decorator
      applyMetadata(target.constructor, propertyKey);
      return descriptor;
    } else {
      // Class decorator
      applyMetadata(target as object);
      return target as TFunction;
    }
  }

  return decorator as ClassDecorator & MethodDecorator;
}

/**
 * Adds 429 response to OpenAPI metadata for rate-limited routes.
 * @param target - The target object (class constructor or prototype)
 * @param propertyKey - Optional property key for method-level metadata
 */
function addTooManyRequestsResponse(
  target: object,
  propertyKey?: string | symbol,
): void {
  const existingResponses = getMetadataOrDefault<
    Array<{ statusCode: number; description?: string; schema?: string }>
  >(RESPONSE_METADATA, target, propertyKey, []);

  // Check if 429 response already exists
  const has429 = existingResponses.some((r) => r.statusCode === 429);
  if (!has429) {
    existingResponses.push(TOO_MANY_REQUESTS_RESPONSE);
    setMetadata(RESPONSE_METADATA, existingResponses, target, propertyKey);
  }
}

/**
 * Decorator that attaches Express middleware to a route or all routes in a controller.
 * Can be applied at class level (affects all methods) or method level.
 * Middleware execution order follows decorator order (top to bottom).
 *
 * @param middleware - Single middleware function or array of middleware functions
 * @returns Class or method decorator
 *
 * @example
 * ```typescript
 * // Single middleware
 * @UseMiddleware(loggerMiddleware)
 * @ApiController('/api/users')
 * class UserController {
 *   @Get('/')
 *   listUsers() {}
 * }
 *
 * // Multiple middleware
 * @ApiController('/api/items')
 * class ItemController {
 *   @UseMiddleware([validateMiddleware, sanitizeMiddleware])
 *   @Post('/')
 *   createItem() {}
 * }
 *
 * // Stacked middleware (executed top to bottom)
 * @ApiController('/api/data')
 * class DataController {
 *   @UseMiddleware(firstMiddleware)
 *   @UseMiddleware(secondMiddleware)
 *   @Get('/')
 *   getData() {}
 * }
 * ```
 */
export function UseMiddleware(
  middleware: RequestHandler | RequestHandler[],
): ClassDecorator & MethodDecorator {
  const middlewareArray = Array.isArray(middleware) ? middleware : [middleware];

  return createMiddlewareDecorator((target, propertyKey) => {
    for (const mw of middlewareArray) {
      appendToMetadataArray(MIDDLEWARE_METADATA, mw, target, propertyKey);
    }
  });
}

/**
 * Creates a cache middleware factory that caches responses.
 * @param options - Cache options
 * @returns Express middleware function
 */
function createCacheMiddleware(options: CacheDecoratorOptions): RequestHandler {
  const { ttl, keyPrefix = '', varyByUser = false, varyByQuery = [] } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Build cache key
    let cacheKey = `${keyPrefix}:${req.method}:${req.originalUrl}`;

    if (varyByUser && req.user) {
      const userId =
        typeof req.user === 'object' && 'id' in req.user
          ? (req.user as { id: string }).id
          : String(req.user);
      cacheKey += `:user:${userId}`;
    }

    if (varyByQuery.length > 0) {
      const queryParts = varyByQuery
        .filter((key) => req.query[key] !== undefined)
        .map((key) => `${key}=${req.query[key]}`)
        .sort()
        .join('&');
      if (queryParts) {
        cacheKey += `:query:${queryParts}`;
      }
    }

    // Check cache
    const cached = cacheStore.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      res.json(cached.data);
      return;
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json to cache the response
    res.json = function (data: unknown): Response {
      cacheStore.set(cacheKey, {
        data,
        expiry: Date.now() + ttl * 1000,
      });
      return originalJson(data);
    };

    next();
  };
}

/**
 * Decorator that adds response caching to a route.
 * Caches successful responses for the specified TTL.
 *
 * @param options - Cache options including TTL, key prefix, and vary options
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @ApiController('/api/data')
 * class DataController {
 *   // Cache for 60 seconds
 *   @CacheResponse({ ttl: 60 })
 *   @Get('/static')
 *   getStaticData() {}
 *
 *   // Cache with user variation
 *   @CacheResponse({ ttl: 300, varyByUser: true })
 *   @Get('/user-data')
 *   getUserData() {}
 *
 *   // Cache with query parameter variation
 *   @CacheResponse({ ttl: 120, varyByQuery: ['page', 'limit'] })
 *   @Get('/items')
 *   listItems() {}
 * }
 * ```
 */
export function CacheResponse(options: CacheDecoratorOptions): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    // Store cache metadata
    setMetadata(CACHE_METADATA, options, target.constructor, propertyKey);

    // Add cache middleware
    const cacheMiddleware = createCacheMiddleware(options);
    appendToMetadataArray(
      MIDDLEWARE_METADATA,
      cacheMiddleware,
      target.constructor,
      propertyKey,
    );

    return descriptor;
  };
}

/**
 * Creates a rate limit middleware factory.
 * @param options - Rate limit options
 * @returns Express middleware function
 */
function createRateLimitMiddleware(
  options: RateLimitDecoratorOptions,
): RequestHandler {
  const {
    requests,
    window,
    message = 'Too many requests, please try again later.',
    byUser = false,
    keyGenerator,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Build rate limit key
    let rateLimitKey: string;

    if (keyGenerator) {
      rateLimitKey = keyGenerator(req as unknown as globalThis.Request);
    } else if (byUser && req.user) {
      const userId =
        typeof req.user === 'object' && 'id' in req.user
          ? (req.user as { id: string }).id
          : String(req.user);
      rateLimitKey = `ratelimit:user:${userId}:${req.method}:${req.path}`;
    } else {
      rateLimitKey = `ratelimit:ip:${req.ip}:${req.method}:${req.path}`;
    }

    const now = Date.now();
    const windowMs = window * 1000;

    // Get or create rate limit entry
    let entry = rateLimitStore.get(rateLimitKey);

    if (!entry || entry.resetTime <= now) {
      // Create new entry or reset expired entry
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(rateLimitKey, entry);
      next();
      return;
    }

    // Increment count
    entry.count++;

    if (entry.count > requests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Limit', requests.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', entry.resetTime.toString());
      res.status(429).json({ error: message });
      return;
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', requests.toString());
    res.setHeader('X-RateLimit-Remaining', (requests - entry.count).toString());
    res.setHeader('X-RateLimit-Reset', entry.resetTime.toString());

    next();
  };
}

/**
 * Decorator that adds rate limiting to a route or all routes in a controller.
 * Automatically adds 429 response to OpenAPI spec.
 *
 * @param options - Rate limit options including requests, window, and key options
 * @returns Class or method decorator
 *
 * @example
 * ```typescript
 * @ApiController('/api/auth')
 * class AuthController {
 *   // Limit to 5 requests per minute
 *   @RateLimit({ requests: 5, window: 60 })
 *   @Post('/login')
 *   login() {}
 *
 *   // Limit by user with custom message
 *   @RateLimit({
 *     requests: 100,
 *     window: 3600,
 *     byUser: true,
 *     message: 'Hourly limit exceeded'
 *   })
 *   @Get('/profile')
 *   getProfile() {}
 * }
 *
 * // Class-level rate limiting
 * @RateLimit({ requests: 1000, window: 3600 })
 * @ApiController('/api/data')
 * class DataController {
 *   @Get('/')
 *   getData() {}
 * }
 * ```
 */
export function RateLimit(
  options: RateLimitDecoratorOptions,
): ClassDecorator & MethodDecorator {
  return createMiddlewareDecorator((target, propertyKey) => {
    // Store rate limit metadata
    setMetadata(RATE_LIMIT_METADATA, options, target, propertyKey);

    // Add rate limit middleware
    const rateLimitMiddleware = createRateLimitMiddleware(options);
    appendToMetadataArray(
      MIDDLEWARE_METADATA,
      rateLimitMiddleware,
      target,
      propertyKey,
    );

    // Add 429 response to OpenAPI
    addTooManyRequestsResponse(target, propertyKey);
  });
}

/**
 * Gets all middleware metadata for a method.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns Array of middleware functions
 */
export function getMiddlewareMetadata(
  target: object,
  propertyKey: string | symbol,
): RequestHandler[] {
  return getMetadataOrDefault<RequestHandler[]>(
    MIDDLEWARE_METADATA,
    target,
    propertyKey,
    [],
  );
}

/**
 * Gets the effective middleware for a method, merging class-level and method-level.
 * Class-level middleware runs first, then method-level.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns Merged array of middleware functions
 */
export function getEffectiveMiddleware(
  target: object,
  propertyKey: string | symbol,
): RequestHandler[] {
  const classMiddleware = getMetadataOrDefault<RequestHandler[]>(
    MIDDLEWARE_METADATA,
    target,
    undefined,
    [],
  );
  const methodMiddleware = getMetadataOrDefault<RequestHandler[]>(
    MIDDLEWARE_METADATA,
    target,
    propertyKey,
    [],
  );

  // Class middleware runs first, then method middleware
  return [...classMiddleware, ...methodMiddleware];
}

/**
 * Gets cache metadata for a method.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns Cache options or undefined if not cached
 */
export function getCacheMetadata(
  target: object,
  propertyKey: string | symbol,
): CacheDecoratorOptions | undefined {
  return getMetadata<CacheDecoratorOptions>(
    CACHE_METADATA,
    target,
    propertyKey,
  );
}

/**
 * Gets rate limit metadata for a method.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns Rate limit options or undefined if not rate limited
 */
export function getRateLimitMetadata(
  target: object,
  propertyKey: string | symbol,
): RateLimitDecoratorOptions | undefined {
  return getMetadata<RateLimitDecoratorOptions>(
    RATE_LIMIT_METADATA,
    target,
    propertyKey,
  );
}

/**
 * Gets the effective rate limit metadata for a method, merging class-level and method-level.
 * Method-level settings override class-level settings.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns Rate limit options or undefined if not rate limited
 */
export function getEffectiveRateLimitMetadata(
  target: object,
  propertyKey: string | symbol,
): RateLimitDecoratorOptions | undefined {
  const classRateLimit = getMetadata<RateLimitDecoratorOptions>(
    RATE_LIMIT_METADATA,
    target,
  );
  const methodRateLimit = getMetadata<RateLimitDecoratorOptions>(
    RATE_LIMIT_METADATA,
    target,
    propertyKey,
  );

  // Method-level overrides class-level
  if (methodRateLimit) {
    return methodRateLimit;
  }
  return classRateLimit;
}

/**
 * Checks if a method has caching enabled.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns True if caching is enabled
 */
export function isCached(
  target: object,
  propertyKey: string | symbol,
): boolean {
  return getCacheMetadata(target, propertyKey) !== undefined;
}

/**
 * Checks if a method has rate limiting enabled.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns True if rate limiting is enabled
 */
export function isRateLimited(
  target: object,
  propertyKey: string | symbol,
): boolean {
  return getEffectiveRateLimitMetadata(target, propertyKey) !== undefined;
}

/**
 * Clears the in-memory cache store.
 * Useful for testing.
 */
export function clearCacheStore(): void {
  cacheStore.clear();
}

/**
 * Clears the in-memory rate limit store.
 * Useful for testing.
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}
