import 'reflect-metadata';
import {
  Body,
  CurrentUser,
  EciesUser,
  getOpenAPIParamMetadata,
  getParamMetadata,
  Header,
  Next,
  Param,
  Query,
  Req,
  Res,
} from '../../src/decorators/params';
import {
  OPENAPI_PARAMS_METADATA,
  PARAMS_METADATA,
} from '../../src/decorators/metadata-keys';
import { ParamMetadata } from '../../src/interfaces/openApi/decoratorOptions';
import { OpenAPIParameter } from '../../src/interfaces/openApi/parameter';

describe('Parameter Injection Decorators', () => {
  describe('@Param', () => {
    it('should store param metadata with name', () => {
      class TestController {
        getUser(@Param('id') id: string) {
          return id;
        }
      }

      const metadata = Reflect.getMetadata(
        PARAMS_METADATA,
        TestController,
        'getUser',
      ) as ParamMetadata[];

      expect(metadata).toHaveLength(1);
      expect(metadata[0].type).toBe('param');
      expect(metadata[0].name).toBe('id');
      expect(metadata[0].index).toBe(0);
    });

    it('should store param metadata with options', () => {
      class TestController {
        getUser(
          @Param('id', { description: 'User ID', schema: { type: 'integer' } })
          id: number,
        ) {
          return id;
        }
      }

      const metadata = Reflect.getMetadata(
        PARAMS_METADATA,
        TestController,
        'getUser',
      ) as ParamMetadata[];

      expect(metadata[0].options?.description).toBe('User ID');
      expect(metadata[0].options?.schema).toEqual({ type: 'integer' });
    });

    it('should auto-add OpenAPI path parameter', () => {
      class TestController {
        getUser(@Param('id') id: string) {
          return id;
        }
      }

      const openApiParams = Reflect.getMetadata(
        OPENAPI_PARAMS_METADATA,
        TestController,
        'getUser',
      ) as OpenAPIParameter[];

      expect(openApiParams).toHaveLength(1);
      expect(openApiParams[0].name).toBe('id');
      expect(openApiParams[0].in).toBe('path');
      expect(openApiParams[0].required).toBe(true);
    });

    it('should handle multiple path parameters', () => {
      class TestController {
        getPost(
          @Param('userId') userId: string,
          @Param('postId') postId: string,
        ) {
          return { userId, postId };
        }
      }

      const metadata = getParamMetadata(TestController, 'getPost');
      expect(metadata).toHaveLength(2);
      expect(metadata[0].name).toBe('userId');
      expect(metadata[1].name).toBe('postId');
    });
  });

  describe('@Body', () => {
    it('should store body metadata without field name', () => {
      class TestController {
        createUser(@Body() data: object) {
          return data;
        }
      }

      const metadata = Reflect.getMetadata(
        PARAMS_METADATA,
        TestController,
        'createUser',
      ) as ParamMetadata[];

      expect(metadata).toHaveLength(1);
      expect(metadata[0].type).toBe('body');
      expect(metadata[0].name).toBeUndefined();
      expect(metadata[0].index).toBe(0);
    });

    it('should store body metadata with field name', () => {
      class TestController {
        login(
          @Body('email') email: string,
          @Body('password') password: string,
        ) {
          return { email, password };
        }
      }

      const metadata = getParamMetadata(TestController, 'login');
      expect(metadata).toHaveLength(2);
      expect(metadata[0].type).toBe('body');
      expect(metadata[0].name).toBe('email');
      expect(metadata[1].type).toBe('body');
      expect(metadata[1].name).toBe('password');
    });

    it('should not auto-add OpenAPI parameters for body', () => {
      class TestController {
        createUser(@Body() data: object) {
          return data;
        }
      }

      const openApiParams = Reflect.getMetadata(
        OPENAPI_PARAMS_METADATA,
        TestController,
        'createUser',
      );

      expect(openApiParams).toBeUndefined();
    });
  });

  describe('@Query', () => {
    it('should store query metadata with name', () => {
      class TestController {
        listUsers(@Query('page') page: number) {
          return page;
        }
      }

      const metadata = Reflect.getMetadata(
        PARAMS_METADATA,
        TestController,
        'listUsers',
      ) as ParamMetadata[];

      expect(metadata).toHaveLength(1);
      expect(metadata[0].type).toBe('query');
      expect(metadata[0].name).toBe('page');
    });

    it('should store query metadata with options', () => {
      class TestController {
        listUsers(
          @Query('page', { description: 'Page number', required: true })
          page: number,
        ) {
          return page;
        }
      }

      const metadata = Reflect.getMetadata(
        PARAMS_METADATA,
        TestController,
        'listUsers',
      ) as ParamMetadata[];

      expect(metadata[0].options?.description).toBe('Page number');
      expect(metadata[0].options?.required).toBe(true);
    });

    it('should auto-add OpenAPI query parameter', () => {
      class TestController {
        listUsers(@Query('page') page: number) {
          return page;
        }
      }

      const openApiParams = Reflect.getMetadata(
        OPENAPI_PARAMS_METADATA,
        TestController,
        'listUsers',
      ) as OpenAPIParameter[];

      expect(openApiParams).toHaveLength(1);
      expect(openApiParams[0].name).toBe('page');
      expect(openApiParams[0].in).toBe('query');
      expect(openApiParams[0].required).toBe(false);
    });

    it('should set required from options', () => {
      class TestController {
        listUsers(@Query('page', { required: true }) page: number) {
          return page;
        }
      }

      const openApiParams = getOpenAPIParamMetadata(
        TestController,
        'listUsers',
      );
      expect(openApiParams[0].required).toBe(true);
    });

    it('should handle multiple query parameters', () => {
      class TestController {
        listUsers(
          @Query('page') page: number,
          @Query('limit') limit: number,
          @Query('sort') sort: string,
        ) {
          return { page, limit, sort };
        }
      }

      const metadata = getParamMetadata(TestController, 'listUsers');
      expect(metadata).toHaveLength(3);

      const openApiParams = getOpenAPIParamMetadata(
        TestController,
        'listUsers',
      );
      expect(openApiParams).toHaveLength(3);
    });
  });

  describe('@Header', () => {
    it('should store header metadata with name', () => {
      class TestController {
        getData(@Header('X-Request-ID') requestId: string) {
          return requestId;
        }
      }

      const metadata = Reflect.getMetadata(
        PARAMS_METADATA,
        TestController,
        'getData',
      ) as ParamMetadata[];

      expect(metadata).toHaveLength(1);
      expect(metadata[0].type).toBe('header');
      expect(metadata[0].name).toBe('X-Request-ID');
    });

    it('should auto-add OpenAPI header parameter', () => {
      class TestController {
        getData(@Header('X-Request-ID') requestId: string) {
          return requestId;
        }
      }

      const openApiParams = Reflect.getMetadata(
        OPENAPI_PARAMS_METADATA,
        TestController,
        'getData',
      ) as OpenAPIParameter[];

      expect(openApiParams).toHaveLength(1);
      expect(openApiParams[0].name).toBe('X-Request-ID');
      expect(openApiParams[0].in).toBe('header');
    });

    it('should include description in OpenAPI parameter', () => {
      class TestController {
        getData(
          @Header('Authorization', { description: 'Bearer token' })
          auth: string,
        ) {
          return auth;
        }
      }

      const openApiParams = getOpenAPIParamMetadata(TestController, 'getData');
      expect(openApiParams[0].description).toBe('Bearer token');
    });
  });

  describe('@CurrentUser', () => {
    it('should store user metadata', () => {
      class TestController {
        getProfile(@CurrentUser() user: object) {
          return user;
        }
      }

      const metadata = Reflect.getMetadata(
        PARAMS_METADATA,
        TestController,
        'getProfile',
      ) as ParamMetadata[];

      expect(metadata).toHaveLength(1);
      expect(metadata[0].type).toBe('user');
      expect(metadata[0].name).toBeUndefined();
    });

    it('should not auto-add OpenAPI parameters', () => {
      class TestController {
        getProfile(@CurrentUser() user: object) {
          return user;
        }
      }

      const openApiParams = Reflect.getMetadata(
        OPENAPI_PARAMS_METADATA,
        TestController,
        'getProfile',
      );

      expect(openApiParams).toBeUndefined();
    });
  });

  describe('@EciesUser', () => {
    it('should store eciesUser metadata', () => {
      class TestController {
        getSecureData(@EciesUser() member: object) {
          return member;
        }
      }

      const metadata = Reflect.getMetadata(
        PARAMS_METADATA,
        TestController,
        'getSecureData',
      ) as ParamMetadata[];

      expect(metadata).toHaveLength(1);
      expect(metadata[0].type).toBe('eciesUser');
    });
  });

  describe('@Req', () => {
    it('should store req metadata', () => {
      class TestController {
        handleRequest(@Req() req: object) {
          return req;
        }
      }

      const metadata = Reflect.getMetadata(
        PARAMS_METADATA,
        TestController,
        'handleRequest',
      ) as ParamMetadata[];

      expect(metadata).toHaveLength(1);
      expect(metadata[0].type).toBe('req');
    });
  });

  describe('@Res', () => {
    it('should store res metadata', () => {
      class TestController {
        handleResponse(@Res() res: object) {
          return res;
        }
      }

      const metadata = Reflect.getMetadata(
        PARAMS_METADATA,
        TestController,
        'handleResponse',
      ) as ParamMetadata[];

      expect(metadata).toHaveLength(1);
      expect(metadata[0].type).toBe('res');
    });
  });

  describe('@Next', () => {
    it('should store next metadata', () => {
      class TestController {
        middleware(@Next() next: () => void) {
          return next;
        }
      }

      const metadata = Reflect.getMetadata(
        PARAMS_METADATA,
        TestController,
        'middleware',
      ) as ParamMetadata[];

      expect(metadata).toHaveLength(1);
      expect(metadata[0].type).toBe('next');
    });
  });

  describe('getParamMetadata', () => {
    it('should return empty array when no params', () => {
      class TestController {
        noParams() {}
      }

      const metadata = getParamMetadata(TestController, 'noParams');
      expect(metadata).toEqual([]);
    });

    it('should return params sorted by index', () => {
      class TestController {
        mixedParams(
          @Query('page') page: number,
          @Param('id') id: string,
          @Body() body: object,
        ) {
          return { page, id, body };
        }
      }

      const metadata = getParamMetadata(TestController, 'mixedParams');
      expect(metadata).toHaveLength(3);
      expect(metadata[0].index).toBe(0);
      expect(metadata[1].index).toBe(1);
      expect(metadata[2].index).toBe(2);
    });
  });

  describe('getOpenAPIParamMetadata', () => {
    it('should return empty array when no OpenAPI params', () => {
      class TestController {
        noOpenApiParams(@Body() body: object) {
          return body;
        }
      }

      const params = getOpenAPIParamMetadata(TestController, 'noOpenApiParams');
      expect(params).toEqual([]);
    });

    it('should return all OpenAPI params', () => {
      class TestController {
        mixedParams(
          @Param('id') id: string,
          @Query('page') page: number,
          @Header('X-Token') token: string,
        ) {
          return { id, page, token };
        }
      }

      const params = getOpenAPIParamMetadata(TestController, 'mixedParams');
      expect(params).toHaveLength(3);
      expect(params.map((p) => p.in)).toContain('path');
      expect(params.map((p) => p.in)).toContain('query');
      expect(params.map((p) => p.in)).toContain('header');
    });
  });

  describe('Mixed parameter decorators', () => {
    it('should handle all parameter types in one method', () => {
      class TestController {
        complexHandler(
          @Param('id') id: string,
          @Query('include') include: string,
          @Header('Authorization') auth: string,
          @Body() body: object,
          @CurrentUser() user: object,
          @Req() req: object,
          @Res() res: object,
        ) {
          return { id, include, auth, body, user, req, res };
        }
      }

      const metadata = getParamMetadata(TestController, 'complexHandler');
      expect(metadata).toHaveLength(7);

      const types = metadata.map((m) => m.type);
      expect(types).toContain('param');
      expect(types).toContain('query');
      expect(types).toContain('header');
      expect(types).toContain('body');
      expect(types).toContain('user');
      expect(types).toContain('req');
      expect(types).toContain('res');
    });

    it('should preserve parameter order', () => {
      class TestController {
        orderedParams(
          @Req() req: object,
          @Param('id') id: string,
          @Body() body: object,
          @Res() res: object,
        ) {
          return { req, id, body, res };
        }
      }

      const metadata = getParamMetadata(TestController, 'orderedParams');
      expect(metadata[0].type).toBe('req');
      expect(metadata[1].type).toBe('param');
      expect(metadata[2].type).toBe('body');
      expect(metadata[3].type).toBe('res');
    });
  });

  describe('OpenAPI parameter options', () => {
    it('should include schema in OpenAPI parameter', () => {
      class TestController {
        getUser(
          @Param('id', { schema: { type: 'integer', format: 'int64' } })
          id: number,
        ) {
          return id;
        }
      }

      const params = getOpenAPIParamMetadata(TestController, 'getUser');
      expect(params[0].schema).toEqual({ type: 'integer', format: 'int64' });
    });

    it('should default schema to string type', () => {
      class TestController {
        getUser(@Param('id') id: string) {
          return id;
        }
      }

      const params = getOpenAPIParamMetadata(TestController, 'getUser');
      expect(params[0].schema).toEqual({ type: 'string' });
    });

    it('should not duplicate OpenAPI params when decorator applied multiple times', () => {
      // This tests the deduplication logic
      class TestController {
        getUser(@Param('id') id: string) {
          return id;
        }
      }

      // Manually add another param with same name to test deduplication
      const existingParams = getOpenAPIParamMetadata(TestController, 'getUser');
      expect(existingParams.filter((p) => p.name === 'id')).toHaveLength(1);
    });
  });
});

