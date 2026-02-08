/**
 * @fileoverview Property-based tests for route registration completeness.
 * Tests that all decorated routes are correctly registered and accessible.
 *
 * **Validates: Requirements 2.2, 2.3, 2.4**
 * - Decorated methods are automatically collected into route definitions
 * - Path parameters (`:id`) are automatically extracted for OpenAPI parameters
 * - Decorators can be stacked with other decorators (auth, validation, etc.)
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
import { RequireAuth, Public } from '../../src/decorators/auth';
import { Returns } from '../../src/decorators/response';
import { ApiTags, ApiSummary } from '../../src/decorators/openapi';
import { Param, Body, Query } from '../../src/decorators/params';

// Metadata keys
import {
  ROUTES_METADATA,
  OPENAPI_METADATA,
  CONTROLLER_METADATA,
} from '../../src/decorators/metadata-keys';

// Types
import { EnhancedRouteMetadata } from '../../src/decorators/http-methods';

/**
 * Arbitrary for generating valid route paths.
 */
const routePathArb = fc
  .array(
    fc.oneof(
      fc
        .string({ minLength: 1, maxLength: 15 })
        .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
      fc
        .string({ minLength: 1, maxLength: 15 })
        .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s))
        .map((s) => `:${s}`),
    ),
    { minLength: 0, maxLength: 3 },
  )
  .map((segments) => '/' + segments.join('/'));

/**
 * Arbitrary for generating valid controller base paths.
 */
const basePathArb = fc
  .array(
    fc
      .string({ minLength: 1, maxLength: 15 })
      .filter((s) => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s)),
    { minLength: 1, maxLength: 3 },
  )
  .map((segments) => '/' + segments.join('/'));

/**
 * Arbitrary for generating valid method names.
 */
const methodNameArb = fc
  .string({ minLength: 3, maxLength: 20 })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s));

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

/**
 * Arbitrary for generating route configurations.
 */
const routeConfigArb = fc.record({
  method: httpMethodArb,
  path: routePathArb,
  handlerName: methodNameArb,
});

/**
 * Extracts path parameters from a route path.
 */
function extractPathParams(path: string): string[] {
  const paramRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
  const params: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = paramRegex.exec(path)) !== null) {
    params.push(match[1]);
  }
  return params;
}

