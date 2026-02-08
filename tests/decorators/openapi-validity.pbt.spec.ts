/**
 * @fileoverview Property-based tests for OpenAPI spec validity.
 * Tests that generated OpenAPI specs are valid with random route configurations.
 *
 * **Validates: Requirements 14.1, 9.10**
 * - OpenAPI spec is automatically built from all decorated controllers via ControllerRegistry
 * - Decorators merge with each other - multiple decorators build up the OpenAPI metadata incrementally
 */

import * as fc from 'fast-check';
import 'reflect-metadata';

// Decorators
import { ApiController } from '../../src/decorators/controller';
import {
  Get,
  Post,
  Put,
  Delete,
  Patch,
} from '../../src/decorators/http-methods';
import { Returns } from '../../src/decorators/response';
import {
  ApiTags,
  ApiSummary,
  ApiDescription,
  Deprecated,
  ApiOperationId,
  getEffectiveOpenAPIMetadata,
} from '../../src/decorators/openapi';
import { ApiParam } from '../../src/decorators/openapi-params';
import { getEffectiveResponseMetadata } from '../../src/decorators/response';
import { getOpenAPIParams } from '../../src/decorators/openapi-params';

// Metadata keys
import { ROUTES_METADATA } from '../../src/decorators/metadata-keys';

// OpenAPI infrastructure
import { OpenAPIBuilder } from '../../src/openapi/builder';
import { ControllerRegistry } from '../../src/registry/controller-registry';
import { OpenAPISchemaRegistry } from '../../src/openapi/schemas';

// Types
import { EnhancedRouteMetadata } from '../../src/decorators/http-methods';

/**
 * Arbitrary for generating valid tag names.
 */
const tagArb = fc
  .string({ minLength: 1, maxLength: 15 })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s));

/**
 * Arbitrary for generating valid method names.
 */
const methodNameArb = fc
  .string({ minLength: 3, maxLength: 15 })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s));

/**
 * Arbitrary for generating valid route paths (simplified).
 */
const routePathArb = fc.constantFrom('/', '/items', '/users', '/data', '/test');

/**
 * Arbitrary for generating valid controller base paths.
 */
const basePathArb = fc.constantFrom('/api', '/v1', '/test', '/admin');

/**
 * Arbitrary for generating status codes.
 */
const statusCodeArb = fc.constantFrom(200, 201, 204, 400, 404, 500);

/**
 * Arbitrary for generating descriptions.
 */
const descriptionArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9 ]*$/.test(s));

/**
 * Validates that an OpenAPI spec has the required structure.
 */
function isValidOpenAPISpec(spec: Record<string, unknown>): boolean {
  if (!spec.openapi || typeof spec.openapi !== 'string') return false;
  if (!spec.info || typeof spec.info !== 'object') return false;
  if (!spec.paths || typeof spec.paths !== 'object') return false;

  const info = spec.info as Record<string, unknown>;
  if (!info.title || typeof info.title !== 'string') return false;
  if (!info.version || typeof info.version !== 'string') return false;

  return true;
}

