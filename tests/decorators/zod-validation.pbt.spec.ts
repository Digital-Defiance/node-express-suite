/**
 * @fileoverview Property-based tests for Zod to OpenAPI conversion.
 * Tests that the conversion preserves schema structure and metadata.
 *
 * **Validates: Requirements 5.5**
 * Zod schemas are automatically converted to OpenAPI request body schemas.
 */

import * as fc from 'fast-check';
import { z } from 'zod';
import {
  zodToOpenAPI,
  OpenAPIObjectSchema,
  OpenAPIArraySchema,
  OpenAPISchemaType,
  ZodOpenAPIParameterSchema,
} from '../../src/decorators/zod-validation';
import { OpenAPIParameterSchema } from '../../src/interfaces/openApi/parameterSchema';

/**
 * Arbitrary for generating valid Zod primitive schemas.
 */
const zodPrimitiveArb = fc.oneof(
  fc.constant(z.string()),
  fc.constant(z.number()),
  fc.constant(z.boolean()),
  fc.constant(z.date()),
  fc.constant(z.bigint()),
);

/**
 * Arbitrary for generating Zod string schemas with various validations.
 */
const zodStringArb = fc
  .record({
    minLength: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
    maxLength: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined }),
    format: fc.option(fc.constantFrom('email', 'url', 'uuid', 'datetime'), {
      nil: undefined,
    }),
    description: fc.option(fc.string({ minLength: 1, maxLength: 100 }), {
      nil: undefined,
    }),
  })
  .map(({ minLength, maxLength, format, description }) => {
    let schema = z.string();
    if (minLength !== undefined) schema = schema.min(minLength);
    if (
      maxLength !== undefined &&
      (minLength === undefined || maxLength >= minLength)
    ) {
      schema = schema.max(maxLength);
    }
    if (format === 'email') schema = schema.email();
    else if (format === 'url') schema = schema.url();
    else if (format === 'uuid') schema = schema.uuid();
    else if (format === 'datetime') schema = schema.datetime();
    if (description !== undefined) schema = schema.describe(description);
    return schema;
  });

/**
 * Arbitrary for generating Zod number schemas with various validations.
 */
const zodNumberArb = fc
  .record({
    isInt: fc.boolean(),
    min: fc.option(fc.integer({ min: -1000, max: 1000 }), { nil: undefined }),
    max: fc.option(fc.integer({ min: -1000, max: 1000 }), { nil: undefined }),
    description: fc.option(fc.string({ minLength: 1, maxLength: 100 }), {
      nil: undefined,
    }),
  })
  .map(({ isInt, min, max, description }) => {
    let schema = z.number();
    if (isInt) schema = schema.int();
    if (min !== undefined) schema = schema.min(min);
    if (max !== undefined && (min === undefined || max >= min)) {
      schema = schema.max(max);
    }
    if (description !== undefined) schema = schema.describe(description);
    return schema;
  });

/**
 * Arbitrary for generating Zod enum schemas.
 */
const zodEnumArb = fc
  .array(
    fc
      .string({ minLength: 1, maxLength: 20 })
      .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s)),
    {
      minLength: 1,
      maxLength: 5,
    },
  )
  .filter((arr) => new Set(arr).size === arr.length) // Ensure unique values
  .map((values) => z.enum(values as [string, ...string[]]));

/**
 * Arbitrary for generating simple Zod object schemas.
 */
const zodSimpleObjectArb = fc
  .dictionary(
    fc
      .string({ minLength: 1, maxLength: 20 })
      .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s)),
    fc.oneof(
      fc.constant(z.string()),
      fc.constant(z.number()),
      fc.constant(z.boolean()),
      fc.constant(z.string().optional()),
      fc.constant(z.number().optional()),
    ),
    { minKeys: 1, maxKeys: 5 },
  )
  .map((shape) => z.object(shape));

/**
 * Arbitrary for generating Zod array schemas.
 */
const zodArrayArb = fc
  .record({
    itemType: fc.constantFrom('string', 'number', 'boolean'),
    minLength: fc.option(fc.integer({ min: 0, max: 10 }), { nil: undefined }),
    maxLength: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
  })
  .map(({ itemType, minLength, maxLength }) => {
    let itemSchema: z.ZodType;
    switch (itemType) {
      case 'string':
        itemSchema = z.string();
        break;
      case 'number':
        itemSchema = z.number();
        break;
      case 'boolean':
        itemSchema = z.boolean();
        break;
      default:
        itemSchema = z.string();
    }
    let schema = z.array(itemSchema);
    if (minLength !== undefined) schema = schema.min(minLength);
    if (
      maxLength !== undefined &&
      (minLength === undefined || maxLength >= minLength)
    ) {
      schema = schema.max(maxLength);
    }
    return schema;
  });

