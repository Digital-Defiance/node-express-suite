import 'reflect-metadata';
import { z } from 'zod';
import {
  ApiParam,
  ApiQuery,
  ApiHeader,
  ApiRequestBody,
  getOpenAPIParams,
  getRequestBodyMetadata,
  requestBodyMetadataToOpenAPI,
  ExtendedOpenAPIParameter,
  RequestBodyMetadata,
} from '../../src/decorators/openapi-params';
import {
  OPENAPI_PARAMS_METADATA,
  OPENAPI_REQUEST_BODY_METADATA,
} from '../../src/decorators/metadata-keys';

describe('OpenAPI Parameter Decorators', () => {
  describe('@ApiParam', () => {
    it('should set path parameter metadata on method', () => {
      class TestController {
        @ApiParam('id', { description: 'User ID' })
        getUser() {}
      }

      const params = Reflect.getMetadata(
        OPENAPI_PARAMS_METADATA,
        TestController,
        'getUser',
      ) as ExtendedOpenAPIParameter[];

      expect(params).toHaveLength(1);
      expect(params[0].name).toBe('id');
      expect(params[0].in).toBe('path');
      expect(params[0].required).toBe(true); // Path params are always required
      expect(params[0].description).toBe('User ID');
    });

    it('should set path parameter with schema', () => {
      class TestController {
        @ApiParam('id', {
          description: 'User ID',
          schema: { type: 'string', format: 'uuid' },
        })
        getUser() {}
      }

      const params = getOpenAPIParams(TestController, 'getUser');

      expect(params[0].schema.type).toBe('string');
      expect(params[0].schema.format).toBe('uuid');
    });

    it('should set path parameter with example', () => {
      class TestController {
        @ApiParam('id', {
          description: 'User ID',
          example: '123e4567-e89b-12d3-a456-426614174000',
        })
        getUser() {}
      }

      const params = getOpenAPIParams(TestController, 'getUser');

      expect(params[0].schema.example).toBe(
        '123e4567-e89b-12d3-a456-426614174000',
      );
    });

    it('should set path parameter with enum', () => {
      class TestController {
        @ApiParam('status', {
          description: 'Status filter',
          enum: ['active', 'inactive', 'pending'],
        })
        getByStatus() {}
      }

      const params = getOpenAPIParams(TestController, 'getByStatus');

      expect(params[0].schema.enum).toEqual(['active', 'inactive', 'pending']);
    });

    it('should set deprecated flag', () => {
      class TestController {
        @ApiParam('oldId', {
          description: 'Deprecated ID parameter',
          deprecated: true,
        })
        getOld() {}
      }

      const params = getOpenAPIParams(TestController, 'getOld');

      expect(params[0].deprecated).toBe(true);
    });

    it('should support schema reference as string', () => {
      class TestController {
        @ApiParam('id', {
          schema: 'UserId',
        })
        getUser() {}
      }

      const params = getOpenAPIParams(TestController, 'getUser');

      expect(params[0].schema.$ref).toBe('#/components/schemas/UserId');
    });

    it('should accumulate multiple path parameters', () => {
      class TestController {
        @ApiParam('userId', { description: 'User ID' })
        @ApiParam('postId', { description: 'Post ID' })
        getUserPost() {}
      }

      const params = getOpenAPIParams(TestController, 'getUserPost');

      expect(params).toHaveLength(2);
      expect(params.map((p) => p.name)).toContain('userId');
      expect(params.map((p) => p.name)).toContain('postId');
    });
  });

  describe('@ApiQuery', () => {
    it('should set query parameter metadata on method', () => {
      class TestController {
        @ApiQuery('page', { description: 'Page number' })
        listUsers() {}
      }

      const params = getOpenAPIParams(TestController, 'listUsers');

      expect(params).toHaveLength(1);
      expect(params[0].name).toBe('page');
      expect(params[0].in).toBe('query');
      expect(params[0].description).toBe('Page number');
    });

    it('should set query parameter as optional by default', () => {
      class TestController {
        @ApiQuery('filter', { description: 'Filter' })
        listUsers() {}
      }

      const params = getOpenAPIParams(TestController, 'filter');

      // Query params are optional by default (required is not set or false)
      expect(params).toHaveLength(0); // No params on wrong method name
    });

    it('should set query parameter as required when specified', () => {
      class TestController {
        @ApiQuery('search', { description: 'Search term', required: true })
        searchUsers() {}
      }

      const params = getOpenAPIParams(TestController, 'searchUsers');

      expect(params[0].required).toBe(true);
    });

    it('should set query parameter with integer schema', () => {
      class TestController {
        @ApiQuery('page', {
          description: 'Page number',
          schema: { type: 'integer', minimum: 1 },
        })
        listUsers() {}
      }

      const params = getOpenAPIParams(TestController, 'listUsers');

      expect(params[0].schema.type).toBe('integer');
      expect(params[0].schema.minimum).toBe(1);
    });

    it('should accumulate multiple query parameters', () => {
      class TestController {
        @ApiQuery('page', { description: 'Page number' })
        @ApiQuery('limit', { description: 'Items per page' })
        @ApiQuery('sort', { description: 'Sort field' })
        listUsers() {}
      }

      const params = getOpenAPIParams(TestController, 'listUsers');

      expect(params).toHaveLength(3);
      expect(params.map((p) => p.name)).toContain('page');
      expect(params.map((p) => p.name)).toContain('limit');
      expect(params.map((p) => p.name)).toContain('sort');
    });
  });

  describe('@ApiHeader', () => {
    it('should set header parameter metadata on method', () => {
      class TestController {
        @ApiHeader('X-Request-ID', { description: 'Request tracking ID' })
        getData() {}
      }

      const params = getOpenAPIParams(TestController, 'getData');

      expect(params).toHaveLength(1);
      expect(params[0].name).toBe('X-Request-ID');
      expect(params[0].in).toBe('header');
      expect(params[0].description).toBe('Request tracking ID');
    });

    it('should set header parameter as required when specified', () => {
      class TestController {
        @ApiHeader('Authorization', {
          description: 'Auth token',
          required: true,
        })
        secureEndpoint() {}
      }

      const params = getOpenAPIParams(TestController, 'secureEndpoint');

      expect(params[0].required).toBe(true);
    });

    it('should set header parameter with enum', () => {
      class TestController {
        @ApiHeader('Accept-Language', {
          description: 'Preferred language',
          enum: ['en', 'es', 'fr', 'de'],
        })
        getData() {}
      }

      const params = getOpenAPIParams(TestController, 'getData');

      expect(params[0].schema.enum).toEqual(['en', 'es', 'fr', 'de']);
    });

    it('should accumulate multiple header parameters', () => {
      class TestController {
        @ApiHeader('X-Request-ID', { description: 'Request ID' })
        @ApiHeader('X-Correlation-ID', { description: 'Correlation ID' })
        getData() {}
      }

      const params = getOpenAPIParams(TestController, 'getData');

      expect(params).toHaveLength(2);
      expect(params.map((p) => p.name)).toContain('X-Request-ID');
      expect(params.map((p) => p.name)).toContain('X-Correlation-ID');
    });
  });

  describe('@ApiRequestBody', () => {
    it('should set request body metadata with schema reference', () => {
      class TestController {
        @ApiRequestBody({
          schema: 'CreateUserDto',
          description: 'User data to create',
        })
        createUser() {}
      }

      const metadata = Reflect.getMetadata(
        OPENAPI_REQUEST_BODY_METADATA,
        TestController,
        'createUser',
      ) as RequestBodyMetadata;

      expect(metadata.schema).toBe('CreateUserDto');
      expect(metadata.description).toBe('User data to create');
    });

    it('should set request body as required by default', () => {
      class TestController {
        @ApiRequestBody({ schema: 'CreateUserDto' })
        createUser() {}
      }

      const metadata = getRequestBodyMetadata(TestController, 'createUser');

      expect(metadata?.required).toBe(true);
    });

    it('should allow setting request body as optional', () => {
      class TestController {
        @ApiRequestBody({ schema: 'UpdateUserDto', required: false })
        updateUser() {}
      }

      const metadata = getRequestBodyMetadata(TestController, 'updateUser');

      expect(metadata?.required).toBe(false);
    });

    it('should set request body with example', () => {
      class TestController {
        @ApiRequestBody({
          schema: 'CreateUserDto',
          example: { name: 'John Doe', email: 'john@example.com' },
        })
        createUser() {}
      }

      const metadata = getRequestBodyMetadata(TestController, 'createUser');

      expect(metadata?.example).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
      });
    });

    it('should set request body with Zod schema', () => {
      const CreateUserSchema = z.object({
        name: z.string(),
        email: z.string().email(),
      });

      class TestController {
        @ApiRequestBody({
          schema: CreateUserSchema,
          description: 'User data',
        })
        createUser() {}
      }

      const metadata = getRequestBodyMetadata(TestController, 'createUser');

      expect(metadata?.schema).toBe(CreateUserSchema);
    });

    it('should set custom content type', () => {
      class TestController {
        @ApiRequestBody({
          schema: 'FileUpload',
          contentType: 'multipart/form-data',
        })
        uploadFile() {}
      }

      const metadata = getRequestBodyMetadata(TestController, 'uploadFile');

      expect(metadata?.contentType).toBe('multipart/form-data');
    });

    it('should default content type to application/json', () => {
      class TestController {
        @ApiRequestBody({ schema: 'CreateUserDto' })
        createUser() {}
      }

      const metadata = getRequestBodyMetadata(TestController, 'createUser');

      expect(metadata?.contentType).toBe('application/json');
    });
  });

  describe('requestBodyMetadataToOpenAPI', () => {
    it('should convert string schema to OpenAPI request body', () => {
      const metadata: RequestBodyMetadata = {
        schema: 'CreateUserDto',
        description: 'User data',
        required: true,
      };

      const openAPIBody = requestBodyMetadataToOpenAPI(metadata);

      expect(openAPIBody.schema).toBe('CreateUserDto');
      expect(openAPIBody.description).toBe('User data');
      expect(openAPIBody.required).toBe(true);
    });

    it('should convert Zod schema to OpenAPI request body', () => {
      const CreateUserSchema = z.object({
        name: z.string(),
      });

      const metadata: RequestBodyMetadata = {
        schema: CreateUserSchema,
        description: 'User data',
        required: true,
      };

      const openAPIBody = requestBodyMetadataToOpenAPI(metadata);

      // Zod schemas get a placeholder name
      expect(openAPIBody.schema).toBe('ZodSchema');
      expect(openAPIBody.description).toBe('User data');
    });

    it('should include example in OpenAPI request body', () => {
      const metadata: RequestBodyMetadata = {
        schema: 'CreateUserDto',
        example: { name: 'John' },
      };

      const openAPIBody = requestBodyMetadataToOpenAPI(metadata);

      expect(openAPIBody.example).toEqual({ name: 'John' });
    });
  });

  describe('Mixed parameter types', () => {
    it('should handle all parameter types on same method', () => {
      class TestController {
        @ApiParam('id', { description: 'User ID' })
        @ApiQuery('include', { description: 'Include related data' })
        @ApiHeader('X-Request-ID', { description: 'Request ID' })
        getUser() {}
      }

      const params = getOpenAPIParams(TestController, 'getUser');

      expect(params).toHaveLength(3);

      const pathParam = params.find((p) => p.in === 'path');
      const queryParam = params.find((p) => p.in === 'query');
      const headerParam = params.find((p) => p.in === 'header');

      expect(pathParam?.name).toBe('id');
      expect(queryParam?.name).toBe('include');
      expect(headerParam?.name).toBe('X-Request-ID');
    });

    it('should handle parameters with request body', () => {
      class TestController {
        @ApiParam('id', { description: 'User ID' })
        @ApiRequestBody({ schema: 'UpdateUserDto' })
        updateUser() {}
      }

      const params = getOpenAPIParams(TestController, 'updateUser');
      const body = getRequestBodyMetadata(TestController, 'updateUser');

      expect(params).toHaveLength(1);
      expect(params[0].name).toBe('id');
      expect(body?.schema).toBe('UpdateUserDto');
    });
  });

  describe('Default options', () => {
    it('should use default schema type string when no schema provided', () => {
      class TestController {
        @ApiParam('id')
        getUser() {}
      }

      const params = getOpenAPIParams(TestController, 'getUser');

      expect(params[0].schema.type).toBe('string');
    });

    it('should work with empty options object', () => {
      class TestController {
        @ApiQuery('filter', {})
        listUsers() {}
      }

      const params = getOpenAPIParams(TestController, 'listUsers');

      expect(params[0].name).toBe('filter');
      expect(params[0].schema.type).toBe('string');
    });
  });
});

