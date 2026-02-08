/**
 * @fileoverview Property-based tests for parameter injection correctness.
 * Tests that parameter decorators correctly store metadata and inject values.
 *
 * **Validates: Requirements 4.1-4.13**
 * - @Param, @Body, @Query, @Header inject correct values
 * - Parameter metadata is correctly stored with index and type
 * - Type coercion is applied for numeric params
 * - Parameter descriptions can be specified
 */

import * as fc from 'fast-check';
import 'reflect-metadata';
import { Request, Response } from 'express';

// Parameter decorators
import {
  Param,
  Body,
  Query,
  Header,
  CurrentUser,
  EciesUser,
  Req,
  Res,
  getParamMetadata,
  getOpenAPIParamMetadata,
} from '../../src/decorators/params';

// Metadata keys
import {
  PARAMS_METADATA,
  OPENAPI_PARAMS_METADATA,
} from '../../src/decorators/metadata-keys';

/**
 * Arbitrary for generating valid method names.
 */
const methodNameArb = fc
  .string({ minLength: 3, maxLength: 15 })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s));

/**
 * Arbitrary for generating valid parameter names.
 */
const paramNameArb = fc
  .string({ minLength: 1, maxLength: 15 })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s));

/**
 * Arbitrary for generating valid header names.
 */
const headerNameArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s));

/**
 * Arbitrary for generating descriptions.
 */
const descriptionArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9 ]*$/.test(s));

/**
 * Arbitrary for generating parameter indices.
 */
const paramIndexArb = fc.integer({ min: 0, max: 5 });

