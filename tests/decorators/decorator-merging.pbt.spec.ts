/**
 * @fileoverview Property-based tests for decorator metadata merging consistency.
 * Tests that multiple decorators on the same method/class merge correctly.
 *
 * **Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5, 15.6**
 * - Multiple decorators on same method merge their OpenAPI metadata
 * - Method-level decorators override class-level decorators for same fields
 * - @Returns decorators accumulate (don't replace each other)
 * - @ApiTags at method level adds to (not replaces) class-level tags
 * - Parameter decorators merge with auto-extracted parameters
 * - Explicit values always override auto-generated values
 */

import * as fc from 'fast-check';
import 'reflect-metadata';

// Decorators
import { ApiController, Controller } from '../../src/decorators/controller';
import {
  Get,
  Post,
  Put,
  Delete,
  Patch,
} from '../../src/decorators/http-methods';
import {
  RequireAuth,
  RequireCryptoAuth,
  Public,
  AuthFailureStatus,
  getEffectiveAuthMetadata,
} from '../../src/decorators/auth';
import {
  Returns,
  getEffectiveResponseMetadata,
} from '../../src/decorators/response';
import {
  UseMiddleware,
  getEffectiveMiddleware,
} from '../../src/decorators/middleware';
import {
  OnSuccess,
  OnError,
  Before,
  After,
  getEffectiveLifecycleMetadata,
} from '../../src/decorators/lifecycle';
import {
  ApiTags,
  ApiSummary,
  ApiDescription,
  Deprecated,
  ApiOperationId,
  getEffectiveOpenAPIMetadata,
} from '../../src/decorators/openapi';
import {
  ValidateBody,
  ValidateParams,
  ValidateQuery,
  getEffectiveValidationMetadata,
} from '../../src/decorators/validation';

// Metadata keys
import {
  CONTROLLER_METADATA,
  OPENAPI_CONTROLLER_METADATA,
  ROUTES_METADATA,
  AUTH_METADATA,
  RESPONSE_METADATA,
  OPENAPI_METADATA,
} from '../../src/decorators/metadata-keys';

import { RequestHandler } from 'express';
import { z } from 'zod';

/**
 * Arbitrary for generating valid tag names.
 */
const tagArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_ -]*$/.test(s));

/**
 * Arbitrary for generating valid method names.
 */
const methodNameArb = fc
  .string({ minLength: 3, maxLength: 20 })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s));

/**
 * Arbitrary for generating status codes.
 */
const statusCodeArb = fc.constantFrom(200, 201, 204, 400, 401, 403, 404, 500);

/**
 * Arbitrary for generating descriptions.
 */
const descriptionArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);

/**
 * Arbitrary for generating schema names.
 */
const schemaNameArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => /^[A-Z][a-zA-Z0-9]*$/.test(s));

