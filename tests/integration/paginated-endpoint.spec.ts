/**
 * @fileoverview Integration tests for paginated endpoints with response decorators.
 * Tests the full flow from decorated controller to OpenAPI spec generation.
 */

import 'reflect-metadata';
import {
  Paginated,
  Returns,
  RawJson,
  getResponseMetadata,
  isPaginatedEndpoint,
  getPaginationOptions,
  isRawJsonHandler,
} from '../../src/decorators/response';
import { Get, Post } from '../../src/decorators/http-methods';
import { ApiController } from '../../src/decorators/controller';
import { RequireAuth, Public } from '../../src/decorators/auth';
import {
  OPENAPI_METADATA,
  ROUTES_METADATA,
} from '../../src/decorators/metadata-keys';

describe('Paginated Endpoint Integration', () => {
  describe('Full Controller with Pagination', () => {
    @ApiController('/api/users', { tags: ['Users'] })
    class UserController {
      @Paginated({ defaultPageSize: 20, maxPageSize: 100 })
      @Returns(200, 'UserList', { description: 'List of users' })
      @Get('/')
      listUsers() {
        return [];
      }

      @Returns(200, 'User', { description: 'User details' })
      @Returns(404, 'ErrorResponse', { description: 'User not found' })
      @Get('/:id')
      getUser() {
        return {};
      }

      @RequireAuth()
      @Returns(201, 'User', { description: 'User created' })
      @Returns(400, 'ValidationError', { description: 'Validation failed' })
      @Post('/')
      createUser() {
        return {};
      }
    }

    it('should have pagination metadata on list endpoint', () => {
      expect(isPaginatedEndpoint(UserController, 'listUsers')).toBe(true);
      expect(isPaginatedEndpoint(UserController, 'getUser')).toBe(false);
      expect(isPaginatedEndpoint(UserController, 'createUser')).toBe(false);
    });

    it('should have correct pagination options', () => {
      const options = getPaginationOptions(UserController, 'listUsers');
      expect(options).toBeDefined();
      expect(options?.defaultPageSize).toBe(20);
      expect(options?.maxPageSize).toBe(100);
      expect(options?.useOffset).toBe(false);
    });

    it('should have pagination query parameters in OpenAPI metadata', () => {
      const openApiMeta = Reflect.getMetadata(
        OPENAPI_METADATA,
        UserController,
        'listUsers',
      ) as { parameters?: Array<{ name: string; in: string }> };

      expect(openApiMeta.parameters).toBeDefined();
      const paramNames = openApiMeta.parameters?.map((p) => p.name) ?? [];
      expect(paramNames).toContain('page');
      expect(paramNames).toContain('limit');
    });

    it('should have response metadata on all endpoints', () => {
      const listResponses = getResponseMetadata(UserController, 'listUsers');
      expect(listResponses).toHaveLength(1);
      expect(listResponses[0].statusCode).toBe(200);

      const getResponses = getResponseMetadata(UserController, 'getUser');
      expect(getResponses).toHaveLength(2);
      expect(getResponses.map((r) => r.statusCode)).toContain(200);
      expect(getResponses.map((r) => r.statusCode)).toContain(404);

      const createResponses = getResponseMetadata(UserController, 'createUser');
      // 3 responses: 201 (created), 400 (validation), 401 (auto-added by @RequireAuth)
      expect(createResponses).toHaveLength(3);
      expect(createResponses.map((r) => r.statusCode)).toContain(201);
      expect(createResponses.map((r) => r.statusCode)).toContain(400);
      expect(createResponses.map((r) => r.statusCode)).toContain(401);
    });

    it('should have routes registered', () => {
      const routes = Reflect.getMetadata(ROUTES_METADATA, UserController);
      expect(routes).toHaveLength(3);
      expect(routes.map((r: { path: string }) => r.path)).toContain('/');
      expect(routes.map((r: { path: string }) => r.path)).toContain('/:id');
    });
  });

  describe('Offset-based Pagination', () => {
    class OffsetController {
      @Paginated({ useOffset: true, defaultPageSize: 50 })
      @Returns(200, 'ItemList')
      @Get('/items')
      listItems() {
        return [];
      }
    }

    it('should use offset-based pagination parameters', () => {
      const openApiMeta = Reflect.getMetadata(
        OPENAPI_METADATA,
        OffsetController,
        'listItems',
      ) as { parameters?: Array<{ name: string }> };

      const paramNames = openApiMeta.parameters?.map((p) => p.name) ?? [];
      expect(paramNames).toContain('offset');
      expect(paramNames).toContain('limit');
      expect(paramNames).not.toContain('page');
    });

    it('should have correct pagination options', () => {
      const options = getPaginationOptions(OffsetController, 'listItems');
      expect(options?.useOffset).toBe(true);
      expect(options?.defaultPageSize).toBe(50);
    });
  });

  describe('Mixed Endpoints with RawJson', () => {
    @ApiController('/api/data')
    class DataController {
      @Paginated()
      @Returns(200, 'DataList')
      @Get('/')
      listData() {
        return [];
      }

      @RawJson()
      @Returns(200, 'RawData')
      @Get('/raw')
      getRawData() {
        return {};
      }

      @RawJson()
      @Paginated()
      @Returns(200, 'RawPaginatedData')
      @Get('/raw-paginated')
      getRawPaginatedData() {
        return [];
      }
    }

    it('should correctly identify paginated endpoints', () => {
      expect(isPaginatedEndpoint(DataController, 'listData')).toBe(true);
      expect(isPaginatedEndpoint(DataController, 'getRawData')).toBe(false);
      expect(isPaginatedEndpoint(DataController, 'getRawPaginatedData')).toBe(
        true,
      );
    });

    it('should correctly identify raw json handlers', () => {
      expect(isRawJsonHandler(DataController, 'listData')).toBe(false);
      expect(isRawJsonHandler(DataController, 'getRawData')).toBe(true);
      expect(isRawJsonHandler(DataController, 'getRawPaginatedData')).toBe(
        true,
      );
    });

    it('should have both pagination and rawJson on combined endpoint', () => {
      const openApiMeta = Reflect.getMetadata(
        OPENAPI_METADATA,
        DataController,
        'getRawPaginatedData',
      ) as {
        isPaginated?: boolean;
        rawJson?: boolean;
        parameters?: Array<{ name: string }>;
      };

      expect(openApiMeta.isPaginated).toBe(true);
      expect(openApiMeta.rawJson).toBe(true);
      expect(openApiMeta.parameters?.map((p) => p.name)).toContain('page');
    });
  });

  describe('Pagination with Authentication', () => {
    @RequireAuth()
    @ApiController('/api/secure')
    class SecureController {
      @Paginated({ defaultPageSize: 10 })
      @Returns(200, 'SecureList')
      @Get('/')
      listSecure() {
        return [];
      }

      @Public()
      @Paginated({ defaultPageSize: 25 })
      @Returns(200, 'PublicList')
      @Get('/public')
      listPublic() {
        return [];
      }
    }

    it('should have pagination on both endpoints', () => {
      expect(isPaginatedEndpoint(SecureController, 'listSecure')).toBe(true);
      expect(isPaginatedEndpoint(SecureController, 'listPublic')).toBe(true);
    });

    it('should have different pagination options', () => {
      const secureOptions = getPaginationOptions(
        SecureController,
        'listSecure',
      );
      const publicOptions = getPaginationOptions(
        SecureController,
        'listPublic',
      );

      expect(secureOptions?.defaultPageSize).toBe(10);
      expect(publicOptions?.defaultPageSize).toBe(25);
    });
  });

  describe('Complex Response Scenarios', () => {
    class ComplexController {
      @Paginated({ defaultPageSize: 20, maxPageSize: 200 })
      @Returns(200, 'ItemList', { description: 'Paginated list of items' })
      @Returns(400, 'ValidationError', {
        description: 'Invalid pagination params',
      })
      @Returns(401, 'ErrorResponse', { description: 'Unauthorized' })
      @Returns(500, 'ErrorResponse', { description: 'Server error' })
      @Get('/items')
      listItems() {
        return [];
      }
    }

    it('should accumulate all response codes', () => {
      const responses = getResponseMetadata(ComplexController, 'listItems');
      expect(responses).toHaveLength(4);

      const statusCodes = responses.map((r) => r.statusCode);
      expect(statusCodes).toContain(200);
      expect(statusCodes).toContain(400);
      expect(statusCodes).toContain(401);
      expect(statusCodes).toContain(500);
    });

    it('should have pagination with all responses', () => {
      expect(isPaginatedEndpoint(ComplexController, 'listItems')).toBe(true);

      const options = getPaginationOptions(ComplexController, 'listItems');
      expect(options?.defaultPageSize).toBe(20);
      expect(options?.maxPageSize).toBe(200);
    });

    it('should have pagination parameters in OpenAPI metadata', () => {
      const openApiMeta = Reflect.getMetadata(
        OPENAPI_METADATA,
        ComplexController,
        'listItems',
      ) as {
        parameters?: Array<{
          name: string;
          schema?: { default?: number; maximum?: number };
        }>;
      };

      const limitParam = openApiMeta.parameters?.find(
        (p) => p.name === 'limit',
      );
      expect(limitParam).toBeDefined();
      expect(limitParam?.schema?.default).toBe(20);
      expect(limitParam?.schema?.maximum).toBe(200);
    });
  });

  describe('Pagination Parameter Schema', () => {
    class SchemaTestController {
      @Paginated({ defaultPageSize: 15, maxPageSize: 50 })
      @Get('/test')
      testEndpoint() {
        return [];
      }
    }

    it('should have correct schema for page parameter', () => {
      const openApiMeta = Reflect.getMetadata(
        OPENAPI_METADATA,
        SchemaTestController,
        'testEndpoint',
      ) as {
        parameters?: Array<{
          name: string;
          in: string;
          required: boolean;
          schema: Record<string, unknown>;
        }>;
      };

      const pageParam = openApiMeta.parameters?.find((p) => p.name === 'page');
      expect(pageParam).toBeDefined();
      expect(pageParam?.in).toBe('query');
      expect(pageParam?.required).toBe(false);
      expect(pageParam?.schema.type).toBe('integer');
      expect(pageParam?.schema.minimum).toBe(1);
      expect(pageParam?.schema.default).toBe(1);
    });

    it('should have correct schema for limit parameter', () => {
      const openApiMeta = Reflect.getMetadata(
        OPENAPI_METADATA,
        SchemaTestController,
        'testEndpoint',
      ) as {
        parameters?: Array<{ name: string; schema: Record<string, unknown> }>;
      };

      const limitParam = openApiMeta.parameters?.find(
        (p) => p.name === 'limit',
      );
      expect(limitParam).toBeDefined();
      expect(limitParam?.schema.type).toBe('integer');
      expect(limitParam?.schema.minimum).toBe(1);
      expect(limitParam?.schema.default).toBe(15);
      expect(limitParam?.schema.maximum).toBe(50);
    });
  });

  describe('Offset Pagination Parameter Schema', () => {
    class OffsetSchemaController {
      @Paginated({ useOffset: true, defaultPageSize: 30, maxPageSize: 100 })
      @Get('/offset-test')
      offsetEndpoint() {
        return [];
      }
    }

    it('should have correct schema for offset parameter', () => {
      const openApiMeta = Reflect.getMetadata(
        OPENAPI_METADATA,
        OffsetSchemaController,
        'offsetEndpoint',
      ) as {
        parameters?: Array<{ name: string; schema: Record<string, unknown> }>;
      };

      const offsetParam = openApiMeta.parameters?.find(
        (p) => p.name === 'offset',
      );
      expect(offsetParam).toBeDefined();
      expect(offsetParam?.schema.type).toBe('integer');
      expect(offsetParam?.schema.minimum).toBe(0);
      expect(offsetParam?.schema.default).toBe(0);
    });

    it('should have correct schema for limit parameter with offset pagination', () => {
      const openApiMeta = Reflect.getMetadata(
        OPENAPI_METADATA,
        OffsetSchemaController,
        'offsetEndpoint',
      ) as {
        parameters?: Array<{ name: string; schema: Record<string, unknown> }>;
      };

      const limitParam = openApiMeta.parameters?.find(
        (p) => p.name === 'limit',
      );
      expect(limitParam).toBeDefined();
      expect(limitParam?.schema.default).toBe(30);
      expect(limitParam?.schema.maximum).toBe(100);
    });
  });
});
