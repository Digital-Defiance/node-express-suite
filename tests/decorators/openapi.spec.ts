import 'reflect-metadata';
import {
  ApiDescription,
  ApiExample,
  ApiOperation,
  ApiOperationId,
  ApiSummary,
  ApiTags,
  Deprecated,
  getClassOpenAPIMetadata,
  getEffectiveOpenAPIMetadata,
  getMethodOpenAPIMetadata,
  OpenAPIClassMetadata,
  OpenAPIMethodMetadata,
} from '../../src/decorators/openapi';
import {
  OPENAPI_CONTROLLER_METADATA,
  OPENAPI_METADATA,
} from '../../src/decorators/metadata-keys';

describe('OpenAPI Decorators', () => {
  describe('@ApiOperation', () => {
    it('should set full operation metadata on method', () => {
      class TestController {
        @ApiOperation({
          summary: 'Get user',
          description: 'Gets a user by ID',
          tags: ['Users'],
          operationId: 'getUserById',
          deprecated: false,
        })
        getUser() {}
      }

      const metadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'getUser',
      ) as OpenAPIMethodMetadata;

      expect(metadata.summary).toBe('Get user');
      expect(metadata.description).toBe('Gets a user by ID');
      expect(metadata.tags).toEqual(['Users']);
      expect(metadata.operationId).toBe('getUserById');
      expect(metadata.deprecated).toBe(false);
    });

    it('should set operation metadata on class', () => {
      @ApiOperation({
        tags: ['Admin'],
        description: 'Admin controller',
        deprecated: true,
      })
      class AdminController {}

      const metadata = Reflect.getMetadata(
        OPENAPI_CONTROLLER_METADATA,
        AdminController,
      ) as OpenAPIClassMetadata;

      expect(metadata.tags).toEqual(['Admin']);
      expect(metadata.description).toBe('Admin controller');
      expect(metadata.deprecated).toBe(true);
    });

    it('should only set provided fields', () => {
      class TestController {
        @ApiOperation({
          summary: 'Simple operation',
        })
        simpleMethod() {}
      }

      const metadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'simpleMethod',
      ) as OpenAPIMethodMetadata;

      expect(metadata.summary).toBe('Simple operation');
      expect(metadata.description).toBeUndefined();
      expect(metadata.tags).toBeUndefined();
      expect(metadata.operationId).toBeUndefined();
      expect(metadata.deprecated).toBeUndefined();
    });
  });

  describe('@ApiTags', () => {
    it('should set tags on method', () => {
      class TestController {
        @ApiTags('Users', 'Public')
        listUsers() {}
      }

      const metadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'listUsers',
      ) as OpenAPIMethodMetadata;

      expect(metadata.tags).toEqual(['Users', 'Public']);
    });

    it('should set tags on class', () => {
      @ApiTags('Admin', 'Internal')
      class AdminController {}

      const metadata = Reflect.getMetadata(
        OPENAPI_CONTROLLER_METADATA,
        AdminController,
      ) as OpenAPIClassMetadata;

      expect(metadata.tags).toEqual(['Admin', 'Internal']);
    });

    it('should accumulate tags when stacked on method', () => {
      class TestController {
        @ApiTags('Tag1')
        @ApiTags('Tag2', 'Tag3')
        multiTagMethod() {}
      }

      const metadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'multiTagMethod',
      ) as OpenAPIMethodMetadata;

      expect(metadata.tags).toEqual(['Tag2', 'Tag3', 'Tag1']);
    });

    it('should accumulate tags when stacked on class', () => {
      @ApiTags('ClassTag1')
      @ApiTags('ClassTag2')
      class MultiTagController {}

      const metadata = Reflect.getMetadata(
        OPENAPI_CONTROLLER_METADATA,
        MultiTagController,
      ) as OpenAPIClassMetadata;

      expect(metadata.tags).toEqual(['ClassTag2', 'ClassTag1']);
    });

    it('should work with single tag', () => {
      class TestController {
        @ApiTags('SingleTag')
        singleTagMethod() {}
      }

      const metadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'singleTagMethod',
      ) as OpenAPIMethodMetadata;

      expect(metadata.tags).toEqual(['SingleTag']);
    });
  });

  describe('@ApiSummary', () => {
    it('should set summary on method', () => {
      class TestController {
        @ApiSummary('Get all users')
        listUsers() {}
      }

      const metadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'listUsers',
      ) as OpenAPIMethodMetadata;

      expect(metadata.summary).toBe('Get all users');
    });

    it('should override previous summary', () => {
      class TestController {
        @ApiSummary('Final summary')
        @ApiSummary('Initial summary')
        overriddenMethod() {}
      }

      const metadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'overriddenMethod',
      ) as OpenAPIMethodMetadata;

      expect(metadata.summary).toBe('Final summary');
    });
  });

  describe('@ApiDescription', () => {
    it('should set description on method', () => {
      class TestController {
        @ApiDescription('This endpoint retrieves all users from the database')
        listUsers() {}
      }

      const metadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'listUsers',
      ) as OpenAPIMethodMetadata;

      expect(metadata.description).toBe(
        'This endpoint retrieves all users from the database',
      );
    });

    it('should override previous description', () => {
      class TestController {
        @ApiDescription('Final description')
        @ApiDescription('Initial description')
        overriddenMethod() {}
      }

      const metadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'overriddenMethod',
      ) as OpenAPIMethodMetadata;

      expect(metadata.description).toBe('Final description');
    });
  });

  describe('@Deprecated', () => {
    it('should set deprecated on method', () => {
      class TestController {
        @Deprecated()
        oldMethod() {}
      }

      const metadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'oldMethod',
      ) as OpenAPIMethodMetadata;

      expect(metadata.deprecated).toBe(true);
    });

    it('should set deprecated on class', () => {
      @Deprecated()
      class LegacyController {}

      const metadata = Reflect.getMetadata(
        OPENAPI_CONTROLLER_METADATA,
        LegacyController,
      ) as OpenAPIClassMetadata;

      expect(metadata.deprecated).toBe(true);
    });
  });

  describe('@ApiOperationId', () => {
    it('should set operationId on method', () => {
      class TestController {
        @ApiOperationId('getUserById')
        getUser() {}
      }

      const metadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'getUser',
      ) as OpenAPIMethodMetadata;

      expect(metadata.operationId).toBe('getUserById');
    });

    it('should override previous operationId', () => {
      class TestController {
        @ApiOperationId('finalId')
        @ApiOperationId('initialId')
        overriddenMethod() {}
      }

      const metadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'overriddenMethod',
      ) as OpenAPIMethodMetadata;

      expect(metadata.operationId).toBe('finalId');
    });
  });

  describe('@ApiExample', () => {
    it('should add example to method', () => {
      class TestController {
        @ApiExample({
          name: 'validUser',
          summary: 'A valid user',
          value: { id: '123', name: 'John' },
          type: 'response',
          statusCode: 200,
        })
        getUser() {}
      }

      const metadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'getUser',
      ) as OpenAPIMethodMetadata;

      expect(metadata.examples).toHaveLength(1);
      expect(metadata.examples![0].name).toBe('validUser');
      expect(metadata.examples![0].value).toEqual({ id: '123', name: 'John' });
      expect(metadata.examples![0].type).toBe('response');
      expect(metadata.examples![0].statusCode).toBe(200);
    });

    it('should accumulate multiple examples', () => {
      class TestController {
        @ApiExample({
          name: 'example1',
          value: { data: 'first' },
        })
        @ApiExample({
          name: 'example2',
          value: { data: 'second' },
        })
        multiExampleMethod() {}
      }

      const metadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'multiExampleMethod',
      ) as OpenAPIMethodMetadata;

      expect(metadata.examples).toHaveLength(2);
      expect(metadata.examples![0].name).toBe('example2');
      expect(metadata.examples![1].name).toBe('example1');
    });

    it('should support request examples', () => {
      class TestController {
        @ApiExample({
          name: 'createUserRequest',
          value: { name: 'Jane', email: 'jane@example.com' },
          type: 'request',
        })
        createUser() {}
      }

      const metadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'createUser',
      ) as OpenAPIMethodMetadata;

      expect(metadata.examples![0].type).toBe('request');
    });
  });

  describe('getEffectiveOpenAPIMetadata', () => {
    it('should return method-level metadata when no class-level exists', () => {
      class TestController {
        @ApiSummary('Method summary')
        @ApiTags('MethodTag')
        methodOnly() {}
      }

      const metadata = getEffectiveOpenAPIMetadata(
        TestController,
        'methodOnly',
      );

      expect(metadata.summary).toBe('Method summary');
      expect(metadata.tags).toEqual(['MethodTag']);
    });

    it('should return class-level metadata when no method-level exists', () => {
      @ApiTags('ClassTag')
      @ApiOperation({ description: 'Class description' })
      class TestController {
        noDecorators() {}
      }

      const metadata = getEffectiveOpenAPIMetadata(
        TestController,
        'noDecorators',
      );

      expect(metadata.tags).toEqual(['ClassTag']);
      expect(metadata.description).toBe('Class description');
    });

    it('should merge class and method tags', () => {
      @ApiTags('ClassTag1', 'ClassTag2')
      class TestController {
        @ApiTags('MethodTag1', 'MethodTag2')
        mergedTags() {}
      }

      const metadata = getEffectiveOpenAPIMetadata(
        TestController,
        'mergedTags',
      );

      expect(metadata.tags).toContain('ClassTag1');
      expect(metadata.tags).toContain('ClassTag2');
      expect(metadata.tags).toContain('MethodTag1');
      expect(metadata.tags).toContain('MethodTag2');
    });

    it('should deduplicate merged tags', () => {
      @ApiTags('SharedTag', 'ClassOnly')
      class TestController {
        @ApiTags('SharedTag', 'MethodOnly')
        duplicateTags() {}
      }

      const metadata = getEffectiveOpenAPIMetadata(
        TestController,
        'duplicateTags',
      );

      const sharedTagCount = metadata.tags!.filter(
        (t) => t === 'SharedTag',
      ).length;
      expect(sharedTagCount).toBe(1);
      expect(metadata.tags).toContain('ClassOnly');
      expect(metadata.tags).toContain('MethodOnly');
    });

    it('should allow method-level to override class-level description', () => {
      @ApiOperation({ description: 'Class description' })
      class TestController {
        @ApiDescription('Method description')
        overrideDescription() {}
      }

      const metadata = getEffectiveOpenAPIMetadata(
        TestController,
        'overrideDescription',
      );

      expect(metadata.description).toBe('Method description');
    });

    it('should allow method-level to override class-level deprecated', () => {
      @Deprecated()
      class TestController {
        @ApiOperation({ deprecated: false })
        notDeprecated() {}
      }

      const metadata = getEffectiveOpenAPIMetadata(
        TestController,
        'notDeprecated',
      );

      expect(metadata.deprecated).toBe(false);
    });

    it('should inherit class-level deprecated when method has no override', () => {
      @Deprecated()
      class TestController {
        inheritDeprecated() {}
      }

      const metadata = getEffectiveOpenAPIMetadata(
        TestController,
        'inheritDeprecated',
      );

      expect(metadata.deprecated).toBe(true);
    });
  });

  describe('getClassOpenAPIMetadata', () => {
    it('should return class-level metadata', () => {
      @ApiTags('Admin')
      @ApiOperation({ description: 'Admin operations' })
      class AdminController {}

      const metadata = getClassOpenAPIMetadata(AdminController);

      expect(metadata?.tags).toEqual(['Admin']);
      expect(metadata?.description).toBe('Admin operations');
    });

    it('should return undefined when no class-level metadata', () => {
      class NoMetadataController {}

      const metadata = getClassOpenAPIMetadata(NoMetadataController);

      expect(metadata).toBeUndefined();
    });
  });

  describe('getMethodOpenAPIMetadata', () => {
    it('should return method-level metadata without merging', () => {
      @ApiTags('ClassTag')
      class TestController {
        @ApiTags('MethodTag')
        @ApiSummary('Method summary')
        decoratedMethod() {}
      }

      const metadata = getMethodOpenAPIMetadata(
        TestController,
        'decoratedMethod',
      );

      expect(metadata?.tags).toEqual(['MethodTag']);
      expect(metadata?.summary).toBe('Method summary');
    });

    it('should return undefined when no method-level metadata', () => {
      class TestController {
        noDecorators() {}
      }

      const metadata = getMethodOpenAPIMetadata(TestController, 'noDecorators');

      expect(metadata).toBeUndefined();
    });
  });

  describe('Decorator stacking', () => {
    it('should allow stacking all decorators on a method', () => {
      // Note: Decorators execute bottom-to-top, so the topmost decorator
      // (@ApiExample) executes last and can override values set by lower decorators
      class TestController {
        @ApiExample({ name: 'ex1', value: { test: true } })
        @Deprecated()
        @ApiOperationId('fullOperation')
        @ApiDescription('Detailed description')
        @ApiSummary('Final summary')
        @ApiTags('Tag1')
        @ApiOperation({ summary: 'Base operation' })
        fullyDecorated() {}
      }

      const metadata = Reflect.getMetadata(
        OPENAPI_METADATA,
        TestController,
        'fullyDecorated',
      ) as OpenAPIMethodMetadata;

      // @ApiSummary executes after @ApiOperation, so it overrides the summary
      expect(metadata.summary).toBe('Final summary');
      expect(metadata.description).toBe('Detailed description');
      expect(metadata.tags).toContain('Tag1');
      expect(metadata.operationId).toBe('fullOperation');
      expect(metadata.deprecated).toBe(true);
      expect(metadata.examples).toHaveLength(1);
    });

    it('should allow stacking class and method decorators', () => {
      @ApiTags('ClassTag')
      @Deprecated()
      class TestController {
        @ApiTags('MethodTag')
        @ApiSummary('Method summary')
        stackedMethod() {}
      }

      const effective = getEffectiveOpenAPIMetadata(
        TestController,
        'stackedMethod',
      );

      expect(effective.tags).toContain('ClassTag');
      expect(effective.tags).toContain('MethodTag');
      expect(effective.summary).toBe('Method summary');
      expect(effective.deprecated).toBe(true);
    });
  });
});

