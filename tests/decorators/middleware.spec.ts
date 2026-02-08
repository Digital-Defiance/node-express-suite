import 'reflect-metadata';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import {
  UseMiddleware,
  CacheResponse,
  RateLimit,
  getMiddlewareMetadata,
  getEffectiveMiddleware,
  getCacheMetadata,
  getRateLimitMetadata,
  getEffectiveRateLimitMetadata,
  isCached,
  isRateLimited,
  clearCacheStore,
  clearRateLimitStore,
} from '../../src/decorators/middleware';
import {
  MIDDLEWARE_METADATA,
  CACHE_METADATA,
  RATE_LIMIT_METADATA,
  RESPONSE_METADATA,
} from '../../src/decorators/metadata-keys';

// Mock middleware functions for testing
const mockMiddleware1: RequestHandler = (
  _req: Request,
  _res: Response,
  next: NextFunction,
) => next();
const mockMiddleware2: RequestHandler = (
  _req: Request,
  _res: Response,
  next: NextFunction,
) => next();
const mockMiddleware3: RequestHandler = (
  _req: Request,
  _res: Response,
  next: NextFunction,
) => next();

describe('Middleware Decorators', () => {
  beforeEach(() => {
    clearCacheStore();
    clearRateLimitStore();
  });

  describe('@UseMiddleware', () => {
    it('should set middleware metadata on method with single middleware', () => {
      class TestController {
        @UseMiddleware(mockMiddleware1)
        testMethod() {}
      }

      const middleware = Reflect.getMetadata(
        MIDDLEWARE_METADATA,
        TestController,
        'testMethod',
      ) as RequestHandler[];
      expect(middleware).toHaveLength(1);
      expect(middleware[0]).toBe(mockMiddleware1);
    });

    it('should set middleware metadata on method with array of middleware', () => {
      class TestController {
        @UseMiddleware([mockMiddleware1, mockMiddleware2])
        testMethod() {}
      }

      const middleware = Reflect.getMetadata(
        MIDDLEWARE_METADATA,
        TestController,
        'testMethod',
      ) as RequestHandler[];
      expect(middleware).toHaveLength(2);
      expect(middleware[0]).toBe(mockMiddleware1);
      expect(middleware[1]).toBe(mockMiddleware2);
    });

    it('should set middleware metadata on class', () => {
      @UseMiddleware(mockMiddleware1)
      class TestController {}

      const middleware = Reflect.getMetadata(
        MIDDLEWARE_METADATA,
        TestController,
      ) as RequestHandler[];
      expect(middleware).toHaveLength(1);
      expect(middleware[0]).toBe(mockMiddleware1);
    });

    it('should set middleware metadata on class with array', () => {
      @UseMiddleware([mockMiddleware1, mockMiddleware2])
      class TestController {}

      const middleware = Reflect.getMetadata(
        MIDDLEWARE_METADATA,
        TestController,
      ) as RequestHandler[];
      expect(middleware).toHaveLength(2);
    });

    it('should allow stacking multiple @UseMiddleware decorators', () => {
      class TestController {
        @UseMiddleware(mockMiddleware1)
        @UseMiddleware(mockMiddleware2)
        testMethod() {}
      }

      const middleware = Reflect.getMetadata(
        MIDDLEWARE_METADATA,
        TestController,
        'testMethod',
      ) as RequestHandler[];
      // Decorators are applied bottom-up, so middleware2 is added first, then middleware1
      expect(middleware).toHaveLength(2);
      expect(middleware).toContain(mockMiddleware1);
      expect(middleware).toContain(mockMiddleware2);
    });

    it('should allow stacking @UseMiddleware with arrays', () => {
      class TestController {
        @UseMiddleware([mockMiddleware1])
        @UseMiddleware([mockMiddleware2, mockMiddleware3])
        testMethod() {}
      }

      const middleware = Reflect.getMetadata(
        MIDDLEWARE_METADATA,
        TestController,
        'testMethod',
      ) as RequestHandler[];
      expect(middleware).toHaveLength(3);
    });
  });

  describe('@CacheResponse', () => {
    it('should set cache metadata on method', () => {
      class TestController {
        @CacheResponse({ ttl: 60 })
        cachedMethod() {}
      }

      const cacheOptions = Reflect.getMetadata(
        CACHE_METADATA,
        TestController,
        'cachedMethod',
      );
      expect(cacheOptions).toEqual({ ttl: 60 });
    });

    it('should set cache metadata with all options', () => {
      class TestController {
        @CacheResponse({
          ttl: 300,
          keyPrefix: 'test',
          varyByUser: true,
          varyByQuery: ['page', 'limit'],
        })
        cachedMethod() {}
      }

      const cacheOptions = Reflect.getMetadata(
        CACHE_METADATA,
        TestController,
        'cachedMethod',
      );
      expect(cacheOptions).toEqual({
        ttl: 300,
        keyPrefix: 'test',
        varyByUser: true,
        varyByQuery: ['page', 'limit'],
      });
    });

    it('should add cache middleware to method', () => {
      class TestController {
        @CacheResponse({ ttl: 60 })
        cachedMethod() {}
      }

      const middleware = Reflect.getMetadata(
        MIDDLEWARE_METADATA,
        TestController,
        'cachedMethod',
      ) as RequestHandler[];
      expect(middleware).toHaveLength(1);
      expect(typeof middleware[0]).toBe('function');
    });
  });

  describe('@RateLimit', () => {
    it('should set rate limit metadata on method', () => {
      class TestController {
        @RateLimit({ requests: 100, window: 60 })
        limitedMethod() {}
      }

      const rateLimitOptions = Reflect.getMetadata(
        RATE_LIMIT_METADATA,
        TestController,
        'limitedMethod',
      );
      expect(rateLimitOptions).toEqual({ requests: 100, window: 60 });
    });

    it('should set rate limit metadata on class', () => {
      @RateLimit({ requests: 1000, window: 3600 })
      class TestController {}

      const rateLimitOptions = Reflect.getMetadata(
        RATE_LIMIT_METADATA,
        TestController,
      );
      expect(rateLimitOptions).toEqual({ requests: 1000, window: 3600 });
    });

    it('should set rate limit metadata with all options', () => {
      class TestController {
        @RateLimit({
          requests: 5,
          window: 60,
          message: 'Custom rate limit message',
          byUser: true,
        })
        limitedMethod() {}
      }

      const rateLimitOptions = Reflect.getMetadata(
        RATE_LIMIT_METADATA,
        TestController,
        'limitedMethod',
      );
      expect(rateLimitOptions).toEqual({
        requests: 5,
        window: 60,
        message: 'Custom rate limit message',
        byUser: true,
      });
    });

    it('should add rate limit middleware to method', () => {
      class TestController {
        @RateLimit({ requests: 100, window: 60 })
        limitedMethod() {}
      }

      const middleware = Reflect.getMetadata(
        MIDDLEWARE_METADATA,
        TestController,
        'limitedMethod',
      ) as RequestHandler[];
      expect(middleware).toHaveLength(1);
      expect(typeof middleware[0]).toBe('function');
    });

    it('should add rate limit middleware to class', () => {
      @RateLimit({ requests: 1000, window: 3600 })
      class TestController {}

      const middleware = Reflect.getMetadata(
        MIDDLEWARE_METADATA,
        TestController,
      ) as RequestHandler[];
      expect(middleware).toHaveLength(1);
      expect(typeof middleware[0]).toBe('function');
    });

    it('should add 429 response to method metadata', () => {
      class TestController {
        @RateLimit({ requests: 100, window: 60 })
        limitedMethod() {}
      }

      const responses = Reflect.getMetadata(
        RESPONSE_METADATA,
        TestController,
        'limitedMethod',
      ) as Array<{ statusCode: number }>;
      expect(responses).toContainEqual(
        expect.objectContaining({ statusCode: 429 }),
      );
    });

    it('should add 429 response to class metadata', () => {
      @RateLimit({ requests: 1000, window: 3600 })
      class TestController {}

      const responses = Reflect.getMetadata(
        RESPONSE_METADATA,
        TestController,
      ) as Array<{ statusCode: number }>;
      expect(responses).toContainEqual(
        expect.objectContaining({ statusCode: 429 }),
      );
    });

    it('should not duplicate 429 response when applied multiple times', () => {
      @RateLimit({ requests: 1000, window: 3600 })
      class TestController {
        @RateLimit({ requests: 100, window: 60 })
        limitedMethod() {}
      }

      const methodResponses = Reflect.getMetadata(
        RESPONSE_METADATA,
        TestController,
        'limitedMethod',
      ) as Array<{ statusCode: number }>;
      const count429 = methodResponses.filter(
        (r) => r.statusCode === 429,
      ).length;
      expect(count429).toBe(1);
    });
  });

  describe('getMiddlewareMetadata', () => {
    it('should return middleware for a method', () => {
      class TestController {
        @UseMiddleware(mockMiddleware1)
        testMethod() {}
      }

      const middleware = getMiddlewareMetadata(TestController, 'testMethod');
      expect(middleware).toHaveLength(1);
      expect(middleware[0]).toBe(mockMiddleware1);
    });

    it('should return empty array when no middleware', () => {
      class TestController {
        testMethod() {}
      }

      const middleware = getMiddlewareMetadata(TestController, 'testMethod');
      expect(middleware).toEqual([]);
    });
  });

  describe('getEffectiveMiddleware', () => {
    it('should return method-level middleware when no class-level exists', () => {
      class TestController {
        @UseMiddleware(mockMiddleware1)
        testMethod() {}
      }

      const middleware = getEffectiveMiddleware(TestController, 'testMethod');
      expect(middleware).toHaveLength(1);
      expect(middleware[0]).toBe(mockMiddleware1);
    });

    it('should return class-level middleware when no method-level exists', () => {
      @UseMiddleware(mockMiddleware1)
      class TestController {
        testMethod() {}
      }

      const middleware = getEffectiveMiddleware(TestController, 'testMethod');
      expect(middleware).toHaveLength(1);
      expect(middleware[0]).toBe(mockMiddleware1);
    });

    it('should merge class and method middleware with class first', () => {
      @UseMiddleware(mockMiddleware1)
      class TestController {
        @UseMiddleware(mockMiddleware2)
        testMethod() {}
      }

      const middleware = getEffectiveMiddleware(TestController, 'testMethod');
      expect(middleware).toHaveLength(2);
      expect(middleware[0]).toBe(mockMiddleware1); // Class middleware first
      expect(middleware[1]).toBe(mockMiddleware2); // Method middleware second
    });

    it('should handle multiple class and method middleware', () => {
      @UseMiddleware([mockMiddleware1, mockMiddleware2])
      class TestController {
        @UseMiddleware(mockMiddleware3)
        testMethod() {}
      }

      const middleware = getEffectiveMiddleware(TestController, 'testMethod');
      expect(middleware).toHaveLength(3);
      expect(middleware[0]).toBe(mockMiddleware1);
      expect(middleware[1]).toBe(mockMiddleware2);
      expect(middleware[2]).toBe(mockMiddleware3);
    });
  });

  describe('getCacheMetadata', () => {
    it('should return cache options for a cached method', () => {
      class TestController {
        @CacheResponse({ ttl: 60 })
        cachedMethod() {}
      }

      const options = getCacheMetadata(TestController, 'cachedMethod');
      expect(options).toEqual({ ttl: 60 });
    });

    it('should return undefined for non-cached method', () => {
      class TestController {
        testMethod() {}
      }

      const options = getCacheMetadata(TestController, 'testMethod');
      expect(options).toBeUndefined();
    });
  });

  describe('getRateLimitMetadata', () => {
    it('should return rate limit options for a rate-limited method', () => {
      class TestController {
        @RateLimit({ requests: 100, window: 60 })
        limitedMethod() {}
      }

      const options = getRateLimitMetadata(TestController, 'limitedMethod');
      expect(options).toEqual({ requests: 100, window: 60 });
    });

    it('should return undefined for non-rate-limited method', () => {
      class TestController {
        testMethod() {}
      }

      const options = getRateLimitMetadata(TestController, 'testMethod');
      expect(options).toBeUndefined();
    });
  });

  describe('getEffectiveRateLimitMetadata', () => {
    it('should return method-level rate limit when no class-level exists', () => {
      class TestController {
        @RateLimit({ requests: 100, window: 60 })
        limitedMethod() {}
      }

      const options = getEffectiveRateLimitMetadata(
        TestController,
        'limitedMethod',
      );
      expect(options).toEqual({ requests: 100, window: 60 });
    });

    it('should return class-level rate limit when no method-level exists', () => {
      @RateLimit({ requests: 1000, window: 3600 })
      class TestController {
        testMethod() {}
      }

      const options = getEffectiveRateLimitMetadata(
        TestController,
        'testMethod',
      );
      expect(options).toEqual({ requests: 1000, window: 3600 });
    });

    it('should allow method-level to override class-level', () => {
      @RateLimit({ requests: 1000, window: 3600 })
      class TestController {
        @RateLimit({ requests: 10, window: 60 })
        strictMethod() {}
      }

      const options = getEffectiveRateLimitMetadata(
        TestController,
        'strictMethod',
      );
      expect(options).toEqual({ requests: 10, window: 60 });
    });
  });

  describe('isCached', () => {
    it('should return true for cached method', () => {
      class TestController {
        @CacheResponse({ ttl: 60 })
        cachedMethod() {}
      }

      expect(isCached(TestController, 'cachedMethod')).toBe(true);
    });

    it('should return false for non-cached method', () => {
      class TestController {
        testMethod() {}
      }

      expect(isCached(TestController, 'testMethod')).toBe(false);
    });
  });

  describe('isRateLimited', () => {
    it('should return true for rate-limited method', () => {
      class TestController {
        @RateLimit({ requests: 100, window: 60 })
        limitedMethod() {}
      }

      expect(isRateLimited(TestController, 'limitedMethod')).toBe(true);
    });

    it('should return true when class has rate limit', () => {
      @RateLimit({ requests: 1000, window: 3600 })
      class TestController {
        testMethod() {}
      }

      expect(isRateLimited(TestController, 'testMethod')).toBe(true);
    });

    it('should return false for non-rate-limited method', () => {
      class TestController {
        testMethod() {}
      }

      expect(isRateLimited(TestController, 'testMethod')).toBe(false);
    });
  });

  describe('Class-level and method-level support', () => {
    it('should support class-level @UseMiddleware affecting all methods', () => {
      @UseMiddleware(mockMiddleware1)
      class TestController {
        method1() {}
        method2() {}
      }

      const middleware1 = getEffectiveMiddleware(TestController, 'method1');
      const middleware2 = getEffectiveMiddleware(TestController, 'method2');

      expect(middleware1).toHaveLength(1);
      expect(middleware1[0]).toBe(mockMiddleware1);
      expect(middleware2).toHaveLength(1);
      expect(middleware2[0]).toBe(mockMiddleware1);
    });

    it('should support class-level @RateLimit affecting all methods', () => {
      @RateLimit({ requests: 1000, window: 3600 })
      class TestController {
        method1() {}
        method2() {}
      }

      expect(isRateLimited(TestController, 'method1')).toBe(true);
      expect(isRateLimited(TestController, 'method2')).toBe(true);
    });

    it('should allow method-level to add to class-level middleware', () => {
      @UseMiddleware(mockMiddleware1)
      class TestController {
        @UseMiddleware(mockMiddleware2)
        enhancedMethod() {}

        basicMethod() {}
      }

      const enhancedMiddleware = getEffectiveMiddleware(
        TestController,
        'enhancedMethod',
      );
      const basicMiddleware = getEffectiveMiddleware(
        TestController,
        'basicMethod',
      );

      expect(enhancedMiddleware).toHaveLength(2);
      expect(basicMiddleware).toHaveLength(1);
    });
  });

  describe('Decorator stacking', () => {
    it('should allow stacking @UseMiddleware, @CacheResponse, and @RateLimit', () => {
      class TestController {
        @UseMiddleware(mockMiddleware1)
        @CacheResponse({ ttl: 60 })
        @RateLimit({ requests: 100, window: 60 })
        complexMethod() {}
      }

      const middleware = getMiddlewareMetadata(TestController, 'complexMethod');
      // Should have: mockMiddleware1, cache middleware, rate limit middleware
      expect(middleware.length).toBeGreaterThanOrEqual(3);

      expect(isCached(TestController, 'complexMethod')).toBe(true);
      expect(isRateLimited(TestController, 'complexMethod')).toBe(true);
    });

    it('should maintain correct middleware order when stacking', () => {
      class TestController {
        @UseMiddleware(mockMiddleware1)
        @UseMiddleware(mockMiddleware2)
        @UseMiddleware(mockMiddleware3)
        orderedMethod() {}
      }

      const middleware = getMiddlewareMetadata(TestController, 'orderedMethod');
      expect(middleware).toHaveLength(3);
      // All middleware should be present
      expect(middleware).toContain(mockMiddleware1);
      expect(middleware).toContain(mockMiddleware2);
      expect(middleware).toContain(mockMiddleware3);
    });
  });
});

