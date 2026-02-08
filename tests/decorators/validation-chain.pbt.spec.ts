/**
 * @fileoverview Property-based tests for validation chain composition.
 * Tests that validation decorators correctly compose and merge validation rules.
 *
 * **Validates: Requirements 5.1-5.8**
 * - @ValidateBody, @ValidateParams, @ValidateQuery store validation metadata
 * - Validation decorators automatically add 400 response
 * - Class-level validation applies to all methods unless overridden
 * - Method-level validation overrides class-level for the same field
 * - Multiple validation decorators can be combined
 * - Zod schemas, ValidationChain[], and functions are all supported
 */

import * as fc from 'fast-check';
import 'reflect-metadata';
import { z } from 'zod';

// Validation decorators
import {
  ValidateBody,
  ValidateParams,
  ValidateQuery,
  getEffectiveValidationMetadata,
  hasValidation,
  isZodSchema,
  isValidationChainArray,
  isValidationFunction,
} from '../../src/decorators/validation';

// Response decorators for checking 400 response
import { getEffectiveResponseMetadata } from '../../src/decorators/response';

// Metadata keys
import {
  VALIDATION_METADATA,
  RESPONSE_METADATA,
} from '../../src/decorators/metadata-keys';

/**
 * Arbitrary for generating valid method names.
 */
const methodNameArb = fc
  .string({ minLength: 3, maxLength: 15 })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s));

/**
 * Arbitrary for generating simple Zod schemas.
 */
const zodSchemaArb = fc.constantFrom(
  z.object({ name: z.string() }),
  z.object({ id: z.string().uuid() }),
  z.object({ email: z.string().email() }),
  z.object({ count: z.number().int().positive() }),
  z.object({ active: z.boolean() }),
);

/**
 * Arbitrary for generating validation field types.
 */
const validationFieldArb = fc.constantFrom('body', 'params', 'query');

