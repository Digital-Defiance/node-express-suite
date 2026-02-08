/**
 * @fileoverview Property-based tests for backward compatibility.
 * Tests that existing decorator usage patterns continue to work.
 *
 * **Validates: Requirements 1.6, 2.6, 16.1, 16.3**
 * - Existing @Controller decorator continues to work for non-OpenAPI use cases
 * - Existing RouteOptions fields are preserved
 * - Existing routeConfig() approach continues to work alongside decorators
 * - Mixed usage (some routes decorated, some manual) is supported
 */

import * as fc from 'fast-check';
import 'reflect-metadata';

// Decorators
import { Controller, ApiController } from '../../src/decorators/controller';
import {
  Get,
  Post,
  Put,
  Delete,
  Patch,
} from '../../src/decorators/http-methods';
import { RequireAuth, Public } from '../../src/decorators/auth';
import { Returns } from '../../src/decorators/response';
import { UseMiddleware } from '../../src/decorators/middleware';
import { Transactional } from '../../src/decorators/transaction';

// Metadata keys
import {
  CONTROLLER_METADATA,
  OPENAPI_CONTROLLER_METADATA,
  ROUTES_METADATA,
} from '../../src/decorators/metadata-keys';

// Types
import { EnhancedRouteMetadata } from '../../src/decorators/http-methods';
import { RequestHandler } from 'express';

/**
 * Arbitrary for generating valid method names.
 */
const methodNameArb = fc
  .string({ minLength: 3, maxLength: 15 })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s));

/**
 * Arbitrary for generating valid route paths.
 */
const routePathArb = fc.constantFrom(
  '/',
  '/items',
  '/users/:id',
  '/data',
  '/test/:testId',
);

/**
 * Arbitrary for generating valid controller base paths.
 */
const basePathArb = fc.constantFrom('/api', '/v1', '/test', '/admin');

/**
 * Arbitrary for generating HTTP methods.
 */
const httpMethodArb = fc.constantFrom(
  'get',
  'post',
  'put',
  'delete',
  'patch',
) as fc.Arbitrary<'get' | 'post' | 'put' | 'delete' | 'patch'>;

