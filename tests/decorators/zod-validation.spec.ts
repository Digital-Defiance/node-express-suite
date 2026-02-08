import 'reflect-metadata';
import { z } from 'zod';
import {
  zodToExpressValidator,
  zodToOpenAPI,
  ZodValidate,
  OpenAPIObjectSchema,
  OpenAPIArraySchema,
  OpenAPISchemaType,
  getZodDescription,
} from '../../src/decorators/zod-validation';
import { OpenAPIParameterSchema } from '../../src/interfaces/openApi/parameterSchema';

describe('Zod Validation', () => {
  describe('zodToExpressValidator', () => {
    it('should convert simple string schema', () => {
      const schema = z.object({
        name: z.string(),
      });

      const validator = zodToExpressValidator(schema);
      const chains = validator('en');
      expect(chains).toHaveLength(1);
    });

    it('should handle optional fields', () => {
      const schema = z.object({
        name: z.string().optional(),
      });

      const validator = zodToExpressValidator(schema);
      const chains = validator('en');
      expect(chains).toHaveLength(1);
    });

    it('should handle multiple fields', () => {
      const schema = z.object({
        name: z.string(),
        email: z.string(),
        age: z.number().optional(),
      });

      const validator = zodToExpressValidator(schema);
      const chains = validator('en');
      expect(chains.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-object schemas', () => {
      const schema = z.string();
      const validator = zodToExpressValidator(schema);
      const chains = validator('en');
      expect(chains).toEqual([]);
    });

    it('should handle string with min/max length', () => {
      const schema = z.object({
        name: z.string().min(1).max(100),
      });

      const validator = zodToExpressValidator(schema);
      const chains = validator('en');
      expect(chains).toHaveLength(1);
    });

    it('should handle email validation', () => {
      const schema = z.object({
        email: z.string().email(),
      });

      const validator = zodToExpressValidator(schema);
      const chains = validator('en');
      expect(chains).toHaveLength(1);
    });

    it('should handle number with int validation', () => {
      const schema = z.object({
        age: z.number().int(),
      });

      const validator = zodToExpressValidator(schema);
      const chains = validator('en');
      expect(chains).toHaveLength(1);
    });

    it('should handle boolean fields', () => {
      const schema = z.object({
        active: z.boolean(),
      });

      const validator = zodToExpressValidator(schema);
      const chains = validator('en');
      expect(chains).toHaveLength(1);
    });

    it('should handle array fields', () => {
      const schema = z.object({
        tags: z.array(z.string()),
      });

      const validator = zodToExpressValidator(schema);
      const chains = validator('en');
      expect(chains).toHaveLength(1);
    });

    it('should handle nullable fields', () => {
      const schema = z.object({
        nickname: z.string().nullable(),
      });

      const validator = zodToExpressValidator(schema);
      const chains = validator('en');
      expect(chains).toHaveLength(1);
    });

    it('should handle default fields', () => {
      const schema = z.object({
        role: z.string().default('user'),
      });

      const validator = zodToExpressValidator(schema);
      const chains = validator('en');
      expect(chains).toHaveLength(1);
    });
  });

  describe('@ZodValidate', () => {
    it('should store schema metadata', () => {
      const schema = z.object({ name: z.string() });

      class TestClass {
        @ZodValidate(schema)
        testMethod() {}
      }

      const metadata = Reflect.getMetadata(
        'zodSchema',
        TestClass.prototype,
        'testMethod',
      );
      expect(metadata).toBe(schema);
    });
  });
});

describe('zodToOpenAPI', () => {
  describe('Primitive types', () => {
    it('should convert ZodString to string schema', () => {
      const schema = z.string();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
    });

    it('should convert ZodNumber to number schema', () => {
      const schema = z.number();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('number');
    });

    it('should convert ZodNumber.int() to integer schema', () => {
      const schema = z.number().int();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('integer');
    });

    it('should convert ZodBoolean to boolean schema', () => {
      const schema = z.boolean();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('boolean');
    });

    it('should convert ZodDate to string with date-time format', () => {
      const schema = z.date();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
      expect(result.format).toBe('date-time');
    });
  });

  describe('String validations', () => {
    it('should convert string with min length', () => {
      const schema = z.string().min(5);
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
      expect(result.minLength).toBe(5);
    });

    it('should convert string with max length', () => {
      const schema = z.string().max(100);
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
      expect(result.maxLength).toBe(100);
    });

    it('should convert string with min and max length', () => {
      const schema = z.string().min(1).max(50);
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
      expect(result.minLength).toBe(1);
      expect(result.maxLength).toBe(50);
    });

    it('should convert string with exact length', () => {
      const schema = z.string().length(10);
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
      expect(result.minLength).toBe(10);
      expect(result.maxLength).toBe(10);
    });

    it('should convert email string to email format', () => {
      const schema = z.string().email();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
      expect(result.format).toBe('email');
    });

    it('should convert url string to uri format', () => {
      const schema = z.string().url();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
      expect(result.format).toBe('uri');
    });

    it('should convert uuid string to uuid format', () => {
      const schema = z.string().uuid();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
      expect(result.format).toBe('uuid');
    });

    it('should convert datetime string to date-time format', () => {
      const schema = z.string().datetime();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
      expect(result.format).toBe('date-time');
    });

    it('should convert string with regex to pattern', () => {
      const schema = z.string().regex(/^[A-Z]{3}$/);
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
      expect(result.pattern).toBe('^[A-Z]{3}$');
    });
  });

  describe('Number validations', () => {
    it('should convert number with min', () => {
      const schema = z.number().min(0);
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('number');
      expect(result.minimum).toBe(0);
    });

    it('should convert number with max', () => {
      const schema = z.number().max(100);
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('number');
      expect(result.maximum).toBe(100);
    });

    it('should convert number with positive (min 0)', () => {
      const schema = z.number().positive();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('number');
      // Zod's positive() sets minimum to 0 (exclusive in Zod, but OpenAPI uses inclusive)
      expect(result.minimum).toBeDefined();
    });

    it('should convert integer with min and max', () => {
      const schema = z.number().int().min(1).max(10);
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('integer');
      expect(result.minimum).toBe(1);
      expect(result.maximum).toBe(10);
    });
  });

  describe('Enum types', () => {
    it('should convert ZodEnum to string with enum values', () => {
      const schema = z.enum(['admin', 'user', 'guest']);
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
      expect(result.enum).toEqual(['admin', 'user', 'guest']);
    });

    it('should convert ZodLiteral string to enum with single value', () => {
      const schema = z.literal('active');
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
      expect(result.enum).toEqual(['active']);
    });
  });

  describe('Array types', () => {
    it('should convert ZodArray to array schema', () => {
      const schema = z.array(z.string());
      const result = zodToOpenAPI(schema) as OpenAPIArraySchema;

      expect(result.type).toBe('array');
      expect((result.items as OpenAPIParameterSchema).type).toBe('string');
    });

    it('should convert array with min items', () => {
      const schema = z.array(z.string()).min(1);
      const result = zodToOpenAPI(schema) as OpenAPIArraySchema;

      expect(result.type).toBe('array');
      expect(result.minItems).toBe(1);
    });

    it('should convert array with max items', () => {
      const schema = z.array(z.string()).max(10);
      const result = zodToOpenAPI(schema) as OpenAPIArraySchema;

      expect(result.type).toBe('array');
      expect(result.maxItems).toBe(10);
    });

    it('should convert array with exact length', () => {
      const schema = z.array(z.string()).length(5);
      const result = zodToOpenAPI(schema) as OpenAPIArraySchema;

      expect(result.type).toBe('array');
      expect(result.minItems).toBe(5);
      expect(result.maxItems).toBe(5);
    });

    it('should convert array of objects', () => {
      const schema = z.array(z.object({ id: z.string(), name: z.string() }));
      const result = zodToOpenAPI(schema) as OpenAPIArraySchema;

      expect(result.type).toBe('array');
      expect((result.items as OpenAPIObjectSchema).type).toBe('object');
      expect((result.items as OpenAPIObjectSchema).properties).toHaveProperty(
        'id',
      );
      expect((result.items as OpenAPIObjectSchema).properties).toHaveProperty(
        'name',
      );
    });

    it('should convert array of enums', () => {
      const schema = z.array(z.enum(['read', 'write', 'delete']));
      const result = zodToOpenAPI(schema) as OpenAPIArraySchema;

      expect(result.type).toBe('array');
      expect((result.items as OpenAPIParameterSchema).type).toBe('string');
      expect((result.items as OpenAPIParameterSchema).enum).toEqual([
        'read',
        'write',
        'delete',
      ]);
    });
  });

  describe('Object types', () => {
    it('should convert ZodObject to object schema', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const result = zodToOpenAPI(schema) as OpenAPIObjectSchema;

      expect(result.type).toBe('object');
      expect(result.properties).toHaveProperty('name');
      expect(result.properties).toHaveProperty('age');
      expect((result.properties!.name as OpenAPIParameterSchema).type).toBe(
        'string',
      );
      expect((result.properties!.age as OpenAPIParameterSchema).type).toBe(
        'number',
      );
    });

    it('should mark required fields correctly', () => {
      const schema = z.object({
        name: z.string(),
        nickname: z.string().optional(),
      });
      const result = zodToOpenAPI(schema) as OpenAPIObjectSchema;

      expect(result.required).toContain('name');
      expect(result.required).not.toContain('nickname');
    });

    it('should handle nested objects', () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
      });
      const result = zodToOpenAPI(schema) as OpenAPIObjectSchema;

      expect(result.type).toBe('object');
      expect(result.properties).toHaveProperty('user');
      const userSchema = result.properties!.user as OpenAPIObjectSchema;
      expect(userSchema.type).toBe('object');
      expect(userSchema.properties).toHaveProperty('name');
      expect(userSchema.properties).toHaveProperty('email');
    });

    it('should handle objects with arrays', () => {
      const schema = z.object({
        tags: z.array(z.string()),
        roles: z.array(z.enum(['admin', 'user'])),
      });
      const result = zodToOpenAPI(schema) as OpenAPIObjectSchema;

      expect(result.type).toBe('object');
      const tagsSchema = result.properties!.tags as OpenAPIArraySchema;
      expect(tagsSchema.type).toBe('array');
      expect((tagsSchema.items as OpenAPIParameterSchema).type).toBe('string');
    });
  });

  describe('Optional and nullable types', () => {
    it('should handle ZodOptional', () => {
      const schema = z.object({
        name: z.string().optional(),
      });
      const result = zodToOpenAPI(schema) as OpenAPIObjectSchema;

      // When all fields are optional, required may be undefined or empty
      expect(result.required ?? []).not.toContain('name');
    });

    it('should handle ZodNullable with nullable flag', () => {
      const schema = z.string().nullable();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
      expect(result.nullable).toBe(true);
    });

    it('should handle ZodDefault', () => {
      const schema = z.object({
        role: z.string().default('user'),
      });
      const result = zodToOpenAPI(schema) as OpenAPIObjectSchema;

      // Default fields are not required
      expect(result.required ?? []).not.toContain('role');
      // Default value should be set
      expect((result.properties!.role as OpenAPIParameterSchema).default).toBe(
        'user',
      );
    });
  });

  describe('Union types', () => {
    it('should convert ZodUnion to oneOf', () => {
      const schema = z.union([z.string(), z.number()]);
      const result = zodToOpenAPI(schema) as { oneOf: OpenAPISchemaType[] };

      expect(result.oneOf).toHaveLength(2);
      expect((result.oneOf[0] as OpenAPIParameterSchema).type).toBe('string');
      expect((result.oneOf[1] as OpenAPIParameterSchema).type).toBe('number');
    });

    it('should convert discriminated union to oneOf', () => {
      const schema = z.discriminatedUnion('type', [
        z.object({ type: z.literal('a'), value: z.string() }),
        z.object({ type: z.literal('b'), count: z.number() }),
      ]);
      const result = zodToOpenAPI(schema) as { oneOf: OpenAPISchemaType[] };

      expect(result.oneOf).toHaveLength(2);
    });
  });

  describe('Record types', () => {
    it('should convert ZodRecord to object with additionalProperties', () => {
      const schema = z.record(z.string(), z.number());
      const result = zodToOpenAPI(schema) as OpenAPIObjectSchema;

      expect(result.type).toBe('object');
      expect((result.additionalProperties as OpenAPIParameterSchema).type).toBe(
        'number',
      );
    });
  });

  describe('Complex schemas', () => {
    it('should convert a realistic user schema', () => {
      const UserSchema = z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        name: z.string().min(1).max(100),
        age: z.number().int().positive().optional(),
        roles: z.array(z.enum(['admin', 'user', 'guest'])),
        profile: z
          .object({
            bio: z.string().max(500).optional(),
            avatar: z.string().url().optional(),
          })
          .optional(),
        createdAt: z.date(),
      });

      const result = zodToOpenAPI(UserSchema) as OpenAPIObjectSchema;

      expect(result.type).toBe('object');
      expect(result.required).toContain('id');
      expect(result.required).toContain('email');
      expect(result.required).toContain('name');
      expect(result.required).toContain('roles');
      expect(result.required).toContain('createdAt');
      expect(result.required).not.toContain('age');
      expect(result.required).not.toContain('profile');

      // Check id
      const idSchema = result.properties!.id as OpenAPIParameterSchema;
      expect(idSchema.type).toBe('string');
      expect(idSchema.format).toBe('uuid');

      // Check email
      const emailSchema = result.properties!.email as OpenAPIParameterSchema;
      expect(emailSchema.type).toBe('string');
      expect(emailSchema.format).toBe('email');

      // Check name
      const nameSchema = result.properties!.name as OpenAPIParameterSchema;
      expect(nameSchema.type).toBe('string');
      expect(nameSchema.minLength).toBe(1);
      expect(nameSchema.maxLength).toBe(100);

      // Check roles
      const rolesSchema = result.properties!.roles as OpenAPIArraySchema;
      expect(rolesSchema.type).toBe('array');
      expect((rolesSchema.items as OpenAPIParameterSchema).enum).toEqual([
        'admin',
        'user',
        'guest',
      ]);

      // Check createdAt
      const createdAtSchema = result.properties!
        .createdAt as OpenAPIParameterSchema;
      expect(createdAtSchema.type).toBe('string');
      expect(createdAtSchema.format).toBe('date-time');
    });

    it('should convert a pagination request schema', () => {
      const PaginationSchema = z.object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(10),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).default('asc'),
      });

      const result = zodToOpenAPI(PaginationSchema) as OpenAPIObjectSchema;

      expect(result.type).toBe('object');
      // All fields have defaults or are optional, so required may be undefined or empty
      expect(result.required ?? []).toHaveLength(0);

      // Check page
      const pageSchema = result.properties!.page as OpenAPIParameterSchema;
      expect(pageSchema.type).toBe('integer');
      expect(pageSchema.minimum).toBeDefined();
      expect(pageSchema.default).toBe(1);

      // Check limit
      const limitSchema = result.properties!.limit as OpenAPIParameterSchema;
      expect(limitSchema.type).toBe('integer');
      expect(limitSchema.maximum).toBe(100);
      expect(limitSchema.default).toBe(10);

      // Check sortOrder
      const sortOrderSchema = result.properties!
        .sortOrder as OpenAPIParameterSchema;
      expect(sortOrderSchema.type).toBe('string');
      expect(sortOrderSchema.enum).toEqual(['asc', 'desc']);
      expect(sortOrderSchema.default).toBe('asc');
    });
  });

  describe('getZodDescription', () => {
    it('should extract description from schema', () => {
      const schema = z.string().describe('A user name');
      const description = getZodDescription(schema);

      expect(description).toBe('A user name');
    });

    it('should return undefined when no description', () => {
      const schema = z.string();
      const description = getZodDescription(schema);

      expect(description).toBeUndefined();
    });
  });
});