describe('Property-Based Tests: Validation Chain Composition', () => {
  describe('P8.1: @ValidateBody Decorator', () => {
    it('should store body validation metadata', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            schema: zodSchemaArb,
          }),
          ({ handlerName, schema }) => {
            class TestController {}

            const decorator = ValidateBody(schema);
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            decorator(TestController.prototype, handlerName, descriptor);

            const validation = getEffectiveValidationMetadata(
              TestController,
              handlerName,
            );

            expect(validation.body).toBeDefined();
            expect(isZodSchema(validation.body!)).toBe(true);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should add 400 response to OpenAPI metadata', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            schema: zodSchemaArb,
          }),
          ({ handlerName, schema }) => {
            class TestController {}

            const decorator = ValidateBody(schema);
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            decorator(TestController.prototype, handlerName, descriptor);

            const responses = getEffectiveResponseMetadata(
              TestController,
              handlerName,
            );

            expect(responses.some((r) => r.statusCode === 400)).toBe(true);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should work as class decorator', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            schema: zodSchemaArb,
          }),
          ({ handlerName, schema }) => {
            @ValidateBody(schema)
            class TestController {}

            const validation = getEffectiveValidationMetadata(
              TestController,
              handlerName,
            );

            expect(validation.body).toBeDefined();
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('P8.2: @ValidateParams Decorator', () => {
    it('should store params validation metadata', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            schema: zodSchemaArb,
          }),
          ({ handlerName, schema }) => {
            class TestController {}

            const decorator = ValidateParams(schema);
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            decorator(TestController.prototype, handlerName, descriptor);

            const validation = getEffectiveValidationMetadata(
              TestController,
              handlerName,
            );

            expect(validation.params).toBeDefined();
            expect(isZodSchema(validation.params!)).toBe(true);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should add 400 response to OpenAPI metadata', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            schema: zodSchemaArb,
          }),
          ({ handlerName, schema }) => {
            class TestController {}

            const decorator = ValidateParams(schema);
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            decorator(TestController.prototype, handlerName, descriptor);

            const responses = getEffectiveResponseMetadata(
              TestController,
              handlerName,
            );

            expect(responses.some((r) => r.statusCode === 400)).toBe(true);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('P8.3: @ValidateQuery Decorator', () => {
    it('should store query validation metadata', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            schema: zodSchemaArb,
          }),
          ({ handlerName, schema }) => {
            class TestController {}

            const decorator = ValidateQuery(schema);
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            decorator(TestController.prototype, handlerName, descriptor);

            const validation = getEffectiveValidationMetadata(
              TestController,
              handlerName,
            );

            expect(validation.query).toBeDefined();
            expect(isZodSchema(validation.query!)).toBe(true);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should add 400 response to OpenAPI metadata', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            schema: zodSchemaArb,
          }),
          ({ handlerName, schema }) => {
            class TestController {}

            const decorator = ValidateQuery(schema);
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            decorator(TestController.prototype, handlerName, descriptor);

            const responses = getEffectiveResponseMetadata(
              TestController,
              handlerName,
            );

            expect(responses.some((r) => r.statusCode === 400)).toBe(true);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('P8.4: Combined Validation Decorators', () => {
    it('should support multiple validation decorators on same method', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            bodySchema: zodSchemaArb,
            paramsSchema: zodSchemaArb,
            querySchema: zodSchemaArb,
          }),
          ({ handlerName, bodySchema, paramsSchema, querySchema }) => {
            class TestController {}

            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };

            ValidateBody(bodySchema)(
              TestController.prototype,
              handlerName,
              descriptor,
            );
            ValidateParams(paramsSchema)(
              TestController.prototype,
              handlerName,
              descriptor,
            );
            ValidateQuery(querySchema)(
              TestController.prototype,
              handlerName,
              descriptor,
            );

            const validation = getEffectiveValidationMetadata(
              TestController,
              handlerName,
            );

            expect(validation.body).toBeDefined();
            expect(validation.params).toBeDefined();
            expect(validation.query).toBeDefined();
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should only add one 400 response when multiple validation decorators applied', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            bodySchema: zodSchemaArb,
            paramsSchema: zodSchemaArb,
          }),
          ({ handlerName, bodySchema, paramsSchema }) => {
            class TestController {}

            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };

            ValidateBody(bodySchema)(
              TestController.prototype,
              handlerName,
              descriptor,
            );
            ValidateParams(paramsSchema)(
              TestController.prototype,
              handlerName,
              descriptor,
            );

            const responses = getEffectiveResponseMetadata(
              TestController,
              handlerName,
            );

            // Should only have one 400 response
            const count400 = responses.filter(
              (r) => r.statusCode === 400,
            ).length;
            expect(count400).toBe(1);
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('P8.5: Class-Level Validation Inheritance', () => {
    it('should inherit class-level validation for all methods', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerNames: fc.uniqueArray(methodNameArb, {
              minLength: 2,
              maxLength: 4,
            }),
            schema: zodSchemaArb,
          }),
          ({ handlerNames, schema }) => {
            @ValidateBody(schema)
            class TestController {}

            // All methods should have body validation
            for (const handlerName of handlerNames) {
              const validation = getEffectiveValidationMetadata(
                TestController,
                handlerName,
              );
              expect(validation.body).toBeDefined();
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should allow method-level to override class-level validation', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            classSchema: zodSchemaArb,
            methodSchema: zodSchemaArb,
          }),
          ({ handlerName, classSchema, methodSchema }) => {
            @ValidateBody(classSchema)
            class TestController {}

            const decorator = ValidateBody(methodSchema);
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            decorator(TestController.prototype, handlerName, descriptor);

            const validation = getEffectiveValidationMetadata(
              TestController,
              handlerName,
            );

            // Method-level should override class-level
            expect(validation.body).toBe(methodSchema);
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('P8.6: hasValidation Helper', () => {
    it('should return true when any validation is configured', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            schema: zodSchemaArb,
            field: validationFieldArb,
          }),
          ({ handlerName, schema, field }) => {
            class TestController {}

            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };

            if (field === 'body') {
              ValidateBody(schema)(
                TestController.prototype,
                handlerName,
                descriptor,
              );
            } else if (field === 'params') {
              ValidateParams(schema)(
                TestController.prototype,
                handlerName,
                descriptor,
              );
            } else {
              ValidateQuery(schema)(
                TestController.prototype,
                handlerName,
                descriptor,
              );
            }

            expect(hasValidation(TestController, handlerName)).toBe(true);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should return false when no validation is configured', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          class TestController {}

          expect(hasValidation(TestController, handlerName)).toBe(false);
        }),
        { numRuns: 30 },
      );
    });
  });

  describe('P8.7: Validation Type Detection', () => {
    it('should correctly identify Zod schemas', () => {
      fc.assert(
        fc.property(zodSchemaArb, (schema) => {
          expect(isZodSchema(schema)).toBe(true);
        }),
        { numRuns: 20 },
      );
    });

    it('should correctly identify validation chain arrays', () => {
      fc.assert(
        fc.property(fc.constant([]), (chains) => {
          expect(isValidationChainArray(chains)).toBe(true);
        }),
        { numRuns: 10 },
      );
    });

    it('should correctly identify validation functions', () => {
      fc.assert(
        fc.property(
          fc.constant(() => []),
          (fn) => {
            expect(isValidationFunction(fn)).toBe(true);
          },
        ),
        { numRuns: 10 },
      );
    });
  });

  describe('P8.8: Validation Metadata Isolation', () => {
    it('should not leak validation metadata between different controllers', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            schema1: zodSchemaArb,
            schema2: zodSchemaArb,
          }),
          ({ handlerName, schema1, schema2 }) => {
            class Controller1 {}
            class Controller2 {}

            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };

            ValidateBody(schema1)(
              Controller1.prototype,
              handlerName,
              descriptor,
            );
            ValidateBody(schema2)(
              Controller2.prototype,
              handlerName,
              descriptor,
            );

            const validation1 = getEffectiveValidationMetadata(
              Controller1,
              handlerName,
            );
            const validation2 = getEffectiveValidationMetadata(
              Controller2,
              handlerName,
            );

            // Each controller should have its own validation
            expect(validation1.body).toBe(schema1);
            expect(validation2.body).toBe(schema2);
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should not leak validation metadata between different methods', () => {
      fc.assert(
        fc.property(
          fc
            .record({
              method1: methodNameArb,
              method2: methodNameArb,
              schema1: zodSchemaArb,
              schema2: zodSchemaArb,
            })
            .filter(({ method1, method2 }) => method1 !== method2),
          ({ method1, method2, schema1, schema2 }) => {
            class TestController {}

            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };

            ValidateBody(schema1)(
              TestController.prototype,
              method1,
              descriptor,
            );
            ValidateBody(schema2)(
              TestController.prototype,
              method2,
              descriptor,
            );

            const validation1 = getEffectiveValidationMetadata(
              TestController,
              method1,
            );
            const validation2 = getEffectiveValidationMetadata(
              TestController,
              method2,
            );

            // Each method should have its own validation
            expect(validation1.body).toBe(schema1);
            expect(validation2.body).toBe(schema2);
          },
        ),
        { numRuns: 20 },
      );
    });
  });
});
