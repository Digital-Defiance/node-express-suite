import 'reflect-metadata';
import { Request, Response } from 'express';
import {
  OnSuccess,
  OnError,
  Before,
  After,
  getLifecycleMetadata,
  getClassLifecycleMetadata,
  getEffectiveLifecycleMetadata,
  hasLifecycleHooks,
  executeBeforeHooks,
  executeAfterHooks,
  executeOnSuccessHooks,
  executeOnErrorHooks,
  LifecycleCallback,
  LifecycleContext,
} from '../../src/decorators/lifecycle';
import { LIFECYCLE_METADATA } from '../../src/decorators/metadata-keys';

// Mock callback functions for testing
const createMockCallback = (): jest.Mock<
  void | Promise<void>,
  [LifecycleContext]
> => jest.fn();

describe('Lifecycle Decorators', () => {
  describe('@OnSuccess', () => {
    it('should set onSuccess metadata on method', () => {
      const callback = createMockCallback();

      class TestController {
        @OnSuccess(callback)
        testMethod() {}
      }

      const metadata = Reflect.getMetadata(
        LIFECYCLE_METADATA,
        TestController,
        'testMethod',
      );
      expect(metadata).toBeDefined();
      expect(metadata.onSuccess).toHaveLength(1);
      expect(metadata.onSuccess[0]).toBe(callback);
    });

    it('should set onSuccess metadata on class', () => {
      const callback = createMockCallback();

      @OnSuccess(callback)
      class TestController {}

      const metadata = Reflect.getMetadata(LIFECYCLE_METADATA, TestController);
      expect(metadata).toBeDefined();
      expect(metadata.onSuccess).toHaveLength(1);
      expect(metadata.onSuccess[0]).toBe(callback);
    });

    it('should allow stacking multiple @OnSuccess decorators', () => {
      const callback1 = createMockCallback();
      const callback2 = createMockCallback();

      class TestController {
        @OnSuccess(callback1)
        @OnSuccess(callback2)
        testMethod() {}
      }

      const metadata = Reflect.getMetadata(
        LIFECYCLE_METADATA,
        TestController,
        'testMethod',
      );
      expect(metadata.onSuccess).toHaveLength(2);
      expect(metadata.onSuccess).toContain(callback1);
      expect(metadata.onSuccess).toContain(callback2);
    });
  });

  describe('@OnError', () => {
    it('should set onError metadata on method', () => {
      const callback = createMockCallback();

      class TestController {
        @OnError(callback)
        testMethod() {}
      }

      const metadata = Reflect.getMetadata(
        LIFECYCLE_METADATA,
        TestController,
        'testMethod',
      );
      expect(metadata).toBeDefined();
      expect(metadata.onError).toHaveLength(1);
      expect(metadata.onError[0]).toBe(callback);
    });

    it('should set onError metadata on class', () => {
      const callback = createMockCallback();

      @OnError(callback)
      class TestController {}

      const metadata = Reflect.getMetadata(LIFECYCLE_METADATA, TestController);
      expect(metadata).toBeDefined();
      expect(metadata.onError).toHaveLength(1);
      expect(metadata.onError[0]).toBe(callback);
    });

    it('should allow stacking multiple @OnError decorators', () => {
      const callback1 = createMockCallback();
      const callback2 = createMockCallback();

      class TestController {
        @OnError(callback1)
        @OnError(callback2)
        testMethod() {}
      }

      const metadata = Reflect.getMetadata(
        LIFECYCLE_METADATA,
        TestController,
        'testMethod',
      );
      expect(metadata.onError).toHaveLength(2);
    });
  });

  describe('@Before', () => {
    it('should set before metadata on method', () => {
      const callback = createMockCallback();

      class TestController {
        @Before(callback)
        testMethod() {}
      }

      const metadata = Reflect.getMetadata(
        LIFECYCLE_METADATA,
        TestController,
        'testMethod',
      );
      expect(metadata).toBeDefined();
      expect(metadata.before).toHaveLength(1);
      expect(metadata.before[0]).toBe(callback);
    });

    it('should set before metadata on class', () => {
      const callback = createMockCallback();

      @Before(callback)
      class TestController {}

      const metadata = Reflect.getMetadata(LIFECYCLE_METADATA, TestController);
      expect(metadata).toBeDefined();
      expect(metadata.before).toHaveLength(1);
      expect(metadata.before[0]).toBe(callback);
    });

    it('should allow stacking multiple @Before decorators', () => {
      const callback1 = createMockCallback();
      const callback2 = createMockCallback();

      class TestController {
        @Before(callback1)
        @Before(callback2)
        testMethod() {}
      }

      const metadata = Reflect.getMetadata(
        LIFECYCLE_METADATA,
        TestController,
        'testMethod',
      );
      expect(metadata.before).toHaveLength(2);
    });
  });

  describe('@After', () => {
    it('should set after metadata on method', () => {
      const callback = createMockCallback();

      class TestController {
        @After(callback)
        testMethod() {}
      }

      const metadata = Reflect.getMetadata(
        LIFECYCLE_METADATA,
        TestController,
        'testMethod',
      );
      expect(metadata).toBeDefined();
      expect(metadata.after).toHaveLength(1);
      expect(metadata.after[0]).toBe(callback);
    });

    it('should set after metadata on class', () => {
      const callback = createMockCallback();

      @After(callback)
      class TestController {}

      const metadata = Reflect.getMetadata(LIFECYCLE_METADATA, TestController);
      expect(metadata).toBeDefined();
      expect(metadata.after).toHaveLength(1);
      expect(metadata.after[0]).toBe(callback);
    });

    it('should allow stacking multiple @After decorators', () => {
      const callback1 = createMockCallback();
      const callback2 = createMockCallback();

      class TestController {
        @After(callback1)
        @After(callback2)
        testMethod() {}
      }

      const metadata = Reflect.getMetadata(
        LIFECYCLE_METADATA,
        TestController,
        'testMethod',
      );
      expect(metadata.after).toHaveLength(2);
    });
  });

  describe('getLifecycleMetadata', () => {
    it('should return lifecycle metadata for a method', () => {
      const callback = createMockCallback();

      class TestController {
        @OnSuccess(callback)
        testMethod() {}
      }

      const metadata = getLifecycleMetadata(TestController, 'testMethod');
      expect(metadata).toBeDefined();
      expect(metadata?.onSuccess).toHaveLength(1);
    });

    it('should return undefined when no metadata exists', () => {
      class TestController {
        testMethod() {}
      }

      const metadata = getLifecycleMetadata(TestController, 'testMethod');
      expect(metadata).toBeUndefined();
    });
  });

  describe('getClassLifecycleMetadata', () => {
    it('should return class-level lifecycle metadata', () => {
      const callback = createMockCallback();

      @OnSuccess(callback)
      class TestController {}

      const metadata = getClassLifecycleMetadata(TestController);
      expect(metadata).toBeDefined();
      expect(metadata?.onSuccess).toHaveLength(1);
    });

    it('should return undefined when no class metadata exists', () => {
      class TestController {}

      const metadata = getClassLifecycleMetadata(TestController);
      expect(metadata).toBeUndefined();
    });
  });

  describe('getEffectiveLifecycleMetadata', () => {
    it('should return method-level metadata when no class-level exists', () => {
      const callback = createMockCallback();

      class TestController {
        @OnSuccess(callback)
        testMethod() {}
      }

      const metadata = getEffectiveLifecycleMetadata(
        TestController,
        'testMethod',
      );
      expect(metadata.onSuccess).toHaveLength(1);
      expect(metadata.onSuccess[0]).toBe(callback);
    });

    it('should return class-level metadata when no method-level exists', () => {
      const callback = createMockCallback();

      @OnSuccess(callback)
      class TestController {
        testMethod() {}
      }

      const metadata = getEffectiveLifecycleMetadata(
        TestController,
        'testMethod',
      );
      expect(metadata.onSuccess).toHaveLength(1);
      expect(metadata.onSuccess[0]).toBe(callback);
    });

    it('should merge class and method metadata with class first', () => {
      const classCallback = createMockCallback();
      const methodCallback = createMockCallback();

      @OnSuccess(classCallback)
      class TestController {
        @OnSuccess(methodCallback)
        testMethod() {}
      }

      const metadata = getEffectiveLifecycleMetadata(
        TestController,
        'testMethod',
      );
      expect(metadata.onSuccess).toHaveLength(2);
      expect(metadata.onSuccess[0]).toBe(classCallback); // Class first
      expect(metadata.onSuccess[1]).toBe(methodCallback); // Method second
    });

    it('should merge all hook types independently', () => {
      const classOnSuccess = createMockCallback();
      const classOnError = createMockCallback();
      const methodBefore = createMockCallback();
      const methodAfter = createMockCallback();

      @OnSuccess(classOnSuccess)
      @OnError(classOnError)
      class TestController {
        @Before(methodBefore)
        @After(methodAfter)
        testMethod() {}
      }

      const metadata = getEffectiveLifecycleMetadata(
        TestController,
        'testMethod',
      );
      expect(metadata.onSuccess).toHaveLength(1);
      expect(metadata.onError).toHaveLength(1);
      expect(metadata.before).toHaveLength(1);
      expect(metadata.after).toHaveLength(1);
    });

    it('should return empty arrays when no hooks defined', () => {
      class TestController {
        testMethod() {}
      }

      const metadata = getEffectiveLifecycleMetadata(
        TestController,
        'testMethod',
      );
      expect(metadata.onSuccess).toEqual([]);
      expect(metadata.onError).toEqual([]);
      expect(metadata.before).toEqual([]);
      expect(metadata.after).toEqual([]);
    });
  });

  describe('hasLifecycleHooks', () => {
    it('should return true when method has hooks', () => {
      const callback = createMockCallback();

      class TestController {
        @OnSuccess(callback)
        testMethod() {}
      }

      expect(hasLifecycleHooks(TestController, 'testMethod')).toBe(true);
    });

    it('should return true when class has hooks', () => {
      const callback = createMockCallback();

      @Before(callback)
      class TestController {
        testMethod() {}
      }

      expect(hasLifecycleHooks(TestController, 'testMethod')).toBe(true);
    });

    it('should return false when no hooks defined', () => {
      class TestController {
        testMethod() {}
      }

      expect(hasLifecycleHooks(TestController, 'testMethod')).toBe(false);
    });
  });

  describe('Hook execution functions', () => {
    const mockReq = { path: '/test' } as Request;
    const mockRes = {} as Response;

    describe('executeBeforeHooks', () => {
      it('should execute all before hooks in order', async () => {
        const executionOrder: number[] = [];
        const callback1: LifecycleCallback = jest.fn(() => {
          executionOrder.push(1);
        });
        const callback2: LifecycleCallback = jest.fn(() => {
          executionOrder.push(2);
        });

        @Before(callback1)
        class TestController {
          @Before(callback2)
          testMethod() {}
        }

        await executeBeforeHooks(TestController, 'testMethod', {
          req: mockReq,
          res: mockRes,
        });

        expect(callback1).toHaveBeenCalled();
        expect(callback2).toHaveBeenCalled();
        expect(executionOrder).toEqual([1, 2]); // Class first, then method
      });

      it('should handle async callbacks', async () => {
        const callback: LifecycleCallback = jest.fn(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
        });

        class TestController {
          @Before(callback)
          testMethod() {}
        }

        await executeBeforeHooks(TestController, 'testMethod', {
          req: mockReq,
          res: mockRes,
        });

        expect(callback).toHaveBeenCalled();
      });
    });

    describe('executeAfterHooks', () => {
      it('should execute all after hooks', async () => {
        const callback = createMockCallback();

        class TestController {
          @After(callback)
          testMethod() {}
        }

        await executeAfterHooks(TestController, 'testMethod', {
          req: mockReq,
          res: mockRes,
          result: { data: 'test' },
        });

        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({
            req: mockReq,
            res: mockRes,
            result: { data: 'test' },
          }),
        );
      });
    });

    describe('executeOnSuccessHooks', () => {
      it('should execute all onSuccess hooks with result', async () => {
        const callback = createMockCallback();

        class TestController {
          @OnSuccess(callback)
          testMethod() {}
        }

        const result = { id: 1, name: 'Test' };
        await executeOnSuccessHooks(TestController, 'testMethod', {
          req: mockReq,
          res: mockRes,
          result,
        });

        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({
            req: mockReq,
            res: mockRes,
            result,
          }),
        );
      });
    });

    describe('executeOnErrorHooks', () => {
      it('should execute all onError hooks with error', async () => {
        const callback = createMockCallback();

        class TestController {
          @OnError(callback)
          testMethod() {}
        }

        const error = new Error('Test error');
        await executeOnErrorHooks(TestController, 'testMethod', {
          req: mockReq,
          res: mockRes,
          error,
        });

        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({
            req: mockReq,
            res: mockRes,
            error,
          }),
        );
      });
    });
  });

  describe('Mixed decorator usage', () => {
    it('should support all lifecycle decorators on same method', () => {
      const onSuccessCallback = createMockCallback();
      const onErrorCallback = createMockCallback();
      const beforeCallback = createMockCallback();
      const afterCallback = createMockCallback();

      class TestController {
        @OnSuccess(onSuccessCallback)
        @OnError(onErrorCallback)
        @Before(beforeCallback)
        @After(afterCallback)
        testMethod() {}
      }

      const metadata = getEffectiveLifecycleMetadata(
        TestController,
        'testMethod',
      );
      expect(metadata.onSuccess).toContain(onSuccessCallback);
      expect(metadata.onError).toContain(onErrorCallback);
      expect(metadata.before).toContain(beforeCallback);
      expect(metadata.after).toContain(afterCallback);
    });

    it('should support all lifecycle decorators on class', () => {
      const onSuccessCallback = createMockCallback();
      const onErrorCallback = createMockCallback();
      const beforeCallback = createMockCallback();
      const afterCallback = createMockCallback();

      @OnSuccess(onSuccessCallback)
      @OnError(onErrorCallback)
      @Before(beforeCallback)
      @After(afterCallback)
      class TestController {
        testMethod() {}
      }

      const metadata = getEffectiveLifecycleMetadata(
        TestController,
        'testMethod',
      );
      expect(metadata.onSuccess).toContain(onSuccessCallback);
      expect(metadata.onError).toContain(onErrorCallback);
      expect(metadata.before).toContain(beforeCallback);
      expect(metadata.after).toContain(afterCallback);
    });
  });

  describe('Class-level hooks affecting all methods', () => {
    it('should apply class-level hooks to all methods', () => {
      const classCallback = createMockCallback();

      @Before(classCallback)
      class TestController {
        method1() {}
        method2() {}
        method3() {}
      }

      expect(hasLifecycleHooks(TestController, 'method1')).toBe(true);
      expect(hasLifecycleHooks(TestController, 'method2')).toBe(true);
      expect(hasLifecycleHooks(TestController, 'method3')).toBe(true);

      const metadata1 = getEffectiveLifecycleMetadata(
        TestController,
        'method1',
      );
      const metadata2 = getEffectiveLifecycleMetadata(
        TestController,
        'method2',
      );
      const metadata3 = getEffectiveLifecycleMetadata(
        TestController,
        'method3',
      );

      expect(metadata1.before).toContain(classCallback);
      expect(metadata2.before).toContain(classCallback);
      expect(metadata3.before).toContain(classCallback);
    });
  });
});