describe('OpenAPI Metadata Merging', () => {
  describe('Class-level to method-level merging', () => {
    it('should merge class tags with method tags preserving order', () => {
      @ApiTags('ClassA', 'ClassB')
      class TestController {
        @ApiTags('MethodA', 'MethodB')
        mergedMethod() {}
      }

      const metadata = getEffectiveOpenAPIMetadata(
        TestController,
        'mergedMethod',
      );

      // Class tags come first, then method tags
      expect(metadata.tags).toEqual(['ClassA', 'ClassB', 'MethodA', 'MethodB']);
    });

    it('should inherit class description when method has none', () => {
      @ApiOperation({ description: 'Controller-level description' })
      class TestController {
        @ApiSummary('Method summary only')
        inheritDescription() {}
      }

      const metadata = getEffectiveOpenAPIMetadata(
        TestController,
        'inheritDescription',
      );

      expect(metadata.description).toBe('Controller-level description');
      expect(metadata.summary).toBe('Method summary only');
    });

    it('should inherit class deprecated when method has none', () => {
      @Deprecated()
      class TestController {
        @ApiSummary('Still deprecated')
        inheritDeprecated() {}
      }

      const metadata = getEffectiveOpenAPIMetadata(
        TestController,
        'inheritDeprecated',
      );

      expect(metadata.deprecated).toBe(true);
    });

    it('should not inherit class summary (method-only field)', () => {
      @ApiOperation({ summary: 'Class summary' })
      class TestController {
        noSummary() {}
      }

      const metadata = getEffectiveOpenAPIMetadata(TestController, 'noSummary');

      // Summary is method-only, class summary is stored but not inherited
      expect(metadata.summary).toBeUndefined();
    });

    it('should not inherit class operationId (method-only field)', () => {
      @ApiOperation({ operationId: 'classOperationId' })
      class TestController {
        noOperationId() {}
      }

      const metadata = getEffectiveOpenAPIMetadata(
        TestController,
        'noOperationId',
      );

      expect(metadata.operationId).toBeUndefined();
    });
  });

  describe('Method-level override of class-level', () => {
    it('should allow method to override class description', () => {
      @ApiOperation({ description: 'Class description' })
      class TestController {
        @ApiDescription('Method description')
        overrideDescription() {}
      }

      const metadata = getEffectiveOpenAPIMetadata(
        TestController,
        'overrideDescription',
      );

      expect(metadata.description).toBe('Method description');
    });

    it('should allow method to override class deprecated to false', () => {
      @Deprecated()
      class TestController {
        @ApiOperation({ deprecated: false })
        notDeprecated() {}
      }

      const metadata = getEffectiveOpenAPIMetadata(
        TestController,
        'notDeprecated',
      );

      expect(metadata.deprecated).toBe(false);
    });

    it('should allow method to add deprecated when class is not', () => {
      @ApiTags('Active')
      class TestController {
        @Deprecated()
        deprecatedMethod() {}

        activeMethod() {}
      }

      const deprecatedMeta = getEffectiveOpenAPIMetadata(
        TestController,
        'deprecatedMethod',
      );
      const activeMeta = getEffectiveOpenAPIMetadata(
        TestController,
        'activeMethod',
      );

      expect(deprecatedMeta.deprecated).toBe(true);
      expect(activeMeta.deprecated).toBeUndefined();
    });
  });

  describe('Multiple methods with different metadata', () => {
    it('should maintain separate metadata for each method', () => {
      @ApiTags('Shared')
      class TestController {
        @ApiSummary('Method A summary')
        @ApiTags('TagA')
        methodA() {}

        @ApiSummary('Method B summary')
        @ApiTags('TagB')
        methodB() {}

        @ApiSummary('Method C summary')
        methodC() {}
      }

      const metaA = getEffectiveOpenAPIMetadata(TestController, 'methodA');
      const metaB = getEffectiveOpenAPIMetadata(TestController, 'methodB');
      const metaC = getEffectiveOpenAPIMetadata(TestController, 'methodC');

      expect(metaA.summary).toBe('Method A summary');
      expect(metaA.tags).toEqual(['Shared', 'TagA']);

      expect(metaB.summary).toBe('Method B summary');
      expect(metaB.tags).toEqual(['Shared', 'TagB']);

      expect(metaC.summary).toBe('Method C summary');
      expect(metaC.tags).toEqual(['Shared']);
    });
  });

  describe('Complex merging scenarios', () => {
    it('should handle deeply nested decorator combinations', () => {
      @ApiTags('Controller')
      @ApiOperation({ description: 'Base controller', deprecated: false })
      class TestController {
        @ApiOperation({ summary: 'Operation summary' })
        @ApiTags('Method')
        @ApiDescription('Method description')
        @ApiOperationId('complexOp')
        @Deprecated()
        complexMethod() {}
      }

      const metadata = getEffectiveOpenAPIMetadata(
        TestController,
        'complexMethod',
      );

      expect(metadata.tags).toEqual(['Controller', 'Method']);
      expect(metadata.summary).toBe('Operation summary');
      expect(metadata.description).toBe('Method description');
      expect(metadata.operationId).toBe('complexOp');
      expect(metadata.deprecated).toBe(true); // Method overrides class
    });

    it('should handle empty class metadata with method metadata', () => {
      class TestController {
        @ApiSummary('Standalone method')
        @ApiTags('Standalone')
        @ApiDescription('No class decorators')
        standaloneMethod() {}
      }

      const metadata = getEffectiveOpenAPIMetadata(
        TestController,
        'standaloneMethod',
      );

      expect(metadata.summary).toBe('Standalone method');
      expect(metadata.tags).toEqual(['Standalone']);
      expect(metadata.description).toBe('No class decorators');
    });

    it('should handle class metadata with no method metadata', () => {
      @ApiTags('ClassOnly')
      @ApiOperation({ description: 'Class description', deprecated: true })
      class TestController {
        bareMethod() {}
      }

      const metadata = getEffectiveOpenAPIMetadata(
        TestController,
        'bareMethod',
      );

      expect(metadata.tags).toEqual(['ClassOnly']);
      expect(metadata.description).toBe('Class description');
      expect(metadata.deprecated).toBe(true);
      expect(metadata.summary).toBeUndefined();
      expect(metadata.operationId).toBeUndefined();
    });

    it('should return empty object when no metadata exists', () => {
      class TestController {
        noMetadata() {}
      }

      const metadata = getEffectiveOpenAPIMetadata(
        TestController,
        'noMetadata',
      );

      expect(metadata).toEqual({});
    });
  });

  describe('Tag deduplication', () => {
    it('should deduplicate tags from class and method', () => {
      @ApiTags('Shared', 'ClassOnly')
      class TestController {
        @ApiTags('Shared', 'MethodOnly')
        duplicateTags() {}
      }

      const metadata = getEffectiveOpenAPIMetadata(
        TestController,
        'duplicateTags',
      );

      expect(metadata.tags).toEqual(['Shared', 'ClassOnly', 'MethodOnly']);
    });

    it('should deduplicate tags from multiple @ApiTags on same target', () => {
      @ApiTags('Tag1')
      @ApiTags('Tag1', 'Tag2')
      class TestController {
        @ApiTags('Tag2')
        @ApiTags('Tag2', 'Tag3')
        multiTags() {}
      }

      const metadata = getEffectiveOpenAPIMetadata(TestController, 'multiTags');

      // Tags accumulate, then get deduplicated in getEffectiveOpenAPIMetadata
      expect(metadata.tags).toContain('Tag1');
      expect(metadata.tags).toContain('Tag2');
      expect(metadata.tags).toContain('Tag3');
    });

    it('should preserve tag order while deduplicating', () => {
      @ApiTags('First', 'Second')
      class TestController {
        @ApiTags('Second', 'Third')
        orderedTags() {}
      }

      const metadata = getEffectiveOpenAPIMetadata(
        TestController,
        'orderedTags',
      );

      // First occurrence wins in deduplication
      expect(metadata.tags).toEqual(['First', 'Second', 'Third']);
    });
  });

  describe('Examples accumulation', () => {
    it('should accumulate examples from multiple decorators', () => {
      class TestController {
        @ApiExample({ name: 'ex3', value: 'third' })
        @ApiExample({ name: 'ex2', value: 'second' })
        @ApiExample({ name: 'ex1', value: 'first' })
        multipleExamples() {}
      }

      const metadata = getMethodOpenAPIMetadata(
        TestController,
        'multipleExamples',
      );

      expect(metadata?.examples).toHaveLength(3);
      // Decorators execute bottom-to-top, so ex1 is added first
      expect(metadata?.examples?.[0].name).toBe('ex1');
      expect(metadata?.examples?.[1].name).toBe('ex2');
      expect(metadata?.examples?.[2].name).toBe('ex3');
    });

    it('should preserve examples when merging with other metadata', () => {
      class TestController {
        @ApiSummary('With examples')
        @ApiExample({ name: 'example', value: { test: true } })
        @ApiTags('Tagged')
        withExamples() {}
      }

      const metadata = getEffectiveOpenAPIMetadata(
        TestController,
        'withExamples',
      );

      expect(metadata.summary).toBe('With examples');
      expect(metadata.tags).toEqual(['Tagged']);
      expect(metadata.examples).toHaveLength(1);
      expect(metadata.examples?.[0].name).toBe('example');
    });
  });
});

