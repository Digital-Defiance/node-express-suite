/**
 * @fileoverview Property-based tests for decorator metadata preservation.
 * Tests that decorator metadata is correctly stored and retrieved across all decorator types.
 *
 * **Validates: Requirements 1.5, 2.2, 15.1**
 * - Controller metadata is accessible via reflection for OpenAPI generation
 * - Decorated methods are automatically collected into route definitions
 * - Multiple decorators on same method merge their OpenAPI metadata
 */

import * as fc from 'fast-check';
import 'reflect-metadata';

// Metadata keys
import {
  CONTROLLER_METADATA,
  OPENAPI_CONTROLLER_METADATA,
  ROUTES_METADATA,
  AUTH_METADATA,
  VALIDATION_METADATA,
  MIDDLEWARE_METADATA,
  RESPONSE_METADATA,
  OPENAPI_METADATA,
  PARAMS_METADATA,
  LIFECYCLE_METADATA,
  TRANSACTION_METADATA,
  HANDLER_ARGS_METADATA,
} from '../../src/decorators/metadata-keys';

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
} from '../../src/decorators/auth';
import {
  ValidateBody,
  ValidateParams,
  ValidateQuery,
} from '../../src/decorators/validation';
import { Returns, RawJson, Paginated } from '../../src/decorators/response';
import {
  UseMiddleware,
  RateLimit,
  CacheResponse,
} from '../../src/decorators/middleware';
import {
  OnSuccess,
  OnError,
  Before,
  After,
} from '../../src/decorators/lifecycle';
import {
  Param,
  Body,
  Query,
  Header,
  CurrentUser,
  Req,
  Res,
} from '../../src/decorators/params';
import {
  ApiTags,
  ApiSummary,
  ApiDescription,
  Deprecated,
  ApiOperationId,
} from '../../src/decorators/openapi';
import { Transactional } from '../../src/decorators/transaction';
import { HandlerArgs } from '../../src/decorators/handler-args';

// Metadata collectors
import {
  getMetadata,
  hasMetadata,
  collectAllMetadata,
  collectMethodMetadata,
} from '../../src/decorators/metadata-collector';

/**
 * Arbitrary for generating valid route paths.
 */
const routePathArb = fc
  .array(
    fc.oneof(
      fc
        .string({ minLength: 1, maxLength: 20 })
        .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
      fc
        .string({ minLength: 1, maxLength: 20 })
        .filter((s) => /^[a-zA-Z0-9_]+$/.test(s))
        .map((s) => `:${s}`),
    ),
    { minLength: 0, maxLength: 4 },
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
 * Arbitrary for generating valid tag names.
 */
const tagArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_ -]*$/.test(s));

/**
 * Arbitrary for generating valid method names.
 */
const methodNameArb = fc
  .string({ minLength: 3, maxLength: 30 })
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
 * Arbitrary for generating status codes.
 */
const statusCodeArb = fc.constantFrom(200, 201, 204, 400, 401, 403, 404, 500);

/**
 * Arbitrary for generating descriptions.
 */
const descriptionArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