describe('Property-Based Tests: Route Registration Completeness', () => {
  describe('P3.1: Single Route Registration', () => {
    it('should register a single route with correct method and path', () => {
      fc.assert(
        fc.property(routeConfigArb, ({ method, path, handlerName }) => {
          const decoratorMap = {
            get: Get,
            post: Post,
            put: Put,
            delete: Delete,
            patch: Patch,
          };

          @Controller('/test')
          class TestController {}

          // Apply HTTP method decorator
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
          expect(routes.length).toBeGreaterThan(0);

          const route = routes.find((r) => r.handlerName === handlerName);
          expect(route).toBeDefined();
          expect(route?.method).toBe(method);
          expect(route?.path).toBe(path);
        }),
        { numRuns: 50 },
      );
    });
  });

  describe('P3.2: Multiple Routes Registration', () => {
    it('should register multiple routes on the same controller', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(routeConfigArb, {
            minLength: 2,
            maxLength: 5,
            comparator: (a, b) => a.handlerName === b.handlerName,
          }),
          (routeConfigs) => {
            const decoratorMap = {
              get: Get,
              post: Post,
              put: Put,
              delete: Delete,
              patch: Patch,
            };

            @Controller('/test')
            class TestController {}

            // Apply all route decorators
            for (const config of routeConfigs) {
              const decorator = decoratorMap[config.method](config.path);
              const descriptor = {
                value: function () {
                  return {};
                },
                writable: true,
                enumerable: false,
                configurable: true,
              };
              decorator(
                TestController.prototype,
                config.handlerName,
                descriptor,
              );
            }

            const routes = Reflect.getMetadata(
              ROUTES_METADATA,
              TestController,
            ) as EnhancedRouteMetadata[];

            expect(routes).toBeDefined();
            expect(routes.length).toBe(routeConfigs.length);

            // All routes should be registered
            for (const config of routeConfigs) {
              const route = routes.find(
                (r) => r.handlerName === config.handlerName,
              );
              expect(route).toBeDefined();
              expect(route?.method).toBe(config.method);
              expect(route?.path).toBe(config.path);
            }
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('P3.3: Path Parameter Extraction', () => {
    it('should extract path parameters for OpenAPI documentation', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            pathSegments: fc.array(
              fc.oneof(
                fc.constant('static'),
                fc
                  .string({ minLength: 1, maxLength: 10 })
                  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s))
                  .map((s) => `:${s}`),
              ),
              { minLength: 1, maxLength: 4 },
            ),
          }),
          ({ handlerName, pathSegments }) => {
            const path = '/' + pathSegments.join('/');
            const expectedParams = extractPathParams(path);

            @Controller('/test')
            class TestController {}

            // Apply GET decorator with path
            const decorator = Get(path);
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            decorator(TestController.prototype, handlerName, descriptor);

            // Check OpenAPI metadata for extracted parameters
            const openApiMeta = Reflect.getMetadata(
              OPENAPI_METADATA,
              TestController,
              handlerName,
            );

            if (expectedParams.length > 0) {
              expect(openApiMeta).toBeDefined();
              expect(openApiMeta.parameters).toBeDefined();

              const paramNames = openApiMeta.parameters.map(
                (p: { name: string }) => p.name,
              );
              for (const expectedParam of expectedParams) {
                expect(paramNames).toContain(expectedParam);
              }

              // All extracted params should be marked as path params
              for (const param of openApiMeta.parameters) {
                if (expectedParams.includes(param.name)) {
                  expect(param.in).toBe('path');
                  expect(param.required).toBe(true);
                }
              }
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('P3.4: Route with Stacked Decorators', () => {
    it('should register routes with multiple stacked decorators', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            path: routePathArb,
            method: httpMethodArb,
            hasAuth: fc.boolean(),
            hasSummary: fc.boolean(),
            hasReturns: fc.boolean(),
          }),
          ({ handlerName, path, method, hasAuth, hasSummary, hasReturns }) => {
            const decoratorMap = {
              get: Get,
              post: Post,
              put: Put,
              delete: Delete,
              patch: Patch,
            };

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

            // Apply HTTP method decorator
            decoratorMap[method](path)(
              TestController.prototype,
              handlerName,
              descriptor,
            );

            // Apply optional decorators
            if (hasAuth) {
              RequireAuth()(TestController.prototype, handlerName, descriptor);
            }
            if (hasSummary) {
              ApiSummary('Test summary')(
                TestController.prototype,
                handlerName,
                descriptor,
              );
            }
            if (hasReturns) {
              Returns(200, 'TestSchema')(
                TestController.prototype,
                handlerName,
                descriptor,
              );
            }

            const routes = Reflect.getMetadata(
              ROUTES_METADATA,
              TestController,
            ) as EnhancedRouteMetadata[];

            // Route should still be registered correctly
            expect(routes).toBeDefined();
            const route = routes.find((r) => r.handlerName === handlerName);
            expect(route).toBeDefined();
            expect(route?.method).toBe(method);
            expect(route?.path).toBe(path);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('P3.5: Route Options Preservation', () => {
    it('should preserve route options passed to HTTP method decorators', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            path: routePathArb,
            summary: fc.option(
              fc
                .string({ minLength: 1, maxLength: 50 })
                .filter((s) => s.trim().length > 0),
              { nil: undefined },
            ),
            description: fc.option(
              fc
                .string({ minLength: 1, maxLength: 100 })
                .filter((s) => s.trim().length > 0),
              { nil: undefined },
            ),
            deprecated: fc.option(fc.boolean(), { nil: undefined }),
            auth: fc.option(fc.boolean(), { nil: undefined }),
            rawJson: fc.option(fc.boolean(), { nil: undefined }),
          }),
          ({
            handlerName,
            path,
            summary,
            description,
            deprecated,
            auth,
            rawJson,
          }) => {
            @Controller('/test')
            class TestController {}

            const options: Record<string, unknown> = {};
            if (summary !== undefined) options.summary = summary;
            if (description !== undefined) options.description = description;
            if (deprecated !== undefined) options.deprecated = deprecated;
            if (auth !== undefined) options.auth = auth;
            if (rawJson !== undefined) options.rawJson = rawJson;

            const decorator = Get(path, options);
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
            expect(route?.options).toBeDefined();

            // Verify options are preserved
            if (summary !== undefined) {
              expect(route?.options.summary).toBe(summary);
            }
            if (description !== undefined) {
              expect(route?.options.description).toBe(description);
            }
            if (deprecated !== undefined) {
              expect(route?.options.deprecated).toBe(deprecated);
            }
            if (auth !== undefined) {
              expect(route?.options.auth).toBe(auth);
            }
            if (rawJson !== undefined) {
              expect(route?.options.rawJson).toBe(rawJson);
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('P3.6: Controller Base Path Preservation', () => {
    it('should preserve controller base path in metadata', () => {
      fc.assert(
        fc.property(
          fc.record({
            basePath: basePathArb,
            handlerName: methodNameArb,
            routePath: routePathArb,
          }),
          ({ basePath, handlerName, routePath }) => {
            @ApiController(basePath, { tags: ['Test'] })
            class TestController {}

            const decorator = Get(routePath);
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            decorator(TestController.prototype, handlerName, descriptor);

            const controllerMeta = Reflect.getMetadata(
              CONTROLLER_METADATA,
              TestController,
            );
            const routes = Reflect.getMetadata(
              ROUTES_METADATA,
              TestController,
            ) as EnhancedRouteMetadata[];

            expect(controllerMeta).toBeDefined();
            expect(controllerMeta.basePath).toBe(basePath);

            const route = routes.find((r) => r.handlerName === handlerName);
            expect(route).toBeDefined();
            expect(route?.path).toBe(routePath);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('P3.7: Route Handler Name Uniqueness', () => {
    it('should handle routes with unique handler names correctly', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(methodNameArb, { minLength: 2, maxLength: 5 }),
          (handlerNames) => {
            @Controller('/test')
            class TestController {}

            // Register routes with unique handler names
            for (let i = 0; i < handlerNames.length; i++) {
              const decorator = Get(`/route${i}`);
              const descriptor = {
                value: function () {
                  return {};
                },
                writable: true,
                enumerable: false,
                configurable: true,
              };
              decorator(TestController.prototype, handlerNames[i], descriptor);
            }

            const routes = Reflect.getMetadata(
              ROUTES_METADATA,
              TestController,
            ) as EnhancedRouteMetadata[];

            // All routes should be registered
            expect(routes.length).toBe(handlerNames.length);

            // Each handler name should appear exactly once
            const registeredNames = routes.map((r) => r.handlerName);
            for (const name of handlerNames) {
              const count = registeredNames.filter((n) => n === name).length;
              expect(count).toBe(1);
            }
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('P3.8: All HTTP Methods Coverage', () => {
    it('should correctly register all HTTP method types', () => {
      fc.assert(
        fc.property(
          fc.record({
            basePath: basePathArb,
            routePath: routePathArb,
          }),
          ({ basePath, routePath }) => {
            const methods = ['get', 'post', 'put', 'delete', 'patch'] as const;
            const decoratorMap = {
              get: Get,
              post: Post,
              put: Put,
              delete: Delete,
              patch: Patch,
            };

            @Controller(basePath)
            class TestController {}

            // Register one route for each HTTP method
            for (const method of methods) {
              const decorator = decoratorMap[method](routePath);
              const descriptor = {
                value: function () {
                  return {};
                },
                writable: true,
                enumerable: false,
                configurable: true,
              };
              decorator(
                TestController.prototype,
                `${method}Handler`,
                descriptor,
              );
            }

            const routes = Reflect.getMetadata(
              ROUTES_METADATA,
              TestController,
            ) as EnhancedRouteMetadata[];

            expect(routes.length).toBe(methods.length);

            // Each HTTP method should be registered
            for (const method of methods) {
              const route = routes.find((r) => r.method === method);
              expect(route).toBeDefined();
              expect(route?.handlerName).toBe(`${method}Handler`);
              expect(route?.path).toBe(routePath);
            }
          },
        ),
        { numRuns: 30 },
      );
    });
  });
});
