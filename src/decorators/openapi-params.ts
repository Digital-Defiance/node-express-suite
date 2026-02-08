/**
 * @fileoverview OpenAPI parameter decorators for Express Suite.
 * Provides @ApiParam, @ApiQuery, @ApiHeader, and @ApiRequestBody decorators
 * for documenting API parameters with full OpenAPI metadata.
 * These decorators merge with auto-extracted parameters from @Param, @Query, @Header.
 * @module decorators/openapi-params
 */

import 'reflect-metadata';
import { z } from 'zod';
import {
  ApiParamDecoratorOptions,
  ApiRequestBodyDecoratorOptions,
} from '../interfaces/openApi/decoratorOptions';
import {
  OpenAPIParameter,
  OpenAPIParameterLocation,
} from '../interfaces/openApi/parameter';
import { OpenAPIParameterSchema } from '../interfaces/openApi/parameterSchema';
import { OpenAPIRequestBody } from '../interfaces/openApi/requestBody';
import {
  OPENAPI_PARAMS_METADATA,
  OPENAPI_REQUEST_BODY_METADATA,
} from './metadata-keys';
import { getMetadataOrDefault, setMetadata } from './metadata-collector';

/**
 * Internal interface for stored request body metadata.
 */
export interface RequestBodyMetadata {
  schema: string | z.ZodSchema;
  description?: string;
  required?: boolean;
  example?: unknown;
  contentType?: string;
}

/**
 * Extended OpenAPI parameter schema that supports $ref for schema references.
 * This extends the base schema to allow referencing component schemas.
 */
export interface ExtendedOpenAPIParameterSchema extends OpenAPIParameterSchema {
  $ref?: string;
  example?: unknown;
}

/**
 * Extended OpenAPI parameter that supports deprecated field.
 */
export interface ExtendedOpenAPIParameter extends Omit<
  OpenAPIParameter,
  'schema'
> {
  schema: ExtendedOpenAPIParameterSchema;
  deprecated?: boolean;
}

/**
 * Converts ApiParamDecoratorOptions to ExtendedOpenAPIParameterSchema.
 * Handles both string references and inline schemas.
 * @param options - The decorator options
 * @returns OpenAPI parameter schema
 */
function optionsToSchema(
  options: ApiParamDecoratorOptions,
): ExtendedOpenAPIParameterSchema {
  if (options.schema) {
    if (typeof options.schema === 'string') {
      // Schema reference - create a schema with $ref
      return { type: 'string', $ref: `#/components/schemas/${options.schema}` };
    }
    // Inline schema - return as-is with extended type
    return options.schema as ExtendedOpenAPIParameterSchema;
  }

  // Build schema from options
  const schema: ExtendedOpenAPIParameterSchema = { type: 'string' };

  if (options.enum) {
    schema.enum = options.enum;
  }

  return schema;
}

/**
 * Creates an OpenAPI parameter from decorator options.
 * @param name - Parameter name
 * @param location - Parameter location (path, query, header)
 * @param options - Decorator options
 * @returns OpenAPI parameter definition
 */
function createOpenAPIParameter(
  name: string,
  location: OpenAPIParameterLocation,
  options: ApiParamDecoratorOptions,
): ExtendedOpenAPIParameter {
  const schema = optionsToSchema(options);

  // Add example to schema if provided
  if (options.example !== undefined) {
    schema.example = options.example;
  }

  const param: ExtendedOpenAPIParameter = {
    name,
    in: location,
    schema,
  };

  // Path parameters are always required
  if (location === 'path') {
    param.required = true;
  } else if (options.required !== undefined) {
    param.required = options.required;
  }

  if (options.description) {
    param.description = options.description;
  }

  if (options.deprecated) {
    param.deprecated = options.deprecated;
  }

  return param;
}

/**
 * Merges a new parameter with existing parameters.
 * If a parameter with the same name and location exists, it's updated.
 * Otherwise, the new parameter is added.
 * @param existing - Existing parameters array
 * @param newParam - New parameter to merge
 * @returns Updated parameters array
 */
