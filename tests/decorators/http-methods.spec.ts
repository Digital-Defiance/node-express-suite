import 'reflect-metadata';
import {
  Delete,
  Get,
  Patch,
  Post,
  Put,
} from '../../src/decorators/http-methods';
import {
  OPENAPI_METADATA,
  ROUTES_METADATA,
} from '../../src/decorators/metadata-keys';
import { ApiController } from '../../src/decorators/controller';

describe('HTTP Method Decorators', () => {
  describe('@Get', () => {
    it('should register a GET route', () => {
      class TestController {
        @Get('/users')
        getUsers() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes).toHaveLength(1);
      expect(routes[0]).toMatchObject({
        method: 'get',
        path: '/users',
        handlerName: 'getUsers',
      });
    });

    it('should register GET route with path parameters', () => {
      class TestController {
        @Get('/users/:id')
        getUser() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes[0].path).toBe('/users/:id');
    });

    it('should store route options', () => {
      class TestController {
        @Get('/users', { auth: true, rawJson: true })
        getUsers() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes[0].options).toMatchObject({
        auth: true,
        rawJson: true,
      });
    });
  });

  describe('@Post', () => {
    it('should register a POST route', () => {
      class TestController {
        @Post('/users')
        createUser() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes).toHaveLength(1);
      expect(routes[0]).toMatchObject({
        method: 'post',
        path: '/users',
        handlerName: 'createUser',
      });
    });

    it('should store validation schema option', () => {
      const mockSchema = { parse: () => {} };
      class TestController {
        @Post('/users', { schema: mockSchema as never })
        createUser() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes[0].options.schema).toBe(mockSchema);
    });
  });

  describe('@Put', () => {
    it('should register a PUT route', () => {
      class TestController {
        @Put('/users/:id')
        updateUser() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes).toHaveLength(1);
      expect(routes[0]).toMatchObject({
        method: 'put',
        path: '/users/:id',
        handlerName: 'updateUser',
      });
    });

    it('should store transaction options', () => {
      class TestController {
        @Put('/users/:id', { transaction: true, transactionTimeout: 5000 })
        updateUser() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes[0].options).toMatchObject({
        transaction: true,
        transactionTimeout: 5000,
      });
    });
  });

  describe('@Delete', () => {
    it('should register a DELETE route', () => {
      class TestController {
        @Delete('/users/:id')
        deleteUser() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes).toHaveLength(1);
      expect(routes[0]).toMatchObject({
        method: 'delete',
        path: '/users/:id',
        handlerName: 'deleteUser',
      });
    });

    it('should store auth options', () => {
      class TestController {
        @Delete('/users/:id', { auth: true, cryptoAuth: true })
        deleteUser() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes[0].options).toMatchObject({
        auth: true,
        cryptoAuth: true,
      });
    });
  });

  describe('@Patch', () => {
    it('should register a PATCH route', () => {
      class TestController {
        @Patch('/users/:id')
        patchUser() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes).toHaveLength(1);
      expect(routes[0]).toMatchObject({
        method: 'patch',
        path: '/users/:id',
        handlerName: 'patchUser',
      });
    });

    it('should store middleware option', () => {
      const mockMiddleware = () => {};
      class TestController {
        @Patch('/users/:id', { middleware: [mockMiddleware] })
        patchUser() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes[0].options.middleware).toEqual([mockMiddleware]);
    });
  });

  describe('Multiple Routes', () => {
    it('should register multiple routes on same controller', () => {
      class TestController {
        @Get('/users')
        getUsers() {}

        @Post('/users')
        createUser() {}

        @Get('/users/:id')
        getUser() {}

        @Put('/users/:id')
        updateUser() {}

        @Delete('/users/:id')
        deleteUser() {}

        @Patch('/users/:id')
        patchUser() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes).toHaveLength(6);
      expect(routes.map((r: { method: string }) => r.method)).toEqual([
        'get',
        'post',
        'get',
        'put',
        'delete',
        'patch',
      ]);
    });

    it('should work with @ApiController decorator', () => {
      @ApiController('/api/users', { tags: ['Users'] })
      class UserController {
        @Get('/')
        listUsers() {}

        @Post('/')
        createUser() {}

        @Get('/:id')
        getUser() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, UserController);
      expect(routes).toHaveLength(3);
      expect(routes[0]).toMatchObject({ method: 'get', path: '/' });
      expect(routes[1]).toMatchObject({ method: 'post', path: '/' });
      expect(routes[2]).toMatchObject({ method: 'get', path: '/:id' });
    });
  });

  describe('Inline OpenAPI Options', () => {
    it('should store summary in OpenAPI metadata', () => {
      class TestController {
        @Get('/users', { summary: 'List all users' })
        getUsers() {}
      }

      const openApiMetadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'getUsers',
      );
      expect(openApiMetadata.summary).toBe('List all users');
    });

    it('should store description in OpenAPI metadata', () => {
      class TestController {
        @Get('/users', {
          description: 'Returns a list of all users in the system',
        })
        getUsers() {}
      }

      const openApiMetadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'getUsers',
      );
      expect(openApiMetadata.description).toBe(
        'Returns a list of all users in the system',
      );
    });

    it('should store tags in OpenAPI metadata', () => {
      class TestController {
        @Get('/users', { tags: ['Users', 'Admin'] })
        getUsers() {}
      }

      const openApiMetadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'getUsers',
      );
      expect(openApiMetadata.tags).toEqual(['Users', 'Admin']);
    });

    it('should store operationId in OpenAPI metadata', () => {
      class TestController {
        @Get('/users', { operationId: 'listUsers' })
        getUsers() {}
      }

      const openApiMetadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'getUsers',
      );
      expect(openApiMetadata.operationId).toBe('listUsers');
    });

    it('should store deprecated flag in OpenAPI metadata', () => {
      class TestController {
        @Get('/users/legacy', { deprecated: true })
        getLegacyUsers() {}
      }

      const openApiMetadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'getLegacyUsers',
      );
      expect(openApiMetadata.deprecated).toBe(true);
    });

    it('should store all inline OpenAPI options together', () => {
      class TestController {
        @Get('/users/:id', {
          summary: 'Get user by ID',
          description: 'Retrieves a single user by their unique identifier',
          tags: ['Users'],
          operationId: 'getUserById',
          deprecated: false,
        })
        getUser() {}
      }

      const openApiMetadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'getUser',
      );
      expect(openApiMetadata).toMatchObject({
        summary: 'Get user by ID',
        description: 'Retrieves a single user by their unique identifier',
        tags: ['Users'],
        operationId: 'getUserById',
        deprecated: false,
      });
    });
  });

  describe('Path Parameter Extraction', () => {
    it('should auto-extract single path parameter', () => {
      class TestController {
        @Get('/users/:id')
        getUser() {}
      }

      const openApiMetadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'getUser',
      );
      expect(openApiMetadata.parameters).toHaveLength(1);
      expect(openApiMetadata.parameters[0]).toMatchObject({
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
      });
    });

    it('should auto-extract multiple path parameters', () => {
      class TestController {
        @Get('/users/:userId/posts/:postId')
        getUserPost() {}
      }

      const openApiMetadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'getUserPost',
      );
      expect(openApiMetadata.parameters).toHaveLength(2);
      expect(openApiMetadata.parameters[0].name).toBe('userId');
      expect(openApiMetadata.parameters[1].name).toBe('postId');
    });

    it('should not create parameters for routes without path params', () => {
      class TestController {
        @Get('/users')
        getUsers() {}
      }

      const openApiMetadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'getUsers',
      );
      // No parameters should be set (or undefined)
      expect(openApiMetadata?.parameters).toBeUndefined();
    });
  });
});

