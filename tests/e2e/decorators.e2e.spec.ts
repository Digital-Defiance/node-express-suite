/**
 * @fileoverview End-to-end tests for decorator-based controllers.
 * Tests actual HTTP requests to decorated endpoints, Swagger UI serving,
 * and OpenAPI spec endpoint functionality.
 */

import 'reflect-metadata';
import express, { Express, Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { z } from 'zod';

// Controller and HTTP method decorators
import { ApiController } from '../../src/decorators/controller';
import { Get, Post, Put, Delete } from '../../src/decorators/http-methods';

// Auth decorators
import { RequireAuth, Public } from '../../src/decorators/auth';

// Validation decorators
import {
  ValidateBody,
  ValidateParams,
  ValidateQuery,
} from '../../src/decorators/validation';

// Response decorators
import { Returns, Paginated, RawJson } from '../../src/decorators/response';

// Middleware decorators
import { UseMiddleware } from '../../src/decorators/middleware';

// Parameter injection decorators
import {
  Param,
  Body,
  Query,
  Header,
  Req,
  Res,
} from '../../src/decorators/params';

// OpenAPI decorators
import {
  ApiSummary,
  ApiDescription,
  ApiTags,
  Deprecated,
} from '../../src/decorators/openapi';
import { ApiParam, ApiQuery } from '../../src/decorators/openapi-params';

// Schema decorators
import { ApiSchema, ApiProperty } from '../../src/decorators/schema';

// Metadata keys
import {
  ROUTES_METADATA,
  PARAMS_METADATA,
} from '../../src/decorators/metadata-keys';
import { ParamMetadata } from '../../src/interfaces/openApi/decoratorOptions';

// OpenAPI infrastructure
import { OpenAPIBuilder } from '../../src/openapi/builder';
import { OpenAPIController } from '../../src/openapi/controller';
import { OpenAPISchemaRegistry } from '../../src/openapi/schemas';
import { ControllerRegistry } from '../../src/registry/controller-registry';
import { SwaggerUIMiddleware } from '../../src/openapi/middleware/swagger-ui';
import { ReDocMiddleware } from '../../src/openapi/middleware/redoc';
import { IApplication } from '../../src/interfaces/application';

// Mock application for OpenAPI controller
const createMockApplication = (): IApplication<Buffer> => {
  return {
    environment: {
      mongo: { useTransactions: false },
    },
  } as IApplication<Buffer>;
};

// Zod schemas for validation
const CreateItemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  price: z.number().positive(),
});

const IdParamSchema = z.object({
  id: z.string().uuid(),
});

const SearchQuerySchema = z.object({
  q: z.string().min(1).optional(),
  category: z.string().optional(),
});

// Define schema classes for OpenAPI
@ApiSchema({ description: 'Item entity' })
class ItemDto {
  @ApiProperty({ type: 'string', required: true, description: 'Item ID' })
  id!: string;

  @ApiProperty({ type: 'string', required: true, description: 'Item name' })
  name!: string;

  @ApiProperty({ type: 'string', description: 'Item description' })
  description?: string;

  @ApiProperty({ type: 'number', required: true, description: 'Item price' })
  price!: number;
}

@ApiSchema({ description: 'Error response' })
class ErrorResponseDto {
  @ApiProperty({ type: 'string', required: true })
  code!: string;

  @ApiProperty({ type: 'string', required: true })
  message!: string;
}

// In-memory data store for testing
interface Item {
  id: string;
  name: string;
  description?: string;
  price: number;
}

let itemStore: Map<string, Item>;

// Simple UUID generator for testing
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Middleware for tracking
let middlewareLog: string[];

const loggingMiddleware = (
  _req: Request,
  _res: Response,
  next: NextFunction,
) => {
  middlewareLog.push('logging');
  next();
};

const authCheckMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  middlewareLog.push('authCheck');
  const authHeader = req.headers.authorization;
  if (authHeader === 'Bearer valid-token') {
    (req as Request & { user: { id: string } }).user = { id: 'user-123' };
  }
  next();
};