describe('Property-Based Tests: OpenAPI Spec Validity', () => {
  beforeEach(() => {
    OpenAPISchemaRegistry.clear();
    ControllerRegistry.clear();
  });

  describe('P4.1: Basic OpenAPI Spec Structure', () => {
    it('should generate valid OpenAPI spec structure', () => {
      fc.assert(
        fc.property(
          fc.record({
            title: descriptionArb,
            version: fc.constantFrom('1.0.0', '2.0.0', '1.1.0'),
          }),
          ({ title, version }) => {
            const builder = new OpenAPIBuilder({ title, version });
            const spec = builder.build();

            expect(isValidOpenAPISpec(spec)).toBe(true);
            expect(spec.openapi).toBe('3.0.3');
            expect((spec.info as Record<string, unknown>).title).toBe(title);
            expect((spec.info as Record<string, unknown>).version).toBe(
              version,
            );
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('P4.2: Route Path Conversion', () => {
    it('should convert Express-style paths to OpenAPI paths', () => {
      fc.assert(
        fc.property(
          fc.record({
            basePath: basePathArb,
            routePath: routePathArb,
            handlerName: methodNameArb,
          }),
          ({ basePath, routePath, handlerName }) => {
            @ApiController(basePath)
            class TestController {}

            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };
            Get(routePath)(TestController.prototype, handlerName, descriptor);

            const routes = Reflect.getMetadata(
              ROUTES_METADATA,
              TestController,
            ) as EnhancedRouteMetadata[];
            ControllerRegistry.register(
              basePath,
              'TestController',
              routes.map((r) => ({
                method: r.method,
                path: r.path,
                handlerKey: r.handlerName,
                openapi: getEffectiveOpenAPIMetadata(
                  TestController,
                  r.handlerName,
                ),
              })),
            );

            const builder = new OpenAPIBuilder({
              title: 'Test',
              version: '1.0.0',
            });
            const spec = builder.build();

            // Normalize path: combine basePath and routePath, remove duplicate slashes, remove trailing slash
            let expectedPath = (basePath + routePath).replace(/\/+/g, '/');
            if (expectedPath.length > 1 && expectedPath.endsWith('/')) {
              expectedPath = expectedPath.slice(0, -1);
            }
            expect(spec.paths).toHaveProperty(expectedPath);
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('P4.3: OpenAPI Operation Metadata', () => {
    it('should include operation metadata in spec', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            summary: descriptionArb,
            tags: fc.array(tagArb, { minLength: 1, maxLength: 2 }),
          }),
          ({ handlerName, summary, tags }) => {
            @ApiController('/test')
            class TestController {}

            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };

            Get('/')(TestController.prototype, handlerName, descriptor);
            ApiSummary(summary)(
              TestController.prototype,
              handlerName,
              descriptor,
            );
            ApiTags(...tags)(TestController.prototype, handlerName, descriptor);

            const routes = Reflect.getMetadata(
              ROUTES_METADATA,
              TestController,
            ) as EnhancedRouteMetadata[];
            ControllerRegistry.register(
              '/test',
              'TestController',
              routes.map((r) => ({
                method: r.method,
                path: r.path,
                handlerKey: r.handlerName,
                openapi: getEffectiveOpenAPIMetadata(
                  TestController,
                  r.handlerName,
                ),
              })),
            );

            const builder = new OpenAPIBuilder({
              title: 'Test',
              version: '1.0.0',
            });
            const spec = builder.build();

            const operation = (
              spec.paths['/test'] as Record<string, Record<string, unknown>>
            )?.get;
            expect(operation).toBeDefined();
            expect(operation.summary).toBe(summary);
            expect(operation.tags).toEqual(expect.arrayContaining(tags));
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('P4.4: OpenAPI Response Documentation', () => {
    it('should include response documentation in spec', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            statusCodes: fc.uniqueArray(statusCodeArb, {
              minLength: 1,
              maxLength: 2,
            }),
          }),
          ({ handlerName, statusCodes }) => {
            @ApiController('/test')
            class TestController {}

            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };

            Get('/')(TestController.prototype, handlerName, descriptor);

            for (const statusCode of statusCodes) {
              Returns(statusCode, 'Schema')(
                TestController.prototype,
                handlerName,
                descriptor,
              );
            }

            const routes = Reflect.getMetadata(
              ROUTES_METADATA,
              TestController,
            ) as EnhancedRouteMetadata[];
            const openApiMeta = getEffectiveOpenAPIMetadata(
              TestController,
              handlerName,
            );
            const responses = getEffectiveResponseMetadata(
              TestController,
              handlerName,
            );

            const responsesObj: Record<
              string,
              { description: string; schema?: string }
            > = {};
            for (const response of responses) {
              responsesObj[String(response.statusCode)] = {
                description:
                  response.description ?? `Response ${response.statusCode}`,
                ...(response.schema && { schema: response.schema }),
              };
            }

            ControllerRegistry.register(
              '/test',
              'TestController',
              routes.map((r) => ({
                method: r.method,
                path: r.path,
                handlerKey: r.handlerName,
                openapi: { ...openApiMeta, responses: responsesObj },
              })),
            );

            const builder = new OpenAPIBuilder({
              title: 'Test',
              version: '1.0.0',
            });
            const spec = builder.build();

            const operation = (
              spec.paths['/test'] as Record<string, Record<string, unknown>>
            )?.get;
            expect(operation).toBeDefined();
            expect(operation.responses).toBeDefined();

            for (const statusCode of statusCodes) {
              expect(operation.responses).toHaveProperty(String(statusCode));
            }
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('P4.5: OpenAPI Parameter Documentation', () => {
    it('should include parameter documentation in spec', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            paramName: fc.constantFrom('id', 'userId', 'itemId'),
            paramDescription: descriptionArb,
          }),
          ({ handlerName, paramName, paramDescription }) => {
            @ApiController('/test')
            class TestController {}

            const descriptor = {
              value: function () {
                return {};
              },
              writable: true,
              enumerable: false,
              configurable: true,
            };

            Get(`/:${paramName}`)(
              TestController.prototype,
              handlerName,
              descriptor,
            );
            ApiParam(paramName, {
              description: paramDescription,
              schema: { type: 'string' },
            })(TestController.prototype, handlerName, descriptor);

            const routes = Reflect.getMetadata(
              ROUTES_METADATA,
              TestController,
            ) as EnhancedRouteMetadata[];
            const openApiMeta = getEffectiveOpenAPIMetadata(
              TestController,
              handlerName,
            );
            const params = getOpenAPIParams(TestController, handlerName);

            ControllerRegistry.register(
              '/test',
              'TestController',
              routes.map((r) => ({
                method: r.method,
                path: r.path,
                handlerKey: r.handlerName,
                openapi: { ...openApiMeta, parameters: params },
              })),
            );

            const builder = new OpenAPIBuilder({
              title: 'Test',
              version: '1.0.0',
            });
            const spec = builder.build();

            const expectedPath = `/test/{${paramName}}`;
            const operation = (
              spec.paths[expectedPath] as Record<
                string,
                Record<string, unknown>
              >
            )?.get;

            expect(operation).toBeDefined();
            expect(operation.parameters).toBeDefined();
            expect(Array.isArray(operation.parameters)).toBe(true);

            const param = (
              operation.parameters as Array<Record<string, unknown>>
            ).find((p) => p.name === paramName);
            expect(param).toBeDefined();
            expect(param?.in).toBe('path');
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('P4.6: Multiple Routes in Same Controller', () => {
    it('should generate valid spec with multiple routes', () => {
      fc.assert(
        fc.property(
          fc.record({
            basePath: basePathArb,
            routeCount: fc.integer({ min: 2, max: 4 }),
          }),
          ({ basePath, routeCount }) => {
            @ApiController(basePath)
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

              methodDecorator(path)(
                TestController.prototype,
                handlerName,
                descriptor,
              );
            }

            const registeredRoutes = Reflect.getMetadata(
              ROUTES_METADATA,
              TestController,
            ) as EnhancedRouteMetadata[];
            ControllerRegistry.register(
              basePath,
              'TestController',
              registeredRoutes.map((r) => ({
                method: r.method,
                path: r.path,
                handlerKey: r.handlerName,
                openapi: getEffectiveOpenAPIMetadata(
                  TestController,
                  r.handlerName,
                ),
              })),
            );

            const builder = new OpenAPIBuilder({
              title: 'Test',
              version: '1.0.0',
            });
            const spec = builder.build();

            expect(isValidOpenAPISpec(spec)).toBe(true);

            for (let i = 0; i < routeCount; i++) {
              const fullPath = (basePath + `/route${i}`).replace(/\/+/g, '/');
              expect(spec.paths).toHaveProperty(fullPath);
            }
          },
        ),
        { numRuns: 15 },
      );
    });
  });

  describe('P4.7: Spec Idempotency', () => {
    it('should produce consistent spec for same input', () => {
      fc.assert(
        fc.property(
          fc.record({
            basePath: basePathArb,
            handlerName: methodNameArb,
            summary: descriptionArb,
          }),
          ({ basePath, handlerName, summary }) => {
            const buildSpec = () => {
              ControllerRegistry.clear();

              @ApiController(basePath)
              class TestController {}

              const descriptor = {
                value: function () {
                  return {};
                },
                writable: true,
                enumerable: false,
                configurable: true,
              };

              Get('/')(TestController.prototype, handlerName, descriptor);
              ApiSummary(summary)(
                TestController.prototype,
                handlerName,
                descriptor,
              );

              const routes = Reflect.getMetadata(
                ROUTES_METADATA,
                TestController,
              ) as EnhancedRouteMetadata[];
              ControllerRegistry.register(
                basePath,
                'TestController',
                routes.map((r) => ({
                  method: r.method,
                  path: r.path,
                  handlerKey: r.handlerName,
                  openapi: getEffectiveOpenAPIMetadata(
                    TestController,
                    r.handlerName,
                  ),
                })),
              );

              const builder = new OpenAPIBuilder({
                title: 'Test',
                version: '1.0.0',
              });
              return builder.build();
            };

            const spec1 = buildSpec();
            const spec2 = buildSpec();

            expect(JSON.stringify(spec1)).toBe(JSON.stringify(spec2));
          },
        ),
        { numRuns: 15 },
      );
    });
  });
});
