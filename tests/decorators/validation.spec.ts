import 'reflect-metadata';
import { body, param, query } from 'express-validator';
import { z } from 'zod';
import {
  getEffectiveValidationMetadata,
  hasValidation,
  isValidationChainArray,
  isValidationFunction,
  isZodSchema,
  ValidateBody,
  ValidateParams,
  ValidateQuery,
} from '../../src/decorators/validation';
import {
  RESPONSE_METADATA,
  VALIDATION_METADATA,
} from '../../src/decorators/metadata-keys';
import { ValidationMetadata } from '../../src/interfaces/openApi/decoratorOptions';

describe('Validation Decorators', () => {
  describe('@ValidateBody', () => {
    it('should set body validation metadata with Zod schema on method', () => {
      const schema = z.object({ name: z.string() });

      class TestController {
        @ValidateBody(schema)
        createItem() {}
      }

      const metadata = Reflect.getMetadata(
        VALIDATION_METADATA,
        TestController,
        'createItem',
      ) as ValidationMetadata;
      expect(metadata.body).toBe(schema);
    });

    it('should set body validation metadata with ValidationChain array on method', () => {
      const chains = [body('name').isString(), body('email').isEmail()];

      class TestController {
        @ValidateBody(chains)
        createItem() {}
      }

      const metadata = Reflect.getMetadata(
        VALIDATION_METADATA,
        TestController,
        'createItem',
      ) as ValidationMetadata;
      expect(metadata.body).toBe(chains);
    });

    it('should set body validation metadata with language-aware function on method', () => {
      const validationFn = function (
        this: { constants: object },
        lang: string,
      ) {
        return [
          body('name').isString().withMessage(`Name required in ${lang}`),
        ];
      };

      class TestController {
        @ValidateBody(validationFn)
        createItem() {}
      }

      const metadata = Reflect.getMetadata(
        VALIDATION_METADATA,
        TestController,
        'createItem',
      ) as ValidationMetadata;
      expect(metadata.body).toBe(validationFn);
    });

    it('should set body validation metadata on class', () => {
      const schema = z.object({ name: z.string() });

      @ValidateBody(schema)
      class TestController {}

      const metadata = Reflect.getMetadata(
        VALIDATION_METADATA,
        TestController,
      ) as ValidationMetadata;
      expect(metadata.body).toBe(schema);
    });

    it('should add 400 response to method metadata', () => {
      const schema = z.object({ name: z.string() });

      class TestController {
        @ValidateBody(schema)
        createItem() {}
      }

      const responses = Reflect.getMetadata(
        RESPONSE_METADATA,
        TestController,
        'createItem',
      ) as Array<{ statusCode: number }>;
      expect(responses).toContainEqual(
        expect.objectContaining({ statusCode: 400 }),
      );
    });

    it('should add 400 response to class metadata', () => {
      const schema = z.object({ name: z.string() });

      @ValidateBody(schema)
      class TestController {}

      const responses = Reflect.getMetadata(
        RESPONSE_METADATA,
        TestController,
      ) as Array<{ statusCode: number }>;
      expect(responses).toContainEqual(
        expect.objectContaining({ statusCode: 400 }),
      );
    });

    it('should not duplicate 400 response when applied multiple times', () => {
      const schema1 = z.object({ name: z.string() });
      const schema2 = z.object({ email: z.string() });

      class TestController {
        @ValidateBody(schema1)
        @ValidateBody(schema2)
        createItem() {}
      }

      const responses = Reflect.getMetadata(
        RESPONSE_METADATA,
        TestController,
        'createItem',
      ) as Array<{ statusCode: number }>;
      const count400 = responses.filter((r) => r.statusCode === 400).length;
      expect(count400).toBe(1);
    });
  });

  describe('@ValidateParams', () => {
    it('should set params validation metadata with Zod schema on method', () => {
      const schema = z.object({ id: z.string().uuid() });

      class TestController {
        @ValidateParams(schema)
        getItem() {}
      }

      const metadata = Reflect.getMetadata(
        VALIDATION_METADATA,
        TestController,
        'getItem',
      ) as ValidationMetadata;
      expect(metadata.params).toBe(schema);
    });

    it('should set params validation metadata with ValidationChain array on method', () => {
      const chains = [param('id').isMongoId()];

      class TestController {
        @ValidateParams(chains)
        getItem() {}
      }

      const metadata = Reflect.getMetadata(
        VALIDATION_METADATA,
        TestController,
        'getItem',
      ) as ValidationMetadata;
      expect(metadata.params).toBe(chains);
    });

    it('should set params validation metadata on class', () => {
      const schema = z.object({ id: z.string() });

      @ValidateParams(schema)
      class TestController {}

      const metadata = Reflect.getMetadata(
        VALIDATION_METADATA,
        TestController,
      ) as ValidationMetadata;
      expect(metadata.params).toBe(schema);
    });

    it('should add 400 response to method metadata', () => {
      const schema = z.object({ id: z.string() });

      class TestController {
        @ValidateParams(schema)
        getItem() {}
      }

      const responses = Reflect.getMetadata(
        RESPONSE_METADATA,
        TestController,
        'getItem',
      ) as Array<{ statusCode: number }>;
      expect(responses).toContainEqual(
        expect.objectContaining({ statusCode: 400 }),
      );
    });
  });

  describe('@ValidateQuery', () => {
    it('should set query validation metadata with Zod schema on method', () => {
      const schema = z.object({
        page: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
      });

      class TestController {
        @ValidateQuery(schema)
        listItems() {}
      }

      const metadata = Reflect.getMetadata(
        VALIDATION_METADATA,
        TestController,
        'listItems',
      ) as ValidationMetadata;
      expect(metadata.query).toBe(schema);
    });

    it('should set query validation metadata with ValidationChain array on method', () => {
      const chains = [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
      ];

      class TestController {
        @ValidateQuery(chains)
        listItems() {}
      }

      const metadata = Reflect.getMetadata(
        VALIDATION_METADATA,
        TestController,
        'listItems',
      ) as ValidationMetadata;
      expect(metadata.query).toBe(chains);
    });

    it('should set query validation metadata on class', () => {
      const schema = z.object({ search: z.string().optional() });

      @ValidateQuery(schema)
      class TestController {}

      const metadata = Reflect.getMetadata(
        VALIDATION_METADATA,
        TestController,
      ) as ValidationMetadata;
      expect(metadata.query).toBe(schema);
    });

    it('should add 400 response to method metadata', () => {
      const schema = z.object({ search: z.string() });

      class TestController {
        @ValidateQuery(schema)
        search() {}
      }

      const responses = Reflect.getMetadata(
        RESPONSE_METADATA,
        TestController,
        'search',
      ) as Array<{ statusCode: number }>;
      expect(responses).toContainEqual(
        expect.objectContaining({ statusCode: 400 }),
      );
    });
  });

  describe('getEffectiveValidationMetadata', () => {
    it('should return method-level metadata when no class-level exists', () => {
      const schema = z.object({ name: z.string() });

      class TestController {
        @ValidateBody(schema)
        createItem() {}
      }

      const metadata = getEffectiveValidationMetadata(
        TestController,
        'createItem',
      );
      expect(metadata.body).toBe(schema);
    });

    it('should return class-level metadata when no method-level exists', () => {
      const schema = z.object({ name: z.string() });

      @ValidateBody(schema)
      class TestController {
        createItem() {}
      }

      const metadata = getEffectiveValidationMetadata(
        TestController,
        'createItem',
      );
      expect(metadata.body).toBe(schema);
    });

    it('should merge class and method metadata for different fields', () => {
      const bodySchema = z.object({ name: z.string() });
      const querySchema = z.object({ page: z.number() });

      @ValidateBody(bodySchema)
      class TestController {
        @ValidateQuery(querySchema)
        listItems() {}
      }

      const metadata = getEffectiveValidationMetadata(
        TestController,
        'listItems',
      );
      expect(metadata.body).toBe(bodySchema);
      expect(metadata.query).toBe(querySchema);
    });

    it('should allow method-level to override class-level for same field', () => {
      const classSchema = z.object({ name: z.string() });
      const methodSchema = z.object({ name: z.string(), email: z.string() });

      @ValidateBody(classSchema)
      class TestController {
        @ValidateBody(methodSchema)
        createItem() {}
      }

      const metadata = getEffectiveValidationMetadata(
        TestController,
        'createItem',
      );
      expect(metadata.body).toBe(methodSchema);
    });

    it('should return empty object when no validation exists', () => {
      class TestController {
        noValidation() {}
      }

      const metadata = getEffectiveValidationMetadata(
        TestController,
        'noValidation',
      );
      expect(metadata).toEqual({});
    });
  });

  describe('hasValidation', () => {
    it('should return true when body validation exists', () => {
      const schema = z.object({ name: z.string() });

      class TestController {
        @ValidateBody(schema)
        createItem() {}
      }

      expect(hasValidation(TestController, 'createItem')).toBe(true);
    });

    it('should return true when params validation exists', () => {
      const schema = z.object({ id: z.string() });

      class TestController {
        @ValidateParams(schema)
        getItem() {}
      }

      expect(hasValidation(TestController, 'getItem')).toBe(true);
    });

    it('should return true when query validation exists', () => {
      const schema = z.object({ search: z.string() });

      class TestController {
        @ValidateQuery(schema)
        search() {}
      }

      expect(hasValidation(TestController, 'search')).toBe(true);
    });

    it('should return false when no validation exists', () => {
      class TestController {
        noValidation() {}
      }

      expect(hasValidation(TestController, 'noValidation')).toBe(false);
    });

    it('should return true when class-level validation exists', () => {
      const schema = z.object({ name: z.string() });

      @ValidateBody(schema)
      class TestController {
        createItem() {}
      }

      expect(hasValidation(TestController, 'createItem')).toBe(true);
    });
  });

  describe('Type guards', () => {
    describe('isZodSchema', () => {
      it('should return true for Zod schemas', () => {
        const schema = z.object({ name: z.string() });
        expect(isZodSchema(schema)).toBe(true);
      });

      it('should return false for ValidationChain arrays', () => {
        const chains = [body('name').isString()];
        expect(isZodSchema(chains)).toBe(false);
      });

      it('should return false for functions', () => {
        const fn = () => [body('name').isString()];
        expect(isZodSchema(fn)).toBe(false);
      });
    });

    describe('isValidationChainArray', () => {
      it('should return true for ValidationChain arrays', () => {
        const chains = [body('name').isString()];
        expect(isValidationChainArray(chains)).toBe(true);
      });

      it('should return false for Zod schemas', () => {
        const schema = z.object({ name: z.string() });
        expect(isValidationChainArray(schema)).toBe(false);
      });

      it('should return false for functions', () => {
        const fn = () => [body('name').isString()];
        expect(isValidationChainArray(fn)).toBe(false);
      });
    });

    describe('isValidationFunction', () => {
      it('should return true for functions', () => {
        const fn = () => [body('name').isString()];
        expect(isValidationFunction(fn)).toBe(true);
      });

      it('should return false for Zod schemas', () => {
        const schema = z.object({ name: z.string() });
        expect(isValidationFunction(schema)).toBe(false);
      });

      it('should return false for ValidationChain arrays', () => {
        const chains = [body('name').isString()];
        expect(isValidationFunction(chains)).toBe(false);
      });
    });
  });

  describe('Decorator stacking', () => {
    it('should allow stacking multiple validation decorators', () => {
      const bodySchema = z.object({ name: z.string() });
      const paramsSchema = z.object({ id: z.string() });
      const querySchema = z.object({ include: z.string().optional() });

      class TestController {
        @ValidateBody(bodySchema)
        @ValidateParams(paramsSchema)
        @ValidateQuery(querySchema)
        updateItem() {}
      }

      const metadata = getEffectiveValidationMetadata(
        TestController,
        'updateItem',
      );
      expect(metadata.body).toBe(bodySchema);
      expect(metadata.params).toBe(paramsSchema);
      expect(metadata.query).toBe(querySchema);
    });

    it('should only add one 400 response when stacking decorators', () => {
      const bodySchema = z.object({ name: z.string() });
      const paramsSchema = z.object({ id: z.string() });

      class TestController {
        @ValidateBody(bodySchema)
        @ValidateParams(paramsSchema)
        updateItem() {}
      }

      const responses = Reflect.getMetadata(
        RESPONSE_METADATA,
        TestController,
        'updateItem',
      ) as Array<{ statusCode: number }>;
      const count400 = responses.filter((r) => r.statusCode === 400).length;
      expect(count400).toBe(1);
    });
  });

  describe('Class-level override by method-level', () => {
    it('should allow method to override class body validation', () => {
      const classSchema = z.object({ name: z.string() });
      const methodSchema = z.object({ name: z.string(), email: z.string() });

      @ValidateBody(classSchema)
      class TestController {
        inheritedValidation() {}

        @ValidateBody(methodSchema)
        customValidation() {}
      }

      const inheritedMeta = getEffectiveValidationMetadata(
        TestController,
        'inheritedValidation',
      );
      const customMeta = getEffectiveValidationMetadata(
        TestController,
        'customValidation',
      );

      expect(inheritedMeta.body).toBe(classSchema);
      expect(customMeta.body).toBe(methodSchema);
    });

    it('should allow method to add validation when class has different field', () => {
      const classBodySchema = z.object({ name: z.string() });
      const methodQuerySchema = z.object({ page: z.number() });

      @ValidateBody(classBodySchema)
      class TestController {
        @ValidateQuery(methodQuerySchema)
        listItems() {}
      }

      const metadata = getEffectiveValidationMetadata(
        TestController,
        'listItems',
      );
      expect(metadata.body).toBe(classBodySchema);
      expect(metadata.query).toBe(methodQuerySchema);
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

  it('should work with @Post decorator', () => {
    const schema = z.object({ name: z.string() });

    class TestController {
      @ValidateBody(schema)
      @Post('/items')
      createItem() {}
    }

    const validationMeta = getEffectiveValidationMetadata(
      TestController,
      'createItem',
    );
    expect(validationMeta.body).toBe(schema);

    const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
    expect(routes).toHaveLength(1);
    expect(routes[0].method).toBe('post');
  });

  it('should work with @Get decorator and query validation', () => {
    const schema = z.object({
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
    });

    class TestController {
      @ValidateQuery(schema)
      @Get('/items')
      listItems() {}
    }

    const validationMeta = getEffectiveValidationMetadata(
      TestController,
      'listItems',
    );
    expect(validationMeta.query).toBe(schema);

    const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);
    expect(routes[0].method).toBe('get');
  });

  it('should work with @Put decorator and multiple validations', () => {
    const bodySchema = z.object({ name: z.string() });
    const paramsSchema = z.object({ id: z.string().uuid() });

    class TestController {
      @ValidateBody(bodySchema)
      @ValidateParams(paramsSchema)
      @Put('/items/:id')
      updateItem() {}
    }

    const validationMeta = getEffectiveValidationMetadata(
      TestController,
      'updateItem',
    );
    expect(validationMeta.body).toBe(bodySchema);
    expect(validationMeta.params).toBe(paramsSchema);
  });

  it('should work with @ApiController and class-level validation', () => {
    const bodySchema = z.object({ name: z.string() });

    @ValidateBody(bodySchema)
    @ApiController('/api/items')
    class ItemController {
      @Post('/')
      createItem() {}

      @Put('/:id')
      updateItem() {}
    }

    // Both methods should inherit body validation
    expect(hasValidation(ItemController, 'createItem')).toBe(true);
    expect(hasValidation(ItemController, 'updateItem')).toBe(true);

    const createMeta = getEffectiveValidationMetadata(
      ItemController,
      'createItem',
    );
    const updateMeta = getEffectiveValidationMetadata(
      ItemController,
      'updateItem',
    );

    expect(createMeta.body).toBe(bodySchema);
    expect(updateMeta.body).toBe(bodySchema);
  });

  it('should handle a realistic controller with mixed validations', () => {
    const CreateItemSchema = z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      price: z.number().positive(),
    });

    const UpdateItemSchema = z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      price: z.number().positive().optional(),
    });

    const IdParamSchema = z.object({
      id: z.string().uuid(),
    });

    const PaginationSchema = z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
    });

    @ApiController('/api/items', { tags: ['Items'] })
    class ItemController {
      @ValidateQuery(PaginationSchema)
      @Get('/')
      listItems() {}

      @ValidateParams(IdParamSchema)
      @Get('/:id')
      getItem() {}

      @ValidateBody(CreateItemSchema)
      @Post('/')
      createItem() {}

      @ValidateBody(UpdateItemSchema)
      @ValidateParams(IdParamSchema)
      @Put('/:id')
      updateItem() {}

      @ValidateParams(IdParamSchema)
      @Delete('/:id')
      deleteItem() {}
    }

    // Verify all validations are set correctly
    const listMeta = getEffectiveValidationMetadata(
      ItemController,
      'listItems',
    );
    expect(listMeta.query).toBe(PaginationSchema);

    const getMeta = getEffectiveValidationMetadata(ItemController, 'getItem');
    expect(getMeta.params).toBe(IdParamSchema);

    const createMeta = getEffectiveValidationMetadata(
      ItemController,
      'createItem',
    );
    expect(createMeta.body).toBe(CreateItemSchema);

    const updateMeta = getEffectiveValidationMetadata(
      ItemController,
      'updateItem',
    );
    expect(updateMeta.body).toBe(UpdateItemSchema);
    expect(updateMeta.params).toBe(IdParamSchema);

    const deleteMeta = getEffectiveValidationMetadata(
      ItemController,
      'deleteItem',
    );
    expect(deleteMeta.params).toBe(IdParamSchema);

    // Verify routes are registered
    const routes = Reflect.getMetadata(ROUTES_METADATA, ItemController);
    expect(routes).toHaveLength(5);
  });
});