// Define the test controller with decorators
@UseMiddleware(loggingMiddleware)
@ApiTags('Items')
@ApiController('/api/items', {
  tags: ['Items'],
  description: 'Item management endpoints',
})
class ItemController {
  @Public()
  @Paginated({ defaultPageSize: 10, maxPageSize: 50 })
  @ValidateQuery(SearchQuerySchema)
  @Returns(200, 'ItemList', { description: 'List of items' })
  @ApiSummary('List all items')
  @ApiDescription('Returns a paginated list of items with optional filtering')
  @ApiQuery('q', { description: 'Search query', schema: { type: 'string' } })
  @Get('/')
  listItems(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    let items = Array.from(itemStore.values());

    if (q) {
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q.toLowerCase()) ||
          (item.description &&
            item.description.toLowerCase().includes(q.toLowerCase())),
      );
    }

    if (category) {
      items = items.filter((item) => item.name.startsWith(category));
    }

    const pageNum = page ?? 1;
    const limitNum = limit ?? 10;
    const start = (pageNum - 1) * limitNum;
    const paginatedItems = items.slice(start, start + limitNum);

    return {
      items: paginatedItems,
      total: items.length,
      page: pageNum,
      pageSize: limitNum,
    };
  }

  @Public()
  @ValidateParams(IdParamSchema)
  @Returns(200, 'Item', { description: 'Item details' })
  @Returns(404, 'ErrorResponse', { description: 'Item not found' })
  @ApiSummary('Get item by ID')
  @ApiParam('id', {
    description: 'Item UUID',
    schema: { type: 'string', format: 'uuid' },
  })
  @Get('/:id')
  getItem(@Param('id') id: string, @Res() res: Response) {
    const item = itemStore.get(id);
    if (!item) {
      return res
        .status(404)
        .json({ code: 'NOT_FOUND', message: 'Item not found' });
    }
    return res.json(item);
  }

  @UseMiddleware(authCheckMiddleware)
  @RequireAuth()
  @ValidateBody(CreateItemSchema)
  @Returns(201, 'Item', { description: 'Created item' })
  @Returns(400, 'ErrorResponse', { description: 'Validation failed' })
  @ApiSummary('Create a new item')
  @Post('/')
  createItem(
    @Body() data: z.infer<typeof CreateItemSchema>,
    @Header('x-request-id') requestId: string | undefined,
    @Res() res: Response,
  ) {
    const id = generateUUID();
    const item: Item = { id, ...data };
    itemStore.set(id, item);

    const response = res.status(201);
    if (requestId) {
      response.setHeader('x-request-id', requestId);
    }
    return response.json(item);
  }

  @UseMiddleware(authCheckMiddleware)
  @RequireAuth()
  @Returns(204, undefined, { description: 'Item deleted' })
  @Returns(404, 'ErrorResponse', { description: 'Item not found' })
  @ApiSummary('Delete an item')
  @Deprecated()
  @Delete('/:id')
  deleteItem(@Param('id') id: string, @Res() res: Response) {
    const item = itemStore.get(id);
    if (!item) {
      return res
        .status(404)
        .json({ code: 'NOT_FOUND', message: 'Item not found' });
    }
    itemStore.delete(id);
    return res.status(204).send();
  }

  @Public()
  @RawJson()
  @Returns(200, 'RawData')
  @ApiSummary('Get raw data')
  @Get('/raw/data')
  getRawData(@Req() req: Request, @Res() res: Response) {
    return res.json({
      raw: true,
      path: req.path,
      timestamp: Date.now(),
    });
  }
}

/**
 * Helper function to create an Express app with the decorated controller routes.
 * This simulates how DecoratorBaseController would register routes.
 */