// Import additional exports for new tests
import {
  getZodExample,
  getZodExamples,
  getZodTitle,
  isZodDeprecated,
  extractZodMetadata,
  ZodOpenAPIParameterSchema,
  OpenAPIUnionSchema,
} from '../../src/decorators/zod-validation';

describe('zodToOpenAPI - Additional Type Conversions', () => {
  describe('BigInt type', () => {
    it('should convert ZodBigInt to integer with int64 format', () => {
      const schema = z.bigint();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('integer');
      expect(result.format).toBe('int64');
    });
  });

  describe('Set type', () => {
    it('should convert ZodSet to array with uniqueItems', () => {
      const schema = z.set(z.string());
      const result = zodToOpenAPI(schema) as OpenAPIArraySchema;

      expect(result.type).toBe('array');
      expect((result.items as OpenAPIParameterSchema).type).toBe('string');
      expect(result.uniqueItems).toBe(true);
    });
  });

  describe('Map type', () => {
    it('should convert ZodMap to object with additionalProperties', () => {
      const schema = z.map(z.string(), z.number());
      const result = zodToOpenAPI(schema) as OpenAPIObjectSchema;

      expect(result.type).toBe('object');
      expect((result.additionalProperties as OpenAPIParameterSchema).type).toBe(
        'number',
      );
    });
  });

  describe('Tuple type', () => {
    it('should convert ZodTuple to array with fixed length', () => {
      const schema = z.tuple([z.string(), z.number(), z.boolean()]);
      const result = zodToOpenAPI(schema) as OpenAPIArraySchema;

      expect(result.type).toBe('array');
      expect(result.minItems).toBe(3);
      expect(result.maxItems).toBe(3);
    });

    it('should convert single-item tuple to array', () => {
      const schema = z.tuple([z.string()]);
      const result = zodToOpenAPI(schema) as OpenAPIArraySchema;

      expect(result.type).toBe('array');
      expect((result.items as OpenAPIParameterSchema).type).toBe('string');
      expect(result.minItems).toBe(1);
      expect(result.maxItems).toBe(1);
    });
  });

  describe('Intersection type', () => {
    it('should merge two object schemas', () => {
      const schema = z.intersection(
        z.object({ name: z.string() }),
        z.object({ age: z.number() }),
      );
      const result = zodToOpenAPI(schema) as OpenAPIObjectSchema;

      expect(result.type).toBe('object');
      expect(result.properties).toHaveProperty('name');
      expect(result.properties).toHaveProperty('age');
    });

    it('should use anyOf for non-object intersections', () => {
      const schema = z.intersection(z.string(), z.number());
      const result = zodToOpenAPI(schema) as OpenAPIUnionSchema;

      expect(result.anyOf).toHaveLength(2);
    });
  });

  describe('Lazy type', () => {
    it('should convert ZodLazy by evaluating the getter', () => {
      const schema = z.lazy(() => z.string());
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
    });
  });

  describe('Pipeline type', () => {
    it('should convert ZodPipeline using the output type', () => {
      const schema = z.string().pipe(z.coerce.number());
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('number');
    });
  });

  describe('Effects type (refinements)', () => {
    it('should unwrap ZodEffects and convert inner type', () => {
      const schema = z.string().refine((val) => val.length > 0);
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
    });

    it('should handle transform effects', () => {
      const schema = z.string().transform((val) => parseInt(val, 10));
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
    });
  });

  describe('Catch type', () => {
    it('should unwrap ZodCatch and convert inner type', () => {
      const schema = z.string().catch('default');
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
    });
  });

  describe('Branded type', () => {
    it('should unwrap ZodBranded and convert inner type', () => {
      const schema = z.string().brand<'UserId'>();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
    });
  });

  describe('Readonly type', () => {
    it('should unwrap ZodReadonly and mark as readOnly', () => {
      const schema = z.object({ id: z.string() }).readonly();
      const result = zodToOpenAPI(schema) as OpenAPIObjectSchema;

      expect(result.type).toBe('object');
      expect(result.readOnly).toBe(true);
    });
  });

  describe('Promise type', () => {
    it('should unwrap ZodPromise and convert inner type', () => {
      const schema = z.promise(z.string());
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
    });
  });

  describe('NaN type', () => {
    it('should convert ZodNaN to number', () => {
      const schema = z.nan();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('number');
    });
  });

  describe('Never type', () => {
    it('should convert ZodNever to string (fallback)', () => {
      const schema = z.never();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
    });
  });

  describe('Null type', () => {
    it('should convert ZodNull to nullable string', () => {
      const schema = z.null();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
      expect(result.nullable).toBe(true);
    });
  });

  describe('Undefined type', () => {
    it('should convert ZodUndefined to string', () => {
      const schema = z.undefined();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
    });
  });

  describe('Void type', () => {
    it('should convert ZodVoid to string', () => {
      const schema = z.void();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
    });
  });

  describe('Any type', () => {
    it('should convert ZodAny to object', () => {
      const schema = z.any();
      const result = zodToOpenAPI(schema) as OpenAPIObjectSchema;

      expect(result.type).toBe('object');
    });
  });

  describe('Unknown type', () => {
    it('should convert ZodUnknown to object', () => {
      const schema = z.unknown();
      const result = zodToOpenAPI(schema) as OpenAPIObjectSchema;

      expect(result.type).toBe('object');
    });
  });

  describe('Native enum type', () => {
    it('should convert string native enum', () => {
      enum Status {
        Active = 'active',
        Inactive = 'inactive',
      }
      const schema = z.nativeEnum(Status);
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
      expect(result.enum).toContain('active');
      expect(result.enum).toContain('inactive');
    });
  });

  describe('Literal types', () => {
    it('should convert number literal', () => {
      const schema = z.literal(42);
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('number');
      expect(result.enum).toEqual(['42']);
    });

    it('should convert boolean literal', () => {
      const schema = z.literal(true);
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('boolean');
    });
  });

  describe('Discriminated union with discriminator', () => {
    it('should include discriminator property in result', () => {
      const schema = z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('circle'), radius: z.number() }),
        z.object({ kind: z.literal('square'), side: z.number() }),
      ]);
      const result = zodToOpenAPI(schema) as OpenAPIUnionSchema;

      expect(result.oneOf).toHaveLength(2);
      expect(result.discriminator).toBeDefined();
      expect(result.discriminator?.propertyName).toBe('kind');
    });
  });

  describe('String format validations', () => {
    it('should convert date string to date format', () => {
      const schema = z.string().date();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
      expect(result.format).toBe('date');
    });

    it('should convert time string to time format', () => {
      const schema = z.string().time();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
      expect(result.format).toBe('time');
    });

    it('should convert ip string to ip format', () => {
      const schema = z.string().ip();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
      expect(result.format).toBe('ip');
    });

    it('should convert cuid string to cuid format', () => {
      const schema = z.string().cuid();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
      expect(result.format).toBe('cuid');
    });

    it('should convert cuid2 string to cuid format', () => {
      const schema = z.string().cuid2();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
      expect(result.format).toBe('cuid');
    });

    it('should convert ulid string to ulid format', () => {
      const schema = z.string().ulid();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
      expect(result.format).toBe('ulid');
    });

    it('should convert duration string to duration format', () => {
      const schema = z.string().duration();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
      expect(result.format).toBe('duration');
    });

    it('should convert base64 string to byte format', () => {
      const schema = z.string().base64();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('string');
      expect(result.format).toBe('byte');
    });
  });

  describe('Number validations', () => {
    it('should convert number with multipleOf', () => {
      const schema = z.number().multipleOf(5);
      const result = zodToOpenAPI(schema) as ZodOpenAPIParameterSchema;

      expect(result.type).toBe('number');
      expect(result.multipleOf).toBe(5);
    });

    it('should convert negative number', () => {
      const schema = z.number().negative();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('number');
      expect(result.maximum).toBeDefined();
    });

    it('should convert nonnegative number', () => {
      const schema = z.number().nonnegative();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('number');
      expect(result.minimum).toBe(0);
    });

    it('should convert nonpositive number', () => {
      const schema = z.number().nonpositive();
      const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

      expect(result.type).toBe('number');
      expect(result.maximum).toBe(0);
    });
  });
});

