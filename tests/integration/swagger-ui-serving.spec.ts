/**
 * @fileoverview Integration tests for Swagger UI serving with OpenAPI infrastructure.
 * Tests the complete flow of serving Swagger UI with dynamically built OpenAPI specs.
 */

import express, { Express } from 'express';
import request from 'supertest';
import { SwaggerUIMiddleware } from '../../src/openapi/middleware/swagger-ui';
import { OpenAPIController } from '../../src/openapi/controller';
import { OpenAPIBuilder } from '../../src/openapi/builder';
import { ControllerRegistry } from '../../src/registry/controller-registry';
import { OpenAPISchemaRegistry } from '../../src/openapi/schemas';
import { IApplication } from '../../src/interfaces/application';

// Mock application
const createMockApplication = (): IApplication<Buffer> => {
  return {
    environment: {
      mongo: { useTransactions: false },
    },
  } as unknown as IApplication<Buffer>;
};

describe('Swagger UI Integration', () => {
  let app: Express;
  let mockApplication: IApplication<Buffer>;

  beforeEach(() => {
    ControllerRegistry.clear();
    OpenAPISchemaRegistry.clear();
    mockApplication = createMockApplication();
    app = express();
  });

  describe('with OpenAPIController', () => {
    it('should serve Swagger UI with spec from OpenAPIController', async () => {
      // Register a controller
      ControllerRegistry.register('/users', 'UsersController', [
        {
          method: 'get',
          path: '/',
          handlerKey: 'list',
          useAuthentication: false,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'List all users',
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
            summary: 'Create a user',
            tags: ['Users'],
            requestBody: {
              schema: 'CreateUserRequest',
              required: true,
            },
            responses: {
              201: { description: 'Created' },
              400: { description: 'Bad Request' },
            },
          },
        },
      ]);

      // Register a schema
      OpenAPISchemaRegistry.registerSchema('CreateUserRequest', {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
        },
        required: ['name', 'email'],
      });

      // Create OpenAPI controller
      const openApiController = new OpenAPIController(mockApplication, {
        title: 'User Management API',
        version: '1.0.0',
        description: 'API for managing users',
        servers: [{ url: '/api', description: 'API Server' }],
      });

      // Mount Swagger UI with spec from controller
      app.use(
        '/docs',
        SwaggerUIMiddleware(() => openApiController.getSpecification(), {
          title: 'User Management API Docs',
          swaggerOptions: {
            docExpansion: 'list',
            filter: true,
          },
        }),
      );

      // Mount OpenAPI spec endpoint
      app.use('/openapi', openApiController.router);

      // Test Swagger UI is served
      const docsResponse = await request(app)
        .get('/docs/')
        .expect(200)
        .expect('Content-Type', /html/);

      expect(docsResponse.text).toContain('User Management API');
      expect(docsResponse.text).toContain('swagger-ui');
      expect(docsResponse.text).toContain('docExpansion: "list"');
      expect(docsResponse.text).toContain('filter: true');

      // Verify the spec contains our registered controller
      expect(docsResponse.text).toContain('/users');
      expect(docsResponse.text).toContain('List all users');

      // Test OpenAPI spec endpoint still works
      const specResponse = await request(app).get('/openapi/raw').expect(200);

      expect(specResponse.body.paths['/users']).toBeDefined();
      expect(specResponse.body.paths['/users'].get.summary).toBe(
        'List all users',
      );
      expect(
        specResponse.body.components.schemas['CreateUserRequest'],
      ).toBeDefined();
    });

    it('should reflect dynamic spec changes when using provider function', async () => {
      const openApiController = new OpenAPIController(
        mockApplication,
        {
          title: 'Dynamic API',
          version: '1.0.0',
          description: 'API with dynamic routes',
        },
        { cacheSpec: false },
      );

      // Mount Swagger UI with dynamic spec provider
      app.use(
        '/docs',
        SwaggerUIMiddleware(() => openApiController.getSpecification()),
      );

      // Initial request - no routes
      const response1 = await request(app).get('/docs/').expect(200);
      expect(response1.text).not.toContain('/products');

      // Register a new controller
      ControllerRegistry.register('/products', 'ProductsController', [
        {
          method: 'get',
          path: '/',
          handlerKey: 'list',
          useAuthentication: false,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'List products',
            tags: ['Products'],
            responses: { 200: { description: 'Success' } },
          },
        },
      ]);

      // Second request should include the new route
      const response2 = await request(app).get('/docs/').expect(200);
      expect(response2.text).toContain('/products');
      expect(response2.text).toContain('List products');
    });
  });

  describe('with OpenAPIBuilder directly', () => {
    it('should serve Swagger UI with spec from OpenAPIBuilder', async () => {
      // Register controllers
      ControllerRegistry.register('/orders', 'OrdersController', [
        {
          method: 'get',
          path: '/:orderId',
          handlerKey: 'getById',
          useAuthentication: true,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'Get order by ID',
            tags: ['Orders'],
            parameters: [
              {
                name: 'orderId',
                in: 'path',
                required: true,
                schema: { type: 'string' },
                description: 'Order ID',
              },
            ],
            responses: {
              200: { description: 'Order found', schema: 'Order' },
              404: { description: 'Order not found' },
            },
          },
        },
      ]);

      // Create builder
      const builder = new OpenAPIBuilder({
        title: 'Order Service',
        version: '2.0.0',
        description: 'Order management service',
        externalDocs: {
          description: 'Full documentation',
          url: 'https://docs.example.com',
        },
        tags: [{ name: 'Orders', description: 'Order management endpoints' }],
      });

      // Mount Swagger UI
      app.use(
        '/swagger',
        SwaggerUIMiddleware(() => builder.build(), {
          title: 'Order Service Documentation',
          showTopBar: false,
          swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
          },
        }),
      );

      const response = await request(app)
        .get('/swagger/')
        .expect(200)
        .expect('Content-Type', /html/);

      expect(response.text).toContain('Order Service');
      expect(response.text).toContain('/orders/{orderId}');
      expect(response.text).toContain('Get order by ID');
      expect(response.text).toContain('.topbar { display: none; }');
      expect(response.text).toContain('persistAuthorization: true');
      expect(response.text).toContain('displayRequestDuration: true');
    });
  });

  describe('multiple Swagger UI instances', () => {
    it('should support multiple Swagger UI instances with different specs', async () => {
      // Register controllers for different APIs
      ControllerRegistry.register('/v1/users', 'V1UsersController', [
        {
          method: 'get',
          path: '/',
          handlerKey: 'list',
          useAuthentication: false,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'List users (v1)',
            tags: ['V1-Users'],
            responses: { 200: { description: 'Success' } },
          },
        },
      ]);

      ControllerRegistry.register('/v2/users', 'V2UsersController', [
        {
          method: 'get',
          path: '/',
          handlerKey: 'list',
          useAuthentication: false,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'List users (v2)',
            tags: ['V2-Users'],
            responses: { 200: { description: 'Success' } },
          },
        },
      ]);

      // Create separate builders for each API version
      const v1Builder = new OpenAPIBuilder({
        title: 'API v1',
        version: '1.0.0',
        description: 'Legacy API',
      });

      const v2Builder = new OpenAPIBuilder({
        title: 'API v2',
        version: '2.0.0',
        description: 'Current API',
      });

      // Mount separate Swagger UI instances
      app.use(
        '/docs/v1',
        SwaggerUIMiddleware(() => {
          const spec = v1Builder.build();
          // Filter to only v1 paths
          spec.paths = Object.fromEntries(
            Object.entries(spec.paths).filter(([path]) =>
              path.startsWith('/v1'),
            ),
          );
          return spec;
        }),
      );

      app.use(
        '/docs/v2',
        SwaggerUIMiddleware(() => {
          const spec = v2Builder.build();
          // Filter to only v2 paths
          spec.paths = Object.fromEntries(
            Object.entries(spec.paths).filter(([path]) =>
              path.startsWith('/v2'),
            ),
          );
          return spec;
        }),
      );

      // Test v1 docs
      const v1Response = await request(app).get('/docs/v1/').expect(200);
      expect(v1Response.text).toContain('API v1');
      expect(v1Response.text).toContain('/v1/users');
      expect(v1Response.text).not.toContain('/v2/users');

      // Test v2 docs
      const v2Response = await request(app).get('/docs/v2/').expect(200);
      expect(v2Response.text).toContain('API v2');
      expect(v2Response.text).toContain('/v2/users');
      expect(v2Response.text).not.toContain('/v1/users');
    });
  });

  describe('with security schemes', () => {
    it('should include security schemes in Swagger UI', async () => {
      // Register security schemes
      OpenAPISchemaRegistry.registerSecurityScheme('bearerAuth', {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      });

      OpenAPISchemaRegistry.registerSecurityScheme('apiKey', {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
      });

      // Register a protected route
      ControllerRegistry.register('/protected', 'ProtectedController', [
        {
          method: 'get',
          path: '/resource',
          handlerKey: 'getResource',
          useAuthentication: true,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'Get protected resource',
            tags: ['Protected'],
            responses: { 200: { description: 'Success' } },
          },
        },
      ]);

      const builder = new OpenAPIBuilder({
        title: 'Secure API',
        version: '1.0.0',
        description: 'API with security',
      });

      app.use(
        '/docs',
        SwaggerUIMiddleware(() => builder.build()),
      );

      const response = await request(app).get('/docs/').expect(200);

      // The spec should include security schemes
      expect(response.text).toContain('bearerAuth');
      expect(response.text).toContain('apiKey');
    });
  });
});