describe('Property-Based Tests: Decorator Metadata Preservation', () => {
  describe('P1.1: Controller Decorator Metadata Preservation', () => {
    it('should preserve basePath in @Controller metadata', () => {
      fc.assert(
        fc.property(basePathArb, (basePath) => {
          @Controller(basePath)
          class TestController {}

          const metadata = Reflect.getMetadata(
            CONTROLLER_METADATA,
            TestController,
          );

          expect(metadata).toBeDefined();
          expect(metadata.basePath).toBe(basePath);
        }),
        { numRuns: 50 },
      );
    });

    it('should preserve all options in @ApiController metadata', () => {
      fc.assert(
        fc.property(
          fc.record({
            basePath: basePathArb,
            tags: fc.array(tagArb, { minLength: 0, maxLength: 3 }),
            description: fc.option(descriptionArb, { nil: undefined }),
            deprecated: fc.option(fc.boolean(), { nil: undefined }),
          }),
          ({ basePath, tags, description, deprecated }) => {
            const options: {
              tags?: string[];
              description?: string;
              deprecated?: boolean;
            } = {};
            if (tags.length > 0) options.tags = tags;
            if (description !== undefined) options.description = description;
            if (deprecated !== undefined) options.deprecated = deprecated;

            @ApiController(basePath, options)
            class TestApiController {}

            const controllerMeta = Reflect.getMetadata(
              CONTROLLER_METADATA,
              TestApiController,
            );
            const openApiMeta = Reflect.getMetadata(
              OPENAPI_CONTROLLER_METADATA,
              TestApiController,
            );

            expect(controllerMeta).toBeDefined();
            expect(controllerMeta.basePath).toBe(basePath);

            expect(openApiMeta).toBeDefined();
            if (tags.length > 0) {
              expect(openApiMeta.tags).toEqual(tags);
            }
            if (description !== undefined) {
              expect(openApiMeta.description).toBe(description);
            }
            if (deprecated !== undefined) {
              expect(openApiMeta.deprecated).toBe(deprecated);
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('P1.2: HTTP Method Decorator Metadata Preservation', () => {
    it('should preserve route metadata for all HTTP methods', () => {
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
            class TestController {
              // We need to dynamically apply the decorator
            }

            // Apply decorator to prototype method
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

            const routes = Reflect.getMetadata(ROUTES_METADATA, TestController);

            expect(routes).toBeDefined();
            expect(Array.isArray(routes)).toBe(true);
            expect(routes.length).toBeGreaterThan(0);

            const route = routes.find(
              (r: { handlerName: string }) => r.handlerName === handlerName,
            );
            expect(route).toBeDefined();
            expect(route.method).toBe(method);
            expect(route.path).toBe(path);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('P1.3: Auth Decorator Metadata Preservation', () => {
    it('should preserve @RequireAuth metadata', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          class TestController {}

          const decorator = RequireAuth();
          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };
          decorator(TestController.prototype, handlerName, descriptor);

          const authMeta = Reflect.getMetadata(
            AUTH_METADATA,
            TestController,
            handlerName,
          );

          expect(authMeta).toBeDefined();
          expect(authMeta.requireAuth).toBe(true);
        }),
        { numRuns: 30 },
      );
    });

    it('should preserve @RequireCryptoAuth metadata', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          class TestController {}

          const decorator = RequireCryptoAuth();
          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };
          decorator(TestController.prototype, handlerName, descriptor);

          const authMeta = Reflect.getMetadata(
            AUTH_METADATA,
            TestController,
            handlerName,
          );

          expect(authMeta).toBeDefined();
          expect(authMeta.requireCryptoAuth).toBe(true);
        }),
        { numRuns: 30 },
      );
    });

    it('should preserve @Public metadata', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          class TestController {}

          const decorator = Public();
          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };
          decorator(TestController.prototype, handlerName, descriptor);

          const authMeta = Reflect.getMetadata(
            AUTH_METADATA,
            TestController,
            handlerName,
          );

          expect(authMeta).toBeDefined();
          expect(authMeta.isPublic).toBe(true);
        }),
        { numRuns: 30 },
      );
    });

    it('should preserve @AuthFailureStatus metadata with any valid status code', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            statusCode: fc.integer({ min: 400, max: 599 }),
          }),
          ({ handlerName, statusCode }) => {
            class TestController {}

            const decorator = AuthFailureStatus(statusCode);
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            decorator(TestController.prototype, handlerName, descriptor);

            const authMeta = Reflect.getMetadata(
              AUTH_METADATA,
              TestController,
              handlerName,
            );

            expect(authMeta).toBeDefined();
            expect(authMeta.failureStatusCode).toBe(statusCode);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('P1.4: Response Decorator Metadata Preservation', () => {
    it('should preserve @Returns metadata with status code and schema', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            statusCode: statusCodeArb,
            schema: fc.option(
              fc
                .string({ minLength: 1, maxLength: 30 })
                .filter((s) => /^[A-Z][a-zA-Z0-9]*$/.test(s)),
              { nil: undefined },
            ),
            description: fc.option(descriptionArb, { nil: undefined }),
          }),
          ({ handlerName, statusCode, schema, description }) => {
            class TestController {}

            const options = description ? { description } : undefined;
            const decorator = Returns(statusCode, schema, options);
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            decorator(TestController.prototype, handlerName, descriptor);

            const responseMeta = Reflect.getMetadata(
              RESPONSE_METADATA,
              TestController,
              handlerName,
            );

            expect(responseMeta).toBeDefined();
            expect(Array.isArray(responseMeta)).toBe(true);
            expect(responseMeta.length).toBeGreaterThan(0);

            const response = responseMeta.find(
              (r: { statusCode: number }) => r.statusCode === statusCode,
            );
            expect(response).toBeDefined();
            expect(response.statusCode).toBe(statusCode);
            if (schema !== undefined) {
              expect(response.schema).toBe(schema);
            }
            if (description !== undefined) {
              expect(response.description).toBe(description);
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should accumulate multiple @Returns decorators', () => {
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

            const responseMeta = Reflect.getMetadata(
              RESPONSE_METADATA,
              TestController,
              handlerName,
            );

            expect(responseMeta).toBeDefined();
            expect(responseMeta.length).toBe(statusCodes.length);

            // All status codes should be present
            const foundCodes = responseMeta.map(
              (r: { statusCode: number }) => r.statusCode,
            );
            for (const code of statusCodes) {
              expect(foundCodes).toContain(code);
            }
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('P1.5: OpenAPI Decorator Metadata Preservation', () => {
    it('should preserve @ApiTags metadata', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            tags: fc.array(tagArb, { minLength: 1, maxLength: 5 }),
          }),
          ({ handlerName, tags }) => {
            class TestController {}

            const decorator = ApiTags(...tags);
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            decorator(TestController.prototype, handlerName, descriptor);

            const openApiMeta = Reflect.getMetadata(
              OPENAPI_METADATA,
              TestController,
              handlerName,
            );

            expect(openApiMeta).toBeDefined();
            expect(openApiMeta.tags).toBeDefined();
            expect(openApiMeta.tags).toEqual(expect.arrayContaining(tags));
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should preserve @ApiSummary metadata', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            summary: descriptionArb,
          }),
          ({ handlerName, summary }) => {
            class TestController {}

            const decorator = ApiSummary(summary);
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            decorator(TestController.prototype, handlerName, descriptor);

            const openApiMeta = Reflect.getMetadata(
              OPENAPI_METADATA,
              TestController,
              handlerName,
            );

            expect(openApiMeta).toBeDefined();
            expect(openApiMeta.summary).toBe(summary);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should preserve @ApiDescription metadata', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            description: descriptionArb,
          }),
          ({ handlerName, description }) => {
            class TestController {}

            const decorator = ApiDescription(description);
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            decorator(TestController.prototype, handlerName, descriptor);

            const openApiMeta = Reflect.getMetadata(
              OPENAPI_METADATA,
              TestController,
              handlerName,
            );

            expect(openApiMeta).toBeDefined();
            expect(openApiMeta.description).toBe(description);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should preserve @Deprecated metadata', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          class TestController {}

          const decorator = Deprecated();
          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };
          decorator(TestController.prototype, handlerName, descriptor);

          const openApiMeta = Reflect.getMetadata(
            OPENAPI_METADATA,
            TestController,
            handlerName,
          );

          expect(openApiMeta).toBeDefined();
          expect(openApiMeta.deprecated).toBe(true);
        }),
        { numRuns: 30 },
      );
    });

    it('should preserve @ApiOperationId metadata', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            operationId: methodNameArb,
          }),
          ({ handlerName, operationId }) => {
            class TestController {}

            const decorator = ApiOperationId(operationId);
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            decorator(TestController.prototype, handlerName, descriptor);

            const openApiMeta = Reflect.getMetadata(
              OPENAPI_METADATA,
              TestController,
              handlerName,
            );

            expect(openApiMeta).toBeDefined();
            expect(openApiMeta.operationId).toBe(operationId);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('P1.6: Transaction Decorator Metadata Preservation', () => {
    it('should preserve @Transactional metadata with timeout', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            timeout: fc.option(fc.integer({ min: 1000, max: 60000 }), {
              nil: undefined,
            }),
          }),
          ({ handlerName, timeout }) => {
            class TestController {}

            const options = timeout !== undefined ? { timeout } : undefined;
            const decorator = Transactional(options);
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            decorator(TestController.prototype, handlerName, descriptor);

            const txMeta = Reflect.getMetadata(
              TRANSACTION_METADATA,
              TestController,
              handlerName,
            );

            expect(txMeta).toBeDefined();
            expect(txMeta.useTransaction).toBe(true);
            if (timeout !== undefined) {
              expect(txMeta.timeout).toBe(timeout);
            }
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('P1.7: Handler Args Decorator Metadata Preservation', () => {
    it('should preserve @HandlerArgs metadata', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            args: fc.array(fc.oneof(fc.string(), fc.integer(), fc.boolean()), {
              minLength: 1,
              maxLength: 5,
            }),
          }),
          ({ handlerName, args }) => {
            class TestController {}

            const decorator = HandlerArgs(...args);
            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            decorator(TestController.prototype, handlerName, descriptor);

            const argsMeta = Reflect.getMetadata(
              HANDLER_ARGS_METADATA,
              TestController,
              handlerName,
            );

            expect(argsMeta).toBeDefined();
            // HandlerArgs stores metadata as { args: [...] }
            expect(argsMeta.args).toEqual(args);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('P1.8: Parameter Decorator Metadata Preservation', () => {
    it('should preserve @Param metadata with name and index', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            paramName: fc
              .string({ minLength: 1, maxLength: 20 })
              .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s)),
            paramIndex: fc.integer({ min: 0, max: 5 }),
          }),
          ({ handlerName, paramName, paramIndex }) => {
            class TestController {}

            const decorator = Param(paramName);
            decorator(TestController.prototype, handlerName, paramIndex);

            const paramsMeta = Reflect.getMetadata(
              PARAMS_METADATA,
              TestController,
              handlerName,
            );

            expect(paramsMeta).toBeDefined();
            expect(Array.isArray(paramsMeta)).toBe(true);

            const param = paramsMeta.find(
              (p: { name: string }) => p.name === paramName,
            );
            expect(param).toBeDefined();
            expect(param.type).toBe('param');
            expect(param.index).toBe(paramIndex);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should preserve @Query metadata with name and index', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            queryName: fc
              .string({ minLength: 1, maxLength: 20 })
              .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s)),
            paramIndex: fc.integer({ min: 0, max: 5 }),
          }),
          ({ handlerName, queryName, paramIndex }) => {
            class TestController {}

            const decorator = Query(queryName);
            decorator(TestController.prototype, handlerName, paramIndex);

            const paramsMeta = Reflect.getMetadata(
              PARAMS_METADATA,
              TestController,
              handlerName,
            );

            expect(paramsMeta).toBeDefined();
            expect(Array.isArray(paramsMeta)).toBe(true);

            const param = paramsMeta.find(
              (p: { name: string }) => p.name === queryName,
            );
            expect(param).toBeDefined();
            expect(param.type).toBe('query');
            expect(param.index).toBe(paramIndex);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should preserve @Header metadata with name and index', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            headerName: fc
              .string({ minLength: 1, maxLength: 30 })
              .filter((s) => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s)),
            paramIndex: fc.integer({ min: 0, max: 5 }),
          }),
          ({ handlerName, headerName, paramIndex }) => {
            class TestController {}

            const decorator = Header(headerName);
            decorator(TestController.prototype, handlerName, paramIndex);

            const paramsMeta = Reflect.getMetadata(
              PARAMS_METADATA,
              TestController,
              handlerName,
            );

            expect(paramsMeta).toBeDefined();
            expect(Array.isArray(paramsMeta)).toBe(true);

            const param = paramsMeta.find(
              (p: { name: string }) => p.name === headerName,
            );
            expect(param).toBeDefined();
            expect(param.type).toBe('header');
            expect(param.index).toBe(paramIndex);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should preserve @Body metadata with index', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            paramIndex: fc.integer({ min: 0, max: 5 }),
          }),
          ({ handlerName, paramIndex }) => {
            class TestController {}

            const decorator = Body();
            decorator(TestController.prototype, handlerName, paramIndex);

            const paramsMeta = Reflect.getMetadata(
              PARAMS_METADATA,
              TestController,
              handlerName,
            );

            expect(paramsMeta).toBeDefined();
            expect(Array.isArray(paramsMeta)).toBe(true);

            const param = paramsMeta.find(
              (p: { type: string; index: number }) =>
                p.type === 'body' && p.index === paramIndex,
            );
            expect(param).toBeDefined();
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('P1.9: Lifecycle Decorator Metadata Preservation', () => {
    it('should preserve @Before callback metadata', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          const callback = jest.fn();

          class TestController {}

          const decorator = Before(callback);
          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };
          decorator(TestController.prototype, handlerName, descriptor);

          const lifecycleMeta = Reflect.getMetadata(
            LIFECYCLE_METADATA,
            TestController,
            handlerName,
          );

          expect(lifecycleMeta).toBeDefined();
          expect(lifecycleMeta.before).toBeDefined();
          expect(lifecycleMeta.before).toContain(callback);
        }),
        { numRuns: 20 },
      );
    });

    it('should preserve @After callback metadata', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          const callback = jest.fn();

          class TestController {}

          const decorator = After(callback);
          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };
          decorator(TestController.prototype, handlerName, descriptor);

          const lifecycleMeta = Reflect.getMetadata(
            LIFECYCLE_METADATA,
            TestController,
            handlerName,
          );

          expect(lifecycleMeta).toBeDefined();
          expect(lifecycleMeta.after).toBeDefined();
          expect(lifecycleMeta.after).toContain(callback);
        }),
        { numRuns: 20 },
      );
    });

    it('should preserve @OnSuccess callback metadata', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          const callback = jest.fn();

          class TestController {}

          const decorator = OnSuccess(callback);
          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };
          decorator(TestController.prototype, handlerName, descriptor);

          const lifecycleMeta = Reflect.getMetadata(
            LIFECYCLE_METADATA,
            TestController,
            handlerName,
          );

          expect(lifecycleMeta).toBeDefined();
          expect(lifecycleMeta.onSuccess).toBeDefined();
          expect(lifecycleMeta.onSuccess).toContain(callback);
        }),
        { numRuns: 20 },
      );
    });

    it('should preserve @OnError callback metadata', () => {
      fc.assert(
        fc.property(methodNameArb, (handlerName) => {
          const callback = jest.fn();

          class TestController {}

          const decorator = OnError(callback);
          const descriptor = {
            value: function () {
              return {};
            },
            writable: true,
            enumerable: false,
            configurable: true,
          };
          decorator(TestController.prototype, handlerName, descriptor);

          const lifecycleMeta = Reflect.getMetadata(
            LIFECYCLE_METADATA,
            TestController,
            handlerName,
          );

          expect(lifecycleMeta).toBeDefined();
          expect(lifecycleMeta.onError).toBeDefined();
          expect(lifecycleMeta.onError).toContain(callback);
        }),
        { numRuns: 20 },
      );
    });
  });
});