describe('Metadata Extraction', () => {
  describe('extractZodMetadata', () => {
    it('should extract description from describe()', () => {
      const schema = z.string().describe('A test description');
      const metadata = extractZodMetadata(schema);

      expect(metadata.description).toBe('A test description');
    });

    it('should return empty metadata for schema without description', () => {
      const schema = z.string();
      const metadata = extractZodMetadata(schema);

      expect(metadata.description).toBeUndefined();
      expect(metadata.example).toBeUndefined();
    });
  });

  describe('getZodExample', () => {
    it('should return undefined for schema without example', () => {
      const schema = z.string();
      const example = getZodExample(schema);

      expect(example).toBeUndefined();
    });

    it('should return default value as example for ZodDefault', () => {
      const schema = z.string().default('default-value');
      const example = getZodExample(schema);

      expect(example).toBe('default-value');
    });
  });

  describe('getZodExamples', () => {
    it('should return undefined for schema without examples', () => {
      const schema = z.string();
      const examples = getZodExamples(schema);

      expect(examples).toBeUndefined();
    });
  });

  describe('getZodTitle', () => {
    it('should return undefined for schema without title', () => {
      const schema = z.string();
      const title = getZodTitle(schema);

      expect(title).toBeUndefined();
    });
  });

  describe('isZodDeprecated', () => {
    it('should return false for non-deprecated schema', () => {
      const schema = z.string();
      const deprecated = isZodDeprecated(schema);

      expect(deprecated).toBe(false);
    });
  });

  describe('Description in OpenAPI output', () => {
    it('should include description in converted schema', () => {
      const schema = z.string().describe('User email address');
      const result = zodToOpenAPI(schema) as ZodOpenAPIParameterSchema;

      expect(result.type).toBe('string');
      expect(result.description).toBe('User email address');
    });

    it('should include description in object properties', () => {
      const schema = z.object({
        email: z.string().email().describe('User email'),
        name: z.string().describe('User full name'),
      });
      const result = zodToOpenAPI(schema) as OpenAPIObjectSchema;

      expect(
        (result.properties!.email as ZodOpenAPIParameterSchema).description,
      ).toBe('User email');
      expect(
        (result.properties!.name as ZodOpenAPIParameterSchema).description,
      ).toBe('User full name');
    });

    it('should include description in array items', () => {
      const schema = z.array(z.string().describe('Tag name'));
      const result = zodToOpenAPI(schema) as OpenAPIArraySchema;

      expect((result.items as ZodOpenAPIParameterSchema).description).toBe(
        'Tag name',
      );
    });

    it('should include description in nested objects', () => {
      const schema = z.object({
        profile: z
          .object({
            bio: z.string().describe('User biography'),
          })
          .describe('User profile information'),
      });
      const result = zodToOpenAPI(schema) as OpenAPIObjectSchema;

      const profileSchema = result.properties!.profile as OpenAPIObjectSchema;
      expect(profileSchema.description).toBe('User profile information');
      expect(
        (profileSchema.properties!.bio as ZodOpenAPIParameterSchema)
          .description,
      ).toBe('User biography');
    });
  });
});

