import 'reflect-metadata';
import {
  ResponseDoc,
  getEffectiveResponseMetadata,
  getPaginationOptions,
  getResponseForStatusCode,
  getResponseMetadata,
  isPaginatedEndpoint,
  isRawJsonHandler,
  mergeResponseMetadata,
  Paginated,
  RawJson,
  Returns,
} from '../../src/decorators/response';
import {
  OPENAPI_METADATA,
  RESPONSE_METADATA,
} from '../../src/decorators/metadata-keys';
import { ResponseMetadata } from '../../src/interfaces/openApi/decoratorOptions';

describe('Response Decorators', () => {
  describe('@Returns', () => {
    it('should set response metadata on method', () => {
      class TestController {
        @Returns(200, 'User')
        getUser() {}
      }

      const metadata = Reflect.getMetadata(
        RESPONSE_METADATA,
        TestController,
        'getUser',
      ) as ResponseMetadata[];
      expect(metadata).toHaveLength(1);
      expect(metadata[0].statusCode).toBe(200);
      expect(metadata[0].schema).toBe('User');
    });

    it('should support description option', () => {
      class TestController {
        @Returns(200, 'User', { description: 'User found successfully' })
        getUser() {}
      }

      const metadata = Reflect.getMetadata(
        RESPONSE_METADATA,
        TestController,
        'getUser',
      ) as ResponseMetadata[];
      expect(metadata[0].description).toBe('User found successfully');
    });

    it('should support example option', () => {
      const example = { id: '123', name: 'John' };
      class TestController {
        @Returns(200, 'User', { example })
        getUser() {}
      }

      const metadata = Reflect.getMetadata(
        RESPONSE_METADATA,
        TestController,
        'getUser',
      ) as ResponseMetadata[];
      expect(metadata[0].example).toEqual(example);
    });

    it('should work without schema (for no-body responses)', () => {
      class TestController {
        @Returns(204)
        deleteUser() {}
      }

      const metadata = Reflect.getMetadata(
        RESPONSE_METADATA,
        TestController,
        'deleteUser',
      ) as ResponseMetadata[];
      expect(metadata[0].statusCode).toBe(204);
      expect(metadata[0].schema).toBeUndefined();
    });

    it('should allow stacking multiple @Returns decorators', () => {
      class TestController {
        @Returns(200, 'User', { description: 'Success' })
        @Returns(404, 'ErrorResponse', { description: 'Not found' })
        @Returns(500, 'ErrorResponse', { description: 'Server error' })
        getUser() {}
      }

      const metadata = Reflect.getMetadata(
        RESPONSE_METADATA,
        TestController,
        'getUser',
      ) as ResponseMetadata[];
      expect(metadata).toHaveLength(3);
      expect(metadata.map((m) => m.statusCode)).toContain(200);
      expect(metadata.map((m) => m.statusCode)).toContain(404);
      expect(metadata.map((m) => m.statusCode)).toContain(500);
    });
  });

  describe('@ResponseDoc', () => {
    it('should set response metadata with inline schema', () => {
      class TestController {
        @ResponseDoc(200, {
          description: 'Health check response',
          schema: {
            type: 'object',
            properties: {
              status: { type: 'string' },
            },
          },
        })
        healthCheck() {}
      }

      const metadata = Reflect.getMetadata(
        RESPONSE_METADATA,
        TestController,
        'healthCheck',
      ) as Array<ResponseMetadata & { inlineSchema?: unknown }>;
      expect(metadata).toHaveLength(1);
      expect(metadata[0].statusCode).toBe(200);
      expect(metadata[0].description).toBe('Health check response');
      expect(metadata[0].inlineSchema).toEqual({
        type: 'object',
        properties: {
          status: { type: 'string' },
        },
      });
    });

    it('should support schemaRef option', () => {
      class TestController {
        @ResponseDoc(200, { schemaRef: 'User' })
        getUser() {}
      }

      const metadata = Reflect.getMetadata(
        RESPONSE_METADATA,
        TestController,
        'getUser',
      ) as ResponseMetadata[];
      expect(metadata[0].schema).toBe('User');
    });

    it('should support example option', () => {
      const example = { status: 'ok' };
      class TestController {
        @ResponseDoc(200, { example })
        healthCheck() {}
      }

      const metadata = Reflect.getMetadata(
        RESPONSE_METADATA,
        TestController,
        'healthCheck',
      ) as ResponseMetadata[];
      expect(metadata[0].example).toEqual(example);
    });

    it('should work with minimal options', () => {
      class TestController {
        @ResponseDoc(204)
        deleteItem() {}
      }

      const metadata = Reflect.getMetadata(
        RESPONSE_METADATA,
        TestController,
        'deleteItem',
      ) as ResponseMetadata[];
      expect(metadata[0].statusCode).toBe(204);
    });
  });

  describe('@RawJson', () => {
    it('should set rawJson flag in OpenAPI metadata', () => {
      class TestController {
        @RawJson()
        getRawData() {}
      }

      const metadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'getRawData',
      ) as { rawJson?: boolean };
      expect(metadata.rawJson).toBe(true);
    });

    it('should be detectable via isRawJsonHandler', () => {
      class TestController {
        @RawJson()
        rawMethod() {}

        normalMethod() {}
      }

      expect(isRawJsonHandler(TestController, 'rawMethod')).toBe(true);
      expect(isRawJsonHandler(TestController, 'normalMethod')).toBe(false);
    });
  });

  describe('@Paginated', () => {
    it('should add pagination query parameters to OpenAPI metadata', () => {
      class TestController {
        @Paginated()
        listUsers() {}
      }

      const metadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'listUsers',
      ) as { parameters?: Array<{ name: string; in: string }> };
      expect(metadata.parameters).toBeDefined();
      expect(metadata.parameters?.map((p) => p.name)).toContain('page');
      expect(metadata.parameters?.map((p) => p.name)).toContain('limit');
    });

    it('should set isPaginated flag', () => {
      class TestController {
        @Paginated()
        listUsers() {}
      }

      expect(isPaginatedEndpoint(TestController, 'listUsers')).toBe(true);
    });

    it('should support custom defaultPageSize', () => {
      class TestController {
        @Paginated({ defaultPageSize: 50 })
        listUsers() {}
      }

      const options = getPaginationOptions(TestController, 'listUsers');
      expect(options?.defaultPageSize).toBe(50);
    });

    it('should support custom maxPageSize', () => {
      class TestController {
        @Paginated({ maxPageSize: 200 })
        listUsers() {}
      }

      const options = getPaginationOptions(TestController, 'listUsers');
      expect(options?.maxPageSize).toBe(200);
    });

    it('should support offset-based pagination', () => {
      class TestController {
        @Paginated({ useOffset: true })
        listUsers() {}
      }

      const metadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'listUsers',
      ) as { parameters?: Array<{ name: string }> };
      expect(metadata.parameters?.map((p) => p.name)).toContain('offset');
      expect(metadata.parameters?.map((p) => p.name)).toContain('limit');
      expect(metadata.parameters?.map((p) => p.name)).not.toContain('page');
    });

    it('should not be paginated for non-decorated methods', () => {
      class TestController {
        normalMethod() {}
      }

      expect(isPaginatedEndpoint(TestController, 'normalMethod')).toBe(false);
      expect(
        getPaginationOptions(TestController, 'normalMethod'),
      ).toBeUndefined();
    });
  });

  describe('getResponseMetadata', () => {
    it('should return empty array for methods without responses', () => {
      class TestController {
        noResponses() {}
      }

      const metadata = getResponseMetadata(TestController, 'noResponses');
      expect(metadata).toEqual([]);
    });

    it('should return all response metadata for a method', () => {
      class TestController {
        @Returns(200, 'User')
        @Returns(404, 'ErrorResponse')
        getUser() {}
      }

      const metadata = getResponseMetadata(TestController, 'getUser');
      expect(metadata).toHaveLength(2);
    });
  });

  describe('getResponseForStatusCode', () => {
    it('should return response for specific status code', () => {
      class TestController {
        @Returns(200, 'User', { description: 'Success' })
        @Returns(404, 'ErrorResponse', { description: 'Not found' })
        getUser() {}
      }

      const response = getResponseForStatusCode(TestController, 'getUser', 404);
      expect(response?.statusCode).toBe(404);
      expect(response?.description).toBe('Not found');
    });

    it('should return undefined for non-existent status code', () => {
      class TestController {
        @Returns(200, 'User')
        getUser() {}
      }

      const response = getResponseForStatusCode(TestController, 'getUser', 500);
      expect(response).toBeUndefined();
    });
  });

  describe('mergeResponseMetadata', () => {
    it('should merge class and method responses', () => {
      const classResponses: ResponseMetadata[] = [
        { statusCode: 401, description: 'Unauthorized' },
        { statusCode: 500, description: 'Server error' },
      ];
      const methodResponses: ResponseMetadata[] = [
        { statusCode: 200, schema: 'User', description: 'Success' },
        { statusCode: 404, description: 'Not found' },
      ];

      const merged = mergeResponseMetadata(classResponses, methodResponses);
      expect(merged).toHaveLength(4);
      expect(merged.map((r) => r.statusCode).sort()).toEqual([
        200, 401, 404, 500,
      ]);
    });

    it('should allow method responses to override class responses', () => {
      const classResponses: ResponseMetadata[] = [
        { statusCode: 500, description: 'Class-level error' },
      ];
      const methodResponses: ResponseMetadata[] = [
        { statusCode: 500, description: 'Method-level error' },
      ];

      const merged = mergeResponseMetadata(classResponses, methodResponses);
      expect(merged).toHaveLength(1);
      expect(merged[0].description).toBe('Method-level error');
    });
  });

  describe('getEffectiveResponseMetadata', () => {
    it('should merge class-level and method-level responses', () => {
      class TestController {
        @Returns(200, 'User')
        getUser() {}
      }

      // Set class-level metadata manually for this test
      Reflect.defineMetadata(
        RESPONSE_METADATA,
        [
          {
            statusCode: 401,
            schema: 'ErrorResponse',
            description: 'Unauthorized',
          },
        ],
        TestController,
      );

      const effective = getEffectiveResponseMetadata(TestController, 'getUser');
      expect(effective.map((r) => r.statusCode)).toContain(200);
      expect(effective.map((r) => r.statusCode)).toContain(401);
    });
  });
});

