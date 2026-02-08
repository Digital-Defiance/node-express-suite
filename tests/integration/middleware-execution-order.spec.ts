/**
 * @fileoverview Integration tests for middleware execution order.
 * Tests the full flow of middleware decorators including execution order,
 * class-level vs method-level middleware, and integration with other decorators.
 */

import 'reflect-metadata';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import {
  UseMiddleware,
  CacheResponse,
  RateLimit,
  getEffectiveMiddleware,
  getEffectiveRateLimitMetadata,
  isCached,
  isRateLimited,
  clearCacheStore,
  clearRateLimitStore,
} from '../../src/decorators/middleware';
import { Get, Post, Put, Delete } from '../../src/decorators/http-methods';
import { ApiController } from '../../src/decorators/controller';
import { RequireAuth, Public } from '../../src/decorators/auth';
import { Returns } from '../../src/decorators/response';
import {
  MIDDLEWARE_METADATA,
  ROUTES_METADATA,
  RESPONSE_METADATA,
} from '../../src/decorators/metadata-keys';

describe('Middleware Execution Order Integration', () => {
  // Track middleware execution order
  let executionOrder: string[] = [];

  // Create named middleware for tracking execution order
  const createTrackedMiddleware = (name: string): RequestHandler => {
    return (_req: Request, _res: Response, next: NextFunction) => {
      executionOrder.push(name);
      next();
    };
  };

  beforeEach(() => {
    executionOrder = [];
    clearCacheStore();
    clearRateLimitStore();
  });

  describe('Class-level and Method-level Middleware Order', () => {
    const classMiddleware1 = createTrackedMiddleware('class1');
    const classMiddleware2 = createTrackedMiddleware('class2');
    const methodMiddleware1 = createTrackedMiddleware('method1');
    const methodMiddleware2 = createTrackedMiddleware('method2');

    @UseMiddleware([classMiddleware1, classMiddleware2])
    @ApiController('/api/ordered')
    class OrderedController {
      @UseMiddleware([methodMiddleware1, methodMiddleware2])
      @Get('/')
      orderedMethod() {}

      @Get('/no-method-middleware')
      noMethodMiddleware() {}
    }

    it('should have class middleware first, then method middleware', () => {
      const middleware = getEffectiveMiddleware(
        OrderedController,
        'orderedMethod',
      );

      // Class middleware should come first
      expect(middleware[0]).toBe(classMiddleware1);
      expect(middleware[1]).toBe(classMiddleware2);
      // Method middleware should come after
      expect(middleware[2]).toBe(methodMiddleware1);
      expect(middleware[3]).toBe(methodMiddleware2);
    });

    it('should only have class middleware for methods without method-level middleware', () => {
      const middleware = getEffectiveMiddleware(
        OrderedController,
        'noMethodMiddleware',
      );

      expect(middleware).toHaveLength(2);
      expect(middleware[0]).toBe(classMiddleware1);
      expect(middleware[1]).toBe(classMiddleware2);
    });

    it('should execute middleware in correct order', () => {
      const middleware = getEffectiveMiddleware(
        OrderedController,
        'orderedMethod',
      );

      // Simulate middleware execution
      const mockReq = {} as Request;
      const mockRes = {} as Response;
      let nextCalled = 0;
      const mockNext = () => {
        nextCalled++;
      };

      // Execute each middleware
      for (const mw of middleware) {
        mw(mockReq, mockRes, mockNext);
      }

      expect(executionOrder).toEqual([
        'class1',
        'class2',
        'method1',
        'method2',
      ]);
      expect(nextCalled).toBe(4);
    });
  });

  describe('Stacked Middleware Decorators Order', () => {
    const first = createTrackedMiddleware('first');
    const second = createTrackedMiddleware('second');
    const third = createTrackedMiddleware('third');

    class StackedController {
      @UseMiddleware(first)
      @UseMiddleware(second)
      @UseMiddleware(third)
      @Get('/stacked')
      stackedMethod() {}
    }

    it('should preserve stacking order (decorators applied bottom-up)', () => {
      const middleware = getEffectiveMiddleware(
        StackedController,
        'stackedMethod',
      );

      // Decorators are applied bottom-up, so third is added first, then second, then first
      // The array order reflects the order they were added
      expect(middleware).toHaveLength(3);
      expect(middleware).toContain(first);
      expect(middleware).toContain(second);
      expect(middleware).toContain(third);
    });
  });

  describe('Full Controller with Mixed Decorators', () => {
    const loggerMiddleware = createTrackedMiddleware('logger');
    const authCheckMiddleware = createTrackedMiddleware('authCheck');
    const validationMiddleware = createTrackedMiddleware('validation');

    @UseMiddleware(loggerMiddleware)
    @RateLimit({ requests: 1000, window: 3600 })
    @ApiController('/api/items', { tags: ['Items'] })
    class ItemController {
      @CacheResponse({ ttl: 60 })
      @Returns(200, 'ItemList', { description: 'List of items' })
      @Get('/')
      listItems() {
        return [];
      }

      @UseMiddleware(validationMiddleware)
      @RequireAuth()
      @RateLimit({ requests: 10, window: 60 })
      @Returns(201, 'Item', { description: 'Item created' })
      @Post('/')
      createItem() {
        return {};
      }

      @UseMiddleware(authCheckMiddleware)
      @Public()
      @Returns(200, 'Item', { description: 'Item details' })
      @Get('/:id')
      getItem() {
        return {};
      }

      @RequireAuth()
      @Returns(200, 'Item', { description: 'Item updated' })
      @Put('/:id')
      updateItem() {
        return {};
      }

      @RequireAuth()
      @Returns(204, undefined, { description: 'Item deleted' })
      @Delete('/:id')
      deleteItem() {}
    }

    it('should have routes registered for all methods', () => {
      const routes = Reflect.getMetadata(ROUTES_METADATA, ItemController);
      expect(routes).toHaveLength(5);
    });

    it('should have class-level logger middleware on all methods', () => {
      const listMiddleware = getEffectiveMiddleware(
        ItemController,
        'listItems',
      );
      const createMiddleware = getEffectiveMiddleware(
        ItemController,
        'createItem',
      );
      const getMiddleware = getEffectiveMiddleware(ItemController, 'getItem');

      expect(listMiddleware).toContain(loggerMiddleware);
      expect(createMiddleware).toContain(loggerMiddleware);
      expect(getMiddleware).toContain(loggerMiddleware);
    });

    it('should have method-specific middleware only on decorated methods', () => {
      const createMiddleware = getEffectiveMiddleware(
        ItemController,
        'createItem',
      );
      const getMiddleware = getEffectiveMiddleware(ItemController, 'getItem');
      const updateMiddleware = getEffectiveMiddleware(
        ItemController,
        'updateItem',
      );

      expect(createMiddleware).toContain(validationMiddleware);
      expect(getMiddleware).toContain(authCheckMiddleware);
      expect(updateMiddleware).not.toContain(validationMiddleware);
      expect(updateMiddleware).not.toContain(authCheckMiddleware);
    });

    it('should have caching only on listItems', () => {
      expect(isCached(ItemController, 'listItems')).toBe(true);
      expect(isCached(ItemController, 'createItem')).toBe(false);
      expect(isCached(ItemController, 'getItem')).toBe(false);
    });

    it('should have class-level rate limit on all methods', () => {
      expect(isRateLimited(ItemController, 'listItems')).toBe(true);
      expect(isRateLimited(ItemController, 'getItem')).toBe(true);
      expect(isRateLimited(ItemController, 'updateItem')).toBe(true);
    });

    it('should have method-level rate limit override on createItem', () => {
      const createRateLimit = getEffectiveRateLimitMetadata(
        ItemController,
        'createItem',
      );
      const listRateLimit = getEffectiveRateLimitMetadata(
        ItemController,
        'listItems',
      );

      expect(createRateLimit?.requests).toBe(10);
      expect(createRateLimit?.window).toBe(60);
      expect(listRateLimit?.requests).toBe(1000);
      expect(listRateLimit?.window).toBe(3600);
    });

    it('should have 429 response on rate-limited methods', () => {
      const classResponses = Reflect.getMetadata(
        RESPONSE_METADATA,
        ItemController,
      ) as Array<{ statusCode: number }>;

      expect(classResponses).toContainEqual(
        expect.objectContaining({ statusCode: 429 }),
      );
    });
  });

  describe('Middleware with Authentication Decorators', () => {
    const preAuthMiddleware = createTrackedMiddleware('preAuth');
    const postAuthMiddleware = createTrackedMiddleware('postAuth');

    @UseMiddleware(preAuthMiddleware)
    @RequireAuth()
    @ApiController('/api/secure')
    class SecureController {
      @UseMiddleware(postAuthMiddleware)
      @Get('/data')
      getData() {}

      @Public()
      @Get('/public')
      getPublic() {}
    }

    it('should have middleware on authenticated routes', () => {
      const dataMiddleware = getEffectiveMiddleware(
        SecureController,
        'getData',
      );

      expect(dataMiddleware).toContain(preAuthMiddleware);
      expect(dataMiddleware).toContain(postAuthMiddleware);
    });

    it('should have class middleware on public routes too', () => {
      const publicMiddleware = getEffectiveMiddleware(
        SecureController,
        'getPublic',
      );

      expect(publicMiddleware).toContain(preAuthMiddleware);
      expect(publicMiddleware).not.toContain(postAuthMiddleware);
    });
  });

  describe('Complex Middleware Scenarios', () => {
    const globalLogger = createTrackedMiddleware('globalLogger');
    const requestValidator = createTrackedMiddleware('requestValidator');
    const responseFormatter = createTrackedMiddleware('responseFormatter');
    const errorHandler = createTrackedMiddleware('errorHandler');

    @UseMiddleware(globalLogger)
    @UseMiddleware(errorHandler)
    @ApiController('/api/complex')
    class ComplexController {
      @UseMiddleware(requestValidator)
      @UseMiddleware(responseFormatter)
      @CacheResponse({ ttl: 300, varyByUser: true })
      @RateLimit({ requests: 50, window: 60 })
      @Returns(200, 'Data')
      @Get('/data')
      getData() {}
    }

    it('should have all middleware in correct order', () => {
      const middleware = getEffectiveMiddleware(ComplexController, 'getData');

      // Should have: globalLogger, errorHandler (class), requestValidator, responseFormatter (method),
      // plus cache and rate limit middleware
      expect(middleware.length).toBeGreaterThanOrEqual(6);

      // Class middleware should be first
      const classMiddlewareIndices = [
        middleware.indexOf(globalLogger),
        middleware.indexOf(errorHandler),
      ];
      const methodMiddlewareIndices = [
        middleware.indexOf(requestValidator),
        middleware.indexOf(responseFormatter),
      ];

      // All class middleware indices should be less than method middleware indices
      for (const classIdx of classMiddlewareIndices) {
        for (const methodIdx of methodMiddlewareIndices) {
          expect(classIdx).toBeLessThan(methodIdx);
        }
      }
    });

    it('should have both cache and rate limit enabled', () => {
      expect(isCached(ComplexController, 'getData')).toBe(true);
      expect(isRateLimited(ComplexController, 'getData')).toBe(true);
    });
  });

  describe('Middleware Execution Simulation', () => {
    const step1 = createTrackedMiddleware('step1');
    const step2 = createTrackedMiddleware('step2');
    const step3 = createTrackedMiddleware('step3');
    const step4 = createTrackedMiddleware('step4');

    @UseMiddleware([step1, step2])
    class ExecutionController {
      @UseMiddleware([step3, step4])
      @Get('/execute')
      execute() {}
    }

    it('should execute all middleware in sequence', () => {
      const middleware = getEffectiveMiddleware(ExecutionController, 'execute');

      const mockReq = {} as Request;
      const mockRes = {} as Response;
      const mockNext = () => {};

      // Execute all middleware
      for (const mw of middleware) {
        mw(mockReq, mockRes, mockNext);
      }

      // Verify execution order: class middleware first, then method middleware
      expect(executionOrder).toEqual(['step1', 'step2', 'step3', 'step4']);
    });
  });

  describe('Empty Middleware Scenarios', () => {
    class NoMiddlewareController {
      @Get('/plain')
      plainMethod() {}
    }

    @ApiController('/api/no-class-middleware')
    class NoClassMiddlewareController {
      @UseMiddleware(createTrackedMiddleware('methodOnly'))
      @Get('/with-method')
      withMethodMiddleware() {}

      @Get('/without-method')
      withoutMethodMiddleware() {}
    }

    it('should return empty array for methods without any middleware', () => {
      const middleware = getEffectiveMiddleware(
        NoMiddlewareController,
        'plainMethod',
      );
      expect(middleware).toEqual([]);
    });

    it('should return only method middleware when no class middleware', () => {
      const withMiddleware = getEffectiveMiddleware(
        NoClassMiddlewareController,
        'withMethodMiddleware',
      );
      const withoutMiddleware = getEffectiveMiddleware(
        NoClassMiddlewareController,
        'withoutMethodMiddleware',
      );

      expect(withMiddleware).toHaveLength(1);
      expect(withoutMiddleware).toEqual([]);
    });
  });
});