describe('OpenAPI Metadata Merging', () => {
  describe('Explicit openapi object merging', () => {
    it('should merge inline options with explicit openapi object', () => {
      class TestController {
        @Get('/users/:id', {
          summary: 'Get user',
          tags: ['Users'],
          openapi: {
            description: 'Detailed description from openapi object',
            operationId: 'getUserById',
          },
        })
        getUser() {}
      }

      const openApiMetadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'getUser',
      );
      expect(openApiMetadata.summary).toBe('Get user');
      expect(openApiMetadata.tags).toContain('Users');
      expect(openApiMetadata.description).toBe(
        'Detailed description from openapi object',
      );
      expect(openApiMetadata.operationId).toBe('getUserById');
    });

    it('should let explicit openapi object override inline options', () => {
      class TestController {
        @Get('/users', {
          summary: 'Inline summary',
          description: 'Inline description',
          openapi: {
            summary: 'Explicit summary',
            description: 'Explicit description',
          },
        })
        getUsers() {}
      }

      const openApiMetadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'getUsers',
      );
      expect(openApiMetadata.summary).toBe('Explicit summary');
      expect(openApiMetadata.description).toBe('Explicit description');
    });

    it('should concatenate tags from inline and explicit openapi', () => {
      class TestController {
        @Get('/users', {
          tags: ['Users'],
          openapi: {
            tags: ['Admin', 'Public'],
          },
        })
        getUsers() {}
      }

      const openApiMetadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'getUsers',
      );
      expect(openApiMetadata.tags).toEqual(['Users', 'Admin', 'Public']);
    });

    it('should merge explicit parameters with auto-extracted path params', () => {
      class TestController {
        @Get('/users/:id', {
          openapi: {
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                description: 'User ID',
                schema: { type: 'string', format: 'uuid' },
              },
            ],
          },
        })
        getUser() {}
      }

      const openApiMetadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'getUser',
      );
      // Explicit param should override auto-extracted
      expect(openApiMetadata.parameters).toHaveLength(1);
      expect(openApiMetadata.parameters[0]).toMatchObject({
        name: 'id',
        in: 'path',
        required: true,
        description: 'User ID',
        schema: { type: 'string', format: 'uuid' },
      });
    });

    it('should add explicit parameters alongside auto-extracted ones', () => {
      class TestController {
        @Get('/users/:id', {
          openapi: {
            parameters: [
              {
                name: 'include',
                in: 'query',
                required: false,
                description: 'Related resources to include',
                schema: { type: 'string' },
              },
            ],
          },
        })
        getUser() {}
      }

      const openApiMetadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'getUser',
      );
      expect(openApiMetadata.parameters).toHaveLength(2);
      // Auto-extracted path param
      expect(openApiMetadata.parameters[0]).toMatchObject({
        name: 'id',
        in: 'path',
      });
      // Explicit query param
      expect(openApiMetadata.parameters[1]).toMatchObject({
        name: 'include',
        in: 'query',
      });
    });

    it('should store requestBody from explicit openapi object', () => {
      class TestController {
        @Post('/users', {
          openapi: {
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CreateUser' },
                },
              },
            },
          },
        })
        createUser() {}
      }

      const openApiMetadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'createUser',
      );
      expect(openApiMetadata.requestBody).toMatchObject({
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateUser' },
          },
        },
      });
    });

    it('should store responses from explicit openapi object', () => {
      class TestController {
        @Get('/users/:id', {
          openapi: {
            responses: {
              200: {
                description: 'User found',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/User' },
                  },
                },
              },
              404: {
                description: 'User not found',
              },
            },
          },
        })
        getUser() {}
      }

      const openApiMetadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'getUser',
      );
      expect(openApiMetadata.responses).toBeDefined();
      expect(openApiMetadata.responses[200]).toMatchObject({
        description: 'User found',
      });
      expect(openApiMetadata.responses[404]).toMatchObject({
        description: 'User not found',
      });
    });
  });

  describe('Metadata isolation between methods', () => {
    it('should not share OpenAPI metadata between different methods', () => {
      class TestController {
        @Get('/users', { summary: 'List users', tags: ['Users'] })
        listUsers() {}

        @Get('/posts', { summary: 'List posts', tags: ['Posts'] })
        listPosts() {}
      }

      const usersMetadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'listUsers',
      );
      const postsMetadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'listPosts',
      );

      expect(usersMetadata.summary).toBe('List users');
      expect(usersMetadata.tags).toEqual(['Users']);
      expect(postsMetadata.summary).toBe('List posts');
      expect(postsMetadata.tags).toEqual(['Posts']);
    });

    it('should not share route metadata between different methods', () => {
      class TestController {
        @Get('/users', { auth: true })
        getUsers() {}

        @Post('/users', { auth: false })
        createUser() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes[0].options.auth).toBe(true);
      expect(routes[1].options.auth).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty options gracefully', () => {
      class TestController {
        @Get('/users')
        getUsers() {}
      }

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes[0].options).toEqual({});
    });

    it('should handle routes with no OpenAPI metadata', () => {
      class TestController {
        @Get('/health')
        healthCheck() {}
      }

      const openApiMetadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'healthCheck',
      );
      // Should be undefined or empty since no OpenAPI options were provided
      expect(openApiMetadata).toBeUndefined();
    });

    it('should handle complex path patterns', () => {
      class TestController {
        @Get('/api/v1/users/:userId/orders/:orderId/items/:itemId')
        getOrderItem() {}
      }

      const openApiMetadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'getOrderItem',
      );
      expect(openApiMetadata.parameters).toHaveLength(3);
      expect(
        openApiMetadata.parameters.map((p: { name: string }) => p.name),
      ).toEqual(['userId', 'orderId', 'itemId']);
    });

    it('should handle path with underscores in parameter names', () => {
      class TestController {
        @Get('/users/:user_id/posts/:post_id')
        getUserPost() {}
      }

      const openApiMetadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'getUserPost',
      );
      expect(openApiMetadata.parameters).toHaveLength(2);
      expect(openApiMetadata.parameters[0].name).toBe('user_id');
      expect(openApiMetadata.parameters[1].name).toBe('post_id');
    });
  });
});
