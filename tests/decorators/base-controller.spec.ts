import 'reflect-metadata';
import { Request, Response } from 'express';
import {
  DecoratorBaseController,
  CollectedRouteMetadata,
} from '../../src/decorators/base-controller';
import { Controller, ApiController } from '../../src/decorators/controller';
import { Get, Post, Put, Delete } from '../../src/decorators/http-methods';
import {
  RequireAuth,
  RequireCryptoAuth,
  Public,
  AuthFailureStatus,
} from '../../src/decorators/auth';
import {
  Param,
  Body,
  Query,
  Header,
  CurrentUser,
  Req,
  Res,
} from '../../src/decorators/params';
import { ValidateBody } from '../../src/decorators/validation';
import { UseMiddleware } from '../../src/decorators/middleware';
import { Returns, RawJson } from '../../src/decorators/response';
import {
  Before,
  After,
  OnSuccess,
  OnError,
  LifecycleContext,
} from '../../src/decorators/lifecycle';
import { Transactional } from '../../src/decorators/transaction';
import {
  ApiTags,
  ApiSummary,
  ApiDescription,
} from '../../src/decorators/openapi';
import { HandlerArgs } from '../../src/decorators/handler-args';
import { ControllerRegistry } from '../../src/registry';
import { IApplication } from '../../src/interfaces/application';
import {
  ROUTES_METADATA,
  CONTROLLER_METADATA,
} from '../../src/decorators/metadata-keys';
import { z } from 'zod';

// Mock application for testing
function createMockApplication(): IApplication<Buffer> {
  return {
    environment: {
      mongo: { useTransactions: false },
      debug: false,
    },
    db: { connection: {} },
    constants: { testConstant: 'value' },
  } as IApplication<Buffer>;
}