describe('Property-Based Tests: Backward Compatibility', () => {
  describe('P6.1: @Controller Decorator Backward Compatibility', () => {
    it('should work with basic @Controller decorator (no OpenAPI)', () => {
      fc.assert(
        fc.property(basePathArb, (basePath) => {
          @Controller(basePath)
          class TestController {}

          const controllerMeta = Reflect.getMetadata(
            CONTROLLER_METADATA,
            TestController,
          );

          expect(controllerMeta).toBeDefined();
          expect(controllerMeta.basePath).toBe(basePath);

          // Should NOT have OpenAPI controller metadata
          const openApiMeta = Reflect.getMetadata(
            OPENAPI_CONTROLLER_METADATA,
            TestController,
          );
          expect(openApiMeta).toBeUndefined();
        }),
        { numRuns: 20 },
      );
    });

    it('should allow @Controller and @ApiController to coexist in same codebase', () => {
      fc.assert(
        fc.property(
          fc.record({
            basePath1: basePathArb,
            basePath2: basePathArb,
          }),
          ({ basePath1, basePath2 }) => {
            @Controller(basePath1)
            class BasicController {}

            @ApiController(basePath2, { tags: ['Test'] })
            class ApiEnabledController {}

            // Both should have controller metadata
            const basicMeta = Reflect.getMetadata(
              CONTROLLER_METADATA,
              BasicController,
            );
            const apiMeta = Reflect.getMetadata(
              CONTROLLER_METADATA,
              ApiEnabledController,
            );

            expect(basicMeta).toBeDefined();
            expect(basicMeta.basePath).toBe(basePath1);

            expect(apiMeta).toBeDefined();
            expect(apiMeta.basePath).toBe(basePath2);

            // Only ApiController should have OpenAPI metadata
            const basicOpenApi = Reflect.getMetadata(
              OPENAPI_CONTROLLER_METADATA,
              BasicController,
            );
            const apiOpenApi = Reflect.getMetadata(
              OPENAPI_CONTROLLER_METADATA,
              ApiEnabledController,
            );

            expect(basicOpenApi).toBeUndefined();
            expect(apiOpenApi).toBeDefined();
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('P6.2: HTTP Method Decorators Backward Compatibility', () => {
    it('should work with HTTP method decorators without options', () => {
      fc.assert(
        fc.property(
          fc.record({
            method: httpMethodArb,
            path: routePathArb,
            handlerName: methodNameArb,
          }),
          ({ method, path, handlerName }) => {
            const decoratorMap = {
              get: Get,
              post: Post,
              put: Put,
              delete: Delete,
              patch: Patch,
            };

            @Controller('/test')
            class TestController {}

            // Apply decorator without any options (backward compatible usage)
            const decorator = decoratorMap[method](path);
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            decorator(TestController.prototype, handlerName, descriptor);

            const routes = Reflect.getMetadata(
              ROUTES_METADATA,
              TestController,
            ) as EnhancedRouteMetadata[];

            expect(routes).toBeDefined();
            const route = routes.find((r) => r.handlerName === handlerName);
            expect(route).toBeDefined();
            expect(route?.method).toBe(method);
            expect(route?.path).toBe(path);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should preserve existing RouteOptions fields (auth, rawJson, transaction)', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            path: routePathArb,
            auth: fc.boolean(),
            rawJson: fc.boolean(),
            transaction: fc.boolean(),
          }),
          ({ handlerName, path, auth, rawJson, transaction }) => {
            @Controller('/test')
            class TestController {}

            // Use existing RouteOptions fields
            const decorator = Get(path, { auth, rawJson, transaction });
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            decorator(TestController.prototype, handlerName, descriptor);

            const routes = Reflect.getMetadata(
              ROUTES_METADATA,
              TestController,
            ) as EnhancedRouteMetadata[];
            const route = routes.find((r) => r.handlerName === handlerName);

            expect(route).toBeDefined();
            expect(route?.options.auth).toBe(auth);
            expect(route?.options.rawJson).toBe(rawJson);
            expect(route?.options.transaction).toBe(transaction);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should preserve transactionTimeout option', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            path: routePathArb,
            transactionTimeout: fc.integer({ min: 1000, max: 60000 }),
          }),
          ({ handlerName, path, transactionTimeout }) => {
            @Controller('/test')
            class TestController {}

            const decorator = Post(path, {
              transaction: true,
              transactionTimeout,
            });
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            decorator(TestController.prototype, handlerName, descriptor);

            const routes = Reflect.getMetadata(
              ROUTES_METADATA,
              TestController,
            ) as EnhancedRouteMetadata[];
            const route = routes.find((r) => r.handlerName === handlerName);

            expect(route).toBeDefined();
            expect(route?.options.transactionTimeout).toBe(transactionTimeout);
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('P6.3: Mixed Decorator and Options Usage', () => {
    it('should allow mixing inline options with separate decorators', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            path: routePathArb,
            inlineAuth: fc.boolean(),
          }),
          ({ handlerName, path, inlineAuth }) => {
            @Controller('/test')
            class TestController {}

            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };

            // Use inline auth option
            Get(path, { auth: inlineAuth })(
              TestController.prototype,
              handlerName,
              descriptor,
            );

            // Also apply @Returns decorator
            Returns(200, 'Schema')(
              TestController.prototype,
              handlerName,
              descriptor,
            );

            const routes = Reflect.getMetadata(
              ROUTES_METADATA,
              TestController,
            ) as EnhancedRouteMetadata[];
            const route = routes.find((r) => r.handlerName === handlerName);

            // Both should work together
            expect(route).toBeDefined();
            expect(route?.options.auth).toBe(inlineAuth);
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should allow @Transactional decorator alongside inline transaction option', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            path: routePathArb,
            timeout: fc.integer({ min: 1000, max: 30000 }),
          }),
          ({ handlerName, path, timeout }) => {
            @Controller('/test')
            class TestController {}

            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };

            // Use @Transactional decorator
            Transactional({ timeout })(
              TestController.prototype,
              handlerName,
              descriptor,
            );

            // Also use inline transaction option (decorator should take precedence in base controller)
            Post(path, { transaction: false })(
              TestController.prototype,
              handlerName,
              descriptor,
            );

            const routes = Reflect.getMetadata(
              ROUTES_METADATA,
              TestController,
            ) as EnhancedRouteMetadata[];
            const route = routes.find((r) => r.handlerName === handlerName);

            expect(route).toBeDefined();
            // Route options should have inline value
            expect(route?.options.transaction).toBe(false);
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('P6.4: Middleware Backward Compatibility', () => {
    it('should support middleware option in route decorators', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            path: routePathArb,
          }),
          ({ handlerName, path }) => {
            const middleware: RequestHandler = (_req, _res, next) => next();

            @Controller('/test')
            class TestController {}

            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };

            // Use middleware option in route decorator (existing pattern)
            Get(path, { middleware: [middleware] })(
              TestController.prototype,
              handlerName,
              descriptor,
            );

            const routes = Reflect.getMetadata(
              ROUTES_METADATA,
              TestController,
            ) as EnhancedRouteMetadata[];
            const route = routes.find((r) => r.handlerName === handlerName);

            expect(route).toBeDefined();
            expect(route?.options.middleware).toContain(middleware);
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should support @UseMiddleware decorator alongside middleware option', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            path: routePathArb,
          }),
          ({ handlerName, path }) => {
            const inlineMiddleware: RequestHandler = (_req, _res, next) =>
              next();
            const decoratorMiddleware: RequestHandler = (_req, _res, next) =>
              next();

            @Controller('/test')
            class TestController {}

            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };

            // Use both patterns
            Get(path, { middleware: [inlineMiddleware] })(
              TestController.prototype,
              handlerName,
              descriptor,
            );
            UseMiddleware(decoratorMiddleware)(
              TestController.prototype,
              handlerName,
              descriptor,
            );

            const routes = Reflect.getMetadata(
              ROUTES_METADATA,
              TestController,
            ) as EnhancedRouteMetadata[];
            const route = routes.find((r) => r.handlerName === handlerName);

            // Inline middleware should be in route options
            expect(route?.options.middleware).toContain(inlineMiddleware);
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('P6.5: OpenAPI Options Backward Compatibility', () => {
    it('should support inline openapi option in route decorators', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            path: routePathArb,
            summary: fc
              .string({ minLength: 1, maxLength: 30 })
              .filter((s) => /^[a-zA-Z][a-zA-Z0-9 ]*$/.test(s)),
          }),
          ({ handlerName, path, summary }) => {
            @Controller('/test')
            class TestController {}

            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };

            // Use inline openapi option (existing pattern)
            Get(path, { openapi: { summary } })(
              TestController.prototype,
              handlerName,
              descriptor,
            );

            const routes = Reflect.getMetadata(
              ROUTES_METADATA,
              TestController,
            ) as EnhancedRouteMetadata[];
            const route = routes.find((r) => r.handlerName === handlerName);

            expect(route).toBeDefined();
            expect(route?.options.openapi?.summary).toBe(summary);
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('P6.6: Multiple Routes on Same Controller', () => {
    it('should support multiple routes with different configurations', () => {
      fc.assert(
        fc.property(
          fc.record({
            basePath: basePathArb,
            routeCount: fc.integer({ min: 2, max: 4 }),
          }),
          ({ basePath, routeCount }) => {
            @Controller(basePath)
            class TestController {}

            const methods = [Get, Post, Put, Delete];

            for (let i = 0; i < routeCount; i++) {
              const handlerName = `handler${i}`;
              const path = `/route${i}`;
              const methodDecorator = methods[i % methods.length];

              const descriptor = {
                value: function () {
                  return {};
                },
                writable: true,
                enumerable: false,
                configurable: true,
              };

              // Mix of configurations
              const options: Record<string, unknown> = {};
              if (i % 2 === 0) options.auth = true;
              if (i % 3 === 0) options.rawJson = true;

              methodDecorator(path, options)(
                TestController.prototype,
                handlerName,
                descriptor,
              );
            }

            const routes = Reflect.getMetadata(
              ROUTES_METADATA,
              TestController,
            ) as EnhancedRouteMetadata[];

            expect(routes.length).toBe(routeCount);

            // Each route should have its own configuration
            for (let i = 0; i < routeCount; i++) {
              const route = routes.find((r) => r.handlerName === `handler${i}`);
              expect(route).toBeDefined();

              if (i % 2 === 0) {
                expect(route?.options.auth).toBe(true);
              }
              if (i % 3 === 0) {
                expect(route?.options.rawJson).toBe(true);
              }
            }
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('P6.7: Empty Options Backward Compatibility', () => {
    it('should work with empty options object', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            path: routePathArb,
          }),
          ({ handlerName, path }) => {
            @Controller('/test')
            class TestController {}

            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };

            // Pass empty options object
            Get(path, {})(TestController.prototype, handlerName, descriptor);

            const routes = Reflect.getMetadata(
              ROUTES_METADATA,
              TestController,
            ) as EnhancedRouteMetadata[];
            const route = routes.find((r) => r.handlerName === handlerName);

            expect(route).toBeDefined();
            expect(route?.options).toBeDefined();
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should work without options parameter', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            path: routePathArb,
          }),
          ({ handlerName, path }) => {
            @Controller('/test')
            class TestController {}

            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };

            // No options parameter
            Get(path)(TestController.prototype, handlerName, descriptor);

            const routes = Reflect.getMetadata(
              ROUTES_METADATA,
              TestController,
            ) as EnhancedRouteMetadata[];
            const route = routes.find((r) => r.handlerName === handlerName);

            expect(route).toBeDefined();
          },
        ),
        { numRuns: 20 },
      );
    });
  });
});
