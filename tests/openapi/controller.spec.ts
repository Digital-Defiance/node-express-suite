/**
 * @fileoverview Unit tests for OpenAPIController
 */

import express, { Express } from 'express';
import request from 'supertest';
import { OpenAPIController } from '../../src/openapi/controller';
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

describe('OpenAPIController', () => {
  let app: Express;
  let mockApplication: IApplication<Buffer>;

  beforeEach(() => {
    ControllerRegistry.clear();
    OpenAPISchemaRegistry.clear();
    mockApplication = createMockApplication();
    app = express();
  });

  describe('GET /', () => {
    it('should return OpenAPI specification', async () => {
      const controller = new OpenAPIController(mockApplication, {
        title: 'Test API',
        version: '1.0.0',
        description: 'Test description',
      });

      app.use('/openapi', controller.router);

      const response = await request(app).get('/openapi').expect(200);

      expect(response.body.message).toBe('OpenAPI specification');
      expect(response.body.openapi).toBe('3.0.3');
      expect(response.body.info.title).toBe('Test API');
      expect(response.body.info.version).toBe('1.0.0');
      expect(response.body.info.description).toBe('Test description');
    });

    it('should include registered controller paths', async () => {
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

      const controller = new OpenAPIController(mockApplication, {
        title: 'Test API',
        version: '1.0.0',
        description: 'Test',
      });

      app.use('/openapi', controller.router);

      const response = await request(app).get('/openapi').expect(200);

      expect(response.body.paths['/users']).toBeDefined();
      expect(response.body.paths['/users'].get.summary).toBe('List users');
    });

    it('should include registered schemas', async () => {
      OpenAPISchemaRegistry.registerSchema('User', {
        type: 'object',
        properties: { id: { type: 'string' } },
      });

      const controller = new OpenAPIController(mockApplication, {
        title: 'Test API',
        version: '1.0.0',
        description: 'Test',
      });

      app.use('/openapi', controller.router);

      const response = await request(app).get('/openapi').expect(200);

      expect(response.body.components.schemas['User']).toBeDefined();
    });
  });

  describe('GET /json', () => {
    it('should return same spec as GET /', async () => {
      const controller = new OpenAPIController(mockApplication, {
        title: 'Test API',
        version: '1.0.0',
        description: 'Test',
      });

      app.use('/openapi', controller.router);

      const response1 = await request(app).get('/openapi').expect(200);
      const response2 = await request(app).get('/openapi/json').expect(200);

      expect(response1.body).toEqual(response2.body);
    });
  });

  describe('GET /raw', () => {
    it('should return raw spec without wrapper', async () => {
      const controller = new OpenAPIController(mockApplication, {
        title: 'Test API',
        version: '1.0.0',
        description: 'Test',
      });

      app.use('/openapi', controller.router);

      const response = await request(app).get('/openapi/raw').expect(200);

      // Raw spec should not have 'message' wrapper
      expect(response.body.message).toBeUndefined();
      expect(response.body.openapi).toBe('3.0.3');
      expect(response.body.info.title).toBe('Test API');
    });
  });

  describe('GET /yaml', () => {
    it('should return YAML format when enabled', async () => {
      const controller = new OpenAPIController(
        mockApplication,
        {
          title: 'Test API',
          version: '1.0.0',
          description: 'Test',
        },
        { enableYaml: true },
      );

      app.use('/openapi', controller.router);

      const response = await request(app)
        .get('/openapi/yaml')
        .expect(200)
        .expect('Content-Type', /text\/yaml/);

      // YAML output quotes strings that look like version numbers
      expect(response.text).toContain('openapi:');
      expect(response.text).toContain('3.0.3');
      expect(response.text).toContain('title: Test API');
    });

    it('should return 404 when YAML is not enabled', async () => {
      const controller = new OpenAPIController(
        mockApplication,
        {
          title: 'Test API',
          version: '1.0.0',
          description: 'Test',
        },
        { enableYaml: false },
      );

      app.use('/openapi', controller.router);

      await request(app).get('/openapi/yaml').expect(404);
    });
  });

  describe('tag filtering', () => {
    beforeEach(() => {
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
    });

    it('should filter paths by tags query parameter', async () => {
      const controller = new OpenAPIController(mockApplication, {
        title: 'Test API',
        version: '1.0.0',
        description: 'Test',
      });

      app.use('/openapi', controller.router);

      const response = await request(app)
        .get('/openapi?tags=Users')
        .expect(200);

      expect(response.body.paths['/users']).toBeDefined();
      expect(response.body.paths['/posts']).toBeUndefined();
    });

    it('should filter by multiple tags', async () => {
      const controller = new OpenAPIController(mockApplication, {
        title: 'Test API',
        version: '1.0.0',
        description: 'Test',
      });

      app.use('/openapi', controller.router);

      const response = await request(app)
        .get('/openapi?tags=Users,Posts')
        .expect(200);

      expect(response.body.paths['/users']).toBeDefined();
      expect(response.body.paths['/posts']).toBeDefined();
    });

    it('should be case-insensitive for tag filtering', async () => {
      const controller = new OpenAPIController(mockApplication, {
        title: 'Test API',
        version: '1.0.0',
        description: 'Test',
      });

      app.use('/openapi', controller.router);

      const response = await request(app)
        .get('/openapi?tags=users')
        .expect(200);

      expect(response.body.paths['/users']).toBeDefined();
    });

    it('should disable tag filtering when option is false', async () => {
      const controller = new OpenAPIController(
        mockApplication,
        {
          title: 'Test API',
          version: '1.0.0',
          description: 'Test',
        },
        { enableTagFiltering: false },
      );

      app.use('/openapi', controller.router);

      const response = await request(app)
        .get('/openapi?tags=Users')
        .expect(200);

      // Should return all paths regardless of tags param
      expect(response.body.paths['/users']).toBeDefined();
      expect(response.body.paths['/posts']).toBeDefined();
    });
  });

  describe('caching', () => {
    it('should cache spec when cacheSpec is true', async () => {
      const controller = new OpenAPIController(
        mockApplication,
        {
          title: 'Test API',
          version: '1.0.0',
          description: 'Test',
        },
        { cacheSpec: true },
      );

      app.use('/openapi', controller.router);

      // First request
      await request(app).get('/openapi').expect(200);

      // Register a new controller after first request
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

      // Second request should return cached spec (without /posts)
      const response = await request(app).get('/openapi').expect(200);

      // The new controller should NOT be in the cached response
      expect(response.body.paths['/posts']).toBeUndefined();
    });

    it('should not cache spec when cacheSpec is false', async () => {
      const controller = new OpenAPIController(
        mockApplication,
        {
          title: 'Test API',
          version: '1.0.0',
          description: 'Test',
        },
        { cacheSpec: false },
      );

      app.use('/openapi', controller.router);

      // First request
      await request(app).get('/openapi').expect(200);

      // Register a new controller after first request
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

      // Second request should include the new controller
      const response = await request(app).get('/openapi').expect(200);

      expect(response.body.paths['/posts']).toBeDefined();
    });

    it('should clear cache when clearCache is called', async () => {
      const controller = new OpenAPIController(
        mockApplication,
        {
          title: 'Test API',
          version: '1.0.0',
          description: 'Test',
        },
        { cacheSpec: true },
      );

      app.use('/openapi', controller.router);

      // First request to populate cache
      await request(app).get('/openapi').expect(200);

      // Register a new controller
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

      // Clear cache
      controller.clearCache();

      // Next request should include the new controller
      const response = await request(app).get('/openapi').expect(200);

      expect(response.body.paths['/posts']).toBeDefined();
    });
  });

  describe('getSpecification', () => {
    it('should return the spec programmatically', () => {
      const controller = new OpenAPIController(mockApplication, {
        title: 'Test API',
        version: '1.0.0',
        description: 'Test',
      });

      const spec = controller.getSpecification();

      expect(spec.openapi).toBe('3.0.3');
      expect(spec.info.title).toBe('Test API');
    });
  });

  describe('getSpecificationByTags', () => {
    it('should return filtered spec by tags', () => {
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

      const controller = new OpenAPIController(mockApplication, {
        title: 'Test API',
        version: '1.0.0',
        description: 'Test',
      });

      const spec = controller.getSpecificationByTags(['Users']);

      expect(spec.paths['/users']).toBeDefined();
      expect(spec.paths['/posts']).toBeUndefined();
    });
  });

  describe('custom servers', () => {
    it('should use custom servers in spec', async () => {
      const controller = new OpenAPIController(mockApplication, {
        title: 'Test API',
        version: '1.0.0',
        description: 'Test',
        servers: [
          { url: 'https://api.example.com', description: 'Production' },
        ],
      });

      app.use('/openapi', controller.router);

      const response = await request(app).get('/openapi').expect(200);

      expect(response.body.servers).toHaveLength(1);
      expect(response.body.servers[0].url).toBe('https://api.example.com');
    });
  });

  describe('external docs', () => {
    it('should include external docs in spec', async () => {
      const controller = new OpenAPIController(mockApplication, {
        title: 'Test API',
        version: '1.0.0',
        description: 'Test',
        externalDocs: {
          description: 'Full documentation',
          url: 'https://docs.example.com',
        },
      });

      app.use('/openapi', controller.router);

      const response = await request(app).get('/openapi').expect(200);

      expect(response.body.externalDocs).toBeDefined();
      expect(response.body.externalDocs.url).toBe('https://docs.example.com');
    });
  });

  describe('application access', () => {
    it('should provide access to application instance', () => {
      const controller = new OpenAPIController(mockApplication, {
        title: 'Test API',
        version: '1.0.0',
        description: 'Test',
      });

      expect(controller.application).toBe(mockApplication);
    });
  });

  describe('builder access', () => {
    it('should provide access to builder instance', () => {
      const controller = new OpenAPIController(mockApplication, {
        title: 'Test API',
        version: '1.0.0',
        description: 'Test',
      });

      const builder = controller.getBuilder();
      expect(builder).toBeDefined();
      expect(builder.getConfig().title).toBe('Test API');
    });
  });
});