function mergeParameter(
  existing: ExtendedOpenAPIParameter[],
  newParam: ExtendedOpenAPIParameter,
): ExtendedOpenAPIParameter[] {
  const result = [...existing];
  const existingIndex = result.findIndex(
    (p) => p.name === newParam.name && p.in === newParam.in,
  );

  if (existingIndex >= 0) {
    // Merge with existing parameter - new values override
    result[existingIndex] = {
      ...result[existingIndex],
      ...newParam,
      schema: {
        ...result[existingIndex].schema,
        ...newParam.schema,
      },
    };
  } else {
    result.push(newParam);
  }

  return result;
}

/**
 * Decorator that documents a path parameter with full OpenAPI metadata.
 * Merges with auto-extracted parameters from @Param decorator.
 *
 * @param name - Name of the path parameter
 * @param options - OpenAPI parameter options
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * class UserController {
 *   @ApiParam('id', {
 *     description: 'User ID',
 *     schema: { type: 'string', format: 'uuid' },
 *     example: '123e4567-e89b-12d3-a456-426614174000'
 *   })
 *   @Get('/:id')
 *   getUser(@Param('id') id: string) {}
 * }
 * ```
 */
export function ApiParam(
  name: string,
  options: ApiParamDecoratorOptions = {},
): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const existingParams = getMetadataOrDefault<ExtendedOpenAPIParameter[]>(
      OPENAPI_PARAMS_METADATA,
      target.constructor,
      propertyKey,
      [],
    );

    const newParam = createOpenAPIParameter(name, 'path', options);
    const mergedParams = mergeParameter(existingParams, newParam);

    setMetadata(
      OPENAPI_PARAMS_METADATA,
      mergedParams,
      target.constructor,
      propertyKey,
    );

    return descriptor;
  };
}

/**
 * Decorator that documents a query parameter with full OpenAPI metadata.
 * Merges with auto-extracted parameters from @Query decorator.
 *
 * @param name - Name of the query parameter
 * @param options - OpenAPI parameter options
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * class UserController {
 *   @ApiQuery('page', {
 *     description: 'Page number',
 *     schema: { type: 'integer', minimum: 1 },
 *     required: false,
 *     example: 1
 *   })
 *   @ApiQuery('limit', {
 *     description: 'Items per page',
 *     schema: { type: 'integer', minimum: 1, maximum: 100 },
 *     required: false
 *   })
 *   @Get('/')
 *   listUsers(@Query('page') page: number, @Query('limit') limit: number) {}
 * }
 * ```
 */
export function ApiQuery(
  name: string,
  options: ApiParamDecoratorOptions = {},
): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const existingParams = getMetadataOrDefault<ExtendedOpenAPIParameter[]>(
      OPENAPI_PARAMS_METADATA,
      target.constructor,
      propertyKey,
      [],
    );

    const newParam = createOpenAPIParameter(name, 'query', options);
    const mergedParams = mergeParameter(existingParams, newParam);

    setMetadata(
      OPENAPI_PARAMS_METADATA,
      mergedParams,
      target.constructor,
      propertyKey,
    );

    return descriptor;
  };
}

/**
 * Decorator that documents a header parameter with full OpenAPI metadata.
 * Merges with auto-extracted parameters from @Header decorator.
 *
 * @param name - Name of the header
 * @param options - OpenAPI parameter options
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * class DataController {
 *   @ApiHeader('X-Request-ID', {
 *     description: 'Unique request identifier for tracing',
 *     schema: { type: 'string', format: 'uuid' },
 *     required: true
 *   })
 *   @ApiHeader('Accept-Language', {
 *     description: 'Preferred language',
 *     schema: { type: 'string' },
 *     enum: ['en', 'es', 'fr'],
 *     required: false
 *   })
 *   @Get('/')
 *   getData(@Header('X-Request-ID') requestId: string) {}
 * }
 * ```
 */
export function ApiHeader(
  name: string,
  options: ApiParamDecoratorOptions = {},
): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const existingParams = getMetadataOrDefault<ExtendedOpenAPIParameter[]>(
      OPENAPI_PARAMS_METADATA,
      target.constructor,
      propertyKey,
      [],
    );

    const newParam = createOpenAPIParameter(name, 'header', options);
    const mergedParams = mergeParameter(existingParams, newParam);

    setMetadata(
      OPENAPI_PARAMS_METADATA,
      mergedParams,
      target.constructor,
      propertyKey,
    );

    return descriptor;
  };
}