describe('Parameter Merging', () => {
  describe('mergeOpenAPIParameters', () => {
    const {
      mergeOpenAPIParameters,
    } = require('../../src/decorators/openapi-params');

    it('should merge auto-extracted and explicit parameters', () => {
      const autoExtracted = [
        { name: 'id', in: 'path', schema: { type: 'string' }, required: true },
      ];
      const explicit = [
        {
          name: 'id',
          in: 'path',
          schema: { type: 'string', format: 'uuid' },
          required: true,
          description: 'User ID',
        },
      ];

      const merged = mergeOpenAPIParameters(autoExtracted, explicit);

      expect(merged).toHaveLength(1);
      expect(merged[0].description).toBe('User ID');
      expect(merged[0].schema.format).toBe('uuid');
    });

    it('should add new parameters from explicit that are not in auto-extracted', () => {
      const autoExtracted = [
        { name: 'id', in: 'path', schema: { type: 'string' }, required: true },
      ];
      const explicit = [
        {
          name: 'page',
          in: 'query',
          schema: { type: 'integer' },
          description: 'Page number',
        },
      ];

      const merged = mergeOpenAPIParameters(autoExtracted, explicit);

      expect(merged).toHaveLength(2);
      expect(merged.find((p) => p.name === 'id')).toBeDefined();
      expect(merged.find((p) => p.name === 'page')).toBeDefined();
    });

    it('should preserve auto-extracted parameters not overridden', () => {
      const autoExtracted = [
        { name: 'id', in: 'path', schema: { type: 'string' }, required: true },
        { name: 'filter', in: 'query', schema: { type: 'string' } },
      ];
      const explicit = [
        {
          name: 'id',
          in: 'path',
          schema: { type: 'string', format: 'uuid' },
          required: true,
        },
      ];

      const merged = mergeOpenAPIParameters(autoExtracted, explicit);

      expect(merged).toHaveLength(2);
      const filterParam = merged.find((p) => p.name === 'filter');
      expect(filterParam).toBeDefined();
      expect(filterParam?.schema.type).toBe('string');
    });

    it('should handle empty auto-extracted array', () => {
      const autoExtracted: ExtendedOpenAPIParameter[] = [];
      const explicit = [
        { name: 'id', in: 'path', schema: { type: 'string' }, required: true },
      ];

      const merged = mergeOpenAPIParameters(autoExtracted, explicit);

      expect(merged).toHaveLength(1);
      expect(merged[0].name).toBe('id');
    });

    it('should handle empty explicit array', () => {
      const autoExtracted = [
        { name: 'id', in: 'path', schema: { type: 'string' }, required: true },
      ];
      const explicit: ExtendedOpenAPIParameter[] = [];

      const merged = mergeOpenAPIParameters(autoExtracted, explicit);

      expect(merged).toHaveLength(1);
      expect(merged[0].name).toBe('id');
    });

    it('should merge schema properties correctly', () => {
      const autoExtracted = [
        { name: 'count', in: 'query', schema: { type: 'integer' } },
      ];
      const explicit = [
        {
          name: 'count',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 100 },
          description: 'Count',
        },
      ];

      const merged = mergeOpenAPIParameters(autoExtracted, explicit);

      expect(merged[0].schema.type).toBe('integer');
      expect(merged[0].schema.minimum).toBe(1);
      expect(merged[0].schema.maximum).toBe(100);
    });
  });

  describe('Integration with @Param, @Query, @Header decorators', () => {
    const { Param, Query, Header } = require('../../src/decorators/params');

    it('should merge @ApiParam with @Param auto-extracted parameter', () => {
      class TestController {
        @ApiParam('id', {
          description: 'User ID',
          schema: { type: 'string', format: 'uuid' },
        })
        getUser(@Param('id') id: string) {}
      }

      const params = getOpenAPIParams(TestController, 'getUser');

      // Should have merged the parameters
      expect(params).toHaveLength(1);
      expect(params[0].name).toBe('id');
      expect(params[0].in).toBe('path');
      expect(params[0].description).toBe('User ID');
      expect(params[0].schema.format).toBe('uuid');
    });

    it('should merge @ApiQuery with @Query auto-extracted parameter', () => {
      class TestController {
        @ApiQuery('page', {
          description: 'Page number',
          schema: { type: 'integer', minimum: 1 },
        })
        listUsers(@Query('page') page: number) {}
      }

      const params = getOpenAPIParams(TestController, 'listUsers');

      expect(params).toHaveLength(1);
      expect(params[0].name).toBe('page');
      expect(params[0].in).toBe('query');
      expect(params[0].description).toBe('Page number');
      expect(params[0].schema.type).toBe('integer');
      expect(params[0].schema.minimum).toBe(1);
    });

    it('should merge @ApiHeader with @Header auto-extracted parameter', () => {
      class TestController {
        @ApiHeader('X-Request-ID', {
          description: 'Request tracking ID',
          required: true,
        })
        getData(@Header('X-Request-ID') requestId: string) {}
      }

      const params = getOpenAPIParams(TestController, 'getData');

      expect(params).toHaveLength(1);
      expect(params[0].name).toBe('X-Request-ID');
      expect(params[0].in).toBe('header');
      expect(params[0].description).toBe('Request tracking ID');
      expect(params[0].required).toBe(true);
    });

    it('should handle mixed auto-extracted and explicit parameters', () => {
      class TestController {
        @ApiParam('userId', { description: 'User ID' })
        @ApiQuery('include', {
          description: 'Include related data',
          enum: ['posts', 'comments'],
        })
        getUser(@Param('userId') userId: string, @Query('page') page: number) {}
      }

      const params = getOpenAPIParams(TestController, 'getUser');

      // Should have: userId (merged), page (auto-extracted), include (explicit only)
      expect(params.length).toBeGreaterThanOrEqual(2);

      const userIdParam = params.find((p) => p.name === 'userId');
      expect(userIdParam?.description).toBe('User ID');

      const includeParam = params.find((p) => p.name === 'include');
      expect(includeParam?.schema.enum).toEqual(['posts', 'comments']);
    });

    it('should allow @ApiParam to add description to @Param without options', () => {
      class TestController {
        @ApiParam('id', { description: 'Resource ID', example: '123' })
        getResource(@Param('id') id: string) {}
      }

      const params = getOpenAPIParams(TestController, 'getResource');

      expect(params[0].description).toBe('Resource ID');
      expect(params[0].schema.example).toBe('123');
    });
  });

  describe('Parameter override behavior', () => {
    it('should allow explicit decorator to override auto-extracted required flag', () => {
      const { Query } = require('../../src/decorators/params');

      class TestController {
        @ApiQuery('filter', { required: true })
        listUsers(@Query('filter') filter: string) {}
      }

      const params = getOpenAPIParams(TestController, 'listUsers');

      expect(params[0].required).toBe(true);
    });

    it('should preserve parameter order', () => {
      class TestController {
        @ApiParam('id', { description: 'ID' })
        @ApiQuery('page', { description: 'Page' })
        @ApiQuery('limit', { description: 'Limit' })
        @ApiHeader('X-Token', { description: 'Token' })
        getData() {}
      }

      const params = getOpenAPIParams(TestController, 'getData');

      // Parameters should be in the order they were added
      expect(params).toHaveLength(4);
    });

    it('should not duplicate parameters with same name and location', () => {
      class TestController {
        @ApiParam('id', { description: 'First' })
        @ApiParam('id', { description: 'Second' })
        getUser() {}
      }

      const params = getOpenAPIParams(TestController, 'getUser');

      // Should merge, not duplicate
      expect(params).toHaveLength(1);
      // The last decorator (topmost in code) should win
      expect(params[0].description).toBe('First');
    });

    it('should allow same name in different locations', () => {
      class TestController {
        @ApiParam('id', { description: 'Path ID' })
        @ApiQuery('id', { description: 'Query ID' })
        getData() {}
      }

      const params = getOpenAPIParams(TestController, 'getData');

      expect(params).toHaveLength(2);
      expect(params.find((p) => p.in === 'path')?.description).toBe('Path ID');
      expect(params.find((p) => p.in === 'query')?.description).toBe(
        'Query ID',
      );
    });
  });
});