function createTestApp(): Express {
  const app = express();
  app.use(express.json());

  const routes = Reflect.getMetadata(ROUTES_METADATA, ItemController) || [];
  const controller = new ItemController();

  for (const route of routes) {
    const { method, path, handlerName } = route;
    const fullPath = `/api/items${path}`;

    const handler = (
      controller as Record<string, (...args: unknown[]) => unknown>
    )[handlerName];
    if (!handler) continue;

    const wrappedHandler = async (
      req: Request,
      res: Response,
      next: NextFunction,
    ) => {
      try {
        const paramMetadata =
          (Reflect.getMetadata(
            PARAMS_METADATA,
            ItemController,
            handlerName,
          ) as ParamMetadata[]) || [];
        const args: unknown[] = [];

        for (const param of paramMetadata) {
          switch (param.type) {
            case 'param':
              args[param.index] = req.params[param.name];
              break;
            case 'body':
              args[param.index] = param.name ? req.body[param.name] : req.body;
              break;
            case 'query':
              args[param.index] = req.query[param.name];
              break;
            case 'header':
              args[param.index] = req.headers[param.name.toLowerCase()];
              break;
            case 'req':
              args[param.index] = req;
              break;
            case 'res':
              args[param.index] = res;
              break;
          }
        }

        const result = await handler.apply(controller, args);
        if (result !== undefined && !res.headersSent) {
          res.json(result);
        }
      } catch (error) {
        next(error);
      }
    };

    const middlewares: express.RequestHandler[] = [loggingMiddleware];
    if (['createItem', 'deleteItem'].includes(handlerName)) {
      middlewares.push(authCheckMiddleware);
    }

    (app as Record<string, (...args: unknown[]) => unknown>)[method](
      fullPath,
      ...middlewares,
      wrappedHandler,
    );
  }

  return app;
}