describe('Property-Based Tests: Zod to OpenAPI Conversion', () => {
  describe('P1: Type Preservation Property', () => {
    it('should preserve primitive type information', () => {
      fc.assert(
        fc.property(zodPrimitiveArb, (zodSchema) => {
          const result = zodToOpenAPI(zodSchema);

          // Result should always have a type
          expect('type' in result).toBe(true);

          // Type should be a valid OpenAPI type
          const validTypes = [
            'string',
            'number',
            'integer',
            'boolean',
            'object',
            'array',
          ];
          expect(validTypes).toContain((result as OpenAPIParameterSchema).type);
        }),
        { numRuns: 50 },
      );
    });
  });

  describe('P2: String Schema Conversion Property', () => {
    it('should preserve string validations in OpenAPI schema', () => {
      fc.assert(
        fc.property(zodStringArb, (zodSchema) => {
          const result = zodToOpenAPI(zodSchema) as ZodOpenAPIParameterSchema;

          // Type should be string
          expect(result.type).toBe('string');

          // If minLength was set, it should be preserved
          const checks = (zodSchema._def.checks ?? []) as Array<{
            kind: string;
            value?: number;
          }>;
          const minCheck = checks.find((c) => c.kind === 'min');
          if (minCheck) {
            expect(result.minLength).toBe(minCheck.value);
          }

          // If maxLength was set, it should be preserved
          const maxCheck = checks.find((c) => c.kind === 'max');
          if (maxCheck) {
            expect(result.maxLength).toBe(maxCheck.value);
          }

          // Description should be preserved
          if (zodSchema._def.description) {
            expect(result.description).toBe(zodSchema._def.description);
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('P3: Number Schema Conversion Property', () => {
    it('should preserve number validations in OpenAPI schema', () => {
      fc.assert(
        fc.property(zodNumberArb, (zodSchema) => {
          const result = zodToOpenAPI(zodSchema) as ZodOpenAPIParameterSchema;

          // Type should be number or integer
          expect(['number', 'integer']).toContain(result.type);

          const checks = (zodSchema._def.checks ?? []) as Array<{
            kind: string;
            value?: number;
          }>;

          // If int was set, type should be integer
          const intCheck = checks.find((c) => c.kind === 'int');
          if (intCheck) {
            expect(result.type).toBe('integer');
          }

          // If min was set, it should be preserved
          const minCheck = checks.find((c) => c.kind === 'min');
          if (minCheck) {
            expect(result.minimum).toBe(minCheck.value);
          }

          // If max was set, it should be preserved
          const maxCheck = checks.find((c) => c.kind === 'max');
          if (maxCheck) {
            expect(result.maximum).toBe(maxCheck.value);
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('P4: Enum Schema Conversion Property', () => {
    it('should preserve enum values in OpenAPI schema', () => {
      fc.assert(
        fc.property(zodEnumArb, (zodSchema) => {
          const result = zodToOpenAPI(zodSchema) as OpenAPIParameterSchema;

          // Type should be string
          expect(result.type).toBe('string');

          // Enum values should be preserved
          const originalValues = zodSchema._def.values as string[];
          expect(result.enum).toEqual(originalValues);
        }),
        { numRuns: 50 },
      );
    });
  });

  describe('P5: Object Schema Conversion Property', () => {
    it('should preserve object structure in OpenAPI schema', () => {
      fc.assert(
        fc.property(zodSimpleObjectArb, (zodSchema) => {
          const result = zodToOpenAPI(zodSchema) as OpenAPIObjectSchema;

          // Type should be object
          expect(result.type).toBe('object');

          // Properties should exist
          expect(result.properties).toBeDefined();

          // All keys from Zod schema should be in OpenAPI schema
          const zodShape = zodSchema._def.shape();
          const zodKeys = Object.keys(zodShape);
          const openApiKeys = Object.keys(result.properties ?? {});

          expect(openApiKeys.sort()).toEqual(zodKeys.sort());

          // Required fields should only include non-optional fields
          const requiredFields = result.required ?? [];
          for (const key of zodKeys) {
            const zodField = zodShape[key] as z.ZodType;
            const isOptional =
              zodField instanceof z.ZodOptional ||
              zodField instanceof z.ZodDefault;
            if (isOptional) {
              expect(requiredFields).not.toContain(key);
            } else {
              expect(requiredFields).toContain(key);
            }
          }
        }),
        { numRuns: 50 },
      );
    });
  });

  describe('P6: Array Schema Conversion Property', () => {
    it('should preserve array structure in OpenAPI schema', () => {
      fc.assert(
        fc.property(zodArrayArb, (zodSchema) => {
          const result = zodToOpenAPI(zodSchema) as OpenAPIArraySchema;

          // Type should be array
          expect(result.type).toBe('array');

          // Items should exist
          expect(result.items).toBeDefined();

          // Min/max items should be preserved if set
          if (
            zodSchema._def.minLength !== null &&
            zodSchema._def.minLength !== undefined
          ) {
            expect(result.minItems).toBe(zodSchema._def.minLength.value);
          }
          if (
            zodSchema._def.maxLength !== null &&
            zodSchema._def.maxLength !== undefined
          ) {
            expect(result.maxItems).toBe(zodSchema._def.maxLength.value);
          }
        }),
        { numRuns: 50 },
      );
    });
  });

  describe('P7: Nullable Schema Conversion Property', () => {
    it('should preserve nullable flag in OpenAPI schema', () => {
      fc.assert(
        fc.property(zodPrimitiveArb, (zodSchema) => {
          const nullableSchema = zodSchema.nullable();
          const result = zodToOpenAPI(nullableSchema) as OpenAPIParameterSchema;

          // Nullable flag should be true
          expect(result.nullable).toBe(true);
        }),
        { numRuns: 50 },
      );
    });
  });

  describe('P8: Optional Schema Conversion Property', () => {
    it('should handle optional fields correctly in objects', () => {
      fc.assert(
        fc.property(
          fc.record({
            requiredField: fc.constant(z.string()),
            optionalField: fc.constant(z.string().optional()),
          }),
          (shape) => {
            const zodSchema = z.object(shape);
            const result = zodToOpenAPI(zodSchema) as OpenAPIObjectSchema;

            // Required should only contain requiredField
            expect(result.required).toContain('requiredField');
            expect(result.required).not.toContain('optionalField');
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('P9: Default Value Preservation Property', () => {
    it('should preserve default values in OpenAPI schema', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc
              .string()
              .map((s) => ({ schema: z.string().default(s), defaultValue: s })),
            fc
              .integer()
              .map((n) => ({ schema: z.number().default(n), defaultValue: n })),
            fc.boolean().map((b) => ({
              schema: z.boolean().default(b),
              defaultValue: b,
            })),
          ),
          ({ schema, defaultValue }) => {
            const result = zodToOpenAPI(schema) as OpenAPIParameterSchema;

            // Default value should be preserved
            expect(result.default).toBe(defaultValue);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('P10: Description Preservation Property', () => {
    it('should preserve descriptions in OpenAPI schema', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            zodPrimitiveArb,
            fc.string({ minLength: 1, maxLength: 200 }),
          ),
          ([zodSchema, description]) => {
            const describedSchema = zodSchema.describe(description);
            const result = zodToOpenAPI(
              describedSchema,
            ) as ZodOpenAPIParameterSchema;

            // Description should be preserved
            expect(result.description).toBe(description);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('P11: Union Schema Conversion Property', () => {
    it('should convert unions to oneOf', () => {
      fc.assert(
        fc.property(
          fc.array(zodPrimitiveArb, { minLength: 2, maxLength: 4 }),
          (schemas) => {
            const unionSchema = z.union(
              schemas as [z.ZodType, z.ZodType, ...z.ZodType[]],
            );
            const result = zodToOpenAPI(unionSchema) as {
              oneOf: OpenAPISchemaType[];
            };

            // Should have oneOf array
            expect(result.oneOf).toBeDefined();
            expect(result.oneOf.length).toBe(schemas.length);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('P12: Idempotency Property', () => {
    it('should produce consistent output for the same input', () => {
      fc.assert(
        fc.property(zodSimpleObjectArb, (zodSchema) => {
          const result1 = zodToOpenAPI(zodSchema);
          const result2 = zodToOpenAPI(zodSchema);

          // Results should be deeply equal
          expect(result1).toEqual(result2);
        }),
        { numRuns: 50 },
      );
    });
  });

  describe('P13: Valid OpenAPI Output Property', () => {
    it('should always produce valid OpenAPI schema structure', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            zodStringArb,
            zodNumberArb,
            zodEnumArb,
            zodSimpleObjectArb,
            zodArrayArb,
          ),
          (zodSchema) => {
            const result = zodToOpenAPI(zodSchema);

            // Result should be an object
            expect(typeof result).toBe('object');
            expect(result).not.toBeNull();

            // Should have either type or oneOf/anyOf
            const hasType = 'type' in result;
            const hasOneOf = 'oneOf' in result;
            const hasAnyOf = 'anyOf' in result;

            expect(hasType || hasOneOf || hasAnyOf).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