describe('Response Accumulation', () => {
  it('should accumulate responses from multiple @Returns decorators', () => {
    class TestController {
      @Returns(200, 'User', { description: 'User found' })
      @Returns(201, 'User', { description: 'User created' })
      @Returns(400, 'ValidationError', { description: 'Validation failed' })
      @Returns(401, 'ErrorResponse', { description: 'Unauthorized' })
      @Returns(404, 'ErrorResponse', { description: 'Not found' })
      @Returns(500, 'ErrorResponse', { description: 'Server error' })
      complexEndpoint() {}
    }

    const metadata = getResponseMetadata(TestController, 'complexEndpoint');
    expect(metadata).toHaveLength(6);

    const statusCodes = metadata.map((m) => m.statusCode);
    expect(statusCodes).toContain(200);
    expect(statusCodes).toContain(201);
    expect(statusCodes).toContain(400);
    expect(statusCodes).toContain(401);
    expect(statusCodes).toContain(404);
    expect(statusCodes).toContain(500);
  });

  it('should preserve order of decorators', () => {
    class TestController {
      @Returns(200, 'Success')
      @Returns(400, 'BadRequest')
      @Returns(500, 'ServerError')
      orderedEndpoint() {}
    }

    const metadata = getResponseMetadata(TestController, 'orderedEndpoint');
    // Decorators are applied bottom-up, so order is reversed
    expect(metadata[0].statusCode).toBe(500);
    expect(metadata[1].statusCode).toBe(400);
    expect(metadata[2].statusCode).toBe(200);
  });

  it('should allow same status code multiple times (for different content types)', () => {
    class TestController {
      @Returns(200, 'JsonResponse', { description: 'JSON response' })
      @Returns(200, 'XmlResponse', { description: 'XML response' })
      multiFormatEndpoint() {}
    }

    const metadata = getResponseMetadata(TestController, 'multiFormatEndpoint');
    expect(metadata).toHaveLength(2);
    expect(metadata.filter((m) => m.statusCode === 200)).toHaveLength(2);
  });
});

