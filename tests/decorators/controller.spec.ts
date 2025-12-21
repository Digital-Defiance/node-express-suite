import 'reflect-metadata';
import {
  Controller,
  CONTROLLER_METADATA,
  Delete,
  Get,
  Patch,
  Post,
  Put,
  ROUTES_METADATA,
} from '../../src/decorators/controller';

describe('Controller Decorators', () => {
  describe('@Controller', () => {
    it('should set controller metadata', () => {
      @Controller('/api')
      class TestController {}

      const metadata = Reflect.getMetadata(CONTROLLER_METADATA, TestController);
      expect(metadata).toEqual({ basePath: '/api' });
    });

    it('should use empty string as default base path', () => {
      @Controller()
      class TestController {}

      const metadata = Reflect.getMetadata(CONTROLLER_METADATA, TestController);
      expect(metadata).toEqual({ basePath: '' });
    });
  });

  describe('HTTP Method Decorators', () => {
    it('should register GET route', () => {
      @Controller('/api')
      class TestController {
        @Get('/test')
        testMethod() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes).toHaveLength(1);
      expect(routes[0]).toMatchObject({
        method: 'get',
        path: '/test',
        handlerName: 'testMethod',
      });
    });

    it('should register POST route', () => {
      @Controller('/api')
      class TestController {
        @Post('/create')
        createMethod() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes[0].method).toBe('post');
    });

    it('should register PUT route', () => {
      @Controller('/api')
      class TestController {
        @Put('/update')
        updateMethod() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes[0].method).toBe('put');
    });

    it('should register DELETE route', () => {
      @Controller('/api')
      class TestController {
        @Delete('/remove')
        removeMethod() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes[0].method).toBe('delete');
    });

    it('should register PATCH route', () => {
      @Controller('/api')
      class TestController {
        @Patch('/modify')
        modifyMethod() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes[0].method).toBe('patch');
    });

    it('should register multiple routes', () => {
      @Controller('/api')
      class TestController {
        @Get('/one')
        methodOne() {}

        @Post('/two')
        methodTwo() {}

        @Put('/three')
        methodThree() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes).toHaveLength(3);
    });

    it('should store route options', () => {
      @Controller('/api')
      class TestController {
        @Get('/test', { auth: true, cryptoAuth: false })
        testMethod() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes[0].options).toMatchObject({
        auth: true,
        cryptoAuth: false,
      });
    });
  });
});