describe('Property-Based Tests: Decorator Metadata Merging', () => {
  describe('P2.1: Auth Decorator Merging - Method Overrides Class', () => {
    it('should allow @Public to override class-level @RequireAuth', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          // Class with @RequireAuth, method with @Public
          @RequireAuth()
          class TestController {}

          // Apply @Public to method
          const publicDecorator = Public();
          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };
          publicDecorator(TestController.prototype, handlerName, descriptor);

          const effectiveAuth = getEffectiveAuthMetadata(
            TestController,
            handlerName,
          );

          // Method-level @Public should override class-level @RequireAuth
          expect(effectiveAuth.isPublic).toBe(true);
        }),
        { numRuns: 30 },
      );
    });

    it('should allow method-level @AuthFailureStatus to override class-level', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            classStatusCode: fc.integer({ min: 400, max: 499 }),
            methodStatusCode: fc.integer({ min: 400, max: 499 }),
          }),
          ({ handlerName, classStatusCode, methodStatusCode }) => {
            // Apply class-level @AuthFailureStatus
            @AuthFailureStatus(classStatusCode)
            class TestController {}

            // Apply method-level @AuthFailureStatus
            const methodDecorator = AuthFailureStatus(methodStatusCode);
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            methodDecorator(TestController.prototype, handlerName, descriptor);

            const effectiveAuth = getEffectiveAuthMetadata(
              TestController,
              handlerName,
            );

            // Method-level should override class-level
            expect(effectiveAuth.failureStatusCode).toBe(methodStatusCode);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should inherit class-level auth when no method-level auth is set', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          @RequireAuth()
          class TestController {}

          // No method-level decorator, just define the method exists
          // We simulate this by not applying any auth decorator to the method

          const effectiveAuth = getEffectiveAuthMetadata(
            TestController,
            handlerName,
          );

          // Should inherit class-level @RequireAuth
          expect(effectiveAuth.requireAuth).toBe(true);
        }),
        { numRuns: 30 },
      );
    });
  });

  describe('P2.2: Response Decorator Accumulation', () => {
    it('should accumulate multiple @Returns decorators without replacing', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            statusCodes: fc.uniqueArray(statusCodeArb, {
              minLength: 2,
              maxLength: 5,
            }),
          }),
          ({ handlerName, statusCodes }) => {
            class TestController {}

            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };

            // Apply multiple @Returns decorators
            for (const statusCode of statusCodes) {
              const decorator = Returns(statusCode, 'Schema');
              decorator(TestController.prototype, handlerName, descriptor);
            }

            const responses = getEffectiveResponseMetadata(
              TestController,
              handlerName,
            );

            // All status codes should be present (accumulated, not replaced)
            expect(responses.length).toBe(statusCodes.length);

            const foundCodes = responses.map((r) => r.statusCode);
            for (const code of statusCodes) {
              expect(foundCodes).toContain(code);
            }
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should merge class-level and method-level responses when class has response metadata', () => {
      fc.assert(
        fc.property(
          fc
            .record({
              handlerName: methodNameArb,
              classStatusCode: statusCodeArb,
              methodStatusCode: statusCodeArb.filter((c) => c !== 200), // Ensure different from common class code
            })
            .filter(
              ({ classStatusCode, methodStatusCode }) =>
                classStatusCode !== methodStatusCode,
            ),
          ({ handlerName, classStatusCode, methodStatusCode }) => {
            class TestController {}

            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };

            // Apply class-level response metadata directly (simulating what auth decorators do)
            // Note: @Returns is a MethodDecorator only, so we test the merging logic
            // by applying responses to both class and method level via the metadata API
            const classResponses = [
              { statusCode: classStatusCode, schema: 'ClassSchema' },
            ];
            Reflect.defineMetadata(
              RESPONSE_METADATA,
              classResponses,
              TestController,
            );

            // Apply method-level @Returns
            const methodDecorator = Returns(methodStatusCode, 'MethodSchema');
            methodDecorator(TestController.prototype, handlerName, descriptor);

            const responses = getEffectiveResponseMetadata(
              TestController,
              handlerName,
            );

            // Both class and method responses should be present
            const foundCodes = responses.map((r) => r.statusCode);
            expect(foundCodes).toContain(classStatusCode);
            expect(foundCodes).toContain(methodStatusCode);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should allow method-level to override class-level for same status code', () => {
      fc.assert(
        fc.property(
          fc
            .record({
              handlerName: methodNameArb,
              statusCode: statusCodeArb,
              classSchema: schemaNameArb,
              methodSchema: schemaNameArb,
            })
            .filter(
              ({ classSchema, methodSchema }) => classSchema !== methodSchema,
            ),
          ({ handlerName, statusCode, classSchema, methodSchema }) => {
            // Apply class-level @Returns with same status code
            @Returns(statusCode, classSchema)
            class TestController {}

            // Apply method-level @Returns with same status code but different schema
            const methodDecorator = Returns(statusCode, methodSchema);
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            methodDecorator(TestController.prototype, handlerName, descriptor);

            const responses = getEffectiveResponseMetadata(
              TestController,
              handlerName,
            );

            // For same status code, method-level should override class-level
            const response = responses.find((r) => r.statusCode === statusCode);
            expect(response).toBeDefined();
            expect(response?.schema).toBe(methodSchema);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('P2.3: OpenAPI Tags Merging', () => {
    it('should merge method-level tags with class-level tags', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            classTags: fc.uniqueArray(tagArb, { minLength: 1, maxLength: 3 }),
            methodTags: fc.uniqueArray(tagArb, { minLength: 1, maxLength: 3 }),
          }),
          ({ handlerName, classTags, methodTags }) => {
            // Apply class-level @ApiTags
            @ApiTags(...classTags)
            class TestController {}

            // Apply method-level @ApiTags
            const methodDecorator = ApiTags(...methodTags);
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            methodDecorator(TestController.prototype, handlerName, descriptor);

            const openApiMeta = getEffectiveOpenAPIMetadata(
              TestController,
              handlerName,
            );

            // Both class and method tags should be present
            expect(openApiMeta.tags).toBeDefined();
            for (const tag of classTags) {
              expect(openApiMeta.tags).toContain(tag);
            }
            for (const tag of methodTags) {
              expect(openApiMeta.tags).toContain(tag);
            }
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('P2.4: OpenAPI Metadata Merging', () => {
    it('should merge multiple OpenAPI decorators on same method', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            summary: descriptionArb,
            description: descriptionArb,
            operationId: methodNameArb,
            tags: fc.uniqueArray(tagArb, { minLength: 1, maxLength: 3 }),
          }),
          ({ handlerName, summary, description, operationId, tags }) => {
            class TestController {}

            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };

            // Apply multiple OpenAPI decorators
            ApiSummary(summary)(
              TestController.prototype,
              handlerName,
              descriptor,
            );
            ApiDescription(description)(
              TestController.prototype,
              handlerName,
              descriptor,
            );
            ApiOperationId(operationId)(
              TestController.prototype,
              handlerName,
              descriptor,
            );
            ApiTags(...tags)(TestController.prototype, handlerName, descriptor);

            const openApiMeta = getEffectiveOpenAPIMetadata(
              TestController,
              handlerName,
            );

            // All metadata should be merged
            expect(openApiMeta.summary).toBe(summary);
            expect(openApiMeta.description).toBe(description);
            expect(openApiMeta.operationId).toBe(operationId);
            expect(openApiMeta.tags).toEqual(expect.arrayContaining(tags));
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should allow later decorator to override earlier for same field', () => {
      fc.assert(
        fc.property(
          fc
            .record({
              handlerName: methodNameArb,
              firstSummary: descriptionArb,
              secondSummary: descriptionArb,
            })
            .filter(
              ({ firstSummary, secondSummary }) =>
                firstSummary !== secondSummary,
            ),
          ({ handlerName, firstSummary, secondSummary }) => {
            class TestController {}

            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };

            // Apply two @ApiSummary decorators (later one should win)
            ApiSummary(firstSummary)(
              TestController.prototype,
              handlerName,
              descriptor,
            );
            ApiSummary(secondSummary)(
              TestController.prototype,
              handlerName,
              descriptor,
            );

            const openApiMeta = getEffectiveOpenAPIMetadata(
              TestController,
              handlerName,
            );

            // Later decorator should override
            expect(openApiMeta.summary).toBe(secondSummary);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('P2.5: Middleware Merging', () => {
    it('should merge class-level and method-level middleware', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          const classMiddleware: RequestHandler = (_req, _res, next) => next();
          const methodMiddleware: RequestHandler = (_req, _res, next) => next();

          // Apply class-level middleware
          @UseMiddleware(classMiddleware)
          class TestController {}

          // Apply method-level middleware
          const methodDecorator = UseMiddleware(methodMiddleware);
          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };
          methodDecorator(TestController.prototype, handlerName, descriptor);

          const middleware = getEffectiveMiddleware(
            TestController,
            handlerName,
          );

          // Both class and method middleware should be present
          expect(middleware).toContain(classMiddleware);
          expect(middleware).toContain(methodMiddleware);
        }),
        { numRuns: 30 },
      );
    });

    it('should preserve middleware order (class first, then method)', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          const classMiddleware: RequestHandler = (_req, _res, next) => next();
          const methodMiddleware: RequestHandler = (_req, _res, next) => next();

          // Apply class-level middleware
          @UseMiddleware(classMiddleware)
          class TestController {}

          // Apply method-level middleware
          const methodDecorator = UseMiddleware(methodMiddleware);
          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };
          methodDecorator(TestController.prototype, handlerName, descriptor);

          const middleware = getEffectiveMiddleware(
            TestController,
            handlerName,
          );

          // Class middleware should come before method middleware
          const classIndex = middleware.indexOf(classMiddleware);
          const methodIndex = middleware.indexOf(methodMiddleware);
          expect(classIndex).toBeLessThan(methodIndex);
        }),
        { numRuns: 30 },
      );
    });
  });

  describe('P2.6: Lifecycle Hooks Merging', () => {
    it('should merge class-level and method-level lifecycle hooks', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          const classBeforeHook = jest.fn();
          const methodBeforeHook = jest.fn();

          // Apply class-level @Before
          @Before(classBeforeHook)
          class TestController {}

          // Apply method-level @Before
          const methodDecorator = Before(methodBeforeHook);
          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };
          methodDecorator(TestController.prototype, handlerName, descriptor);

          const lifecycle = getEffectiveLifecycleMetadata(
            TestController,
            handlerName,
          );

          // Both class and method hooks should be present
          expect(lifecycle.before).toContain(classBeforeHook);
          expect(lifecycle.before).toContain(methodBeforeHook);
        }),
        { numRuns: 30 },
      );
    });

    it('should accumulate multiple hooks of same type', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            hookCount: fc.integer({ min: 2, max: 5 }),
          }),
          ({ handlerName, hookCount }) => {
            class TestController {}

            const hooks: jest.Mock[] = [];
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };

            // Apply multiple @Before hooks
            for (let i = 0; i < hookCount; i++) {
              const hook = jest.fn();
              hooks.push(hook);
              Before(hook)(TestController.prototype, handlerName, descriptor);
            }

            const lifecycle = getEffectiveLifecycleMetadata(
              TestController,
              handlerName,
            );

            // All hooks should be present
            expect(lifecycle.before?.length).toBe(hookCount);
            for (const hook of hooks) {
              expect(lifecycle.before).toContain(hook);
            }
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('P2.7: Validation Metadata Merging', () => {
    it('should merge class-level and method-level validation', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          const classSchema = z.object({ classField: z.string() });
          const methodSchema = z.object({ methodField: z.string() });

          // Apply class-level validation
          @ValidateBody(classSchema)
          class TestController {}

          // Apply method-level validation for different field (params)
          const methodDecorator = ValidateParams(methodSchema);
          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };
          methodDecorator(TestController.prototype, handlerName, descriptor);

          const validation = getEffectiveValidationMetadata(
            TestController,
            handlerName,
          );

          // Both body and params validation should be present
          expect(validation.body).toBeDefined();
          expect(validation.params).toBeDefined();
        }),
        { numRuns: 30 },
      );
    });

    it('should allow method-level to override class-level for same field', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          const classSchema = z.object({ classField: z.string() });
          const methodSchema = z.object({ methodField: z.string() });

          // Apply class-level body validation
          @ValidateBody(classSchema)
          class TestController {}

          // Apply method-level body validation (should override)
          const methodDecorator = ValidateBody(methodSchema);
          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };
          methodDecorator(TestController.prototype, handlerName, descriptor);

          const validation = getEffectiveValidationMetadata(
            TestController,
            handlerName,
          );

          // Method-level should override class-level for body
          expect(validation.body).toBe(methodSchema);
        }),
        { numRuns: 30 },
      );
    });
  });

  describe('P2.8: Combined Decorator Merging', () => {
    it('should correctly merge all decorator types on a single method', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            tags: fc.uniqueArray(tagArb, { minLength: 1, maxLength: 2 }),
            summary: descriptionArb,
            statusCode: statusCodeArb,
          }),
          ({ handlerName, tags, summary, statusCode }) => {
            const middleware: RequestHandler = (_req, _res, next) => next();
            const beforeHook = jest.fn();

            class TestController {}

            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };

            // Apply multiple decorator types
            RequireAuth()(TestController.prototype, handlerName, descriptor);
            ApiTags(...tags)(TestController.prototype, handlerName, descriptor);
            ApiSummary(summary)(
              TestController.prototype,
              handlerName,
              descriptor,
            );
            Returns(statusCode, 'Schema')(
              TestController.prototype,
              handlerName,
              descriptor,
            );
            UseMiddleware(middleware)(
              TestController.prototype,
              handlerName,
              descriptor,
            );
            Before(beforeHook)(
              TestController.prototype,
              handlerName,
              descriptor,
            );

            // Verify all metadata is correctly stored
            const authMeta = getEffectiveAuthMetadata(
              TestController,
              handlerName,
            );
            expect(authMeta.requireAuth).toBe(true);

            const openApiMeta = getEffectiveOpenAPIMetadata(
              TestController,
              handlerName,
            );
            expect(openApiMeta.tags).toEqual(expect.arrayContaining(tags));
            expect(openApiMeta.summary).toBe(summary);

            const responses = getEffectiveResponseMetadata(
              TestController,
              handlerName,
            );
            expect(responses.some((r) => r.statusCode === statusCode)).toBe(
              true,
            );

            const middlewareList = getEffectiveMiddleware(
              TestController,
              handlerName,
            );
            expect(middlewareList).toContain(middleware);

            const lifecycle = getEffectiveLifecycleMetadata(
              TestController,
              handlerName,
            );
            expect(lifecycle.before).toContain(beforeHook);
          },
        ),
        { numRuns: 30 },
      );
    });
  });
});