describe('Integration with HTTP Method Decorators', () => {
  const { Get, Post, Delete } = require('../../src/decorators/http-methods');
  const { ApiController } = require('../../src/decorators/controller');
  const { ROUTES_METADATA } = require('../../src/decorators/metadata-keys');

  it('should work with @Get decorator', () => {
    class TestController {
      @Returns(200, 'User')
      @Returns(404, 'ErrorResponse')
      @Get('/users/:id')
      getUser() {}
    }

    const responses = getResponseMetadata(TestController, 'getUser');
    expect(responses).toHaveLength(2);

    const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
    expect(routes).toHaveLength(1);
    expect(routes[0].method).toBe('get');
  });

  it('should work with @Post decorator', () => {
    class TestController {
      @Returns(201, 'User', { description: 'User created' })
      @Returns(400, 'ValidationError')
      @Post('/users')
      createUser() {}
    }

    const responses = getResponseMetadata(TestController, 'createUser');
    expect(responses).toHaveLength(2);
    expect(responses.find((r) => r.statusCode === 201)?.description).toBe(
      'User created',
    );
  });

  it('should work with @RawJson and route decorators', () => {
    class TestController {
      @RawJson()
      @Returns(200, 'RawData')
      @Get('/raw')
      getRawData() {}
    }

    expect(isRawJsonHandler(TestController, 'getRawData')).toBe(true);
    const responses = getResponseMetadata(TestController, 'getRawData');
    expect(responses).toHaveLength(1);
  });

  it('should work with @Paginated and route decorators', () => {
    class TestController {
      @Paginated({ defaultPageSize: 25 })
      @Returns(200, 'UserList')
      @Get('/users')
      listUsers() {}
    }

    expect(isPaginatedEndpoint(TestController, 'listUsers')).toBe(true);
    const options = getPaginationOptions(TestController, 'listUsers');
    expect(options?.defaultPageSize).toBe(25);
  });

  it('should work with @ApiController', () => {
    @ApiController('/api/items')
    class ItemController {
      @Returns(200, 'Item')
      @Returns(404, 'ErrorResponse')
      @Get('/:id')
      getItem() {}

      @Paginated()
      @Returns(200, 'ItemList')
      @Get('/')
      listItems() {}

      @RawJson()
      @Returns(200, 'RawItem')
      @Get('/raw/:id')
      getRawItem() {}
    }

    // Verify responses
    expect(getResponseMetadata(ItemController, 'getItem')).toHaveLength(2);
    expect(getResponseMetadata(ItemController, 'listItems')).toHaveLength(1);
    expect(getResponseMetadata(ItemController, 'getRawItem')).toHaveLength(1);

    // Verify pagination
    expect(isPaginatedEndpoint(ItemController, 'listItems')).toBe(true);
    expect(isPaginatedEndpoint(ItemController, 'getItem')).toBe(false);

    // Verify raw json
    expect(isRawJsonHandler(ItemController, 'getRawItem')).toBe(true);
    expect(isRawJsonHandler(ItemController, 'getItem')).toBe(false);
  });
});

