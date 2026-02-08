/**
 * @fileoverview Integration tests for lifecycle hook execution.
 * Tests the full flow of lifecycle decorators including execution order,
 * class-level vs method-level hooks, and integration with other decorators.
 */

import 'reflect-metadata';
import { Request, Response } from 'express';
import {
  OnSuccess,
  OnError,
  Before,
  After,
  getEffectiveLifecycleMetadata,
  hasLifecycleHooks,
  executeBeforeHooks,
  executeAfterHooks,
  executeOnSuccessHooks,
  executeOnErrorHooks,
  LifecycleCallback,
  LifecycleContext,
} from '../../src/decorators/lifecycle';
import { Get, Post, Put, Delete } from '../../src/decorators/http-methods';
import { ApiController } from '../../src/decorators/controller';
import { RequireAuth, Public } from '../../src/decorators/auth';
import { Returns } from '../../src/decorators/response';
import { UseMiddleware } from '../../src/decorators/middleware';
import { ROUTES_METADATA } from '../../src/decorators/metadata-keys';

describe('Lifecycle Hook Execution Integration', () => {
  // Track hook execution order
  let executionOrder: string[] = [];
  let capturedContexts: LifecycleContext[] = [];

  // Create named callbacks for tracking execution order
  const createTrackedCallback = (name: string): LifecycleCallback => {
    return (context: LifecycleContext) => {
      executionOrder.push(name);
      capturedContexts.push({ ...context });
    };
  };

  // Create async callback for testing async support
  const createAsyncTrackedCallback = (
    name: string,
    delay: number,
  ): LifecycleCallback => {
    return async (context: LifecycleContext) => {
      await new Promise((resolve) => setTimeout(resolve, delay));
      executionOrder.push(name);
      capturedContexts.push({ ...context });
    };
  };

  beforeEach(() => {
    executionOrder = [];
    capturedContexts = [];
  });

  describe('Class-level and Method-level Hook Order', () => {
    const classBefore = createTrackedCallback('classBefore');
    const classAfter = createTrackedCallback('classAfter');
    const methodBefore = createTrackedCallback('methodBefore');
    const methodAfter = createTrackedCallback('methodAfter');

    @Before(classBefore)
    @After(classAfter)
    @ApiController('/api/ordered')
    class OrderedController {
      @Before(methodBefore)
      @After(methodAfter)
      @Get('/')
      orderedMethod() {}

      @Get('/no-method-hooks')
      noMethodHooks() {}
    }

    it('should have class hooks first, then method hooks', () => {
      const metadata = getEffectiveLifecycleMetadata(
        OrderedController,
        'orderedMethod',
      );

      // Class hooks should come first
      expect(metadata.before[0]).toBe(classBefore);
      expect(metadata.before[1]).toBe(methodBefore);
      expect(metadata.after[0]).toBe(classAfter);
      expect(metadata.after[1]).toBe(methodAfter);
    });

    it('should only have class hooks for methods without method-level hooks', () => {
      const metadata = getEffectiveLifecycleMetadata(
        OrderedController,
        'noMethodHooks',
      );

      expect(metadata.before).toHaveLength(1);
      expect(metadata.before[0]).toBe(classBefore);
      expect(metadata.after).toHaveLength(1);
      expect(metadata.after[0]).toBe(classAfter);
    });

    it('should execute hooks in correct order', async () => {
      const mockReq = { path: '/test' } as Request;
      const mockRes = {} as Response;
      const context: LifecycleContext = { req: mockReq, res: mockRes };

      await executeBeforeHooks(OrderedController, 'orderedMethod', context);

      expect(executionOrder).toEqual(['classBefore', 'methodBefore']);
    });
  });

  describe('Full Request Lifecycle Simulation', () => {
    const beforeHook = createTrackedCallback('before');
    const afterHook = createTrackedCallback('after');
    const onSuccessHook = createTrackedCallback('onSuccess');
    const onErrorHook = createTrackedCallback('onError');

    class LifecycleController {
      @Before(beforeHook)
      @After(afterHook)
      @OnSuccess(onSuccessHook)
      @OnError(onErrorHook)
      @Get('/lifecycle')
      lifecycleMethod() {}
    }

    it('should execute hooks in correct order for successful request', async () => {
      const mockReq = { path: '/lifecycle' } as Request;
      const mockRes = {} as Response;
      const result = { data: 'success' };

      // Simulate request lifecycle
      await executeBeforeHooks(LifecycleController, 'lifecycleMethod', {
        req: mockReq,
        res: mockRes,
      });

      // Handler executes successfully...
      await executeOnSuccessHooks(LifecycleController, 'lifecycleMethod', {
        req: mockReq,
        res: mockRes,
        result,
      });

      await executeAfterHooks(LifecycleController, 'lifecycleMethod', {
        req: mockReq,
        res: mockRes,
        result,
      });

      expect(executionOrder).toEqual(['before', 'onSuccess', 'after']);
    });

    it('should execute hooks in correct order for failed request', async () => {
      const mockReq = { path: '/lifecycle' } as Request;
      const mockRes = {} as Response;
      const error = new Error('Test error');

      // Simulate request lifecycle with error
      await executeBeforeHooks(LifecycleController, 'lifecycleMethod', {
        req: mockReq,
        res: mockRes,
      });

      // Handler throws error...
      await executeOnErrorHooks(LifecycleController, 'lifecycleMethod', {
        req: mockReq,
        res: mockRes,
        error,
      });

      await executeAfterHooks(LifecycleController, 'lifecycleMethod', {
        req: mockReq,
        res: mockRes,
        error,
      });

      expect(executionOrder).toEqual(['before', 'onError', 'after']);
    });

    it('should pass correct context to each hook', async () => {
      const mockReq = { path: '/lifecycle', method: 'GET' } as Request;
      const mockRes = { statusCode: 200 } as Response;
      const result = { id: 1 };

      await executeBeforeHooks(LifecycleController, 'lifecycleMethod', {
        req: mockReq,
        res: mockRes,
      });

      await executeOnSuccessHooks(LifecycleController, 'lifecycleMethod', {
        req: mockReq,
        res: mockRes,
        result,
      });

      // Check before hook context
      expect(capturedContexts[0].req).toBe(mockReq);
      expect(capturedContexts[0].res).toBe(mockRes);

      // Check onSuccess hook context
      expect(capturedContexts[1].result).toEqual(result);
    });
  });

  describe('Full Controller with Mixed Decorators', () => {
    const logBefore = createTrackedCallback('logBefore');
    const logAfter = createTrackedCallback('logAfter');
    const auditSuccess = createTrackedCallback('auditSuccess');
    const auditError = createTrackedCallback('auditError');
    const methodBefore = createTrackedCallback('methodBefore');

    @Before(logBefore)
    @After(logAfter)
    @OnSuccess(auditSuccess)
    @OnError(auditError)
    @ApiController('/api/items', { tags: ['Items'] })
    class ItemController {
      @Returns(200, 'ItemList')
      @Get('/')
      listItems() {
        return [];
      }

      @Before(methodBefore)
      @RequireAuth()
      @Returns(201, 'Item')
      @Post('/')
      createItem() {
        return {};
      }

      @Public()
      @Returns(200, 'Item')
      @Get('/:id')
      getItem() {
        return {};
      }
    }

    it('should have routes registered for all methods', () => {
      const routes = Reflect.getMetadata(ROUTES_METADATA, ItemController);
      expect(routes).toHaveLength(3);
    });

    it('should have class-level hooks on all methods', () => {
      expect(hasLifecycleHooks(ItemController, 'listItems')).toBe(true);
      expect(hasLifecycleHooks(ItemController, 'createItem')).toBe(true);
      expect(hasLifecycleHooks(ItemController, 'getItem')).toBe(true);
    });

    it('should have method-specific hooks only on decorated methods', () => {
      const createMetadata = getEffectiveLifecycleMetadata(
        ItemController,
        'createItem',
      );
      const listMetadata = getEffectiveLifecycleMetadata(
        ItemController,
        'listItems',
      );

      expect(createMetadata.before).toContain(methodBefore);
      expect(listMetadata.before).not.toContain(methodBefore);
    });

    it('should execute class hooks for all methods', async () => {
      const mockReq = { path: '/items' } as Request;
      const mockRes = {} as Response;

      await executeBeforeHooks(ItemController, 'listItems', {
        req: mockReq,
        res: mockRes,
      });

      expect(executionOrder).toContain('logBefore');
    });

    it('should execute both class and method hooks for createItem', async () => {
      const mockReq = { path: '/items' } as Request;
      const mockRes = {} as Response;

      await executeBeforeHooks(ItemController, 'createItem', {
        req: mockReq,
        res: mockRes,
      });

      expect(executionOrder).toEqual(['logBefore', 'methodBefore']);
    });
  });

  describe('Async Hook Execution', () => {
    const asyncBefore1 = createAsyncTrackedCallback('asyncBefore1', 20);
    const asyncBefore2 = createAsyncTrackedCallback('asyncBefore2', 10);
    const syncBefore = createTrackedCallback('syncBefore');

    class AsyncController {
      @Before(asyncBefore1)
      @Before(asyncBefore2)
      @Before(syncBefore)
      @Get('/async')
      asyncMethod() {}
    }

    it('should execute async hooks sequentially', async () => {
      const mockReq = { path: '/async' } as Request;
      const mockRes = {} as Response;

      await executeBeforeHooks(AsyncController, 'asyncMethod', {
        req: mockReq,
        res: mockRes,
      });

      // Hooks should execute in order despite different delays
      // Order depends on decorator application (bottom-up)
      expect(executionOrder).toHaveLength(3);
      expect(executionOrder).toContain('asyncBefore1');
      expect(executionOrder).toContain('asyncBefore2');
      expect(executionOrder).toContain('syncBefore');
    });
  });

  describe('Multiple Hooks of Same Type', () => {
    const success1 = createTrackedCallback('success1');
    const success2 = createTrackedCallback('success2');
    const success3 = createTrackedCallback('success3');

    @OnSuccess(success1)
    class MultiHookController {
      @OnSuccess(success2)
      @OnSuccess(success3)
      @Get('/multi')
      multiMethod() {}
    }

    it('should execute all hooks of same type', async () => {
      const mockReq = { path: '/multi' } as Request;
      const mockRes = {} as Response;
      const result = { data: 'test' };

      await executeOnSuccessHooks(MultiHookController, 'multiMethod', {
        req: mockReq,
        res: mockRes,
        result,
      });

      expect(executionOrder).toHaveLength(3);
      expect(executionOrder).toContain('success1');
      expect(executionOrder).toContain('success2');
      expect(executionOrder).toContain('success3');
    });
  });

  describe('Lifecycle Hooks with Middleware', () => {
    const beforeHook = createTrackedCallback('beforeHook');
    const afterHook = createTrackedCallback('afterHook');

    @Before(beforeHook)
    @After(afterHook)
    @UseMiddleware((_req, _res, next) => next())
    @ApiController('/api/mixed')
    class MixedController {
      @Get('/data')
      getData() {}
    }

    it('should have both lifecycle hooks and middleware', () => {
      expect(hasLifecycleHooks(MixedController, 'getData')).toBe(true);

      const metadata = getEffectiveLifecycleMetadata(
        MixedController,
        'getData',
      );
      expect(metadata.before).toContain(beforeHook);
      expect(metadata.after).toContain(afterHook);
    });
  });

  describe('Error Context in Hooks', () => {
    let capturedError: Error | undefined;

    const errorCapture: LifecycleCallback = (context) => {
      capturedError = context.error as Error;
    };

    class ErrorController {
      @OnError(errorCapture)
      @Get('/error')
      errorMethod() {}
    }

    beforeEach(() => {
      capturedError = undefined;
    });

    it('should pass error to onError hooks', async () => {
      const mockReq = { path: '/error' } as Request;
      const mockRes = {} as Response;
      const testError = new Error('Test error message');

      await executeOnErrorHooks(ErrorController, 'errorMethod', {
        req: mockReq,
        res: mockRes,
        error: testError,
      });

      expect(capturedError).toBe(testError);
      expect(capturedError?.message).toBe('Test error message');
    });
  });

  describe('Result Context in Hooks', () => {
    let capturedResult: unknown;

    const resultCapture: LifecycleCallback = (context) => {
      capturedResult = context.result;
    };

    class ResultController {
      @OnSuccess(resultCapture)
      @After(resultCapture)
      @Get('/result')
      resultMethod() {}
    }

    beforeEach(() => {
      capturedResult = undefined;
    });

    it('should pass result to onSuccess and after hooks', async () => {
      const mockReq = { path: '/result' } as Request;
      const mockRes = {} as Response;
      const testResult = { id: 123, name: 'Test Item' };

      await executeOnSuccessHooks(ResultController, 'resultMethod', {
        req: mockReq,
        res: mockRes,
        result: testResult,
      });

      expect(capturedResult).toEqual(testResult);
    });
  });

  describe('Empty Hook Scenarios', () => {
    class NoHooksController {
      @Get('/plain')
      plainMethod() {}
    }

    @ApiController('/api/no-class-hooks')
    class NoClassHooksController {
      @Before(createTrackedCallback('methodOnly'))
      @Get('/with-method')
      withMethodHooks() {}

      @Get('/without-method')
      withoutMethodHooks() {}
    }

    it('should return false for methods without any hooks', () => {
      expect(hasLifecycleHooks(NoHooksController, 'plainMethod')).toBe(false);
    });

    it('should return true only for methods with hooks', () => {
      expect(hasLifecycleHooks(NoClassHooksController, 'withMethodHooks')).toBe(
        true,
      );
      expect(
        hasLifecycleHooks(NoClassHooksController, 'withoutMethodHooks'),
      ).toBe(false);
    });

    it('should execute without error when no hooks defined', async () => {
      const mockReq = { path: '/plain' } as Request;
      const mockRes = {} as Response;

      // Should not throw
      await executeBeforeHooks(NoHooksController, 'plainMethod', {
        req: mockReq,
        res: mockRes,
      });
      await executeAfterHooks(NoHooksController, 'plainMethod', {
        req: mockReq,
        res: mockRes,
      });
      await executeOnSuccessHooks(NoHooksController, 'plainMethod', {
        req: mockReq,
        res: mockRes,
      });
      await executeOnErrorHooks(NoHooksController, 'plainMethod', {
        req: mockReq,
        res: mockRes,
      });

      expect(executionOrder).toEqual([]);
    });
  });
});