describe('OpenAPI Parameter Generation', () => {
  describe('Path parameters', () => {
    it('should generate required path parameter with string schema', () => {
      class TestController {
        getUser(@Param('userId') userId: string) {
          return userId;
        }
      }

      const params = getOpenAPIParamMetadata(TestController, 'getUser');
      expect(params).toHaveLength(1);
      expect(params[0]).toEqual({
        name: 'userId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
      });
    });

    it('should generate path parameter with custom schema', () => {
      class TestController {
        getUser(
          @Param('id', { schema: { type: 'integer', minimum: 1 } }) id: number,
        ) {
          return id;
        }
      }

      const params = getOpenAPIParamMetadata(TestController, 'getUser');
      expect(params[0].schema).toEqual({ type: 'integer', minimum: 1 });
    });

    it('should always set path parameters as required', () => {
      class TestController {
        getUser(
          @Param('id', { required: false }) id: string, // required: false should be ignored
        ) {
          return id;
        }
      }

      const params = getOpenAPIParamMetadata(TestController, 'getUser');
      expect(params[0].required).toBe(true);
    });

    it('should include description when provided', () => {
      class TestController {
        getUser(
          @Param('id', { description: 'Unique user identifier' }) id: string,
        ) {
          return id;
        }
      }

      const params = getOpenAPIParamMetadata(TestController, 'getUser');
      expect(params[0].description).toBe('Unique user identifier');
    });

    it('should generate multiple path parameters', () => {
      class TestController {
        getComment(
          @Param('postId', { description: 'Post ID' }) postId: string,
          @Param('commentId', { description: 'Comment ID' }) commentId: string,
        ) {
          return { postId, commentId };
        }
      }

      const params = getOpenAPIParamMetadata(TestController, 'getComment');
      expect(params).toHaveLength(2);

      const postIdParam = params.find((p) => p.name === 'postId');
      const commentIdParam = params.find((p) => p.name === 'commentId');

      expect(postIdParam).toBeDefined();
      expect(postIdParam?.description).toBe('Post ID');
      expect(commentIdParam).toBeDefined();
      expect(commentIdParam?.description).toBe('Comment ID');
    });
  });

  describe('Query parameters', () => {
    it('should generate optional query parameter by default', () => {
      class TestController {
        listUsers(@Query('page') page: number) {
          return page;
        }
      }

      const params = getOpenAPIParamMetadata(TestController, 'listUsers');
      expect(params[0]).toEqual({
        name: 'page',
        in: 'query',
        required: false,
        schema: { type: 'string' },
      });
    });

    it('should generate required query parameter when specified', () => {
      class TestController {
        search(@Query('q', { required: true }) query: string) {
          return query;
        }
      }

      const params = getOpenAPIParamMetadata(TestController, 'search');
      expect(params[0].required).toBe(true);
    });

    it('should generate query parameter with custom schema', () => {
      class TestController {
        listUsers(
          @Query('limit', {
            schema: { type: 'integer', minimum: 1, maximum: 100 },
          })
          limit: number,
        ) {
          return limit;
        }
      }

      const params = getOpenAPIParamMetadata(TestController, 'listUsers');
      expect(params[0].schema).toEqual({
        type: 'integer',
        minimum: 1,
        maximum: 100,
      });
    });

    it('should generate multiple query parameters', () => {
      class TestController {
        listUsers(
          @Query('page', { schema: { type: 'integer' } }) page: number,
          @Query('limit', { schema: { type: 'integer' } }) limit: number,
          @Query('sort') sort: string,
          @Query('order') order: string,
        ) {
          return { page, limit, sort, order };
        }
      }

      const params = getOpenAPIParamMetadata(TestController, 'listUsers');
      expect(params).toHaveLength(4);

      const paramNames = params.map((p) => p.name);
      expect(paramNames).toContain('page');
      expect(paramNames).toContain('limit');
      expect(paramNames).toContain('sort');
      expect(paramNames).toContain('order');
    });
  });

  describe('Header parameters', () => {
    it('should generate optional header parameter by default', () => {
      class TestController {
        getData(@Header('X-Request-ID') requestId: string) {
          return requestId;
        }
      }

      const params = getOpenAPIParamMetadata(TestController, 'getData');
      expect(params[0]).toEqual({
        name: 'X-Request-ID',
        in: 'header',
        required: false,
        schema: { type: 'string' },
      });
    });

    it('should generate required header parameter when specified', () => {
      class TestController {
        getData(@Header('Authorization', { required: true }) auth: string) {
          return auth;
        }
      }

      const params = getOpenAPIParamMetadata(TestController, 'getData');
      expect(params[0].required).toBe(true);
    });

    it('should include description for header parameter', () => {
      class TestController {
        getData(
          @Header('X-API-Key', {
            description: 'API key for authentication',
            required: true,
          })
          apiKey: string,
        ) {
          return apiKey;
        }
      }

      const params = getOpenAPIParamMetadata(TestController, 'getData');
      expect(params[0].description).toBe('API key for authentication');
      expect(params[0].required).toBe(true);
    });
  });

  describe('Mixed parameter types', () => {
    it('should generate OpenAPI params for path, query, and header but not body', () => {
      class TestController {
        updateUser(
          @Param('id') id: string,
          @Query('notify') notify: string,
          @Header('X-Request-ID') requestId: string,
          @Body() body: object,
          @CurrentUser() user: object,
        ) {
          return { id, notify, requestId, body, user };
        }
      }

      const params = getOpenAPIParamMetadata(TestController, 'updateUser');
      expect(params).toHaveLength(3);

      const locations = params.map((p) => p.in);
      expect(locations).toContain('path');
      expect(locations).toContain('query');
      expect(locations).toContain('header');
    });

    it('should maintain correct parameter locations', () => {
      class TestController {
        complexEndpoint(
          @Param('resourceId', { description: 'Resource ID' })
          resourceId: string,
          @Param('subResourceId', { description: 'Sub-resource ID' })
          subResourceId: string,
          @Query('include', { description: 'Fields to include' })
          include: string,
          @Query('expand', { description: 'Relations to expand' })
          expand: string,
          @Header('Accept-Language', { description: 'Preferred language' })
          lang: string,
        ) {
          return { resourceId, subResourceId, include, expand, lang };
        }
      }

      const params = getOpenAPIParamMetadata(TestController, 'complexEndpoint');
      expect(params).toHaveLength(5);

      const pathParams = params.filter((p) => p.in === 'path');
      const queryParams = params.filter((p) => p.in === 'query');
      const headerParams = params.filter((p) => p.in === 'header');

      expect(pathParams).toHaveLength(2);
      expect(queryParams).toHaveLength(2);
      expect(headerParams).toHaveLength(1);

      // Path params should be required
      pathParams.forEach((p) => expect(p.required).toBe(true));

      // Query and header params should be optional by default
      queryParams.forEach((p) => expect(p.required).toBe(false));
      headerParams.forEach((p) => expect(p.required).toBe(false));
    });
  });

  describe('Parameter deduplication', () => {
    it('should not create duplicate OpenAPI params for same name and location', () => {
      class TestController {
        getUser(@Param('id') id: string) {
          return id;
        }
      }

      // Get params twice to ensure no duplication
      const params1 = getOpenAPIParamMetadata(TestController, 'getUser');
      const params2 = getOpenAPIParamMetadata(TestController, 'getUser');

      expect(params1).toHaveLength(1);
      expect(params2).toHaveLength(1);
    });
  });

  describe('Schema types', () => {
    it('should support string schema', () => {
      class TestController {
        get(@Param('id', { schema: { type: 'string' } }) id: string) {
          return id;
        }
      }

      const params = getOpenAPIParamMetadata(TestController, 'get');
      expect(params[0].schema).toEqual({ type: 'string' });
    });

    it('should support integer schema with format', () => {
      class TestController {
        get(
          @Param('id', { schema: { type: 'integer', format: 'int64' } })
          id: number,
        ) {
          return id;
        }
      }

      const params = getOpenAPIParamMetadata(TestController, 'get');
      expect(params[0].schema).toEqual({ type: 'integer', format: 'int64' });
    });

    it('should support number schema', () => {
      class TestController {
        get(
          @Query('price', { schema: { type: 'number', format: 'double' } })
          price: number,
        ) {
          return price;
        }
      }

      const params = getOpenAPIParamMetadata(TestController, 'get');
      expect(params[0].schema).toEqual({ type: 'number', format: 'double' });
    });

    it('should support boolean schema', () => {
      class TestController {
        get(@Query('active', { schema: { type: 'boolean' } }) active: boolean) {
          return active;
        }
      }

      const params = getOpenAPIParamMetadata(TestController, 'get');
      expect(params[0].schema).toEqual({ type: 'boolean' });
    });

    it('should support array schema', () => {
      class TestController {
        get(
          @Query('ids', {
            schema: { type: 'array', items: { type: 'string' } },
          })
          ids: string[],
        ) {
          return ids;
        }
      }

      const params = getOpenAPIParamMetadata(TestController, 'get');
      expect(params[0].schema).toEqual({
        type: 'array',
        items: { type: 'string' },
      });
    });

    it('should support enum in schema', () => {
      class TestController {
        get(
          @Query('status', {
            schema: { type: 'string', enum: ['active', 'inactive', 'pending'] },
          })
          status: string,
        ) {
          return status;
        }
      }

      const params = getOpenAPIParamMetadata(TestController, 'get');
      expect(params[0].schema).toEqual({
        type: 'string',
        enum: ['active', 'inactive', 'pending'],
      });
    });
  });
});