describe('Integration with actual validation execution', () => {
  const { validationResult } = require('express-validator');

  /**
   * Helper to create a mock request object
   */
  function createMockRequest(options: {
    body?: Record<string, unknown>;
    params?: Record<string, string>;
    query?: Record<string, string>;
  }) {
    return {
      body: options.body ?? {},
      params: options.params ?? {},
      query: options.query ?? {},
    };
  }

  /**
   * Helper to run validation chains against a mock request
   */
  async function runValidation(
    chains: ReturnType<typeof body>[],
    req: ReturnType<typeof createMockRequest>,
  ) {
    const mockRes = {};
    const mockNext = jest.fn();

    for (const chain of chains) {
      await chain.run(req);
    }

    return validationResult(req);
  }

  describe('Zod schema to express-validator conversion', () => {
    it('should validate valid body data with Zod schema', async () => {
      const {
        zodToExpressValidator,
      } = require('../../src/decorators/zod-validation');

      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });

      const validator = zodToExpressValidator(schema);
      const chains = validator('en');

      const req = createMockRequest({
        body: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      });

      const result = await runValidation(chains, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('should reject invalid body data with Zod schema', async () => {
      const {
        zodToExpressValidator,
      } = require('../../src/decorators/zod-validation');

      const schema = z.object({
        name: z.string().min(3),
        email: z.string().email(),
      });

      const validator = zodToExpressValidator(schema);
      const chains = validator('en');

      const req = createMockRequest({
        body: {
          name: 'Jo', // Too short
          email: 'not-an-email', // Invalid email
        },
      });

      const result = await runValidation(chains, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle optional fields correctly', async () => {
      const {
        zodToExpressValidator,
      } = require('../../src/decorators/zod-validation');

      const schema = z.object({
        name: z.string(),
        nickname: z.string().optional(),
      });

      const validator = zodToExpressValidator(schema);
      const chains = validator('en');

      // Request without optional field
      const req = createMockRequest({
        body: {
          name: 'John',
          // nickname is not provided
        },
      });

      const result = await runValidation(chains, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('should validate number fields', async () => {
      const {
        zodToExpressValidator,
      } = require('../../src/decorators/zod-validation');

      const schema = z.object({
        age: z.number().int().min(0).max(150),
      });

      const validator = zodToExpressValidator(schema);
      const chains = validator('en');

      // Valid age
      const validReq = createMockRequest({
        body: { age: 25 },
      });
      const validResult = await runValidation(chains, validReq);
      expect(validResult.isEmpty()).toBe(true);

      // Invalid age (negative)
      const invalidReq = createMockRequest({
        body: { age: -5 },
      });
      const invalidResult = await runValidation(chains, invalidReq);
      expect(invalidResult.isEmpty()).toBe(false);
    });
  });

  describe('Express-validator chains directly', () => {
    it('should validate with direct ValidationChain array', async () => {
      const chains = [
        body('username').isString().isLength({ min: 3, max: 20 }),
        body('password').isString().isLength({ min: 8 }),
      ];

      // Valid request
      const validReq = createMockRequest({
        body: {
          username: 'johndoe',
          password: 'securepassword123',
        },
      });
      const validResult = await runValidation(chains, validReq);
      expect(validResult.isEmpty()).toBe(true);

      // Invalid request (password too short)
      const invalidReq = createMockRequest({
        body: {
          username: 'johndoe',
          password: 'short',
        },
      });
      const invalidResult = await runValidation(chains, invalidReq);
      expect(invalidResult.isEmpty()).toBe(false);
    });

    it('should validate params with param chains', async () => {
      const chains = [param('id').isUUID()];

      // Valid UUID
      const validReq = createMockRequest({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      });
      const validResult = await runValidation(chains, validReq);
      expect(validResult.isEmpty()).toBe(true);

      // Invalid UUID
      const invalidReq = createMockRequest({
        params: { id: 'not-a-uuid' },
      });
      const invalidResult = await runValidation(chains, invalidReq);
      expect(invalidResult.isEmpty()).toBe(false);
    });

    it('should validate query with query chains', async () => {
      const chains = [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
      ];

      // Valid query
      const validReq = createMockRequest({
        query: { page: '1', limit: '10' },
      });
      const validResult = await runValidation(chains, validReq);
      expect(validResult.isEmpty()).toBe(true);

      // Invalid query (limit too high)
      const invalidReq = createMockRequest({
        query: { page: '1', limit: '500' },
      });
      const invalidResult = await runValidation(chains, invalidReq);
      expect(invalidResult.isEmpty()).toBe(false);
    });
  });

  describe('Language-aware validation functions', () => {
    it('should execute language-aware validation function', async () => {
      const validationFn = function (
        this: { constants: { minLength: number } },
        lang: string,
      ) {
        return [
          body('name')
            .isString()
            .isLength({ min: this.constants.minLength })
            .withMessage(
              `Name must be at least ${this.constants.minLength} characters (${lang})`,
            ),
        ];
      };

      const context = { constants: { minLength: 3 } };
      const chains = validationFn.call(context, 'en');

      // Valid request
      const validReq = createMockRequest({
        body: { name: 'John' },
      });
      const validResult = await runValidation(chains, validReq);
      expect(validResult.isEmpty()).toBe(true);

      // Invalid request
      const invalidReq = createMockRequest({
        body: { name: 'Jo' },
      });
      const invalidResult = await runValidation(chains, invalidReq);
      expect(invalidResult.isEmpty()).toBe(false);
      const errors = invalidResult.array();
      expect(errors[0].msg).toContain('en');
    });
  });

  describe('Combined validation scenarios', () => {
    it('should validate a complete CRUD operation request', async () => {
      const {
        zodToExpressValidator,
      } = require('../../src/decorators/zod-validation');

      // Create item schema
      const CreateItemSchema = z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        price: z.number().positive(),
        category: z.enum(['electronics', 'clothing', 'food']),
      });

      const bodyValidator = zodToExpressValidator(CreateItemSchema);
      const bodyChains = bodyValidator('en');

      // Valid create request
      const validReq = createMockRequest({
        body: {
          name: 'Test Product',
          description: 'A great product',
          price: 29.99,
          category: 'electronics',
        },
      });
      const validResult = await runValidation(bodyChains, validReq);
      expect(validResult.isEmpty()).toBe(true);

      // Invalid create request (missing required field, invalid category)
      const invalidReq = createMockRequest({
        body: {
          name: '', // Empty name
          price: -10, // Negative price
          category: 'invalid', // Invalid category
        },
      });
      const invalidResult = await runValidation(bodyChains, invalidReq);
      expect(invalidResult.isEmpty()).toBe(false);
    });

    it('should validate update request with params and body', async () => {
      const {
        zodToExpressValidator,
      } = require('../../src/decorators/zod-validation');

      // Update item schema (all fields optional)
      const UpdateItemSchema = z.object({
        name: z.string().min(1).max(100).optional(),
        price: z.number().positive().optional(),
      });

      const bodyValidator = zodToExpressValidator(UpdateItemSchema);
      const bodyChains = bodyValidator('en');
      const paramChains = [param('id').isUUID()];

      // Valid update request
      const validReq = createMockRequest({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { name: 'Updated Name' },
      });

      const bodyResult = await runValidation(bodyChains, validReq);
      const paramResult = await runValidation(paramChains, validReq);

      expect(bodyResult.isEmpty()).toBe(true);
      expect(paramResult.isEmpty()).toBe(true);
    });

    it('should validate list request with pagination query params', async () => {
      const {
        zodToExpressValidator,
      } = require('../../src/decorators/zod-validation');

      const PaginationSchema = z.object({
        page: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
        sortBy: z.string().optional(),
      });

      // Note: For query params, we'd typically use query() instead of body()
      // but zodToExpressValidator currently generates body() chains
      // In a real scenario, you'd use query chains directly
      const queryChains = [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('sortBy').optional().isString(),
      ];

      // Valid pagination
      const validReq = createMockRequest({
        query: { page: '2', limit: '25', sortBy: 'name' },
      });
      const validResult = await runValidation(queryChains, validReq);
      expect(validResult.isEmpty()).toBe(true);

      // Invalid pagination
      const invalidReq = createMockRequest({
        query: { page: '0', limit: '200' }, // page < 1, limit > 100
      });
      const invalidResult = await runValidation(queryChains, invalidReq);
      expect(invalidResult.isEmpty()).toBe(false);
    });
  });
});