/**
 * Decorator that documents the request body with full OpenAPI metadata.
 * Supports both schema references and Zod schemas.
 *
 * @param options - Request body options including schema, description, required, example
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * // With schema reference
 * class UserController {
 *   @ApiRequestBody({
 *     schema: 'CreateUserDto',
 *     description: 'User data to create',
 *     required: true,
 *     example: { name: 'John Doe', email: 'john@example.com' }
 *   })
 *   @Post('/')
 *   createUser(@Body() data: CreateUserDto) {}
 * }
 *
 * // With Zod schema
 * const CreateUserSchema = z.object({
 *   name: z.string(),
 *   email: z.string().email()
 * });
 *
 * class UserController {
 *   @ApiRequestBody({
 *     schema: CreateUserSchema,
 *     description: 'User data to create',
 *     required: true
 *   })
 *   @Post('/')
 *   createUser(@Body() data: z.infer<typeof CreateUserSchema>) {}
 * }
 * ```
 */
export function ApiRequestBody(
  options: ApiRequestBodyDecoratorOptions,
): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const metadata: RequestBodyMetadata = {
      schema: options.schema,
      description: options.description,
      required: options.required ?? true,
      example: options.example,
      contentType: options.contentType ?? 'application/json',
    };

    setMetadata(
      OPENAPI_REQUEST_BODY_METADATA,
      metadata,
      target.constructor,
      propertyKey,
    );

    return descriptor;
  };
}

/**
 * Gets all OpenAPI parameter definitions for a method.
 * Returns parameters from both @ApiParam/@ApiQuery/@ApiHeader decorators
 * and auto-extracted parameters from @Param/@Query/@Header decorators.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns Array of OpenAPI parameter definitions
 */
export function getOpenAPIParams(
  target: object,
  propertyKey: string | symbol,
): ExtendedOpenAPIParameter[] {
  return getMetadataOrDefault<ExtendedOpenAPIParameter[]>(
    OPENAPI_PARAMS_METADATA,
    target,
    propertyKey,
    [],
  );
}

/**
 * Gets the request body metadata for a method.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns Request body metadata or undefined
 */
export function getRequestBodyMetadata(
  target: object,
  propertyKey: string | symbol,
): RequestBodyMetadata | undefined {
  return getMetadataOrDefault<RequestBodyMetadata | undefined>(
    OPENAPI_REQUEST_BODY_METADATA,
    target,
    propertyKey,
    undefined,
  );
}

/**
 * Converts request body metadata to OpenAPI request body definition.
 * Handles both schema references and Zod schemas.
 *
 * @param metadata - Request body metadata
 * @returns OpenAPI request body definition
 */
export function requestBodyMetadataToOpenAPI(
  metadata: RequestBodyMetadata,
): OpenAPIRequestBody {
  let schemaName: string;

  if (typeof metadata.schema === 'string') {
    // Schema reference - use directly
    schemaName = metadata.schema;
  } else if (metadata.schema instanceof z.ZodType) {
    // Zod schema - we need to generate a schema name
    // The actual schema conversion should be handled by the OpenAPI builder
    // For now, we use a placeholder that indicates it's a Zod schema
    schemaName = 'ZodSchema';
  } else {
    // Fallback
    schemaName = 'Object';
  }

  const requestBody: OpenAPIRequestBody = {
    schema: schemaName,
  };

  if (metadata.description) {
    requestBody.description = metadata.description;
  }

  if (metadata.required !== undefined) {
    requestBody.required = metadata.required;
  }

  if (metadata.example !== undefined) {
    requestBody.example = metadata.example;
  }

  return requestBody;
}

/**
 * Merges OpenAPI parameters from multiple sources.
 * Parameters from explicit @ApiParam/@ApiQuery/@ApiHeader decorators
 * take precedence over auto-extracted parameters.
 *
 * @param autoExtracted - Parameters auto-extracted from @Param/@Query/@Header
 * @param explicit - Parameters from @ApiParam/@ApiQuery/@ApiHeader
 * @returns Merged parameters array
 */
export function mergeOpenAPIParameters(
  autoExtracted: ExtendedOpenAPIParameter[],
  explicit: ExtendedOpenAPIParameter[],
): ExtendedOpenAPIParameter[] {
  let result = [...autoExtracted];

  for (const param of explicit) {
    result = mergeParameter(result, param);
  }

  return result;
}