describe('Integration with HTTP Method Decorators', () => {
  const {
    Get,
    Post,
    Put,
    Delete,
  } = require('../../src/decorators/http-methods');
  const { ApiController } = require('../../src/decorators/controller');
  const { ROUTES_METADATA } = require('../../src/decorators/metadata-keys');

  it('should work with @Get decorator', () => {
    class TestController {
      @ApiSummary('Get users')
      @ApiTags('Users')
      @Get('/users')
      getUsers() {}
    }

    const metadata = getEffectiveOpenAPIMetadata(TestController, 'getUsers');
    expect(metadata.summary).toBe('Get users');
    expect(metadata.tags).toEqual(['Users']);

    const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
    expect(routes).toHaveLength(1);
    expect(routes[0].method).toBe('get');
  });

  it('should work with @ApiController and method decorators', () => {
    @ApiTags('Admin')
    @ApiController('/api/admin')
    class AdminController {
      @ApiSummary('List admins')
      @ApiTags('List')
      @Get('/')
      listAdmins() {}

      @ApiSummary('Create admin')
      @ApiDescription('Creates a new admin user')
      @Post('/')
      createAdmin() {}
    }

    const listMeta = getEffectiveOpenAPIMetadata(AdminController, 'listAdmins');
    expect(listMeta.summary).toBe('List admins');
    expect(listMeta.tags).toContain('Admin');
    expect(listMeta.tags).toContain('List');

    const createMeta = getEffectiveOpenAPIMetadata(
      AdminController,
      'createAdmin',
    );
    expect(createMeta.summary).toBe('Create admin');
    expect(createMeta.description).toBe('Creates a new admin user');
    expect(createMeta.tags).toContain('Admin');
  });

  it('should work with @Deprecated on controller and methods', () => {
    @Deprecated()
    @ApiController('/api/legacy')
    class LegacyController {
      @Get('/old')
      oldEndpoint() {}

      @ApiOperation({ deprecated: false })
      @Get('/still-active')
      stillActive() {}
    }

    const oldMeta = getEffectiveOpenAPIMetadata(
      LegacyController,
      'oldEndpoint',
    );
    expect(oldMeta.deprecated).toBe(true);

    const activeMeta = getEffectiveOpenAPIMetadata(
      LegacyController,
      'stillActive',
    );
    expect(activeMeta.deprecated).toBe(false);
  });

  it('should combine OpenAPI decorators with route options', () => {
    @ApiTags('Items')
    @ApiController('/api/items')
    class ItemController {
      @ApiSummary('Get item by ID')
      @ApiDescription('Retrieves a single item')
      @ApiOperationId('getItemById')
      @Get('/:id', { summary: 'Route summary' })
      getItem() {}
    }

    // Method-level OpenAPI decorators
    const metadata = getEffectiveOpenAPIMetadata(ItemController, 'getItem');
    expect(metadata.summary).toBe('Get item by ID');
    expect(metadata.description).toBe('Retrieves a single item');
    expect(metadata.operationId).toBe('getItemById');
    expect(metadata.tags).toContain('Items');

    // Route is still registered
    const routes = Reflect.getMetadata(ROUTES_METADATA, ItemController);
    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('/:id');
  });
});
