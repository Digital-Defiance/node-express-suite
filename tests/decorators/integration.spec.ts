/**
 * @fileoverview Comprehensive integration tests for decorator-based controllers.
 * Tests the full flow of all decorators working together including:
 * - Controller and HTTP method decorators
 * - Authentication decorators
 * - Validation decorators
 * - Response decorators
 * - Middleware decorators
 * - Lifecycle decorators
 * - Parameter injection decorators
 * - OpenAPI decorators
 * - Transaction decorator
 * - Handler args decorator
 */

import 'reflect-metadata';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
import { body, param, query, validationResult } from 'express-validator';

// Controller and HTTP method decorators
import { ApiController } from '../../src/decorators/controller';
import {
  Get,
  Post,
  Put,
  Delete,
  Patch,
} from '../../src/decorators/http-methods';

// Auth decorators
import {
  RequireAuth,
  RequireCryptoAuth,
  Public,
  AuthFailureStatus,
  getEffectiveAuthMetadata,
  requiresAuthentication,
} from '../../src/decorators/auth';

// Validation decorators
import {
  ValidateBody,
  ValidateParams,
  ValidateQuery,
  getEffectiveValidationMetadata,
  hasValidation,
} from '../../src/decorators/validation';

// Response decorators
import {
  Returns,
  RawJson,
  Paginated,
  getEffectiveResponseMetadata,
  isRawJsonHandler,
  isPaginatedEndpoint,
} from '../../src/decorators/response';

// Middleware decorators
import {
  UseMiddleware,
  CacheResponse,
  RateLimit,
  getEffectiveMiddleware,
  isCached,
  isRateLimited,
  clearCacheStore,
  clearRateLimitStore,
} from '../../src/decorators/middleware';

// Lifecycle decorators
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

// Parameter injection decorators
import {
  Param,
  Body,
  Query,
  Header,
  CurrentUser,
  Req,
  Res,
  getParamMetadata,
} from '../../src/decorators/params';

// OpenAPI decorators
import {
  ApiOperation,
  ApiTags,
  ApiSummary,
  ApiDescription,
  Deprecated,
  ApiOperationId,
  getEffectiveOpenAPIMetadata,
} from '../../src/decorators/openapi';

import {
  ApiParam,
  ApiQuery,
  ApiHeader,
  ApiRequestBody,
  getOpenAPIParams,
  getRequestBodyMetadata,
} from '../../src/decorators/openapi-params';

// Transaction decorator
import {
  Transactional,
  getTransactionMetadata,
  isTransactional,
} from '../../src/decorators/transaction';

// Handler args decorator
import { HandlerArgs, getHandlerArgs } from '../../src/decorators/handler-args';

// Schema decorators
import { ApiSchema, ApiProperty } from '../../src/decorators/schema';

// Metadata keys
import {
  CONTROLLER_METADATA,
  OPENAPI_CONTROLLER_METADATA,
  ROUTES_METADATA,
  RESPONSE_METADATA,
} from '../../src/decorators/metadata-keys';

// OpenAPI infrastructure
import { OpenAPIBuilder } from '../../src/openapi/builder';
import { OpenAPISchemaRegistry } from '../../src/openapi/schemas';
import { ControllerRegistry } from '../../src/registry/controller-registry';

