import 'reflect-metadata';
import {
  HandlerArgs,
  getHandlerArgsMetadata,
  getHandlerArgs,
  hasHandlerArgs,
  HandlerArgsMetadata,
} from '../../src/decorators/handler-args';
import { HANDLER_ARGS_METADATA } from '../../src/decorators/metadata-keys';

describe('Handler Args Decorators', () => {
  describe('@HandlerArgs', () => {
    it('should set handler args metadata on method', () => {
      class TestController {
        @HandlerArgs('arg1', 'arg2')
        methodWithArgs() {}
      }

      const metadata = Reflect.getMetadata(
        HANDLER_ARGS_METADATA,
        TestController,
        'methodWithArgs',
      ) as HandlerArgsMetadata;

      expect(metadata).toBeDefined();
      expect(metadata.args).toEqual(['arg1', 'arg2']);
    });

    it('should handle single argument', () => {
      class TestController {
        @HandlerArgs('singleArg')
        methodWithSingleArg() {}
      }

      const metadata = Reflect.getMetadata(
        HANDLER_ARGS_METADATA,
        TestController,
        'methodWithSingleArg',
      ) as HandlerArgsMetadata;

      expect(metadata).toBeDefined();
      expect(metadata.args).toEqual(['singleArg']);
    });

    it('should handle no arguments', () => {
      class TestController {
        @HandlerArgs()
        methodWithNoArgs() {}
      }

      const metadata = Reflect.getMetadata(
        HANDLER_ARGS_METADATA,
        TestController,
        'methodWithNoArgs',
      ) as HandlerArgsMetadata;

      expect(metadata).toBeDefined();
      expect(metadata.args).toEqual([]);
    });

    it('should handle object arguments', () => {
      const config = { maxItems: 100, enabled: true };

      class TestController {
        @HandlerArgs(config)
        methodWithObjectArg() {}
      }

      const metadata = Reflect.getMetadata(
        HANDLER_ARGS_METADATA,
        TestController,
        'methodWithObjectArg',
      ) as HandlerArgsMetadata;

      expect(metadata).toBeDefined();
      expect(metadata.args).toEqual([config]);
      expect(metadata.args[0]).toBe(config);
    });

    it('should handle mixed argument types', () => {
      class TestController {
        @HandlerArgs('string', 42, { key: 'value' }, true, null)
        methodWithMixedArgs() {}
      }

      const metadata = Reflect.getMetadata(
        HANDLER_ARGS_METADATA,
        TestController,
        'methodWithMixedArgs',
      ) as HandlerArgsMetadata;

      expect(metadata).toBeDefined();
      expect(metadata.args).toEqual([
        'string',
        42,
        { key: 'value' },
        true,
        null,
      ]);
    });

    it('should allow different args on different methods', () => {
      class TestController {
        @HandlerArgs('method1Args')
        method1() {}

        @HandlerArgs('method2Args', 123)
        method2() {}
      }

      const metadata1 = Reflect.getMetadata(
        HANDLER_ARGS_METADATA,
        TestController,
        'method1',
      ) as HandlerArgsMetadata;

      const metadata2 = Reflect.getMetadata(
        HANDLER_ARGS_METADATA,
        TestController,
        'method2',
      ) as HandlerArgsMetadata;

      expect(metadata1.args).toEqual(['method1Args']);
      expect(metadata2.args).toEqual(['method2Args', 123]);
    });

    it('should not affect methods without the decorator', () => {
      class TestController {
        @HandlerArgs('withArgs')
        methodWithArgs() {}

        methodWithoutArgs() {}
      }

      const withArgsMetadata = Reflect.getMetadata(
        HANDLER_ARGS_METADATA,
        TestController,
        'methodWithArgs',
      );

      const withoutArgsMetadata = Reflect.getMetadata(
        HANDLER_ARGS_METADATA,
        TestController,
        'methodWithoutArgs',
      );

      expect(withArgsMetadata).toBeDefined();
      expect(withoutArgsMetadata).toBeUndefined();
    });
  });

  describe('getHandlerArgsMetadata', () => {
    it('should return handler args metadata for a decorated method', () => {
      class TestController {
        @HandlerArgs('arg1', 'arg2')
        decoratedMethod() {}
      }

      const metadata = getHandlerArgsMetadata(
        TestController,
        'decoratedMethod',
      );

      expect(metadata).toBeDefined();
      expect(metadata?.args).toEqual(['arg1', 'arg2']);
    });

    it('should return undefined for non-decorated method', () => {
      class TestController {
        regularMethod() {}
      }

      const metadata = getHandlerArgsMetadata(TestController, 'regularMethod');

      expect(metadata).toBeUndefined();
    });
  });

  describe('getHandlerArgs', () => {
    it('should return args array for decorated method', () => {
      class TestController {
        @HandlerArgs('a', 'b', 'c')
        decoratedMethod() {}
      }

      const args = getHandlerArgs(TestController, 'decoratedMethod');

      expect(args).toEqual(['a', 'b', 'c']);
    });

    it('should return empty array for non-decorated method', () => {
      class TestController {
        regularMethod() {}
      }

      const args = getHandlerArgs(TestController, 'regularMethod');

      expect(args).toEqual([]);
    });

    it('should return empty array for method decorated with no args', () => {
      class TestController {
        @HandlerArgs()
        emptyArgsMethod() {}
      }

      const args = getHandlerArgs(TestController, 'emptyArgsMethod');

      expect(args).toEqual([]);
    });
  });

  describe('hasHandlerArgs', () => {
    it('should return true for method with handler args', () => {
      class TestController {
        @HandlerArgs('arg')
        methodWithArgs() {}
      }

      expect(hasHandlerArgs(TestController, 'methodWithArgs')).toBe(true);
    });

    it('should return false for method without decorator', () => {
      class TestController {
        regularMethod() {}
      }

      expect(hasHandlerArgs(TestController, 'regularMethod')).toBe(false);
    });

    it('should return false for method decorated with empty args', () => {
      class TestController {
        @HandlerArgs()
        emptyArgsMethod() {}
      }

      expect(hasHandlerArgs(TestController, 'emptyArgsMethod')).toBe(false);
    });
  });

  describe('Integration with HTTP method decorators', () => {
    const {
      Get,
      Post,
      Put,
      Delete,
    } = require('../../src/decorators/http-methods');
    const { ApiController } = require('../../src/decorators/controller');
    const { ROUTES_METADATA } = require('../../src/decorators/metadata-keys');

    it('should work with @Get decorator', () => {
      class TestController {
        @HandlerArgs({ limit: 50 })
        @Get('/items')
        listItems() {}
      }

      expect(hasHandlerArgs(TestController, 'listItems')).toBe(true);
      expect(getHandlerArgs(TestController, 'listItems')).toEqual([
        { limit: 50 },
      ]);

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes).toHaveLength(1);
      expect(routes[0].method).toBe('get');
    });

    it('should work with @Post decorator', () => {
      class TestController {
        @HandlerArgs('createMode')
        @Post('/items')
        createItem() {}
      }

      expect(hasHandlerArgs(TestController, 'createItem')).toBe(true);
      expect(getHandlerArgs(TestController, 'createItem')).toEqual([
        'createMode',
      ]);
    });

    it('should work with @ApiController', () => {
      @ApiController('/api/items')
      class ItemController {
        @HandlerArgs({ config: 'value' })
        @Get('/')
        listItems() {}

        @Post('/')
        createItem() {}
      }

      expect(hasHandlerArgs(ItemController, 'listItems')).toBe(true);
      expect(hasHandlerArgs(ItemController, 'createItem')).toBe(false);
    });

    it('should work regardless of decorator order', () => {
      class TestController {
        @Get('/route1')
        @HandlerArgs('args1')
        route1() {}

        @HandlerArgs('args2')
        @Get('/route2')
        route2() {}
      }

      expect(getHandlerArgs(TestController, 'route1')).toEqual(['args1']);
      expect(getHandlerArgs(TestController, 'route2')).toEqual(['args2']);
    });
  });

  describe('Full controller example', () => {
    const {
      Get,
      Post,
      Put,
      Delete,
    } = require('../../src/decorators/http-methods');
    const { ApiController } = require('../../src/decorators/controller');

    it('should handle a realistic controller with handler args', () => {
      const listConfig = { defaultLimit: 20, maxLimit: 100 };
      const createConfig = { validateStrict: true };

      @ApiController('/api/products')
      class ProductController {
        @HandlerArgs(listConfig)
        @Get('/')
        listProducts() {}

        @Get('/:id')
        getProduct() {}

        @HandlerArgs(createConfig)
        @Post('/')
        createProduct() {}

        @HandlerArgs('updateMode', { partial: true })
        @Put('/:id')
        updateProduct() {}

        @Delete('/:id')
        deleteProduct() {}
      }

      // Check which methods have handler args
      expect(hasHandlerArgs(ProductController, 'listProducts')).toBe(true);
      expect(hasHandlerArgs(ProductController, 'getProduct')).toBe(false);
      expect(hasHandlerArgs(ProductController, 'createProduct')).toBe(true);
      expect(hasHandlerArgs(ProductController, 'updateProduct')).toBe(true);
      expect(hasHandlerArgs(ProductController, 'deleteProduct')).toBe(false);

      // Check the actual args
      expect(getHandlerArgs(ProductController, 'listProducts')).toEqual([
        listConfig,
      ]);
      expect(getHandlerArgs(ProductController, 'createProduct')).toEqual([
        createConfig,
      ]);
      expect(getHandlerArgs(ProductController, 'updateProduct')).toEqual([
        'updateMode',
        { partial: true },
      ]);
    });
  });
});
