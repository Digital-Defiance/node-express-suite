/**
 * @fileoverview Unit tests for OpenAPIBuilder
 */

import { ControllerRegistry } from '../../src/registry/controller-registry';
import {
  OpenAPIBuilder,
  OpenAPIBuilderConfig,
} from '../../src/openapi/builder';
import { OpenAPISchemaRegistry } from '../../src/openapi/schemas';
import { RouteConfig } from '../../src/types';

describe('OpenAPIBuilder', () => {
  const defaultConfig: OpenAPIBuilderConfig = {
    title: 'Test API',
    version: '1.0.0',
    description: 'A test API',
  };

  beforeEach(() => {
    ControllerRegistry.clear();
    OpenAPISchemaRegistry.clear();
  });

  describe('build', () => {
    it('should build a valid OpenAPI 3.0.3 spec', () => {
      const builder = new OpenAPIBuilder(defaultConfig);
      const spec = builder.build();

      expect(spec.openapi).toBe('3.0.3');
      expect(spec.info.title).toBe('Test API');
      expect(spec.info.version).toBe('1.0.0');
      expect(spec.info.description).toBe('A test API');
    });

    it('should use default server when none provided', () => {
      const builder = new OpenAPIBuilder(defaultConfig);
      const spec = builder.build();

      expect(spec.servers).toHaveLength(1);
      expect(spec.servers[0].url).toBe('/api');
    });

    it('should use custom servers when provided', () => {
      const config: OpenAPIBuilderConfig = {
        ...defaultConfig,
        servers: [
          { url: 'https://api.example.com', description: 'Production' },
          { url: 'https://staging.example.com', description: 'Staging' },
        ],
      };
      const builder = new OpenAPIBuilder(config);
      const spec = builder.build();

      expect(spec.servers).toHaveLength(2);
      expect(spec.servers[0].url).toBe('https://api.example.com');
    });

    it('should include optional info fields when provided', () => {
      const config: OpenAPIBuilderConfig = {
        ...defaultConfig,
        contact: { name: 'Support', email: 'support@example.com' },
        license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
        termsOfService: 'https://example.com/tos',
      };
      const builder = new OpenAPIBuilder(config);
      const spec = builder.build();

      expect(spec.info.contact).toEqual({
        name: 'Support',
        email: 'support@example.com',
      });
      expect(spec.info.license).toEqual({
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      });
      expect(spec.info.termsOfService).toBe('https://example.com/tos');
    });
  });

  describe('external docs', () => {
    it('should include external docs when provided', () => {
      const config: OpenAPIBuilderConfig = {
        ...defaultConfig,
        externalDocs: {
          description: 'Full documentation',
          url: 'https://docs.example.com',
        },
      };
      const builder = new OpenAPIBuilder(config);
      const spec = builder.build();

      expect(spec.externalDocs).toBeDefined();
      expect(spec.externalDocs?.url).toBe('https://docs.example.com');
      expect(spec.externalDocs?.description).toBe('Full documentation');
    });
  });

  describe('tag definitions', () => {
    it('should include configured tag definitions', () => {
      const config: OpenAPIBuilderConfig = {
        ...defaultConfig,
        tags: [
          { name: 'Users', description: 'User management endpoints' },
          { name: 'Posts', description: 'Blog post endpoints' },
        ],
      };
      const builder = new OpenAPIBuilder(config);
      const spec = builder.build();

      expect(spec.tags).toBeDefined();
      expect(spec.tags).toHaveLength(2);
      expect(spec.tags?.find((t) => t.name === 'Users')?.description).toBe(
        'User management endpoints',
      );
    });

    it('should auto-generate tag definitions from routes', () => {
      ControllerRegistry.register('/users', 'UsersController', [
        {
          method: 'get',
          path: '/',
          handlerKey: 'list',
          useAuthentication: false,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'List users',
            tags: ['Users'],
            responses: { 200: { description: 'Success' } },
          },
        },
      ]);

      const builder = new OpenAPIBuilder(defaultConfig);
      const spec = builder.build();

      expect(spec.tags).toBeDefined();
      expect(spec.tags?.find((t) => t.name === 'Users')).toBeDefined();
    });

    it('should not auto-generate tags when disabled', () => {
      ControllerRegistry.register('/users', 'UsersController', [
        {
          method: 'get',
          path: '/',
          handlerKey: 'list',
          useAuthentication: false,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'List users',
            tags: ['Users'],
            responses: { 200: { description: 'Success' } },
          },
        },
      ]);

      const config: OpenAPIBuilderConfig = {
        ...defaultConfig,
        autoGenerateTags: false,
      };
      const builder = new OpenAPIBuilder(config);
      const spec = builder.build();

      // Should not have auto-generated tags
      expect(spec.tags).toBeUndefined();
    });

    it('should merge configured and auto-generated tags', () => {
      ControllerRegistry.register('/users', 'UsersController', [
        {
          method: 'get',
          path: '/',
          handlerKey: 'list',
          useAuthentication: false,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'List users',
            tags: ['Users', 'NewTag'],
            responses: { 200: { description: 'Success' } },
          },
        },
      ]);

      const config: OpenAPIBuilderConfig = {
        ...defaultConfig,
        tags: [{ name: 'Users', description: 'User management endpoints' }],
      };
      const builder = new OpenAPIBuilder(config);
      const spec = builder.build();

      expect(spec.tags).toBeDefined();
      // Should have configured Users tag with description
      const usersTag = spec.tags?.find((t) => t.name === 'Users');
      expect(usersTag?.description).toBe('User management endpoints');
      // Should have auto-generated NewTag
      expect(spec.tags?.find((t) => t.name === 'NewTag')).toBeDefined();
    });

    it('should sort tags alphabetically', () => {
      ControllerRegistry.register('/test', 'TestController', [
        {
          method: 'get',
          path: '/',
          handlerKey: 'test',
          useAuthentication: false,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'Test',
            tags: ['Zebra', 'Alpha', 'Middle'],
            responses: { 200: { description: 'Success' } },
          },
        },
      ]);

      const builder = new OpenAPIBuilder(defaultConfig);
      const spec = builder.build();

      expect(spec.tags).toBeDefined();
      expect(spec.tags?.[0].name).toBe('Alpha');
      expect(spec.tags?.[1].name).toBe('Middle');
      expect(spec.tags?.[2].name).toBe('Zebra');
    });
  });

  describe('path building', () => {
    it('should build paths from registered controllers', () => {
      const routes: RouteConfig<Record<string, unknown>, string>[] = [
        {
          method: 'get',
          path: '/',
          handlerKey: 'list',
          useAuthentication: false,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'List users',
            tags: ['Users'],
            responses: { 200: { description: 'Success' } },
          },
        },
      ];

      ControllerRegistry.register('/users', 'UsersController', routes);

      const builder = new OpenAPIBuilder(defaultConfig);
      const spec = builder.build();

      expect(spec.paths['/users']).toBeDefined();
      expect(spec.paths['/users'].get).toBeDefined();
      expect(
        (spec.paths['/users'].get as Record<string, unknown>).summary,
      ).toBe('List users');
    });

    it('should convert Express path params to OpenAPI format', () => {
      const routes: RouteConfig<Record<string, unknown>, string>[] = [
        {
          method: 'get',
          path: '/:userId/posts/:postId',
          handlerKey: 'getPost',
          useAuthentication: false,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'Get user post',
            tags: ['Posts'],
            responses: { 200: { description: 'Success' } },
          },
        },
      ];

      ControllerRegistry.register('/users', 'UsersController', routes);

      const builder = new OpenAPIBuilder(defaultConfig);
      const spec = builder.build();

      expect(spec.paths['/users/{userId}/posts/{postId}']).toBeDefined();
    });

    it('should combine multiple controllers', () => {
      ControllerRegistry.register('/users', 'UsersController', [
        {
          method: 'get',
          path: '/',
          handlerKey: 'list',
          useAuthentication: false,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'List users',
            tags: ['Users'],
            responses: { 200: { description: 'Success' } },
          },
        },
      ]);

      ControllerRegistry.register('/posts', 'PostsController', [
        {
          method: 'get',
          path: '/',
          handlerKey: 'list',
          useAuthentication: false,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'List posts',
            tags: ['Posts'],
            responses: { 200: { description: 'Success' } },
          },
        },
      ]);

      const builder = new OpenAPIBuilder(defaultConfig);
      const spec = builder.build();

      expect(spec.paths['/users']).toBeDefined();
      expect(spec.paths['/posts']).toBeDefined();
    });

    it('should handle multiple methods on same path', () => {
      const routes: RouteConfig<Record<string, unknown>, string>[] = [
        {
          method: 'get',
          path: '/',
          handlerKey: 'list',
          useAuthentication: false,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'List users',
            tags: ['Users'],
            responses: { 200: { description: 'Success' } },
          },
        },
        {
          method: 'post',
          path: '/',
          handlerKey: 'create',
          useAuthentication: true,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'Create user',
            tags: ['Users'],
            responses: { 201: { description: 'Created' } },
          },
        },
      ];

      ControllerRegistry.register('/users', 'UsersController', routes);

      const builder = new OpenAPIBuilder(defaultConfig);
      const spec = builder.build();

      expect(spec.paths['/users'].get).toBeDefined();
      expect(spec.paths['/users'].post).toBeDefined();
    });
  });

  describe('operation building', () => {
    it('should build minimal operation when no openapi metadata', () => {
      const routes: RouteConfig<Record<string, unknown>, string>[] = [
        {
          method: 'get',
          path: '/:id',
          handlerKey: 'getById',
          useAuthentication: false,
          useCryptoAuthentication: false,
        },
      ];

      ControllerRegistry.register('/users', 'UsersController', routes);

      const builder = new OpenAPIBuilder(defaultConfig);
      const spec = builder.build();

      const operation = spec.paths['/users/{id}'].get as Record<
        string,
        unknown
      >;
      expect(operation.summary).toBe('GET /:id');
      expect(operation.tags).toEqual(['Untagged']);
      expect(operation.parameters as Array<{ name: string }>).toHaveLength(1);
      expect((operation.parameters as Array<{ name: string }>)[0].name).toBe(
        'id',
      );
    });

    it('should include all openapi metadata fields', () => {
      const routes: RouteConfig<Record<string, unknown>, string>[] = [
        {
          method: 'get',
          path: '/:id',
          handlerKey: 'getById',
          useAuthentication: false,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'Get user by ID',
            description: 'Retrieves a user by their unique identifier',
            tags: ['Users'],
            operationId: 'getUserById',
            deprecated: true,
            responses: {
              200: { schema: 'User', description: 'User found' },
              404: { schema: 'Error', description: 'User not found' },
            },
          },
        },
      ];

      ControllerRegistry.register('/users', 'UsersController', routes);

      const builder = new OpenAPIBuilder(defaultConfig);
      const spec = builder.build();

      const operation = spec.paths['/users/{id}'].get as Record<
        string,
        unknown
      >;
      expect(operation.summary).toBe('Get user by ID');
      expect(operation.description).toBe(
        'Retrieves a user by their unique identifier',
      );
      expect(operation.tags).toEqual(['Users']);
      expect(operation.operationId).toBe('getUserById');
      expect(operation.deprecated).toBe(true);
    });

    it('should auto-add security for authenticated routes', () => {
      const routes: RouteConfig<Record<string, unknown>, string>[] = [
        {
          method: 'post',
          path: '/',
          handlerKey: 'create',
          useAuthentication: true,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'Create user',
            tags: ['Users'],
            responses: { 201: { description: 'Created' } },
          },
        },
      ];

      ControllerRegistry.register('/users', 'UsersController', routes);

      const builder = new OpenAPIBuilder(defaultConfig);
      const spec = builder.build();

      const operation = spec.paths['/users'].post as Record<string, unknown>;
      expect(operation.security).toEqual([{ bearerAuth: [] }]);
    });

    it('should have empty security for unauthenticated routes', () => {
      const routes: RouteConfig<Record<string, unknown>, string>[] = [
        {
          method: 'get',
          path: '/',
          handlerKey: 'list',
          useAuthentication: false,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'List users',
            tags: ['Users'],
            responses: { 200: { description: 'Success' } },
          },
        },
      ];

      ControllerRegistry.register('/users', 'UsersController', routes);

      const builder = new OpenAPIBuilder(defaultConfig);
      const spec = builder.build();

      const operation = spec.paths['/users'].get as Record<string, unknown>;
      expect(operation.security).toEqual([]);
    });

    it('should auto-add 401 response for authenticated routes', () => {
      const routes: RouteConfig<Record<string, unknown>, string>[] = [
        {
          method: 'delete',
          path: '/:id',
          handlerKey: 'delete',
          useAuthentication: true,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'Delete user',
            tags: ['Users'],
            responses: { 204: { description: 'Deleted' } },
          },
        },
      ];

      ControllerRegistry.register('/users', 'UsersController', routes);

      const builder = new OpenAPIBuilder(defaultConfig);
      const spec = builder.build();

      const operation = spec.paths['/users/{id}'].delete as Record<
        string,
        unknown
      >;
      const responses = operation.responses as Record<
        string,
        Record<string, unknown>
      >;
      expect(responses['401']).toBeDefined();
      expect(responses['401'].description).toBe('Unauthorized');
    });

    it('should not override explicit 401 response', () => {
      const routes: RouteConfig<Record<string, unknown>, string>[] = [
        {
          method: 'delete',
          path: '/:id',
          handlerKey: 'delete',
          useAuthentication: true,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'Delete user',
            tags: ['Users'],
            responses: {
              204: { description: 'Deleted' },
              401: { description: 'Custom unauthorized message' },
            },
          },
        },
      ];

      ControllerRegistry.register('/users', 'UsersController', routes);

      const builder = new OpenAPIBuilder(defaultConfig);
      const spec = builder.build();

      const operation = spec.paths['/users/{id}'].delete as Record<
        string,
        unknown
      >;
      const responses = operation.responses as Record<
        string,
        Record<string, unknown>
      >;
      expect(responses['401'].description).toBe('Custom unauthorized message');
    });
  });

  describe('parameter building', () => {
    it('should extract path parameters automatically', () => {
      const routes: RouteConfig<Record<string, unknown>, string>[] = [
        {
          method: 'get',
          path: '/:userId/posts/:postId',
          handlerKey: 'getPost',
          useAuthentication: false,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'Get post',
            tags: ['Posts'],
            responses: { 200: { description: 'Success' } },
          },
        },
      ];

      ControllerRegistry.register('/users', 'UsersController', routes);

      const builder = new OpenAPIBuilder(defaultConfig);
      const spec = builder.build();

      const operation = spec.paths['/users/{userId}/posts/{postId}']
        .get as Record<string, unknown>;
      const params = operation.parameters as Array<{
        name: string;
        in: string;
        required: boolean;
      }>;
      expect(params).toHaveLength(2);
      expect(params[0].name).toBe('userId');
      expect(params[0].in).toBe('path');
      expect(params[0].required).toBe(true);
      expect(params[1].name).toBe('postId');
    });

    it('should include explicit query parameters', () => {
      const routes: RouteConfig<Record<string, unknown>, string>[] = [
        {
          method: 'get',
          path: '/',
          handlerKey: 'list',
          useAuthentication: false,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'List users',
            tags: ['Users'],
            parameters: [
              {
                name: 'page',
                in: 'query',
                schema: { type: 'integer', default: 1 },
              },
              {
                name: 'limit',
                in: 'query',
                schema: { type: 'integer', default: 10 },
              },
            ],
            responses: { 200: { description: 'Success' } },
          },
        },
      ];

      ControllerRegistry.register('/users', 'UsersController', routes);

      const builder = new OpenAPIBuilder(defaultConfig);
      const spec = builder.build();

      const operation = spec.paths['/users'].get as Record<string, unknown>;
      const params = operation.parameters as Array<{ name: string }>;
      expect(params).toHaveLength(2);
      expect(params.find((p) => p.name === 'page')).toBeDefined();
      expect(params.find((p) => p.name === 'limit')).toBeDefined();
    });

    it('should not duplicate path parameters', () => {
      const routes: RouteConfig<Record<string, unknown>, string>[] = [
        {
          method: 'get',
          path: '/:id',
          handlerKey: 'getById',
          useAuthentication: false,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'Get user',
            tags: ['Users'],
            parameters: [
              {
                name: 'id',
                in: 'path',
                description: 'User ID',
                schema: { type: 'string', format: 'uuid' },
              },
            ],
            responses: { 200: { description: 'Success' } },
          },
        },
      ];

      ControllerRegistry.register('/users', 'UsersController', routes);

      const builder = new OpenAPIBuilder(defaultConfig);
      const spec = builder.build();

      const operation = spec.paths['/users/{id}'].get as Record<
        string,
        unknown
      >;
      const params = operation.parameters as Array<{ name: string }>;
      // Should only have one 'id' parameter, not duplicated
      const idParams = params.filter((p) => p.name === 'id');
      expect(idParams).toHaveLength(1);
    });
  });

  describe('request body building', () => {
    it('should build request body with schema reference', () => {
      const routes: RouteConfig<Record<string, unknown>, string>[] = [
        {
          method: 'post',
          path: '/',
          handlerKey: 'create',
          useAuthentication: false,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'Create user',
            tags: ['Users'],
            requestBody: {
              schema: 'CreateUserRequest',
            },
            responses: { 201: { description: 'Created' } },
          },
        },
      ];

      ControllerRegistry.register('/users', 'UsersController', routes);

      const builder = new OpenAPIBuilder(defaultConfig);
      const spec = builder.build();

      const operation = spec.paths['/users'].post as Record<string, unknown>;
      const requestBody = operation.requestBody as Record<string, unknown>;
      expect(requestBody.required).toBe(true);
      const content = requestBody.content as Record<
        string,
        Record<string, unknown>
      >;
      expect(content['application/json'].schema).toEqual({
        $ref: '#/components/schemas/CreateUserRequest',
      });
    });

    it('should include request body example', () => {
      const routes: RouteConfig<Record<string, unknown>, string>[] = [
        {
          method: 'post',
          path: '/',
          handlerKey: 'create',
          useAuthentication: false,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'Create user',
            tags: ['Users'],
            requestBody: {
              schema: 'CreateUserRequest',
              example: { name: 'John', email: 'john@example.com' },
            },
            responses: { 201: { description: 'Created' } },
          },
        },
      ];

      ControllerRegistry.register('/users', 'UsersController', routes);

      const builder = new OpenAPIBuilder(defaultConfig);
      const spec = builder.build();

      const operation = spec.paths['/users'].post as Record<string, unknown>;
      const requestBody = operation.requestBody as Record<string, unknown>;
      const content = requestBody.content as Record<
        string,
        Record<string, unknown>
      >;
      expect(content['application/json'].example).toEqual({
        name: 'John',
        email: 'john@example.com',
      });
    });
  });

  describe('response building', () => {
    it('should build responses with schema references', () => {
      const routes: RouteConfig<Record<string, unknown>, string>[] = [
        {
          method: 'get',
          path: '/:id',
          handlerKey: 'getById',
          useAuthentication: false,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'Get user',
            tags: ['Users'],
            responses: {
              200: { schema: 'User', description: 'User found' },
              404: { schema: 'Error', description: 'Not found' },
            },
          },
        },
      ];

      ControllerRegistry.register('/users', 'UsersController', routes);

      const builder = new OpenAPIBuilder(defaultConfig);
      const spec = builder.build();

      const operation = spec.paths['/users/{id}'].get as Record<
        string,
        unknown
      >;
      const responses = operation.responses as Record<
        string,
        Record<string, unknown>
      >;
      const content200 = responses['200'].content as Record<
        string,
        Record<string, unknown>
      >;
      const content404 = responses['404'].content as Record<
        string,
        Record<string, unknown>
      >;
      expect(content200['application/json'].schema).toEqual({
        $ref: '#/components/schemas/User',
      });
      expect(content404['application/json'].schema).toEqual({
        $ref: '#/components/schemas/Error',
      });
    });

    it('should handle responses without schema', () => {
      const routes: RouteConfig<Record<string, unknown>, string>[] = [
        {
          method: 'delete',
          path: '/:id',
          handlerKey: 'delete',
          useAuthentication: false,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'Delete user',
            tags: ['Users'],
            responses: {
              204: { description: 'No content' },
            },
          },
        },
      ];

      ControllerRegistry.register('/users', 'UsersController', routes);

      const builder = new OpenAPIBuilder(defaultConfig);
      const spec = builder.build();

      const operation = spec.paths['/users/{id}'].delete as Record<
        string,
        unknown
      >;
      const responses = operation.responses as Record<
        string,
        Record<string, unknown>
      >;
      const response = responses['204'];
      expect(response.description).toBe('No content');
      expect(response.content).toBeUndefined();
    });
  });

  describe('components', () => {
    it('should include registered schemas in components', () => {
      OpenAPISchemaRegistry.registerSchema('User', {
        type: 'object',
        properties: { id: { type: 'string' } },
      });

      const builder = new OpenAPIBuilder(defaultConfig);
      const spec = builder.build();

      expect(spec.components.schemas['User']).toBeDefined();
    });

    it('should include registered security schemes in components', () => {
      OpenAPISchemaRegistry.registerSecurityScheme('bearerAuth', {
        type: 'http',
        scheme: 'bearer',
      });

      const builder = new OpenAPIBuilder(defaultConfig);
      const spec = builder.build();

      expect(spec.components.securitySchemes['bearerAuth']).toBeDefined();
    });
  });

  describe('getConfig', () => {
    it('should return the current configuration', () => {
      const builder = new OpenAPIBuilder(defaultConfig);
      const config = builder.getConfig();

      expect(config.title).toBe('Test API');
      expect(config.version).toBe('1.0.0');
    });

    it('should return a copy of the configuration', () => {
      const builder = new OpenAPIBuilder(defaultConfig);
      const config = builder.getConfig();
      config.title = 'Modified';

      expect(builder.getConfig().title).toBe('Test API');
    });
  });

  describe('updateConfig', () => {
    it('should update the configuration', () => {
      const builder = new OpenAPIBuilder(defaultConfig);
      builder.updateConfig({ title: 'Updated API' });

      const spec = builder.build();
      expect(spec.info.title).toBe('Updated API');
    });

    it('should merge with existing configuration', () => {
      const builder = new OpenAPIBuilder(defaultConfig);
      builder.updateConfig({ version: '2.0.0' });

      const spec = builder.build();
      expect(spec.info.title).toBe('Test API');
      expect(spec.info.version).toBe('2.0.0');
    });
  });
});