describe('Complex Nested Schemas', () => {
  it('should handle deeply nested objects', () => {
    const schema = z.object({
      level1: z.object({
        level2: z.object({
          level3: z.object({
            value: z.string(),
          }),
        }),
      }),
    });
    const result = zodToOpenAPI(schema) as OpenAPIObjectSchema;

    const level1 = result.properties!.level1 as OpenAPIObjectSchema;
    const level2 = level1.properties!.level2 as OpenAPIObjectSchema;
    const level3 = level2.properties!.level3 as OpenAPIObjectSchema;
    expect((level3.properties!.value as OpenAPIParameterSchema).type).toBe(
      'string',
    );
  });

  it('should handle arrays of arrays', () => {
    const schema = z.array(z.array(z.string()));
    const result = zodToOpenAPI(schema) as OpenAPIArraySchema;

    expect(result.type).toBe('array');
    const innerArray = result.items as OpenAPIArraySchema;
    expect(innerArray.type).toBe('array');
    expect((innerArray.items as OpenAPIParameterSchema).type).toBe('string');
  });

  it('should handle union of objects', () => {
    const schema = z.union([
      z.object({ type: z.literal('a'), valueA: z.string() }),
      z.object({ type: z.literal('b'), valueB: z.number() }),
    ]);
    const result = zodToOpenAPI(schema) as OpenAPIUnionSchema;

    expect(result.oneOf).toHaveLength(2);
    const firstOption = result.oneOf![0] as OpenAPIObjectSchema;
    const secondOption = result.oneOf![1] as OpenAPIObjectSchema;
    expect(firstOption.properties).toHaveProperty('valueA');
    expect(secondOption.properties).toHaveProperty('valueB');
  });

  it('should handle optional nullable with default', () => {
    const schema = z.string().nullable().optional().default(null);
    const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

    expect(result.type).toBe('string');
    expect(result.nullable).toBe(true);
    expect(result.default).toBe(null);
  });

  it('should handle record with complex value type', () => {
    const schema = z.record(
      z.string(),
      z.object({
        count: z.number(),
        items: z.array(z.string()),
      }),
    );
    const result = zodToOpenAPI(schema) as OpenAPIObjectSchema;

    expect(result.type).toBe('object');
    const additionalProps = result.additionalProperties as OpenAPIObjectSchema;
    expect(additionalProps.type).toBe('object');
    expect(additionalProps.properties).toHaveProperty('count');
    expect(additionalProps.properties).toHaveProperty('items');
  });
});
