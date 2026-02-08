import 'reflect-metadata';
import {
  ApiController,
  Controller,
  CONTROLLER_METADATA,
  Delete,
  Get,
  OPENAPI_CONTROLLER_METADATA,
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

  describe('@ApiController', () => {
    it('should set controller metadata with basePath', () => {
      @ApiController('/api/users')
      class UserController {}

      const metadata = Reflect.getMetadata(CONTROLLER_METADATA, UserController);
      expect(metadata.basePath).toBe('/api/users');
    });

    it('should use empty string as default base path', () => {
      @ApiController()
      class TestController {}

      const metadata = Reflect.getMetadata(CONTROLLER_METADATA, TestController);
      expect(metadata.basePath).toBe('');
    });

    it('should derive controller name from class name by default', () => {
      @ApiController('/api')
      class MyCustomController {}

      const metadata = Reflect.getMetadata(
        CONTROLLER_METADATA,
        MyCustomController,
      );
      expect(metadata.name).toBe('MyCustomController');
    });

    it('should allow custom controller name via options', () => {
      @ApiController('/api', { name: 'CustomName' })
      class TestController {}

      const metadata = Reflect.getMetadata(CONTROLLER_METADATA, TestController);
      expect(metadata.name).toBe('CustomName');
    });

    it('should store OpenAPI tags metadata', () => {
      @ApiController('/api/users', { tags: ['Users', 'Admin'] })
      class UserController {}

      const openApiMetadata = Reflect.getMetadata(
        OPENAPI_CONTROLLER_METADATA,
        UserController,
      );
      expect(openApiMetadata.tags).toEqual(['Users', 'Admin']);
    });

    it('should store OpenAPI description metadata', () => {
      @ApiController('/api/users', {
        description: 'User management endpoints',
      })
      class UserController {}

      const openApiMetadata = Reflect.getMetadata(
        OPENAPI_CONTROLLER_METADATA,
        UserController,
      );
      expect(openApiMetadata.description).toBe('User management endpoints');
    });

    it('should store OpenAPI deprecated metadata', () => {
      @ApiController('/api/legacy', { deprecated: true })
      class LegacyController {}

      const openApiMetadata = Reflect.getMetadata(
        OPENAPI_CONTROLLER_METADATA,
        LegacyController,
      );
      expect(openApiMetadata.deprecated).toBe(true);
    });

    it('should store all OpenAPI options together', () => {
      @ApiController('/api/products', {
        tags: ['Products'],
        description: 'Product catalog API',
        deprecated: false,
        name: 'ProductAPI',
      })
      class ProductController {}

      const controllerMetadata = Reflect.getMetadata(
        CONTROLLER_METADATA,
        ProductController,
      );
      const openApiMetadata = Reflect.getMetadata(
        OPENAPI_CONTROLLER_METADATA,
        ProductController,
      );

      expect(controllerMetadata).toEqual({
        basePath: '/api/products',
        name: 'ProductAPI',
      });
      expect(openApiMetadata).toEqual({
        tags: ['Products'],
        description: 'Product catalog API',
        deprecated: false,
      });
    });

    it('should work with HTTP method decorators', () => {
      @ApiController('/api/items', { tags: ['Items'] })
      class ItemController {
        @Get('/')
        listItems() {}

        @Post('/')
        createItem() {}

        @Get('/:id')
        getItem() {}
      }

      const controllerMetadata = Reflect.getMetadata(
        CONTROLLER_METADATA,
        ItemController,
      );
      const routes = Reflect.getMetadata(ROUTES_METADATA, ItemController);

      expect(controllerMetadata.basePath).toBe('/api/items');
      expect(routes).toHaveLength(3);
      expect(routes[0]).toMatchObject({ method: 'get', path: '/' });
      expect(routes[1]).toMatchObject({ method: 'post', path: '/' });
      expect(routes[2]).toMatchObject({ method: 'get', path: '/:id' });
    });

    it('should not set OpenAPI metadata when no options provided', () => {
      @ApiController('/api')
      class SimpleController {}

      const openApiMetadata = Reflect.getMetadata(
        OPENAPI_CONTROLLER_METADATA,
        SimpleController,
      );
      expect(openApiMetadata).toEqual({
        tags: undefined,
        description: undefined,
        deprecated: undefined,
      });
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

  describe('Backward Compatibility', () => {
    it('@Controller should not set OpenAPI metadata', () => {
      @Controller('/api')
      class LegacyController {}

      const openApiMetadata = Reflect.getMetadata(
        OPENAPI_CONTROLLER_METADATA,
        LegacyController,
      );
      expect(openApiMetadata).toBeUndefined();
    });

    it('@Controller should not set name in metadata', () => {
      @Controller('/api')
      class LegacyController {}

      const metadata = Reflect.getMetadata(
        CONTROLLER_METADATA,
        LegacyController,
      );
      expect(metadata.name).toBeUndefined();
    });

    it('both @Controller and @ApiController can coexist in same codebase', () => {
      @Controller('/api/legacy')
      class LegacyController {
        @Get('/old')
        oldMethod() {}
      }

      @ApiController('/api/modern', { tags: ['Modern'] })
      class ModernController {
        @Get('/new')
        newMethod() {}
      }

      const legacyMeta = Reflect.getMetadata(
        CONTROLLER_METADATA,
        LegacyController,
      );
      const modernMeta = Reflect.getMetadata(
        CONTROLLER_METADATA,
        ModernController,
      );
      const legacyOpenApi = Reflect.getMetadata(
        OPENAPI_CONTROLLER_METADATA,
        LegacyController,
      );
      const modernOpenApi = Reflect.getMetadata(
        OPENAPI_CONTROLLER_METADATA,
        ModernController,
      );

      expect(legacyMeta.basePath).toBe('/api/legacy');
      expect(modernMeta.basePath).toBe('/api/modern');
      expect(legacyOpenApi).toBeUndefined();
      expect(modernOpenApi.tags).toEqual(['Modern']);
    });

    it('@Controller metadata structure remains unchanged', () => {
      @Controller('/test')
      class TestController {}

      const metadata = Reflect.getMetadata(CONTROLLER_METADATA, TestController);
      // Verify exact structure - only basePath, no extra properties
      expect(Object.keys(metadata)).toEqual(['basePath']);
      expect(metadata.basePath).toBe('/test');
    });

    it('HTTP method decorators work identically with both controller types', () => {
      @Controller('/legacy')
      class LegacyController {
        @Get('/items')
        getItems() {}

        @Post('/items')
        createItem() {}
      }

      @ApiController('/modern', { tags: ['Items'] })
      class ModernController {
        @Get('/items')
        getItems() {}

        @Post('/items')
        createItem() {}
      }

      const legacyRoutes = Reflect.getMetadata(
        ROUTES_METADATA,
        LegacyController,
      );
      const modernRoutes = Reflect.getMetadata(
        ROUTES_METADATA,
        ModernController,
      );

      expect(legacyRoutes).toHaveLength(2);
      expect(modernRoutes).toHaveLength(2);

      // Routes should have identical structure
      expect(legacyRoutes[0]).toMatchObject({
        method: 'get',
        path: '/items',
        handlerName: 'getItems',
      });
      expect(modernRoutes[0]).toMatchObject({
        method: 'get',
        path: '/items',
        handlerName: 'getItems',
      });
    });
  });
});