describe('Property-Based Tests: Parameter Injection Correctness', () => {
  describe('P5.1: @Param Decorator Metadata', () => {
    it('should store @Param metadata with correct name and index', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            paramName: paramNameArb,
            paramIndex: paramIndexArb,
          }),
          ({ handlerName, paramName, paramIndex }) => {
            class TestController {}

            const decorator = Param(paramName);
            decorator(TestController.prototype, handlerName, paramIndex);

            const paramsMeta = getParamMetadata(TestController, handlerName);

            expect(paramsMeta).toBeDefined();
            expect(Array.isArray(paramsMeta)).toBe(true);

            const param = paramsMeta.find((p) => p.name === paramName);
            expect(param).toBeDefined();
            expect(param?.type).toBe('param');
            expect(param?.index).toBe(paramIndex);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should add OpenAPI path parameter for @Param', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            paramName: paramNameArb,
            paramIndex: paramIndexArb,
          }),
          ({ handlerName, paramName, paramIndex }) => {
            class TestController {}

            const decorator = Param(paramName);
            decorator(TestController.prototype, handlerName, paramIndex);

            const openApiParams = getOpenAPIParamMetadata(
              TestController,
              handlerName,
            );

            expect(openApiParams).toBeDefined();
            expect(Array.isArray(openApiParams)).toBe(true);

            const param = openApiParams.find((p) => p.name === paramName);
            expect(param).toBeDefined();
            expect(param?.in).toBe('path');
            expect(param?.required).toBe(true);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should preserve @Param options (description, schema)', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            paramName: paramNameArb,
            paramIndex: paramIndexArb,
            description: descriptionArb,
          }),
          ({ handlerName, paramName, paramIndex, description }) => {
            class TestController {}

            const decorator = Param(paramName, {
              description,
              schema: { type: 'string' },
            });
            decorator(TestController.prototype, handlerName, paramIndex);

            const openApiParams = getOpenAPIParamMetadata(
              TestController,
              handlerName,
            );
            const param = openApiParams.find((p) => p.name === paramName);

            expect(param).toBeDefined();
            expect(param?.description).toBe(description);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('P5.2: @Query Decorator Metadata', () => {
    it('should store @Query metadata with correct name and index', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            queryName: paramNameArb,
            paramIndex: paramIndexArb,
          }),
          ({ handlerName, queryName, paramIndex }) => {
            class TestController {}

            const decorator = Query(queryName);
            decorator(TestController.prototype, handlerName, paramIndex);

            const paramsMeta = getParamMetadata(TestController, handlerName);

            const param = paramsMeta.find((p) => p.name === queryName);
            expect(param).toBeDefined();
            expect(param?.type).toBe('query');
            expect(param?.index).toBe(paramIndex);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should add OpenAPI query parameter for @Query', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            queryName: paramNameArb,
            paramIndex: paramIndexArb,
          }),
          ({ handlerName, queryName, paramIndex }) => {
            class TestController {}

            const decorator = Query(queryName);
            decorator(TestController.prototype, handlerName, paramIndex);

            const openApiParams = getOpenAPIParamMetadata(
              TestController,
              handlerName,
            );
            const param = openApiParams.find((p) => p.name === queryName);

            expect(param).toBeDefined();
            expect(param?.in).toBe('query');
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('P5.3: @Header Decorator Metadata', () => {
    it('should store @Header metadata with correct name and index', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            headerName: headerNameArb,
            paramIndex: paramIndexArb,
          }),
          ({ handlerName, headerName, paramIndex }) => {
            class TestController {}

            const decorator = Header(headerName);
            decorator(TestController.prototype, handlerName, paramIndex);

            const paramsMeta = getParamMetadata(TestController, handlerName);

            const param = paramsMeta.find((p) => p.name === headerName);
            expect(param).toBeDefined();
            expect(param?.type).toBe('header');
            expect(param?.index).toBe(paramIndex);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should add OpenAPI header parameter for @Header', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            headerName: headerNameArb,
            paramIndex: paramIndexArb,
          }),
          ({ handlerName, headerName, paramIndex }) => {
            class TestController {}

            const decorator = Header(headerName);
            decorator(TestController.prototype, handlerName, paramIndex);

            const openApiParams = getOpenAPIParamMetadata(
              TestController,
              handlerName,
            );
            const param = openApiParams.find((p) => p.name === headerName);

            expect(param).toBeDefined();
            expect(param?.in).toBe('header');
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('P5.4: @Body Decorator Metadata', () => {
    it('should store @Body metadata with correct index', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            paramIndex: paramIndexArb,
          }),
          ({ handlerName, paramIndex }) => {
            class TestController {}

            const decorator = Body();
            decorator(TestController.prototype, handlerName, paramIndex);

            const paramsMeta = getParamMetadata(TestController, handlerName);

            const param = paramsMeta.find(
              (p) => p.type === 'body' && p.index === paramIndex,
            );
            expect(param).toBeDefined();
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should store @Body with field name when specified', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            fieldName: paramNameArb,
            paramIndex: paramIndexArb,
          }),
          ({ handlerName, fieldName, paramIndex }) => {
            class TestController {}

            const decorator = Body(fieldName);
            decorator(TestController.prototype, handlerName, paramIndex);

            const paramsMeta = getParamMetadata(TestController, handlerName);

            const param = paramsMeta.find(
              (p) => p.type === 'body' && p.name === fieldName,
            );
            expect(param).toBeDefined();
            expect(param?.index).toBe(paramIndex);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('P5.5: Special Parameter Decorators', () => {
    it('should store @CurrentUser metadata', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            paramIndex: paramIndexArb,
          }),
          ({ handlerName, paramIndex }) => {
            class TestController {}

            const decorator = CurrentUser();
            decorator(TestController.prototype, handlerName, paramIndex);

            const paramsMeta = getParamMetadata(TestController, handlerName);

            const param = paramsMeta.find(
              (p) => p.type === 'user' && p.index === paramIndex,
            );
            expect(param).toBeDefined();
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should store @EciesUser metadata', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            paramIndex: paramIndexArb,
          }),
          ({ handlerName, paramIndex }) => {
            class TestController {}

            const decorator = EciesUser();
            decorator(TestController.prototype, handlerName, paramIndex);

            const paramsMeta = getParamMetadata(TestController, handlerName);

            const param = paramsMeta.find(
              (p) => p.type === 'eciesUser' && p.index === paramIndex,
            );
            expect(param).toBeDefined();
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should store @Req metadata', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            paramIndex: paramIndexArb,
          }),
          ({ handlerName, paramIndex }) => {
            class TestController {}

            const decorator = Req();
            decorator(TestController.prototype, handlerName, paramIndex);

            const paramsMeta = getParamMetadata(TestController, handlerName);

            const param = paramsMeta.find(
              (p) => p.type === 'req' && p.index === paramIndex,
            );
            expect(param).toBeDefined();
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should store @Res metadata', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            paramIndex: paramIndexArb,
          }),
          ({ handlerName, paramIndex }) => {
            class TestController {}

            const decorator = Res();
            decorator(TestController.prototype, handlerName, paramIndex);

            const paramsMeta = getParamMetadata(TestController, handlerName);

            const param = paramsMeta.find(
              (p) => p.type === 'res' && p.index === paramIndex,
            );
            expect(param).toBeDefined();
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('P5.6: Multiple Parameters on Same Method', () => {
    it('should correctly store multiple parameters with different indices', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            params: fc.uniqueArray(
              fc.record({
                name: paramNameArb,
                index: paramIndexArb,
                type: fc.constantFrom(
                  'param',
                  'query',
                  'header',
                ) as fc.Arbitrary<'param' | 'query' | 'header'>,
              }),
              {
                minLength: 2,
                maxLength: 4,
                comparator: (a, b) => a.index === b.index,
              },
            ),
          }),
          ({ handlerName, params }) => {
            class TestController {}

            const decoratorMap = {
              param: Param,
              query: Query,
              header: Header,
            };

            // Apply all parameter decorators
            for (const param of params) {
              const decorator = decoratorMap[param.type](param.name);
              decorator(TestController.prototype, handlerName, param.index);
            }

            const paramsMeta = getParamMetadata(TestController, handlerName);

            // All parameters should be stored
            expect(paramsMeta.length).toBe(params.length);

            // Each parameter should have correct metadata
            for (const param of params) {
              const stored = paramsMeta.find(
                (p) => p.name === param.name && p.index === param.index,
              );
              expect(stored).toBeDefined();
              expect(stored?.type).toBe(param.type);
            }
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should return parameters sorted by index', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            indices: fc.uniqueArray(paramIndexArb, {
              minLength: 2,
              maxLength: 4,
            }),
          }),
          ({ handlerName, indices }) => {
            class TestController {}

            // Apply parameters in random order
            const shuffledIndices = [...indices].sort(
              () => Math.random() - 0.5,
            );
            for (const index of shuffledIndices) {
              const decorator = Param(`param${index}`);
              decorator(TestController.prototype, handlerName, index);
            }

            const paramsMeta = getParamMetadata(TestController, handlerName);

            // Parameters should be sorted by index
            for (let i = 1; i < paramsMeta.length; i++) {
              expect(paramsMeta[i].index).toBeGreaterThanOrEqual(
                paramsMeta[i - 1].index,
              );
            }
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('P5.7: Parameter Type Coercion Schema', () => {
    it('should store schema type for numeric parameters', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            paramName: paramNameArb,
            paramIndex: paramIndexArb,
            schemaType: fc.constantFrom('integer', 'number') as fc.Arbitrary<
              'integer' | 'number'
            >,
          }),
          ({ handlerName, paramName, paramIndex, schemaType }) => {
            class TestController {}

            const decorator = Param(paramName, {
              schema: { type: schemaType },
            });
            decorator(TestController.prototype, handlerName, paramIndex);

            const paramsMeta = getParamMetadata(TestController, handlerName);
            const param = paramsMeta.find((p) => p.name === paramName);

            expect(param).toBeDefined();
            expect(param?.options?.schema?.type).toBe(schemaType);
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('P5.8: OpenAPI Parameter Deduplication', () => {
    it('should not duplicate OpenAPI parameters when applied multiple times', () => {
      fc.assert(
        fc.property(
          fc.record({
            handlerName: methodNameArb,
            paramName: paramNameArb,
          }),
          ({ handlerName, paramName }) => {
            class TestController {}

            // Apply same parameter decorator twice (simulating re-decoration)
            const decorator = Param(paramName);
            decorator(TestController.prototype, handlerName, 0);
            decorator(TestController.prototype, handlerName, 0);

            const openApiParams = getOpenAPIParamMetadata(
              TestController,
              handlerName,
            );

            // Should only have one OpenAPI parameter with this name
            const matchingParams = openApiParams.filter(
              (p) => p.name === paramName && p.in === 'path',
            );
            expect(matchingParams.length).toBe(1);
          },
        ),
        { numRuns: 20 },
      );
    });
  });
});