describe('Decorator E2E Tests', () => {
  let app: Express;
  let mockApplication: IApplication<Buffer>;

  beforeEach(() => {
    ControllerRegistry.clear();
    OpenAPISchemaRegistry.clear();
    itemStore = new Map();
    middlewareLog = [];
    app = createTestApp();
    mockApplication = createMockApplication();
  });

  describe('HTTP Requests to Decorated Endpoints', () => {
    describe('GET /api/items - List items', () => {
      beforeEach(() => {
        itemStore.set('item-1', {
          id: 'item-1',
          name: 'Widget A',
          description: 'A widget',
          price: 10.99,
        });
        itemStore.set('item-2', {
          id: 'item-2',
          name: 'Widget B',
          description: 'Another widget',
          price: 20.99,
        });
        itemStore.set('item-3', {
          id: 'item-3',
          name: 'Gadget C',
          description: 'A gadget',
          price: 30.99,
        });
      });

      it('should return paginated list of items', async () => {
        const response = await request(app).get('/api/items').expect(200);

        expect(response.body).toHaveProperty('items');
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('page');
        expect(response.body).toHaveProperty('pageSize');
        expect(response.body.items).toHaveLength(3);
        expect(response.body.total).toBe(3);
      });

      it('should execute middleware', async () => {
        await request(app).get('/api/items').expect(200);
        expect(middlewareLog).toContain('logging');
      });
    });

    describe('GET /api/items/:id - Get item by ID', () => {
      const testItemId = '123e4567-e89b-12d3-a456-426614174000';

      beforeEach(() => {
        itemStore.set(testItemId, {
          id: testItemId,
          name: 'Test Item',
          description: 'A test item',
          price: 99.99,
        });
      });

      it('should return item when found', async () => {
        const response = await request(app)
          .get(`/api/items/${testItemId}`)
          .expect(200);

        expect(response.body.id).toBe(testItemId);
        expect(response.body.name).toBe('Test Item');
        expect(response.body.price).toBe(99.99);
      });

      it('should return 404 when item not found', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';
        const response = await request(app)
          .get(`/api/items/${nonExistentId}`)
          .expect(404);

        expect(response.body.code).toBe('NOT_FOUND');
        expect(response.body.message).toBe('Item not found');
      });
    });

    describe('POST /api/items - Create item', () => {
      const validItem = {
        name: 'New Item',
        description: 'A brand new item',
        price: 49.99,
      };

      it('should create item with valid data and auth', async () => {
        const response = await request(app)
          .post('/api/items')
          .set('Authorization', 'Bearer valid-token')
          .send(validItem)
          .expect(201);

        expect(response.body.name).toBe(validItem.name);
        expect(response.body.description).toBe(validItem.description);
        expect(response.body.price).toBe(validItem.price);
        expect(response.body.id).toBeDefined();
        expect(itemStore.has(response.body.id)).toBe(true);
      });

      it('should include request ID header when provided', async () => {
        const requestId = 'req-12345';
        const response = await request(app)
          .post('/api/items')
          .set('Authorization', 'Bearer valid-token')
          .set('x-request-id', requestId)
          .send(validItem)
          .expect(201);

        expect(response.headers['x-request-id']).toBe(requestId);
      });

      it('should execute auth middleware', async () => {
        await request(app)
          .post('/api/items')
          .set('Authorization', 'Bearer valid-token')
          .send(validItem)
          .expect(201);

        expect(middlewareLog).toContain('logging');
        expect(middlewareLog).toContain('authCheck');
      });
    });

    describe('DELETE /api/items/:id - Delete item', () => {
      const testItemId = '123e4567-e89b-12d3-a456-426614174000';

      beforeEach(() => {
        itemStore.set(testItemId, {
          id: testItemId,
          name: 'Item to Delete',
          price: 25.0,
        });
      });

      it('should delete item and return 204', async () => {
        await request(app)
          .delete(`/api/items/${testItemId}`)
          .set('Authorization', 'Bearer valid-token')
          .expect(204);

        expect(itemStore.has(testItemId)).toBe(false);
      });

      it('should return 404 when deleting non-existent item', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';

        const response = await request(app)
          .delete(`/api/items/${nonExistentId}`)
          .set('Authorization', 'Bearer valid-token')
          .expect(404);

        expect(response.body.code).toBe('NOT_FOUND');
      });
    });

    describe('GET /api/items/raw/data - Raw JSON endpoint', () => {
      it('should return raw JSON data', async () => {
        const response = await request(app)
          .get('/api/items/raw/data')
          .expect(200);

        expect(response.body.raw).toBe(true);
        expect(response.body.path).toBe('/api/items/raw/data');
        expect(response.body.timestamp).toBeDefined();
      });
    });
  });

  describe('Swagger UI Serving', () => {
    let swaggerApp: Express;

    beforeEach(() => {
      swaggerApp = express();

      const routes = Reflect.getMetadata(ROUTES_METADATA, ItemController) || [];
      ControllerRegistry.register(
        '/api/items',
        'ItemController',
        routes.map(
          (route: { method: string; path: string; handlerName: string }) => ({
            method: route.method,
            path: route.path,
            handlerKey: route.handlerName,
            useAuthentication: ['createItem', 'deleteItem'].includes(
              route.handlerName,
            ),
            useCryptoAuthentication: false,
            openapi: {
              summary: `${route.handlerName} operation`,
              tags: ['Items'],
            },
          }),
        ),
      );
    });

    it('should serve Swagger UI HTML page', async () => {
      const builder = new OpenAPIBuilder({
        title: 'Items API',
        version: '1.0.0',
        description: 'API for managing items',
      });

      swaggerApp.use(
        '/docs',
        SwaggerUIMiddleware(() => builder.build()),
      );

      const response = await request(swaggerApp)
        .get('/docs/')
        .expect(200)
        .expect('Content-Type', /html/);

      expect(response.text).toContain('Items API');
      expect(response.text).toContain('swagger-ui');
      expect(response.text).toContain('SwaggerUIBundle');
    });

    it('should serve Swagger UI at /index.html', async () => {
      const builder = new OpenAPIBuilder({
        title: 'Items API',
        version: '1.0.0',
      });

      swaggerApp.use(
        '/docs',
        SwaggerUIMiddleware(() => builder.build()),
      );

      const response = await request(swaggerApp)
        .get('/docs/index.html')
        .expect(200)
        .expect('Content-Type', /html/);

      expect(response.text).toContain('swagger-ui');
    });

    it('should include registered routes in Swagger UI spec', async () => {
      const builder = new OpenAPIBuilder({
        title: 'Items API',
        version: '1.0.0',
      });

      swaggerApp.use(
        '/docs',
        SwaggerUIMiddleware(() => builder.build()),
      );

      const response = await request(swaggerApp).get('/docs/').expect(200);

      expect(response.text).toContain('/api/items');
    });

    it('should apply custom Swagger UI options', async () => {
      const builder = new OpenAPIBuilder({
        title: 'Custom API',
        version: '2.0.0',
      });

      swaggerApp.use(
        '/docs',
        SwaggerUIMiddleware(() => builder.build(), {
          title: 'Custom Documentation',
          showTopBar: false,
          swaggerOptions: {
            docExpansion: 'list',
            filter: true,
            persistAuthorization: true,
          },
        }),
      );

      const response = await request(swaggerApp).get('/docs/').expect(200);

      expect(response.text).toContain('Custom API');
      expect(response.text).toContain('.topbar { display: none; }');
      expect(response.text).toContain('docExpansion: "list"');
      expect(response.text).toContain('filter: true');
      expect(response.text).toContain('persistAuthorization: true');
    });

    it('should serve ReDoc documentation', async () => {
      const builder = new OpenAPIBuilder({
        title: 'Items API',
        version: '1.0.0',
        description: 'ReDoc documentation',
      });

      swaggerApp.use(
        '/redoc',
        ReDocMiddleware(() => builder.build()),
      );

      const response = await request(swaggerApp)
        .get('/redoc/')
        .expect(200)
        .expect('Content-Type', /html/);

      expect(response.text).toContain('Items API');
      expect(response.text).toContain('Redoc.init');
    });

    it('should apply custom ReDoc options', async () => {
      const builder = new OpenAPIBuilder({
        title: 'Custom ReDoc API',
        version: '1.0.0',
      });

      swaggerApp.use(
        '/redoc',
        ReDocMiddleware(() => builder.build(), {
          title: 'Custom ReDoc',
          redocOptions: {
            hideDownloadButton: true,
            expandResponses: '200,201',
          },
        }),
      );

      const response = await request(swaggerApp).get('/redoc/').expect(200);

      expect(response.text).toContain('Custom ReDoc API');
      expect(response.text).toContain('hideDownloadButton');
    });
  });

  describe('OpenAPI Spec Endpoint', () => {
    let openApiApp: Express;

    beforeEach(() => {
      openApiApp = express();

      const routes = Reflect.getMetadata(ROUTES_METADATA, ItemController) || [];
      ControllerRegistry.register(
        '/api/items',
        'ItemController',
        routes.map(
          (route: { method: string; path: string; handlerName: string }) => ({
            method: route.method,
            path: route.path,
            handlerKey: route.handlerName,
            useAuthentication: ['createItem', 'deleteItem'].includes(
              route.handlerName,
            ),
            useCryptoAuthentication: false,
            openapi: {
              summary: `${route.handlerName} operation`,
              tags: ['Items'],
              responses: { 200: { description: 'Success' } },
            },
          }),
        ),
      );

      OpenAPISchemaRegistry.registerSchema('Item', {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
        },
        required: ['id', 'name', 'price'],
      });
    });

    it('should serve OpenAPI spec at /openapi endpoint', async () => {
      const openApiController = new OpenAPIController(mockApplication, {
        title: 'Items API',
        version: '1.0.0',
        description: 'API for managing items',
      });

      openApiApp.use('/openapi', openApiController.router);

      const response = await request(openApiApp).get('/openapi/').expect(200);

      expect(response.body.message).toBe('OpenAPI specification');
      expect(response.body.openapi).toBe('3.0.3');
      expect(response.body.info.title).toBe('Items API');
      expect(response.body.info.version).toBe('1.0.0');
    });

    it('should serve raw OpenAPI spec at /openapi/raw', async () => {
      const openApiController = new OpenAPIController(mockApplication, {
        title: 'Items API',
        version: '1.0.0',
      });

      openApiApp.use('/openapi', openApiController.router);

      const response = await request(openApiApp)
        .get('/openapi/raw')
        .expect(200);

      expect(response.body.openapi).toBe('3.0.3');
      expect(response.body.info.title).toBe('Items API');
      expect(response.body.paths).toBeDefined();
      expect(response.body.paths['/api/items']).toBeDefined();
    });

    it('should include registered paths in spec', async () => {
      const openApiController = new OpenAPIController(mockApplication, {
        title: 'Items API',
        version: '1.0.0',
      });

      openApiApp.use('/openapi', openApiController.router);

      const response = await request(openApiApp)
        .get('/openapi/raw')
        .expect(200);

      const paths = response.body.paths;

      expect(paths['/api/items']).toBeDefined();
      expect(paths['/api/items/{id}']).toBeDefined();

      expect(paths['/api/items'].get).toBeDefined();
      expect(paths['/api/items'].post).toBeDefined();
      expect(paths['/api/items/{id}'].get).toBeDefined();
      expect(paths['/api/items/{id}'].delete).toBeDefined();
    });

    it('should include registered schemas in spec', async () => {
      const openApiController = new OpenAPIController(mockApplication, {
        title: 'Items API',
        version: '1.0.0',
      });

      openApiApp.use('/openapi', openApiController.router);

      const response = await request(openApiApp)
        .get('/openapi/raw')
        .expect(200);

      expect(response.body.components.schemas.Item).toBeDefined();
      expect(response.body.components.schemas.Item.type).toBe('object');
      expect(response.body.components.schemas.Item.properties.name.type).toBe(
        'string',
      );
    });

    it('should filter spec by tags', async () => {
      ControllerRegistry.register('/api/users', 'UserController', [
        {
          method: 'get',
          path: '/',
          handlerKey: 'listUsers',
          useAuthentication: false,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'List users',
            tags: ['Users'],
            responses: { 200: { description: 'Success' } },
          },
        },
      ]);

      const openApiController = new OpenAPIController(
        mockApplication,
        {
          title: 'Multi-Tag API',
          version: '1.0.0',
        },
        {
          enableTagFiltering: true,
        },
      );

      openApiApp.use('/openapi', openApiController.router);

      const response = await request(openApiApp)
        .get('/openapi/raw?tags=Items')
        .expect(200);

      const paths = response.body.paths;

      expect(paths['/api/items']).toBeDefined();
      expect(paths['/api/users']).toBeUndefined();
    });

    it('should serve spec in JSON format at /openapi/json', async () => {
      const openApiController = new OpenAPIController(mockApplication, {
        title: 'Items API',
        version: '1.0.0',
      });

      openApiApp.use('/openapi', openApiController.router);

      const response = await request(openApiApp)
        .get('/openapi/json')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.message).toBe('OpenAPI specification');
      expect(response.body.openapi).toBe('3.0.3');
    });

    it('should serve spec in YAML format when enabled', async () => {
      const openApiController = new OpenAPIController(
        mockApplication,
        {
          title: 'Items API',
          version: '1.0.0',
        },
        {
          enableYaml: true,
        },
      );

      openApiApp.use('/openapi', openApiController.router);

      const response = await request(openApiApp)
        .get('/openapi/yaml')
        .expect(200)
        .expect('Content-Type', /yaml/);

      // YAML format may quote strings, so check for both formats
      expect(response.text).toMatch(/openapi: ["']?3\.0\.3["']?/);
      expect(response.text).toContain('title: Items API');
    });

    it('should include security schemes for authenticated routes', async () => {
      OpenAPISchemaRegistry.registerSecurityScheme('bearerAuth', {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      });

      const openApiController = new OpenAPIController(mockApplication, {
        title: 'Secure API',
        version: '1.0.0',
      });

      openApiApp.use('/openapi', openApiController.router);

      const response = await request(openApiApp)
        .get('/openapi/raw')
        .expect(200);

      expect(response.body.components.securitySchemes).toBeDefined();
      expect(response.body.components.securitySchemes.bearerAuth).toBeDefined();
      expect(response.body.components.securitySchemes.bearerAuth.type).toBe(
        'http',
      );
      expect(response.body.components.securitySchemes.bearerAuth.scheme).toBe(
        'bearer',
      );
    });

    it('should include external docs when configured', async () => {
      const openApiController = new OpenAPIController(mockApplication, {
        title: 'Items API',
        version: '1.0.0',
        externalDocs: {
          description: 'Full API documentation',
          url: 'https://docs.example.com/api',
        },
      });

      openApiApp.use('/openapi', openApiController.router);

      const response = await request(openApiApp).get('/openapi/').expect(200);

      expect(response.body.externalDocs).toBeDefined();
      expect(response.body.externalDocs.description).toBe(
        'Full API documentation',
      );
      expect(response.body.externalDocs.url).toBe(
        'https://docs.example.com/api',
      );
    });
  });
});