describe('Decorator Order Independence', () => {
  const { Get } = require('../../src/decorators/http-methods');

  it('should work with @Returns before @Get', () => {
    class TestController {
      @Returns(200, 'User')
      @Get('/user')
      getUser() {}
    }

    expect(getResponseMetadata(TestController, 'getUser')).toHaveLength(1);
  });

  it('should work with @Returns after @Get', () => {
    class TestController {
      @Get('/user')
      @Returns(200, 'User')
      getUser() {}
    }

    expect(getResponseMetadata(TestController, 'getUser')).toHaveLength(1);
  });

  it('should work with @RawJson in any position', () => {
    class TestController {
      @RawJson()
      @Returns(200, 'Data')
      @Get('/data1')
      getData1() {}

      @Returns(200, 'Data')
      @RawJson()
      @Get('/data2')
      getData2() {}

      @Get('/data3')
      @Returns(200, 'Data')
      @RawJson()
      getData3() {}
    }

    expect(isRawJsonHandler(TestController, 'getData1')).toBe(true);
    expect(isRawJsonHandler(TestController, 'getData2')).toBe(true);
    expect(isRawJsonHandler(TestController, 'getData3')).toBe(true);
  });

  it('should work with @Paginated in any position', () => {
    class TestController {
      @Paginated()
      @Returns(200, 'List')
      @Get('/list1')
      getList1() {}

      @Returns(200, 'List')
      @Paginated()
      @Get('/list2')
      getList2() {}

      @Get('/list3')
      @Returns(200, 'List')
      @Paginated()
      getList3() {}
    }

    expect(isPaginatedEndpoint(TestController, 'getList1')).toBe(true);
    expect(isPaginatedEndpoint(TestController, 'getList2')).toBe(true);
    expect(isPaginatedEndpoint(TestController, 'getList3')).toBe(true);
  });
});