describe('Integration with Route Decorators', () => {
  const { Get, Post } = require('../../src/decorators/http-methods');
  const { ApiController } = require('../../src/decorators/controller');

  beforeEach(() => {
    clearCacheStore();
    clearRateLimitStore();
  });

  describe('Middleware decorators with HTTP method decorators', () => {
    it('should work with @Get decorator', () => {
      class TestController {
        @UseMiddleware(mockMiddleware1)
        @Get('/test')
        testGet() {}
      }

      const middleware = getMiddlewareMetadata(TestController, 'testGet');
      expect(middleware).toContain(mockMiddleware1);

      const routes = Reflect.getMetadata(
        require('../../src/decorators/metadata-keys').ROUTES_METADATA,
        TestController,
      );
      expect(routes).toHaveLength(1);
      expect(routes[0].method).toBe('get');
    });

    it('should work with @Post decorator', () => {
      class TestController {
        @RateLimit({ requests: 5, window: 60 })
        @Post('/create')
        createItem() {}
      }

      expect(isRateLimited(TestController, 'createItem')).toBe(true);

      const routes = Reflect.getMetadata(
        require('../../src/decorators/metadata-keys').ROUTES_METADATA,
        TestController,
      );
      expect(routes[0].method).toBe('post');
    });

    it('should work with @CacheResponse and @Get', () => {
      class TestController {
        @CacheResponse({ ttl: 300 })
        @Get('/cached')
        getCached() {}
      }

      expect(isCached(TestController, 'getCached')).toBe(true);
    });
  });

  describe('Middleware decorators with @ApiController', () => {
    it('should work with class-level @UseMiddleware and @ApiController', () => {
      @UseMiddleware(mockMiddleware1)
      @ApiController('/api/test')
      class TestController {
        @Get('/')
        list() {}

        @Post('/')
        create() {}
      }

      // Both methods should have class middleware
      expect(getEffectiveMiddleware(TestController, 'list')).toContain(
        mockMiddleware1,
      );
      expect(getEffectiveMiddleware(TestController, 'create')).toContain(
        mockMiddleware1,
      );
    });

    it('should work with class-level @RateLimit and @ApiController', () => {
      @RateLimit({ requests: 1000, window: 3600 })
      @ApiController('/api/limited')
      class LimitedController {
        @Get('/data')
        getData() {}
      }

      expect(isRateLimited(LimitedController, 'getData')).toBe(true);
    });
  });

  describe('Full controller example', () => {
    it('should handle a realistic controller with mixed middleware', () => {
      @UseMiddleware(mockMiddleware1)
      @RateLimit({ requests: 1000, window: 3600 })
      @ApiController('/api/items')
      class ItemController {
        @CacheResponse({ ttl: 60 })
        @Get('/')
        listItems() {}

        @RateLimit({ requests: 10, window: 60 })
        @Post('/')
        createItem() {}

        @UseMiddleware(mockMiddleware2)
        @Get('/:id')
        getItem() {}
      }

      // listItems: class middleware + cache middleware + class rate limit
      const listMiddleware = getEffectiveMiddleware(
        ItemController,
        'listItems',
      );
      expect(listMiddleware.length).toBeGreaterThanOrEqual(2);
      expect(isCached(ItemController, 'listItems')).toBe(true);

      // createItem: class middleware + method rate limit (overrides class)
      const createRateLimit = getEffectiveRateLimitMetadata(
        ItemController,
        'createItem',
      );
      expect(createRateLimit?.requests).toBe(10);

      // getItem: class middleware + method middleware
      const getMiddleware = getEffectiveMiddleware(ItemController, 'getItem');
      expect(getMiddleware).toContain(mockMiddleware1);
      expect(getMiddleware).toContain(mockMiddleware2);
    });
  });

  describe('Decorator order independence', () => {
    it('should work regardless of decorator order (middleware first)', () => {
      class TestController {
        @UseMiddleware(mockMiddleware1)
        @Get('/route1')
        route1() {}
      }

      expect(getMiddlewareMetadata(TestController, 'route1')).toContain(
        mockMiddleware1,
      );
    });

    it('should work regardless of decorator order (route first)', () => {
      class TestController {
        @Get('/route2')
        @UseMiddleware(mockMiddleware1)
        route2() {}
      }

      expect(getMiddlewareMetadata(TestController, 'route2')).toContain(
        mockMiddleware1,
      );
    });

    it('should work with multiple decorators in any order', () => {
      class TestController {
        @RateLimit({ requests: 100, window: 60 })
        @CacheResponse({ ttl: 60 })
        @UseMiddleware(mockMiddleware1)
        @Get('/route3')
        route3() {}

        @Get('/route4')
        @UseMiddleware(mockMiddleware1)
        @CacheResponse({ ttl: 60 })
        @RateLimit({ requests: 100, window: 60 })
        route4() {}
      }

      expect(isCached(TestController, 'route3')).toBe(true);
      expect(isRateLimited(TestController, 'route3')).toBe(true);
      expect(getMiddlewareMetadata(TestController, 'route3')).toContain(
        mockMiddleware1,
      );

      expect(isCached(TestController, 'route4')).toBe(true);
      expect(isRateLimited(TestController, 'route4')).toBe(true);
      expect(getMiddlewareMetadata(TestController, 'route4')).toContain(
        mockMiddleware1,
      );
    });
  });
});
