/**
 * @fileoverview Response decorators for Express Suite.
 * Provides @Returns, @ApiResponse, @RawJson, and @Paginated decorators.
 * Supports stacking multiple @Returns for different status codes.
 * @module decorators/response
 */

import 'reflect-metadata';
import {
  PaginatedDecoratorOptions,
  ResponseMetadata,
  ReturnsDecoratorOptions,
} from '../interfaces/openApi/decoratorOptions';
import { OPENAPI_METADATA, RESPONSE_METADATA } from './metadata-keys';
import {
  appendToMetadataArray,
  deepMergeMetadata,
  getMetadata,
  getMetadataOrDefault,
  mergeMetadata,
  setMetadata as _setMetadata,
} from './metadata-collector';

/**
 * Default pagination query parameters for OpenAPI documentation.
 */
const PAGINATION_QUERY_PARAMS = [
  {
    name: 'page',
    in: 'query' as const,
    required: false,
    schema: { type: 'integer' as const, minimum: 1, default: 1 },
    description: 'Page number (1-indexed)',
  },
  {
    name: 'limit',
    in: 'query' as const,
    required: false,
    schema: { type: 'integer' as const, minimum: 1, maximum: 100, default: 20 },
    description: 'Number of items per page',
  },
];

/**
 * Offset-based pagination query parameters for OpenAPI documentation.
 */
const OFFSET_PAGINATION_QUERY_PARAMS = [
  {
    name: 'offset',
    in: 'query' as const,
    required: false,
    schema: { type: 'integer' as const, minimum: 0, default: 0 },
    description: 'Number of items to skip',
  },
  {
    name: 'limit',
    in: 'query' as const,
    required: false,
    schema: { type: 'integer' as const, minimum: 1, maximum: 100, default: 20 },
    description: 'Number of items to return',
  },
];

/**
 * Decorator that documents a response type for OpenAPI generation.
 * Can be stacked multiple times for different status codes.
 *
 * @param statusCode - HTTP status code for this response
 * @param schema - Schema reference name (e.g., 'User') or undefined for no body
 * @param options - Additional options (description, example)
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @ApiController('/api/users')
 * class UserController {
 *   @Returns(200, 'User', { description: 'User found successfully' })
 *   @Returns(404, 'ErrorResponse', { description: 'User not found' })
 *   @Get('/:id')
 *   async getUser(@Param('id') id: string) {
 *     return this.userService.findById(id);
 *   }
 * }
 * ```
 */
export function Returns(
  statusCode: number,
  schema?: string,
  options?: ReturnsDecoratorOptions,
): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const responseMetadata: ResponseMetadata = {
      statusCode,
      schema,
      description: options?.description,
      example: options?.example,
    };

    appendToMetadataArray(
      RESPONSE_METADATA,
      responseMetadata,
      target.constructor,
      propertyKey,
    );

    return descriptor;
  };
}

/**
 * Options for the @ResponseDoc decorator.
 */
export interface ResponseDocOptions {
  /**
   * Description of the response.
   */
  description?: string;

  /**
   * Example response value.
   */
  example?: unknown;

  /**
   * Inline schema definition (alternative to schema reference).
   */
  schema?: {
    type?: string;
    properties?: Record<string, unknown>;
    items?: unknown;
    $ref?: string;
  };

  /**
   * Schema reference name.
   */
  schemaRef?: string;
}

/**
 * Decorator that documents a response with inline schema definition.
 * Useful for simple responses that don't need a separate schema.
 *
 * @param statusCode - HTTP status code for this response
 * @param options - Response options including description, example, and inline schema
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @ApiController('/api/health')
 * class HealthController {
 *   @ResponseDoc(200, {
 *     description: 'Health check response',
 *     schema: {
 *       type: 'object',
 *       properties: {
 *         status: { type: 'string' },
 *         timestamp: { type: 'string', format: 'date-time' }
 *       }
 *     }
 *   })
 *   @Get('/')
 *   healthCheck() {
 *     return { status: 'ok', timestamp: new Date().toISOString() };
 *   }
 * }
 * ```
 */
export function ResponseDoc(
  statusCode: number,
  options?: ResponseDocOptions,
): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const responseMetadata: ResponseMetadata & {
      inlineSchema?: ResponseDocOptions['schema'];
    } = {
      statusCode,
      schema: options?.schemaRef,
      description: options?.description,
      example: options?.example,
    };

    // Store inline schema if provided
    if (options?.schema) {
      (
        responseMetadata as ResponseMetadata & {
          inlineSchema?: ResponseDocOptions['schema'];
        }
      ).inlineSchema = options.schema;
    }

    appendToMetadataArray(
      RESPONSE_METADATA,
      responseMetadata,
      target.constructor,
      propertyKey,
    );

    return descriptor;
  };
}

/**
 * Decorator that marks a route handler as returning raw JSON.
 * Bypasses the standard response wrapper.
 *
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @ApiController('/api/data')
 * class DataController {
 *   @RawJson()
 *   @Get('/raw')
 *   getRawData() {
 *     return { raw: 'data', without: 'wrapper' };
 *   }
 * }
 * ```
 */
export function RawJson(): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    // Store rawJson flag in OpenAPI metadata
    mergeMetadata(
      OPENAPI_METADATA,
      { rawJson: true },
      target.constructor,
      propertyKey,
    );

    return descriptor;
  };
}

/**
 * Metadata stored for paginated endpoints.
 */
export interface PaginatedMetadata {
  /**
   * Whether pagination is enabled.
   */
  isPaginated: true;

  /**
   * Pagination options.
   */
  options: PaginatedDecoratorOptions;
}