describe('Decorator Integration Tests', () => {
  beforeEach(() => {
    // Clear registries before each test
    OpenAPISchemaRegistry.clear();
    ControllerRegistry.clear();
    clearCacheStore();
    clearRateLimitStore();
  });

  describe('Full Controller with All Decorators', () => {
    // Track execution for lifecycle hooks
    let executionLog: string[] = [];

    const logBefore: LifecycleCallback = () => {
      executionLog.push('before');
    };
    const logAfter: LifecycleCallback = () => {
      executionLog.push('after');
    };
    const logSuccess: LifecycleCallback = () => {
      executionLog.push('success');
    };
    const logError: LifecycleCallback = () => {
      executionLog.push('error');
    };

    // Middleware for tracking
    const loggerMiddleware: RequestHandler = (_req, _res, next) => {
      executionLog.push('middleware:logger');
      next();
    };

    const authMiddleware: RequestHandler = (_req, _res, next) => {
      executionLog.push('middleware:auth');
      next();
    };

    // Zod schemas for validation
    const CreateUserSchema = z.object({
      name: z.string().min(1).max(100),
      email: z.string().email(),
      age: z.number().int().positive().optional(),
    });

    const UpdateUserSchema = z.object({
      name: z.string().min(1).max(100).optional(),
      email: z.string().email().optional(),
      age: z.number().int().positive().optional(),
    });

    const IdParamSchema = z.object({
      id: z.string().uuid(),
    });

    const PaginationSchema = z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
    });

    // Define a complete controller with all decorator types
    @Before(logBefore)
    @After(logAfter)
    @OnSuccess(logSuccess)
    @OnError(logError)
    @UseMiddleware(loggerMiddleware)
    @RateLimit({ requests: 1000, window: 3600 })
    @RequireAuth()
    @AuthFailureStatus(401)
    @ApiTags('Users')
    @ApiController('/api/users', {
      tags: ['Users'],
      description: 'User management endpoints',
    })
    class UserController {
      @Public()
      @Paginated({ defaultPageSize: 20, maxPageSize: 100 })
      @ValidateQuery(PaginationSchema)
      @Returns(200, 'UserList', { description: 'List of users' })
      @ApiSummary('List all users')
      @ApiDescription('Returns a paginated list of all users')
      @ApiOperationId('listUsers')
      @Get('/')
      listUsers(@Query('page') page?: number, @Query('limit') limit?: number) {
        return { page, limit };
      }

      @Public()
      @CacheResponse({ ttl: 300 })
      @ValidateParams(IdParamSchema)
      @Returns(200, 'User', { description: 'User details' })
      @Returns(404, 'ErrorResponse', { description: 'User not found' })
      @ApiSummary('Get user by ID')
      @ApiParam('id', {
        description: 'User UUID',
        schema: { type: 'string', format: 'uuid' },
      })
      @Get('/:id')
      getUser(@Param('id') id: string) {
        return { id };
      }

      @UseMiddleware(authMiddleware)
      @ValidateBody(CreateUserSchema)
      @Returns(201, 'User', { description: 'Created user' })
      @Returns(400, 'ValidationError', { description: 'Validation failed' })
      @ApiSummary('Create a new user')
      @ApiRequestBody({
        description: 'User data',
        required: true,
        schema: 'CreateUserRequest',
      })
      @Post('/')
      createUser(@Body() userData: z.infer<typeof CreateUserSchema>) {
        return userData;
      }

      @RequireCryptoAuth()
      @Transactional({ timeout: 5000 })
      @ValidateParams(IdParamSchema)
      @ValidateBody(UpdateUserSchema)
      @Returns(200, 'User', { description: 'Updated user' })
      @Returns(404, 'ErrorResponse', { description: 'User not found' })
      @ApiSummary('Update user')
      @Put('/:id')
      updateUser(
        @Param('id') id: string,
        @Body() userData: z.infer<typeof UpdateUserSchema>,
      ) {
        return { id, ...userData };
      }

      @RateLimit({ requests: 10, window: 60 })
      @ValidateParams(IdParamSchema)
      @Returns(204, undefined, { description: 'User deleted' })
      @Returns(404, 'ErrorResponse', { description: 'User not found' })
      @ApiSummary('Delete user')
      @Deprecated()
      @Delete('/:id')
      deleteUser(@Param('id') id: string) {
        return { deleted: id };
      }

      @RawJson()
      @HandlerArgs('extra-arg-1', 'extra-arg-2')
      @Returns(200, 'RawData')
      @ApiSummary('Get raw data')
      @Patch('/raw')
      getRawData(@Req() req: Request) {
        return { raw: true, path: req.path };
      }
    }

    beforeEach(() => {
      executionLog = [];
    });

    it('should register controller metadata correctly', () => {
      const controllerMeta = Reflect.getMetadata(
        CONTROLLER_METADATA,
        UserController,
      );
      expect(controllerMeta).toBeDefined();
      expect(controllerMeta.basePath).toBe('/api/users');
      expect(controllerMeta.name).toBe('UserController');
    });

    it('should register OpenAPI controller metadata', () => {
      const openApiMeta = Reflect.getMetadata(
        OPENAPI_CONTROLLER_METADATA,
        UserController,
      );
      expect(openApiMeta).toBeDefined();
      expect(openApiMeta.tags).toContain('Users');
      expect(openApiMeta.description).toBe('User management endpoints');
    });

    it('should register all routes', () => {
      const routes = Reflect.getMetadata(ROUTES_METADATA, UserController);
      expect(routes).toHaveLength(6);

      const methods = routes.map((r: { method: string }) => r.method);
      expect(methods).toContain('get');
      expect(methods).toContain('post');
      expect(methods).toContain('put');
      expect(methods).toContain('delete');
      expect(methods).toContain('patch');
    });

    it('should handle authentication correctly', () => {
      // listUsers is public
      expect(requiresAuthentication(UserController, 'listUsers')).toBe(false);

      // getUser is public
      expect(requiresAuthentication(UserController, 'getUser')).toBe(false);

      // createUser requires auth (inherited from class)
      expect(requiresAuthentication(UserController, 'createUser')).toBe(true);

      // updateUser requires both auth and crypto auth
      const updateAuth = getEffectiveAuthMetadata(UserController, 'updateUser');
      expect(updateAuth.requireAuth).toBe(true);
      expect(updateAuth.requireCryptoAuth).toBe(true);

      // deleteUser requires auth (inherited)
      expect(requiresAuthentication(UserController, 'deleteUser')).toBe(true);
    });

    it('should handle validation correctly', () => {
      // listUsers has query validation
      const listValidation = getEffectiveValidationMetadata(
        UserController,
        'listUsers',
      );
      expect(listValidation.query).toBeDefined();

      // getUser has params validation
      const getValidation = getEffectiveValidationMetadata(
        UserController,
        'getUser',
      );
      expect(getValidation.params).toBeDefined();

      // createUser has body validation
      const createValidation = getEffectiveValidationMetadata(
        UserController,
        'createUser',
      );
      expect(createValidation.body).toBeDefined();

      // updateUser has both params and body validation
      const updateValidation = getEffectiveValidationMetadata(
        UserController,
        'updateUser',
      );
      expect(updateValidation.params).toBeDefined();
      expect(updateValidation.body).toBeDefined();
    });

    it('should handle response metadata correctly', () => {
      // listUsers has 200 response
      const listResponses = getEffectiveResponseMetadata(
        UserController,
        'listUsers',
      );
      expect(listResponses.some((r) => r.statusCode === 200)).toBe(true);

      // getUser has 200 and 404 responses
      const getResponses = getEffectiveResponseMetadata(
        UserController,
        'getUser',
      );
      expect(getResponses.some((r) => r.statusCode === 200)).toBe(true);
      expect(getResponses.some((r) => r.statusCode === 404)).toBe(true);

      // createUser has 201 and 400 responses (400 auto-added by validation)
      const createResponses = getEffectiveResponseMetadata(
        UserController,
        'createUser',
      );
      expect(createResponses.some((r) => r.statusCode === 201)).toBe(true);
      expect(createResponses.some((r) => r.statusCode === 400)).toBe(true);

      // deleteUser has 204 response
      const deleteResponses = getEffectiveResponseMetadata(
        UserController,
        'deleteUser',
      );
      expect(deleteResponses.some((r) => r.statusCode === 204)).toBe(true);
    });

    it('should handle middleware correctly', () => {
      // All methods should have class-level logger middleware
      const listMiddleware = getEffectiveMiddleware(
        UserController,
        'listUsers',
      );
      expect(listMiddleware).toContain(loggerMiddleware);

      // createUser should have additional auth middleware
      const createMiddleware = getEffectiveMiddleware(
        UserController,
        'createUser',
      );
      expect(createMiddleware).toContain(loggerMiddleware);
      expect(createMiddleware).toContain(authMiddleware);
    });

    it('should handle caching correctly', () => {
      // Only getUser is cached
      expect(isCached(UserController, 'getUser')).toBe(true);
      expect(isCached(UserController, 'listUsers')).toBe(false);
      expect(isCached(UserController, 'createUser')).toBe(false);
    });

    it('should handle rate limiting correctly', () => {
      // All methods have class-level rate limit
      expect(isRateLimited(UserController, 'listUsers')).toBe(true);
      expect(isRateLimited(UserController, 'createUser')).toBe(true);

      // deleteUser has method-level rate limit override
      expect(isRateLimited(UserController, 'deleteUser')).toBe(true);
    });

    it('should handle lifecycle hooks correctly', () => {
      // All methods should have class-level lifecycle hooks
      expect(hasLifecycleHooks(UserController, 'listUsers')).toBe(true);
      expect(hasLifecycleHooks(UserController, 'createUser')).toBe(true);

      const listHooks = getEffectiveLifecycleMetadata(
        UserController,
        'listUsers',
      );
      expect(listHooks.before).toContain(logBefore);
      expect(listHooks.after).toContain(logAfter);
      expect(listHooks.onSuccess).toContain(logSuccess);
      expect(listHooks.onError).toContain(logError);
    });

    it('should handle parameter injection metadata correctly', () => {
      // listUsers has query params
      const listParams = getParamMetadata(UserController, 'listUsers');
      expect(
        listParams.some((p) => p.type === 'query' && p.name === 'page'),
      ).toBe(true);
      expect(
        listParams.some((p) => p.type === 'query' && p.name === 'limit'),
      ).toBe(true);

      // getUser has path param
      const getParams = getParamMetadata(UserController, 'getUser');
      expect(getParams.some((p) => p.type === 'param' && p.name === 'id')).toBe(
        true,
      );

      // createUser has body param
      const createParams = getParamMetadata(UserController, 'createUser');
      expect(createParams.some((p) => p.type === 'body')).toBe(true);

      // updateUser has both path and body params
      const updateParams = getParamMetadata(UserController, 'updateUser');
      expect(
        updateParams.some((p) => p.type === 'param' && p.name === 'id'),
      ).toBe(true);
      expect(updateParams.some((p) => p.type === 'body')).toBe(true);

      // getRawData has req param
      const rawParams = getParamMetadata(UserController, 'getRawData');
      expect(rawParams.some((p) => p.type === 'req')).toBe(true);
    });

    it('should handle OpenAPI metadata correctly', () => {
      // listUsers has summary, description, operationId
      const listOpenApi = getEffectiveOpenAPIMetadata(
        UserController,
        'listUsers',
      );
      expect(listOpenApi.summary).toBe('List all users');
      expect(listOpenApi.description).toBe(
        'Returns a paginated list of all users',
      );
      expect(listOpenApi.operationId).toBe('listUsers');
      expect(listOpenApi.tags).toContain('Users');

      // getUser has summary and param documentation
      const getOpenApi = getEffectiveOpenAPIMetadata(UserController, 'getUser');
      expect(getOpenApi.summary).toBe('Get user by ID');

      // deleteUser is deprecated
      const deleteOpenApi = getEffectiveOpenAPIMetadata(
        UserController,
        'deleteUser',
      );
      expect(deleteOpenApi.deprecated).toBe(true);
    });

    it('should handle OpenAPI parameters correctly', () => {
      // getUser has documented path param
      const getParams = getOpenAPIParams(UserController, 'getUser');
      const idParam = getParams.find((p) => p.name === 'id');
      expect(idParam).toBeDefined();
      expect(idParam?.description).toBe('User UUID');
    });

    it('should handle request body metadata correctly', () => {
      // createUser has request body documentation
      const createBody = getRequestBodyMetadata(UserController, 'createUser');
      expect(createBody).toBeDefined();
      expect(createBody?.description).toBe('User data');
      expect(createBody?.required).toBe(true);
    });

    it('should handle transaction metadata correctly', () => {
      // Only updateUser has transaction
      expect(isTransactional(UserController, 'updateUser')).toBe(true);
      expect(isTransactional(UserController, 'createUser')).toBe(false);

      const updateTx = getTransactionMetadata(UserController, 'updateUser');
      expect(updateTx?.timeout).toBe(5000);
    });

    it('should handle handler args correctly', () => {
      // getRawData has handler args
      const rawArgs = getHandlerArgs(UserController, 'getRawData');
      expect(rawArgs).toContain('extra-arg-1');
      expect(rawArgs).toContain('extra-arg-2');
    });

    it('should handle raw JSON handler correctly', () => {
      // Only getRawData is raw JSON
      expect(isRawJsonHandler(UserController, 'getRawData')).toBe(true);
      expect(isRawJsonHandler(UserController, 'listUsers')).toBe(false);
    });

    it('should handle pagination correctly', () => {
      // Only listUsers is paginated
      expect(isPaginatedEndpoint(UserController, 'listUsers')).toBe(true);
      expect(isPaginatedEndpoint(UserController, 'getUser')).toBe(false);
    });

    it('should execute lifecycle hooks in correct order', async () => {
      const mockReq = { path: '/api/users' } as Request;
      const mockRes = {} as Response;
      const context: LifecycleContext = { req: mockReq, res: mockRes };

      // Simulate successful request lifecycle
      await executeBeforeHooks(UserController, 'listUsers', context);
      // Handler executes...
      context.result = { users: [] };
      await executeOnSuccessHooks(UserController, 'listUsers', context);
      await executeAfterHooks(UserController, 'listUsers', context);

      expect(executionLog).toEqual(['before', 'success', 'after']);
    });

    it('should execute lifecycle hooks on error', async () => {
      executionLog = [];
      const mockReq = { path: '/api/users' } as Request;
      const mockRes = {} as Response;
      const context: LifecycleContext = { req: mockReq, res: mockRes };

      // Simulate failed request lifecycle
      await executeBeforeHooks(UserController, 'createUser', context);
      // Handler throws...
      context.error = new Error('Test error');
      await executeOnErrorHooks(UserController, 'createUser', context);
      await executeAfterHooks(UserController, 'createUser', context);

      expect(executionLog).toEqual(['before', 'error', 'after']);
    });
  });

  describe('OpenAPI Spec Generation from Decorated Controllers', () => {
    it('should register schemas and build valid OpenAPI spec', () => {
      // Define schemas inside the test to ensure they're registered fresh
      @ApiSchema({ description: 'User entity' })
      class TestUserDto {
        @ApiProperty({ type: 'string', required: true, description: 'User ID' })
        id!: string;

        @ApiProperty({ type: 'string', required: true, format: 'email' })
        email!: string;

        @ApiProperty({ type: 'string', required: true })
        name!: string;

        @ApiProperty({ type: 'integer', minimum: 0 })
        age?: number;
      }

      @ApiSchema({ description: 'Error response' })
      class TestErrorResponse {
        @ApiProperty({ type: 'string', required: true })
        code!: string;

        @ApiProperty({ type: 'string', required: true })
        message!: string;
      }

      @ApiSchema({ description: 'Paginated user list' })
      class TestUserListResponse {
        @ApiProperty({ type: 'array', items: 'TestUserDto', required: true })
        items!: TestUserDto[];

        @ApiProperty({ type: 'integer', required: true })
        total!: number;

        @ApiProperty({ type: 'integer', required: true })
        page!: number;

        @ApiProperty({ type: 'integer', required: true })
        pageSize!: number;
      }

      // Verify schemas are registered
      const schemas = OpenAPISchemaRegistry.getAllSchemas();
      expect(schemas).toHaveProperty('TestUserDto');
      expect(schemas).toHaveProperty('TestErrorResponse');
      expect(schemas).toHaveProperty('TestUserListResponse');

      // Verify schema properties
      const userSchema = schemas.TestUserDto as Record<string, unknown>;
      expect(userSchema.type).toBe('object');
      expect(userSchema.description).toBe('User entity');

      const props = userSchema.properties as Record<
        string,
        Record<string, unknown>
      >;
      expect(props.id.type).toBe('string');
      expect(props.email.format).toBe('email');
      expect(props.age.type).toBe('integer');
      expect(props.age.minimum).toBe(0);

      const required = userSchema.required as string[];
      expect(required).toContain('id');
      expect(required).toContain('email');
      expect(required).toContain('name');
    });

    it('should build OpenAPI spec with controller routes', () => {
      // Define a controller for OpenAPI generation
      @ApiTags('TestUsers')
      @ApiController('/test-users', { description: 'Test user management' })
      class TestOpenApiUserController {
        @ApiSummary('List users')
        @ApiDescription('Get a paginated list of users')
        @ApiOperationId('getTestUsers')
        @Paginated()
        @Returns(200, 'UserList', { description: 'Success' })
        @Get('/')
        listUsers() {
          return [];
        }

        @ApiSummary('Get user')
        @ApiParam('id', { description: 'User ID', schema: { type: 'string' } })
        @Returns(200, 'User', { description: 'User found' })
        @Returns(404, 'Error', { description: 'Not found' })
        @Get('/:id')
        getUser() {
          return {};
        }

        @RequireAuth()
        @ApiSummary('Create user')
        @ApiRequestBody({ schema: 'User', required: true })
        @Returns(201, 'User', { description: 'Created' })
        @Returns(400, 'Error', { description: 'Validation error' })
        @Post('/')
        createUser() {
          return {};
        }

        @RequireAuth()
        @ApiSummary('Delete user')
        @Deprecated()
        @Returns(204, undefined, { description: 'Deleted' })
        @Delete('/:id')
        deleteUser() {}
      }

      // Register controller routes
      const routes = Reflect.getMetadata(
        ROUTES_METADATA,
        TestOpenApiUserController,
      );
      ControllerRegistry.register(
        '/test-users',
        'TestOpenApiUserController',
        routes.map(
          (route: { method: string; path: string; handlerName: string }) => ({
            method: route.method,
            path: route.path,
            handlerKey: route.handlerName,
            openapi: getEffectiveOpenAPIMetadata(
              TestOpenApiUserController,
              route.handlerName,
            ),
          }),
        ),
      );

      const builder = new OpenAPIBuilder({
        title: 'Test API',
        version: '1.0.0',
        description: 'Test API for integration tests',
      });

      const spec = builder.build();

      // Verify spec structure
      expect(spec.openapi).toBe('3.0.3');
      expect(spec.info.title).toBe('Test API');
      expect(spec.info.version).toBe('1.0.0');

      // Verify paths are generated
      expect(spec.paths).toHaveProperty('/test-users');
      expect(spec.paths).toHaveProperty('/test-users/{id}');

      // Verify operations
      const listOp = spec.paths['/test-users'].get as Record<string, unknown>;
      expect(listOp.summary).toBe('List users');
      expect(listOp.operationId).toBe('getTestUsers');

      const getOp = spec.paths['/test-users/{id}'].get as Record<
        string,
        unknown
      >;
      expect(getOp.summary).toBe('Get user');

      const deleteOp = spec.paths['/test-users/{id}'].delete as Record<
        string,
        unknown
      >;
      expect(deleteOp.deprecated).toBe(true);
    });

    it('should handle array schema references', () => {
      @ApiSchema({ description: 'Test item' })
      class TestItem {
        @ApiProperty({ type: 'string', required: true })
        id!: string;
      }

      @ApiSchema({ description: 'Test list' })
      class TestItemList {
        @ApiProperty({ type: 'array', items: 'TestItem', required: true })
        items!: TestItem[];
      }

      const schemas = OpenAPISchemaRegistry.getAllSchemas();
      const listSchema = schemas.TestItemList as Record<string, unknown>;
      const props = listSchema.properties as Record<
        string,
        Record<string, unknown>
      >;

      expect(props.items.type).toBe('array');
      expect((props.items.items as Record<string, unknown>).$ref).toBe(
        '#/components/schemas/TestItem',
      );
    });
  });

  describe('Route Registration and Handler Execution', () => {
    // Track handler execution
    let handlerCalls: Array<{ method: string; args: unknown[] }> = [];

    @ApiController('/items')
    class ItemController {
      @Get('/')
      listItems(@Query('search') search?: string) {
        handlerCalls.push({ method: 'listItems', args: [search] });
        return { search };
      }

      @Get('/:id')
      getItem(
        @Param('id') id: string,
        @Header('x-request-id') requestId?: string,
      ) {
        handlerCalls.push({ method: 'getItem', args: [id, requestId] });
        return { id, requestId };
      }

      @Post('/')
      createItem(@Body() data: { name: string }) {
        handlerCalls.push({ method: 'createItem', args: [data] });
        return data;
      }

      @Put('/:id')
      updateItem(
        @Param('id') id: string,
        @Body() data: { name: string },
        @CurrentUser() user?: { id: string },
      ) {
        handlerCalls.push({ method: 'updateItem', args: [id, data, user] });
        return { id, ...data, userId: user?.id };
      }
    }

    beforeEach(() => {
      handlerCalls = [];
    });

    it('should register all routes with correct methods', () => {
      const routes = Reflect.getMetadata(ROUTES_METADATA, ItemController);

      expect(routes).toHaveLength(4);

      const routeMap = new Map(
        routes.map(
          (r: { handlerName: string; method: string; path: string }) => [
            r.handlerName,
            r,
          ],
        ),
      );

      expect(routeMap.get('listItems')).toMatchObject({
        method: 'get',
        path: '/',
      });
      expect(routeMap.get('getItem')).toMatchObject({
        method: 'get',
        path: '/:id',
      });
      expect(routeMap.get('createItem')).toMatchObject({
        method: 'post',
        path: '/',
      });
      expect(routeMap.get('updateItem')).toMatchObject({
        method: 'put',
        path: '/:id',
      });
    });

    it('should collect parameter metadata for injection', () => {
      // listItems has query param
      const listParams = getParamMetadata(ItemController, 'listItems');
      expect(listParams).toHaveLength(1);
      expect(listParams[0]).toMatchObject({
        type: 'query',
        name: 'search',
        index: 0,
      });

      // getItem has path param and header
      const getParams = getParamMetadata(ItemController, 'getItem');
      expect(getParams).toHaveLength(2);
      expect(getParams.find((p) => p.type === 'param')).toMatchObject({
        name: 'id',
      });
      expect(getParams.find((p) => p.type === 'header')).toMatchObject({
        name: 'x-request-id',
      });

      // createItem has body
      const createParams = getParamMetadata(ItemController, 'createItem');
      expect(createParams).toHaveLength(1);
      expect(createParams[0]).toMatchObject({ type: 'body', index: 0 });

      // updateItem has path param, body, and user
      const updateParams = getParamMetadata(ItemController, 'updateItem');
      expect(updateParams).toHaveLength(3);
      expect(updateParams.find((p) => p.type === 'param')).toMatchObject({
        name: 'id',
      });
      expect(updateParams.find((p) => p.type === 'body')).toBeDefined();
      expect(updateParams.find((p) => p.type === 'user')).toBeDefined();
    });

    it('should support parameter injection with correct indices', () => {
      const updateParams = getParamMetadata(ItemController, 'updateItem');

      // Sort by index
      const sorted = [...updateParams].sort((a, b) => a.index - b.index);

      expect(sorted[0]).toMatchObject({ type: 'param', name: 'id', index: 0 });
      expect(sorted[1]).toMatchObject({ type: 'body', index: 1 });
      expect(sorted[2]).toMatchObject({ type: 'user', index: 2 });
    });
  });

  describe('Validation Error Responses', () => {
    const CreateSchema = z.object({
      name: z.string().min(1).max(100),
      email: z.string().email(),
      age: z.number().int().positive().optional(),
    });

    const IdSchema = z.object({
      id: z.string().uuid(),
    });

    const SearchSchema = z.object({
      q: z.string().min(1),
      page: z.coerce.number().int().positive().optional(),
    });

    @ApiController('/validated')
    class ValidatedController {
      @ValidateBody(CreateSchema)
      @Returns(201, 'Item')
      @Post('/')
      create() {}

      @ValidateParams(IdSchema)
      @Returns(200, 'Item')
      @Get('/:id')
      getById() {}

      @ValidateQuery(SearchSchema)
      @Returns(200, 'SearchResults')
      @Get('/search')
      search() {}

      @ValidateBody(CreateSchema)
      @ValidateParams(IdSchema)
      @Returns(200, 'Item')
      @Put('/:id')
      update() {}
    }

    it('should add 400 response for body validation', () => {
      const responses = getEffectiveResponseMetadata(
        ValidatedController,
        'create',
      );
      expect(responses.some((r) => r.statusCode === 400)).toBe(true);
      expect(responses.some((r) => r.statusCode === 201)).toBe(true);
    });

    it('should add 400 response for params validation', () => {
      const responses = getEffectiveResponseMetadata(
        ValidatedController,
        'getById',
      );
      expect(responses.some((r) => r.statusCode === 400)).toBe(true);
    });

    it('should add 400 response for query validation', () => {
      const responses = getEffectiveResponseMetadata(
        ValidatedController,
        'search',
      );
      expect(responses.some((r) => r.statusCode === 400)).toBe(true);
    });

    it('should not duplicate 400 response with multiple validations', () => {
      const responses = getEffectiveResponseMetadata(
        ValidatedController,
        'update',
      );
      const count400 = responses.filter((r) => r.statusCode === 400).length;
      expect(count400).toBe(1);
    });

    it('should store validation schemas correctly', () => {
      const createValidation = getEffectiveValidationMetadata(
        ValidatedController,
        'create',
      );
      expect(createValidation.body).toBe(CreateSchema);

      const getValidation = getEffectiveValidationMetadata(
        ValidatedController,
        'getById',
      );
      expect(getValidation.params).toBe(IdSchema);

      const searchValidation = getEffectiveValidationMetadata(
        ValidatedController,
        'search',
      );
      expect(searchValidation.query).toBe(SearchSchema);

      const updateValidation = getEffectiveValidationMetadata(
        ValidatedController,
        'update',
      );
      expect(updateValidation.body).toBe(CreateSchema);
      expect(updateValidation.params).toBe(IdSchema);
    });
  });

  describe('Authentication Enforcement', () => {
    @RequireAuth()
    @AuthFailureStatus(401)
    @ApiController('/secure')
    class SecureController {
      @Get('/protected')
      protectedRoute() {}

      @RequireCryptoAuth()
      @Get('/crypto')
      cryptoRoute() {}

      @Public()
      @Get('/public')
      publicRoute() {}

      @AuthFailureStatus(403)
      @Get('/forbidden')
      forbiddenRoute() {}
    }

    it('should require auth for protected routes', () => {
      expect(requiresAuthentication(SecureController, 'protectedRoute')).toBe(
        true,
      );
    });

    it('should require both auth types for crypto routes', () => {
      const auth = getEffectiveAuthMetadata(SecureController, 'cryptoRoute');
      expect(auth.requireAuth).toBe(true);
      expect(auth.requireCryptoAuth).toBe(true);
    });

    it('should not require auth for public routes', () => {
      expect(requiresAuthentication(SecureController, 'publicRoute')).toBe(
        false,
      );
    });

    it('should use class-level failure status by default', () => {
      const auth = getEffectiveAuthMetadata(SecureController, 'protectedRoute');
      expect(auth.failureStatusCode).toBe(401);
    });

    it('should allow method-level failure status override', () => {
      const auth = getEffectiveAuthMetadata(SecureController, 'forbiddenRoute');
      expect(auth.failureStatusCode).toBe(403);
    });

    it('should add 401 response to authenticated routes', () => {
      // Class-level auth adds 401 to class metadata
      const classResponses = Reflect.getMetadata(
        RESPONSE_METADATA,
        SecureController,
      ) as Array<{ statusCode: number }>;
      expect(classResponses.some((r) => r.statusCode === 401)).toBe(true);
    });

    it('should not add 401 response to public routes', () => {
      const publicResponses = Reflect.getMetadata(
        RESPONSE_METADATA,
        SecureController,
        'publicRoute',
      );
      // Public routes don't have their own 401 response
      expect(publicResponses).toBeUndefined();
    });
  });

  describe('Complex Decorator Combinations', () => {
    let middlewareLog: string[] = [];
    let lifecycleLog: string[] = [];

    const middleware1: RequestHandler = (_req, _res, next) => {
      middlewareLog.push('m1');
      next();
    };

    const middleware2: RequestHandler = (_req, _res, next) => {
      middlewareLog.push('m2');
      next();
    };

    const beforeHook: LifecycleCallback = () => {
      lifecycleLog.push('before');
    };

    const afterHook: LifecycleCallback = () => {
      lifecycleLog.push('after');
    };

    @UseMiddleware(middleware1)
    @Before(beforeHook)
    @After(afterHook)
    @RequireAuth()
    @RateLimit({ requests: 100, window: 60 })
    @ApiTags('Complex')
    @ApiController('/complex')
    class ComplexController {
      @UseMiddleware(middleware2)
      @CacheResponse({ ttl: 60 })
      @ValidateQuery(z.object({ filter: z.string().optional() }))
      @Paginated()
      @Returns(200, 'ItemList')
      @ApiSummary('Complex list operation')
      @Get('/')
      list() {}

      @Public()
      @RateLimit({ requests: 10, window: 60 })
      @ValidateParams(z.object({ id: z.string() }))
      @Returns(200, 'Item')
      @Returns(404, 'Error')
      @ApiSummary('Get single item')
      @Get('/:id')
      getOne() {}

      @RequireCryptoAuth()
      @Transactional({ timeout: 10000 })
      @ValidateBody(z.object({ name: z.string() }))
      @ValidateParams(z.object({ id: z.string() }))
      @Returns(200, 'Item')
      @ApiSummary('Update item')
      @Put('/:id')
      update() {}
    }

    beforeEach(() => {
      middlewareLog = [];
      lifecycleLog = [];
    });

    it('should combine all class-level decorators', () => {
      // Auth
      expect(requiresAuthentication(ComplexController, 'list')).toBe(true);

      // Middleware
      const middleware = getEffectiveMiddleware(ComplexController, 'list');
      expect(middleware).toContain(middleware1);
      expect(middleware).toContain(middleware2);

      // Lifecycle
      expect(hasLifecycleHooks(ComplexController, 'list')).toBe(true);

      // Rate limit
      expect(isRateLimited(ComplexController, 'list')).toBe(true);

      // Tags
      const openApi = getEffectiveOpenAPIMetadata(ComplexController, 'list');
      expect(openApi.tags).toContain('Complex');
    });

    it('should allow method-level overrides', () => {
      // getOne is public despite class-level auth
      expect(requiresAuthentication(ComplexController, 'getOne')).toBe(false);

      // getOne has its own rate limit
      expect(isRateLimited(ComplexController, 'getOne')).toBe(true);
    });

    it('should combine multiple auth requirements', () => {
      const auth = getEffectiveAuthMetadata(ComplexController, 'update');
      expect(auth.requireAuth).toBe(true);
      expect(auth.requireCryptoAuth).toBe(true);
    });

    it('should combine multiple validations', () => {
      const validation = getEffectiveValidationMetadata(
        ComplexController,
        'update',
      );
      expect(validation.body).toBeDefined();
      expect(validation.params).toBeDefined();
    });

    it('should combine caching with other decorators', () => {
      expect(isCached(ComplexController, 'list')).toBe(true);
      expect(isPaginatedEndpoint(ComplexController, 'list')).toBe(true);
      expect(hasValidation(ComplexController, 'list')).toBe(true);
    });

    it('should combine transaction with validation', () => {
      expect(isTransactional(ComplexController, 'update')).toBe(true);
      expect(hasValidation(ComplexController, 'update')).toBe(true);

      const tx = getTransactionMetadata(ComplexController, 'update');
      expect(tx?.timeout).toBe(10000);
    });

    it('should maintain correct middleware order', () => {
      const middleware = getEffectiveMiddleware(ComplexController, 'list');

      // Class middleware should come before method middleware
      const m1Index = middleware.indexOf(middleware1);
      const m2Index = middleware.indexOf(middleware2);

      expect(m1Index).toBeLessThan(m2Index);
    });
  });
});