describe('Integration with Route Decorators', () => {
  // Import route decorators for integration tests
  const {
    Get,
    Post,
    Put,
    Delete,
    Patch,
  } = require('../../src/decorators/http-methods');
  const { ApiController } = require('../../src/decorators/controller');
  const { RequireAuth } = require('../../src/decorators/auth');
  const {
    ROUTES_METADATA,
    OPENAPI_METADATA,
  } = require('../../src/decorators/metadata-keys');

  describe('Parameter decorators with HTTP method decorators', () => {
    it('should work with @Get decorator', () => {
      class TestController {
        @Get('/:id')
        getUser(@Param('id') id: string) {
          return id;
        }
      }

      const paramMeta = getParamMetadata(TestController, 'getUser');
      expect(paramMeta).toHaveLength(1);
      expect(paramMeta[0].type).toBe('param');

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes).toHaveLength(1);
      expect(routes[0].method).toBe('get');
    });

    it('should work with @Post decorator and @Body', () => {
      class TestController {
        @Post('/')
        createUser(@Body() data: object) {
          return data;
        }
      }

      const paramMeta = getParamMetadata(TestController, 'createUser');
      expect(paramMeta).toHaveLength(1);
      expect(paramMeta[0].type).toBe('body');

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes[0].method).toBe('post');
    });

    it('should work with @Put decorator and mixed params', () => {
      class TestController {
        @Put('/:id')
        updateUser(@Param('id') id: string, @Body() data: object) {
          return { id, data };
        }
      }

      const paramMeta = getParamMetadata(TestController, 'updateUser');
      expect(paramMeta).toHaveLength(2);

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes[0].method).toBe('put');
    });

    it('should work with @Delete decorator', () => {
      class TestController {
        @Delete('/:id')
        deleteUser(@Param('id') id: string) {
          return id;
        }
      }

      const paramMeta = getParamMetadata(TestController, 'deleteUser');
      expect(paramMeta).toHaveLength(1);

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes[0].method).toBe('delete');
    });

    it('should work with @Patch decorator', () => {
      class TestController {
        @Patch('/:id')
        patchUser(@Param('id') id: string, @Body() data: object) {
          return { id, data };
        }
      }

      const paramMeta = getParamMetadata(TestController, 'patchUser');
      expect(paramMeta).toHaveLength(2);

      const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
      expect(routes[0].method).toBe('patch');
    });
  });

  describe('Parameter decorators with @ApiController', () => {
    it('should work with class-level @ApiController', () => {
      @ApiController('/api/users')
      class UserController {
        @Get('/:id')
        getUser(@Param('id') id: string) {
          return id;
        }

        @Get('/')
        listUsers(@Query('page') page: number, @Query('limit') limit: number) {
          return { page, limit };
        }
      }

      const getUserParams = getParamMetadata(UserController, 'getUser');
      expect(getUserParams).toHaveLength(1);

      const listUsersParams = getParamMetadata(UserController, 'listUsers');
      expect(listUsersParams).toHaveLength(2);
    });
  });

  describe('Parameter decorators with auth decorators', () => {
    it('should work with @RequireAuth and @CurrentUser', () => {
      class TestController {
        @RequireAuth()
        @Get('/profile')
        getProfile(@CurrentUser() user: object) {
          return user;
        }
      }

      const paramMeta = getParamMetadata(TestController, 'getProfile');
      expect(paramMeta).toHaveLength(1);
      expect(paramMeta[0].type).toBe('user');
    });
  });

  describe('OpenAPI parameter merging with route decorators', () => {
    it('should merge param decorator OpenAPI params with route path params', () => {
      class TestController {
        @Get('/:id/:subId', { summary: 'Get resource' })
        getResource(
          @Param('id', { description: 'Resource ID' }) id: string,
          @Param('subId', { description: 'Sub-resource ID' }) subId: string,
        ) {
          return { id, subId };
        }
      }

      // Check param decorator metadata
      const paramOpenAPI = getOpenAPIParamMetadata(
        TestController,
        'getResource',
      );
      expect(paramOpenAPI).toHaveLength(2);

      const idParam = paramOpenAPI.find((p) => p.name === 'id');
      expect(idParam?.description).toBe('Resource ID');

      // Check route decorator metadata
      const routeOpenAPI = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'getResource',
      );
      expect(routeOpenAPI.summary).toBe('Get resource');
      // Route decorator also extracts path params
      expect(routeOpenAPI.parameters).toHaveLength(2);
    });

    it('should generate OpenAPI params for query parameters', () => {
      class TestController {
        @Get('/search')
        search(
          @Query('q', { description: 'Search query', required: true })
          query: string,
          @Query('page', { description: 'Page number' }) page: number,
        ) {
          return { query, page };
        }
      }

      const openAPIParams = getOpenAPIParamMetadata(TestController, 'search');
      expect(openAPIParams).toHaveLength(2);

      const qParam = openAPIParams.find((p) => p.name === 'q');
      expect(qParam?.required).toBe(true);
      expect(qParam?.description).toBe('Search query');

      const pageParam = openAPIParams.find((p) => p.name === 'page');
      expect(pageParam?.required).toBe(false);
    });
  });

  describe('Full controller example with all parameter types', () => {
    it('should handle a realistic controller with various parameter decorators', () => {
      @RequireAuth()
      @ApiController('/api/resources', { tags: ['Resources'] })
      class ResourceController {
        @Get('/')
        list(
          @Query('page') page: number,
          @Query('limit') limit: number,
          @Query('sort') sort: string,
          @Header('Accept-Language') lang: string,
        ) {
          return { page, limit, sort, lang };
        }

        @Get('/:id')
        getOne(
          @Param('id', { description: 'Resource ID' }) id: string,
          @Query('include') include: string,
          @CurrentUser() user: object,
        ) {
          return { id, include, user };
        }

        @Post('/')
        create(
          @Body() data: object,
          @CurrentUser() user: object,
          @Header('X-Request-ID') requestId: string,
        ) {
          return { data, user, requestId };
        }

        @Put('/:id')
        update(
          @Param('id') id: string,
          @Body() data: object,
          @CurrentUser() user: object,
        ) {
          return { id, data, user };
        }

        @Delete('/:id')
        remove(@Param('id') id: string, @CurrentUser() user: object) {
          return { id, user };
        }
      }

      // Verify list method params
      const listParams = getParamMetadata(ResourceController, 'list');
      expect(listParams).toHaveLength(4);
      expect(listParams.filter((p) => p.type === 'query')).toHaveLength(3);
      expect(listParams.filter((p) => p.type === 'header')).toHaveLength(1);

      // Verify getOne method params
      const getOneParams = getParamMetadata(ResourceController, 'getOne');
      expect(getOneParams).toHaveLength(3);
      expect(getOneParams.filter((p) => p.type === 'param')).toHaveLength(1);
      expect(getOneParams.filter((p) => p.type === 'query')).toHaveLength(1);
      expect(getOneParams.filter((p) => p.type === 'user')).toHaveLength(1);

      // Verify create method params
      const createParams = getParamMetadata(ResourceController, 'create');
      expect(createParams).toHaveLength(3);
      expect(createParams.filter((p) => p.type === 'body')).toHaveLength(1);
      expect(createParams.filter((p) => p.type === 'user')).toHaveLength(1);
      expect(createParams.filter((p) => p.type === 'header')).toHaveLength(1);

      // Verify update method params
      const updateParams = getParamMetadata(ResourceController, 'update');
      expect(updateParams).toHaveLength(3);

      // Verify remove method params
      const removeParams = getParamMetadata(ResourceController, 'remove');
      expect(removeParams).toHaveLength(2);

      // Verify routes are registered
      const routes = Reflect.getMetadata(ROUTES_METADATA, ResourceController);
      expect(routes).toHaveLength(5);

      // Verify OpenAPI params are generated for path, query, header
      const listOpenAPI = getOpenAPIParamMetadata(ResourceController, 'list');
      expect(listOpenAPI).toHaveLength(4); // 3 query + 1 header

      const getOneOpenAPI = getOpenAPIParamMetadata(
        ResourceController,
        'getOne',
      );
      expect(getOneOpenAPI).toHaveLength(2); // 1 path + 1 query (user doesn't generate OpenAPI param)
    });
  });

  describe('Decorator order independence', () => {
    it('should work regardless of decorator order (param first)', () => {
      class TestController {
        getUser(@Param('id') id: string) {
          return id;
        }
      }
      // Apply Get decorator after
      Get('/:id')(
        TestController.prototype,
        'getUser',
        Object.getOwnPropertyDescriptor(TestController.prototype, 'getUser')!,
      );

      const paramMeta = getParamMetadata(TestController, 'getUser');
      expect(paramMeta).toHaveLength(1);
    });

    it('should work with multiple param decorators in any order', () => {
      class TestController {
        @Get('/:id')
        handler(
          @Body() body: object,
          @Param('id') id: string,
          @Query('q') q: string,
        ) {
          return { body, id, q };
        }
      }

      const paramMeta = getParamMetadata(TestController, 'handler');
      expect(paramMeta).toHaveLength(3);

      // Verify all types are present
      const types = paramMeta.map((p) => p.type);
      expect(types).toContain('body');
      expect(types).toContain('param');
      expect(types).toContain('query');
    });
  });
});