/**
 * Decorator that adds pagination support to an endpoint.
 * Automatically adds pagination query parameters to OpenAPI documentation.
 * Wraps response schema in pagination envelope.
 *
 * @param options - Pagination options (defaultPageSize, maxPageSize, useOffset)
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @ApiController('/api/users')
 * class UserController {
 *   @Paginated({ defaultPageSize: 20, maxPageSize: 100 })
 *   @Returns(200, 'User', { description: 'List of users' })
 *   @Get('/')
 *   async listUsers() {
 *     return this.userService.findAll();
 *   }
 * }
 * ```
 */
export function Paginated(
  options: PaginatedDecoratorOptions = {},
): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const {
      defaultPageSize = 20,
      maxPageSize = 100,
      useOffset = false,
    } = options;

    // Choose pagination parameters based on style
    const paginationParams = useOffset
      ? OFFSET_PAGINATION_QUERY_PARAMS.map((param) => ({
          ...param,
          schema: {
            ...param.schema,
            ...(param.name === 'limit' && {
              default: defaultPageSize,
              maximum: maxPageSize,
            }),
          },
        }))
      : PAGINATION_QUERY_PARAMS.map((param) => ({
          ...param,
          schema: {
            ...param.schema,
            ...(param.name === 'limit' && {
              default: defaultPageSize,
              maximum: maxPageSize,
            }),
          },
        }));

    // Add pagination query parameters to OpenAPI metadata
    const existingOpenApi = getMetadataOrDefault<{
      parameters?: Array<{ name: string; in: string }>;
    }>(OPENAPI_METADATA, target.constructor, propertyKey, {});

    const existingParams = existingOpenApi.parameters ?? [];
    const existingParamNames = new Set(existingParams.map((p) => p.name));

    // Only add pagination params that don't already exist
    const newParams = paginationParams.filter(
      (p) => !existingParamNames.has(p.name),
    );

    deepMergeMetadata(
      OPENAPI_METADATA,
      {
        parameters: [...existingParams, ...newParams],
        isPaginated: true,
        paginationOptions: { defaultPageSize, maxPageSize, useOffset },
      },
      target.constructor,
      propertyKey,
    );

    return descriptor;
  };
}

/**
 * Gets all response metadata for a method.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns Array of response metadata
 */
export function getResponseMetadata(
  target: object,
  propertyKey: string | symbol,
): ResponseMetadata[] {
  return getMetadataOrDefault<ResponseMetadata[]>(
    RESPONSE_METADATA,
    target,
    propertyKey,
    [],
  );
}

/**
 * Gets response metadata for a specific status code.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @param statusCode - The HTTP status code
 * @returns Response metadata for the status code, or undefined
 */
export function getResponseForStatusCode(
  target: object,
  propertyKey: string | symbol,
  statusCode: number,
): ResponseMetadata | undefined {
  const responses = getResponseMetadata(target, propertyKey);
  return responses.find((r) => r.statusCode === statusCode);
}

/**
 * Checks if a method has the @RawJson decorator.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns True if the method has @RawJson decorator
 */
export function isRawJsonHandler(
  target: object,
  propertyKey: string | symbol,
): boolean {
  const openApiMeta = getMetadata<{ rawJson?: boolean }>(
    OPENAPI_METADATA,
    target,
    propertyKey,
  );
  return openApiMeta?.rawJson === true;
}

/**
 * Checks if a method has the @Paginated decorator.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns True if the method has @Paginated decorator
 */
export function isPaginatedEndpoint(
  target: object,
  propertyKey: string | symbol,
): boolean {
  const openApiMeta = getMetadata<{ isPaginated?: boolean }>(
    OPENAPI_METADATA,
    target,
    propertyKey,
  );
  return openApiMeta?.isPaginated === true;
}

/**
 * Gets pagination options for a method.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns Pagination options or undefined if not paginated
 */
export function getPaginationOptions(
  target: object,
  propertyKey: string | symbol,
): PaginatedDecoratorOptions | undefined {
  const openApiMeta = getMetadata<{
    isPaginated?: boolean;
    paginationOptions?: PaginatedDecoratorOptions;
  }>(OPENAPI_METADATA, target, propertyKey);

  if (openApiMeta?.isPaginated) {
    return openApiMeta.paginationOptions;
  }
  return undefined;
}

/**
 * Merges response metadata from multiple sources (class-level, method-level).
 * Method-level responses take precedence for the same status code.
 *
 * @param classResponses - Class-level response metadata
 * @param methodResponses - Method-level response metadata
 * @returns Merged response metadata array
 */
export function mergeResponseMetadata(
  classResponses: ResponseMetadata[],
  methodResponses: ResponseMetadata[],
): ResponseMetadata[] {
  const merged = new Map<number, ResponseMetadata>();

  // Add class-level responses first
  for (const response of classResponses) {
    merged.set(response.statusCode, response);
  }

  // Method-level responses override class-level for same status code
  for (const response of methodResponses) {
    merged.set(response.statusCode, response);
  }

  return Array.from(merged.values());
}

/**
 * Gets the effective response metadata for a method, merging class and method level.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns Merged response metadata array
 */
export function getEffectiveResponseMetadata(
  target: object,
  propertyKey: string | symbol,
): ResponseMetadata[] {
  const classResponses = getMetadataOrDefault<ResponseMetadata[]>(
    RESPONSE_METADATA,
    target,
    undefined,
    [],
  );
  const methodResponses = getMetadataOrDefault<ResponseMetadata[]>(
    RESPONSE_METADATA,
    target,
    propertyKey,
    [],
  );

  return mergeResponseMetadata(classResponses, methodResponses);
}