describe('DecoratorBaseController', () => {
  beforeEach(() => {
    // Clear the controller registry before each test
    ControllerRegistry.clear();
  });

  describe('Metadata Collection (16.6)', () => {
    describe('collectRouteMetadata', () => {
      it('should collect basic route metadata from HTTP method decorators', () => {
        @Controller('/test')
        class TestController extends DecoratorBaseController {
          @Get('/items')
          getItems() {
            return { items: [] };
          }

          @Post('/items')
          createItem() {
            return { created: true };
          }
        }

        // Verify routes are registered on the class
        const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
        expect(routes).toHaveLength(2);
        expect(routes[0].method).toBe('get');
        expect(routes[0].path).toBe('/items');
        expect(routes[1].method).toBe('post');

        // Now instantiate and verify collected metadata
        const controller = new TestController(createMockApplication());

        const getMetadata = controller.getCollectedMetadata('getItems');
        const postMetadata = controller.getCollectedMetadata('createItem');

        expect(getMetadata).toBeDefined();
        expect(getMetadata?.method).toBe('get');
        expect(getMetadata?.path).toBe('/items');
        expect(getMetadata?.handlerName).toBe('getItems');

        expect(postMetadata).toBeDefined();
        expect(postMetadata?.method).toBe('post');
        expect(postMetadata?.path).toBe('/items');
      });

      it('should collect authentication metadata', () => {
        @Controller('/auth')
        class AuthController extends DecoratorBaseController {
          @Get('/public')
          @Public()
          publicRoute() {
            return {};
          }

          @Get('/protected')
          @RequireAuth()
          protectedRoute() {
            return {};
          }

          @Get('/crypto')
          @RequireCryptoAuth()
          cryptoRoute() {
            return {};
          }

          @Get('/custom-status')
          @RequireAuth()
          @AuthFailureStatus(403)
          customStatusRoute() {
            return {};
          }
        }

        const controller = new AuthController(createMockApplication());

        const publicMeta = controller.getCollectedMetadata('publicRoute');
        expect(publicMeta?.isPublic).toBe(true);
        expect(publicMeta?.useAuthentication).toBe(false);

        const protectedMeta = controller.getCollectedMetadata('protectedRoute');
        expect(protectedMeta?.useAuthentication).toBe(true);
        expect(protectedMeta?.useCryptoAuthentication).toBe(false);

        const cryptoMeta = controller.getCollectedMetadata('cryptoRoute');
        expect(cryptoMeta?.useCryptoAuthentication).toBe(true);

        const customStatusMeta =
          controller.getCollectedMetadata('customStatusRoute');
        expect(customStatusMeta?.authFailureStatusCode).toBe(403);
      });

      it('should collect class-level auth metadata and merge with method-level', () => {
        @Controller('/class-auth')
        @RequireAuth()
        class ClassAuthController extends DecoratorBaseController {
          @Get('/inherited')
          inheritedAuth() {
            return {};
          }

          @Get('/public')
          @Public()
          publicOverride() {
            return {};
          }
        }

        const controller = new ClassAuthController(createMockApplication());

        const inheritedMeta = controller.getCollectedMetadata('inheritedAuth');
        expect(inheritedMeta?.useAuthentication).toBe(true);

        const publicMeta = controller.getCollectedMetadata('publicOverride');
        expect(publicMeta?.isPublic).toBe(true);
        expect(publicMeta?.useAuthentication).toBe(false);
      });

      it('should collect transaction metadata', () => {
        @Controller('/tx')
        class TxController extends DecoratorBaseController {
          @Post('/create')
          @Transactional()
          createWithTx() {
            return {};
          }

          @Post('/create-timeout')
          @Transactional({ timeout: 5000 })
          createWithTimeout() {
            return {};
          }
        }

        const controller = new TxController(createMockApplication());

        const txMeta = controller.getCollectedMetadata('createWithTx');
        expect(txMeta?.useTransaction).toBe(true);

        const timeoutMeta =
          controller.getCollectedMetadata('createWithTimeout');
        expect(timeoutMeta?.useTransaction).toBe(true);
        expect(timeoutMeta?.transactionTimeout).toBe(5000);
      });

      it('should collect middleware metadata', () => {
        const middleware1 = jest.fn();
        const middleware2 = jest.fn();

        @Controller('/mw')
        @UseMiddleware(middleware1)
        class MwController extends DecoratorBaseController {
          @Get('/route')
          @UseMiddleware(middleware2)
          routeWithMiddleware() {
            return {};
          }
        }

        const controller = new MwController(createMockApplication());
        const meta = controller.getCollectedMetadata('routeWithMiddleware');

        expect(meta?.middleware).toBeDefined();
        expect(meta?.middleware.length).toBeGreaterThanOrEqual(1);
      });

      it('should collect rawJson metadata', () => {
        @Controller('/raw')
        class RawController extends DecoratorBaseController {
          @Get('/json')
          @RawJson()
          rawJsonRoute() {
            return { raw: true };
          }
        }

        const controller = new RawController(createMockApplication());
        const meta = controller.getCollectedMetadata('rawJsonRoute');

        expect(meta?.rawJsonHandler).toBe(true);
      });

      it('should collect handler args metadata', () => {
        @Controller('/args')
        class ArgsController extends DecoratorBaseController {
          @Get('/route')
          @HandlerArgs('arg1', 'arg2')
          routeWithArgs() {
            return {};
          }
        }

        const controller = new ArgsController(createMockApplication());
        const meta = controller.getCollectedMetadata('routeWithArgs');

        expect(meta?.handlerArgs).toEqual(['arg1', 'arg2']);
      });

      it('should collect parameter injection metadata', () => {
        @Controller('/params')
        class ParamsController extends DecoratorBaseController {
          @Get('/:id')
          getById(@Param('id') id: string, @Query('include') include: string) {
            return { id, include };
          }
        }

        const controller = new ParamsController(createMockApplication());
        const meta = controller.getCollectedMetadata('getById');

        expect(meta?.paramMetadata).toBeDefined();
        expect(meta?.paramMetadata.length).toBe(2);
        expect(
          meta?.paramMetadata.find((p) => p.type === 'param'),
        ).toBeDefined();
        expect(
          meta?.paramMetadata.find((p) => p.type === 'query'),
        ).toBeDefined();
      });

      it('should detect lifecycle hooks', () => {
        const beforeCallback = jest.fn();
        const afterCallback = jest.fn();

        @Controller('/lifecycle')
        class LifecycleController extends DecoratorBaseController {
          @Get('/with-hooks')
          @Before(beforeCallback)
          @After(afterCallback)
          routeWithHooks() {
            return {};
          }

          @Get('/no-hooks')
          routeWithoutHooks() {
            return {};
          }
        }

        const controller = new LifecycleController(createMockApplication());

        const withHooksMeta = controller.getCollectedMetadata('routeWithHooks');
        expect(withHooksMeta?.hasLifecycleHooks).toBe(true);

        const noHooksMeta =
          controller.getCollectedMetadata('routeWithoutHooks');
        expect(noHooksMeta?.hasLifecycleHooks).toBe(false);
      });
    });

    describe('getAllCollectedMetadata', () => {
      it('should return all collected metadata', () => {
        @Controller('/all')
        class AllController extends DecoratorBaseController {
          @Get('/one')
          routeOne() {
            return {};
          }

          @Post('/two')
          routeTwo() {
            return {};
          }

          @Delete('/three')
          routeThree() {
            return {};
          }
        }

        const controller = new AllController(createMockApplication());
        const allMetadata = controller.getAllCollectedMetadata();

        expect(allMetadata.size).toBe(3);
        expect(allMetadata.has('routeOne')).toBe(true);
        expect(allMetadata.has('routeTwo')).toBe(true);
        expect(allMetadata.has('routeThree')).toBe(true);
      });
    });

    describe('OpenAPI metadata collection', () => {
      it('should collect OpenAPI metadata from decorators', () => {
        @Controller('/openapi')
        @ApiTags('Test')
        class OpenAPIController extends DecoratorBaseController {
          @Get('/route')
          @ApiSummary('Get route summary')
          @ApiDescription('Detailed description of the route')
          @Returns(200, {
            description: 'Success response',
            schema: 'SuccessSchema',
          })
          getRoute() {
            return {};
          }
        }

        const controller = new OpenAPIController(createMockApplication());
        const meta = controller.getCollectedMetadata('getRoute');

        expect(meta?.openapi).toBeDefined();
        expect(meta?.openapi?.summary).toBe('Get route summary');
        expect(meta?.openapi?.description).toBe(
          'Detailed description of the route',
        );
        expect(meta?.openapi?.tags).toContain('Test');
      });
    });
  });

  describe('Parameter Injection (16.7)', () => {
    describe('injectParameters', () => {
      it('should inject @Param values from request params', () => {
        @Controller('/inject')
        class InjectController extends DecoratorBaseController {
          @Get('/:id')
          getById(@Param('id') id: string) {
            return { id };
          }
        }

        const controller = new InjectController(createMockApplication());
        const meta = controller.getCollectedMetadata('getById');

        const mockReq = {
          params: { id: '123' },
          query: {},
          body: {},
          headers: {},
          get: jest.fn(),
        } as unknown as Request;
        const mockRes = {} as Response;

        const args = controller['injectParameters'](
          mockReq,
          mockRes,
          meta!.paramMetadata,
        );

        expect(args[0]).toBe('123');
      });

      it('should inject @Body values', () => {
        @Controller('/inject')
        class InjectController extends DecoratorBaseController {
          @Post('/')
          create(@Body() data: object) {
            return data;
          }
        }

        const controller = new InjectController(createMockApplication());
        const meta = controller.getCollectedMetadata('create');

        const bodyData = { name: 'Test', value: 42 };
        const mockReq = {
          params: {},
          query: {},
          body: bodyData,
          headers: {},
          get: jest.fn(),
        } as unknown as Request;
        const mockRes = {} as Response;

        const args = controller['injectParameters'](
          mockReq,
          mockRes,
          meta!.paramMetadata,
        );

        expect(args[0]).toEqual(bodyData);
      });

      it('should inject specific @Body field', () => {
        @Controller('/inject')
        class InjectController extends DecoratorBaseController {
          @Post('/')
          create(@Body('name') name: string) {
            return { name };
          }
        }

        const controller = new InjectController(createMockApplication());
        const meta = controller.getCollectedMetadata('create');

        const mockReq = {
          params: {},
          query: {},
          body: { name: 'TestName', other: 'value' },
          headers: {},
          get: jest.fn(),
        } as unknown as Request;
        const mockRes = {} as Response;

        const args = controller['injectParameters'](
          mockReq,
          mockRes,
          meta!.paramMetadata,
        );

        expect(args[0]).toBe('TestName');
      });

      it('should inject @Query values', () => {
        @Controller('/inject')
        class InjectController extends DecoratorBaseController {
          @Get('/')
          list(@Query('page') page: string, @Query('limit') limit: string) {
            return { page, limit };
          }
        }

        const controller = new InjectController(createMockApplication());
        const meta = controller.getCollectedMetadata('list');

        const mockReq = {
          params: {},
          query: { page: '1', limit: '10' },
          body: {},
          headers: {},
          get: jest.fn(),
        } as unknown as Request;
        const mockRes = {} as Response;

        const args = controller['injectParameters'](
          mockReq,
          mockRes,
          meta!.paramMetadata,
        );

        expect(args[0]).toBe('1');
        expect(args[1]).toBe('10');
      });

      it('should inject @Header values', () => {
        @Controller('/inject')
        class InjectController extends DecoratorBaseController {
          @Get('/')
          getData(@Header('X-Request-ID') requestId: string) {
            return { requestId };
          }
        }

        const controller = new InjectController(createMockApplication());
        const meta = controller.getCollectedMetadata('getData');

        const mockReq = {
          params: {},
          query: {},
          body: {},
          headers: { 'x-request-id': 'req-123' },
          get: jest.fn((name: string) => {
            if (name === 'X-Request-ID') return 'req-123';
            return undefined;
          }),
        } as unknown as Request;
        const mockRes = {} as Response;

        const args = controller['injectParameters'](
          mockReq,
          mockRes,
          meta!.paramMetadata,
        );

        expect(args[0]).toBe('req-123');
      });

      it('should inject @CurrentUser from request', () => {
        @Controller('/inject')
        class InjectController extends DecoratorBaseController {
          @Get('/profile')
          getProfile(@CurrentUser() user: object) {
            return user;
          }
        }

        const controller = new InjectController(createMockApplication());
        const meta = controller.getCollectedMetadata('getProfile');

        const mockUser = { id: 'user-1', name: 'Test User' };
        const mockReq = {
          params: {},
          query: {},
          body: {},
          headers: {},
          user: mockUser,
          get: jest.fn(),
        } as unknown as Request;
        const mockRes = {} as Response;

        const args = controller['injectParameters'](
          mockReq,
          mockRes,
          meta!.paramMetadata,
        );

        expect(args[0]).toEqual(mockUser);
      });

      it('should inject @Req and @Res objects', () => {
        @Controller('/inject')
        class InjectController extends DecoratorBaseController {
          @Get('/')
          handler(@Req() req: Request, @Res() res: Response) {
            return {};
          }
        }

        const controller = new InjectController(createMockApplication());
        const meta = controller.getCollectedMetadata('handler');

        const mockReq = {
          params: {},
          query: {},
          body: {},
          headers: {},
          get: jest.fn(),
        } as unknown as Request;
        const mockRes = { status: jest.fn() } as unknown as Response;

        const args = controller['injectParameters'](
          mockReq,
          mockRes,
          meta!.paramMetadata,
        );

        expect(args[0]).toBe(mockReq);
        expect(args[1]).toBe(mockRes);
      });

      it('should handle mixed parameter types in correct order', () => {
        @Controller('/inject')
        class InjectController extends DecoratorBaseController {
          @Put('/:id')
          update(
            @Param('id') id: string,
            @Body() data: object,
            @Query('notify') notify: string,
          ) {
            return { id, data, notify };
          }
        }

        const controller = new InjectController(createMockApplication());
        const meta = controller.getCollectedMetadata('update');

        const mockReq = {
          params: { id: '456' },
          query: { notify: 'true' },
          body: { name: 'Updated' },
          headers: {},
          get: jest.fn(),
        } as unknown as Request;
        const mockRes = {} as Response;

        const args = controller['injectParameters'](
          mockReq,
          mockRes,
          meta!.paramMetadata,
        );

        expect(args[0]).toBe('456');
        expect(args[1]).toEqual({ name: 'Updated' });
        expect(args[2]).toBe('true');
      });

      it('should coerce numeric parameters when schema specifies integer', () => {
        @Controller('/inject')
        class InjectController extends DecoratorBaseController {
          @Get('/:id')
          getById(@Param('id', { schema: { type: 'integer' } }) id: number) {
            return { id };
          }
        }

        const controller = new InjectController(createMockApplication());
        const meta = controller.getCollectedMetadata('getById');

        const mockReq = {
          params: { id: '42' },
          query: {},
          body: {},
          headers: {},
          get: jest.fn(),
        } as unknown as Request;
        const mockRes = {} as Response;

        const args = controller['injectParameters'](
          mockReq,
          mockRes,
          meta!.paramMetadata,
        );

        expect(args[0]).toBe(42);
        expect(typeof args[0]).toBe('number');
      });
    });
  });

  describe('Integration Test - Full Controller (16.8)', () => {
    it('should create a fully decorated controller with all decorator types', () => {
      const beforeCallback = jest.fn();
      const afterCallback = jest.fn();
      const onSuccessCallback = jest.fn();
      const onErrorCallback = jest.fn();
      const customMiddleware = jest.fn(
        (_req: Request, _res: Response, next: () => void) => next(),
      );

      @ApiController('/api/users')
      @ApiTags('Users')
      @RequireAuth()
      @UseMiddleware(customMiddleware)
      @Before(beforeCallback)
      class FullUserController extends DecoratorBaseController {
        @Get('/')
        @ApiSummary('List all users')
        @Returns(200, { description: 'List of users', schema: 'UserList' })
        @Public()
        listUsers(@Query('page') page: string, @Query('limit') limit: string) {
          return { page, limit };
        }

        @Get('/:id')
        @ApiSummary('Get user by ID')
        @Returns(200, { description: 'User details', schema: 'User' })
        @Returns(404, { description: 'User not found' })
        @After(afterCallback)
        getUser(@Param('id') id: string) {
          return { id };
        }

        @Post('/')
        @ApiSummary('Create a new user')
        @Returns(201, { description: 'User created', schema: 'User' })
        @Transactional()
        @OnSuccess(onSuccessCallback)
        createUser(@Body() data: object) {
          return data;
        }

        @Put('/:id')
        @ApiSummary('Update user')
        @Returns(200, { description: 'User updated', schema: 'User' })
        @Transactional({ timeout: 10000 })
        updateUser(@Param('id') id: string, @Body() data: object) {
          return { id, ...(data as Record<string, unknown>) };
        }

        @Delete('/:id')
        @ApiSummary('Delete user')
        @Returns(204, { description: 'User deleted' })
        @OnError(onErrorCallback)
        deleteUser(@Param('id') id: string) {
          return { deleted: id };
        }
      }

      const controller = new FullUserController(createMockApplication());
      const allMetadata = controller.getAllCollectedMetadata();

      // Verify all routes are collected
      expect(allMetadata.size).toBe(5);

      // Verify listUsers - public route with query params
      const listMeta = controller.getCollectedMetadata('listUsers');
      expect(listMeta?.isPublic).toBe(true);
      expect(listMeta?.useAuthentication).toBe(false);
      expect(listMeta?.paramMetadata.length).toBe(2);
      expect(listMeta?.openapi?.summary).toBe('List all users');

      // Verify getUser - authenticated with param injection
      const getMeta = controller.getCollectedMetadata('getUser');
      expect(getMeta?.useAuthentication).toBe(true);
      expect(getMeta?.paramMetadata.length).toBe(1);
      expect(getMeta?.hasLifecycleHooks).toBe(true);

      // Verify createUser - transactional with body
      const createMeta = controller.getCollectedMetadata('createUser');
      expect(createMeta?.useTransaction).toBe(true);
      expect(createMeta?.paramMetadata.length).toBe(1);
      expect(createMeta?.hasLifecycleHooks).toBe(true);

      // Verify updateUser - transactional with timeout
      const updateMeta = controller.getCollectedMetadata('updateUser');
      expect(updateMeta?.useTransaction).toBe(true);
      expect(updateMeta?.transactionTimeout).toBe(10000);
      expect(updateMeta?.paramMetadata.length).toBe(2);

      // Verify deleteUser - with error handler
      const deleteMeta = controller.getCollectedMetadata('deleteUser');
      expect(deleteMeta?.hasLifecycleHooks).toBe(true);
    });

    it('should register controller with ControllerRegistry', () => {
      @ApiController('/api/items')
      class ItemController extends DecoratorBaseController {
        @Get('/')
        listItems() {
          return [];
        }
      }

      // Clear registry first
      ControllerRegistry.clear();

      new ItemController(createMockApplication());

      const registered = ControllerRegistry.getAll();
      expect(registered.length).toBe(1);
      expect(registered[0].basePath).toBe('/api/items');
    });

    it('should build route definitions from decorated methods', () => {
      @Controller('/api/products')
      class ProductController extends DecoratorBaseController {
        @Get('/')
        list() {
          return [];
        }

        @Get('/:id')
        @RequireAuth()
        get(@Param('id') id: string) {
          return { id };
        }

        @Post('/')
        @RequireAuth()
        @Transactional()
        create(@Body() data: object) {
          return data;
        }
      }

      const controller = new ProductController(createMockApplication());
      const routeDefs = controller['routeDefinitions'];

      expect(routeDefs.length).toBe(3);

      const listRoute = routeDefs.find((r) => r.handlerKey === 'list');
      expect(listRoute?.method).toBe('get');
      expect(listRoute?.path).toBe('/');
      expect(listRoute?.useAuthentication).toBe(false);

      const getRoute = routeDefs.find((r) => r.handlerKey === 'get');
      expect(getRoute?.method).toBe('get');
      expect(getRoute?.path).toBe('/:id');
      expect(getRoute?.useAuthentication).toBe(true);

      const createRoute = routeDefs.find((r) => r.handlerKey === 'create');
      expect(createRoute?.method).toBe('post');
      expect(createRoute?.useTransaction).toBe(true);
    });

    it('should create wrapped handlers for routes with parameter injection', () => {
      @Controller('/api/wrapped')
      class WrappedController extends DecoratorBaseController {
        @Get('/:id')
        getById(@Param('id') id: string) {
          return { id };
        }
      }

      const controller = new WrappedController(createMockApplication());
      const handlers = controller['handlers'];

      expect(handlers['getById']).toBeDefined();
      expect(typeof handlers['getById']).toBe('function');
    });

    it('should create wrapped handlers for routes with lifecycle hooks', () => {
      const beforeHook = jest.fn();

      @Controller('/api/hooks')
      class HooksController extends DecoratorBaseController {
        @Get('/')
        @Before(beforeHook)
        list() {
          return [];
        }
      }

      const controller = new HooksController(createMockApplication());
      const handlers = controller['handlers'];

      expect(handlers['list']).toBeDefined();
      expect(typeof handlers['list']).toBe('function');
    });

    it('should handle validation decorators', () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });

      @Controller('/api/validated')
      class ValidatedController extends DecoratorBaseController {
        @Post('/')
        @ValidateBody(schema)
        create(@Body() data: object) {
          return data;
        }
      }

      const controller = new ValidatedController(createMockApplication());
      const routeDefs = controller['routeDefinitions'];

      const createRoute = routeDefs.find((r) => r.handlerKey === 'create');
      expect(createRoute?.validation).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle controller with no routes', () => {
      @Controller('/empty')
      class EmptyController extends DecoratorBaseController {}

      const controller = new EmptyController(createMockApplication());
      const allMetadata = controller.getAllCollectedMetadata();

      expect(allMetadata.size).toBe(0);
    });

    it('should handle controller without @Controller decorator', () => {
      // This should still work but won't register with ControllerRegistry
      class NoDecoratorController extends DecoratorBaseController {
        @Get('/')
        list() {
          return [];
        }
      }

      ControllerRegistry.clear();
      const controller = new NoDecoratorController(createMockApplication());

      // Should not be registered since no @Controller decorator
      const registered = ControllerRegistry.getAll();
      expect(registered.length).toBe(0);
    });

    it('should handle methods without decorators', () => {
      @Controller('/partial')
      class PartialController extends DecoratorBaseController {
        @Get('/decorated')
        decoratedMethod() {
          return {};
        }

        // This method has no decorator
        helperMethod() {
          return 'helper';
        }
      }

      const controller = new PartialController(createMockApplication());
      const allMetadata = controller.getAllCollectedMetadata();

      // Only decorated method should be collected
      expect(allMetadata.size).toBe(1);
      expect(allMetadata.has('decoratedMethod')).toBe(true);
      expect(allMetadata.has('helperMethod')).toBe(false);
    });
  });
});
