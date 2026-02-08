/**
 * @fileoverview Enhanced HTTP method decorators with OpenAPI support.
 * Provides @Get, @Post, @Put, @Delete, @Patch decorators with inline OpenAPI metadata.
 * @module decorators/http-methods
 */

import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import 'reflect-metadata';
import { RouteDecoratorOptions } from '../interfaces/openApi/decoratorOptions';
import { OpenAPIRouteMetadata } from '../interfaces/openApi/routeMetadata';
import { OPENAPI_METADATA, ROUTES_METADATA } from './metadata-keys';
import { deepMergeMetadata, getMetadataOrDefault } from './metadata-collector';

/**
 * Route metadata structure stored by HTTP method decorators.
 */
export interface EnhancedRouteMetadata<
  TLanguage extends CoreLanguageCode = CoreLanguageCode,
> {
  /** HTTP method */
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  /** Route path */
  path: string;
  /** Handler method name */
  handlerName: string;
  /** Route options including validation, middleware, auth, etc. */
  options: RouteDecoratorOptions<TLanguage>;
}

/**
 * Extracts path parameters from an Express-style route path.
 * @param path - Route path (e.g., '/users/:id/posts/:postId')
 * @returns Array of parameter names
 */
function extractPathParameters(path: string): string[] {
  const paramRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
  const params: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = paramRegex.exec(path)) !== null) {
    params.push(match[1]);
  }
  return params;
}

/**
 * Builds OpenAPI metadata from route decorator options.
 * Merges inline options (summary, description, tags, etc.) with explicit openapi object.
 * @param path - Route path for extracting parameters
 * @param options - Route decorator options
 * @returns Partial OpenAPI route metadata
 */
function buildOpenAPIMetadata<TLanguage extends CoreLanguageCode>(
  path: string,
  options: RouteDecoratorOptions<TLanguage>,
): Partial<OpenAPIRouteMetadata> {
  const metadata: Partial<OpenAPIRouteMetadata> = {};

  // Extract inline OpenAPI options
  if (options.summary !== undefined) {
    metadata.summary = options.summary;
  }
  if (options.description !== undefined) {
    metadata.description = options.description;
  }
  if (options.tags !== undefined) {
    metadata.tags = options.tags;
  }
  if (options.operationId !== undefined) {
    metadata.operationId = options.operationId;
  }
  if (options.deprecated !== undefined) {
    metadata.deprecated = options.deprecated;
  }

  // Auto-extract path parameters for OpenAPI
  const pathParams = extractPathParameters(path);
  if (pathParams.length > 0) {
    metadata.parameters = pathParams.map((name) => ({
      name,
      in: 'path' as const,
      required: true,
      schema: { type: 'string' as const },
    }));
  }

  // Merge with explicit openapi object (explicit takes precedence)
  if (options.openapi) {
    // Merge tags (concatenate arrays)
    if (options.openapi.tags) {
      metadata.tags = [...(metadata.tags ?? []), ...options.openapi.tags];
    }
    // Merge parameters (concatenate, explicit params can override auto-extracted)
    if (options.openapi.parameters) {
      const existingParams = metadata.parameters ?? [];
      const explicitParams = options.openapi.parameters;
      // Remove auto-extracted params that are overridden by explicit params
      const explicitParamNames = new Set(explicitParams.map((p) => p.name));
      const filteredExisting = existingParams.filter(
        (p) => !explicitParamNames.has(p.name),
      );
      metadata.parameters = [...filteredExisting, ...explicitParams];
    }
    // Override scalar values
    if (options.openapi.summary !== undefined) {
      metadata.summary = options.openapi.summary;
    }
    if (options.openapi.description !== undefined) {
      metadata.description = options.openapi.description;
    }
    if (options.openapi.operationId !== undefined) {
      metadata.operationId = options.openapi.operationId;
    }
    if (options.openapi.deprecated !== undefined) {
      metadata.deprecated = options.openapi.deprecated;
    }
    if (options.openapi.requestBody !== undefined) {
      metadata.requestBody = options.openapi.requestBody;
    }
    if (options.openapi.responses !== undefined) {
      metadata.responses = options.openapi.responses;
    }
  }

  return metadata;
}

/**
 * Creates an HTTP method decorator with OpenAPI support.
 * @param method - HTTP method (get, post, put, delete, patch)
 * @param path - Route path
 * @param options - Route decorator options
 * @returns Method decorator function
 */
function createHttpMethodDecorator<
  TLanguage extends CoreLanguageCode = CoreLanguageCode,
>(
  method: 'get' | 'post' | 'put' | 'delete' | 'patch',
  path: string,
  options: RouteDecoratorOptions<TLanguage> = {},
): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const constructor = target.constructor;
    const handlerName = String(propertyKey);

    // Get existing routes or initialize empty array
    const existingRoutes = getMetadataOrDefault<EnhancedRouteMetadata[]>(
      ROUTES_METADATA,
      constructor,
      undefined,
      [],
    );

    // Create route metadata
    const route: EnhancedRouteMetadata<TLanguage> = {
      method,
      path,
      handlerName,
      options,
    };

    // Add to routes array
    existingRoutes.push(route as EnhancedRouteMetadata<CoreLanguageCode>);
    Reflect.defineMetadata(ROUTES_METADATA, existingRoutes, constructor);

    // Build and store OpenAPI metadata for this method
    const openApiMetadata = buildOpenAPIMetadata(path, options);
    if (Object.keys(openApiMetadata).length > 0) {
      // Deep merge with any existing OpenAPI metadata on this method
      // (from other decorators like @ApiSummary, @ApiTags, etc.)
      deepMergeMetadata(
        OPENAPI_METADATA,
        openApiMetadata,
        constructor,
        propertyKey,
      );
    }

    return descriptor;
  };
}

/**
 * GET method decorator with OpenAPI support.
 * Registers a GET route handler with optional OpenAPI metadata.
 *
 * @param path - Route path (e.g., '/users/:id')
 * @param options - Route options including validation, auth, and OpenAPI metadata
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @ApiController('/api/users')
 * class UserController {
 *   @Get('/:id', {
 *     summary: 'Get user by ID',
 *     tags: ['Users'],
 *     auth: true,
 *   })
 *   async getUser(@Param('id') id: string) {
 *     return this.userService.findById(id);
 *   }
 * }
 * ```
 */
export function Get<TLanguage extends CoreLanguageCode = CoreLanguageCode>(
  path: string,
  options: RouteDecoratorOptions<TLanguage> = {},
): MethodDecorator {
  return createHttpMethodDecorator('get', path, options);
}

/**
 * POST method decorator with OpenAPI support.
 * Registers a POST route handler with optional OpenAPI metadata.
 *
 * @param path - Route path (e.g., '/users')
 * @param options - Route options including validation, auth, and OpenAPI metadata
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @ApiController('/api/users')
 * class UserController {
 *   @Post('/', {
 *     summary: 'Create a new user',
 *     tags: ['Users'],
 *     schema: createUserSchema,
 *   })
 *   async createUser(@Body() data: CreateUserDto) {
 *     return this.userService.create(data);
 *   }
 * }
 * ```
 */
export function Post<TLanguage extends CoreLanguageCode = CoreLanguageCode>(
  path: string,
  options: RouteDecoratorOptions<TLanguage> = {},
): MethodDecorator {
  return createHttpMethodDecorator('post', path, options);
}

/**
 * PUT method decorator with OpenAPI support.
 * Registers a PUT route handler with optional OpenAPI metadata.
 *
 * @param path - Route path (e.g., '/users/:id')
 * @param options - Route options including validation, auth, and OpenAPI metadata
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @ApiController('/api/users')
 * class UserController {
 *   @Put('/:id', {
 *     summary: 'Update user',
 *     tags: ['Users'],
 *     auth: true,
 *   })
 *   async updateUser(@Param('id') id: string, @Body() data: UpdateUserDto) {
 *     return this.userService.update(id, data);
 *   }
 * }
 * ```
 */
export function Put<TLanguage extends CoreLanguageCode = CoreLanguageCode>(
  path: string,
  options: RouteDecoratorOptions<TLanguage> = {},
): MethodDecorator {
  return createHttpMethodDecorator('put', path, options);
}

/**
 * DELETE method decorator with OpenAPI support.
 * Registers a DELETE route handler with optional OpenAPI metadata.
 *
 * @param path - Route path (e.g., '/users/:id')
 * @param options - Route options including validation, auth, and OpenAPI metadata
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @ApiController('/api/users')
 * class UserController {
 *   @Delete('/:id', {
 *     summary: 'Delete user',
 *     tags: ['Users'],
 *     auth: true,
 *   })
 *   async deleteUser(@Param('id') id: string) {
 *     return this.userService.delete(id);
 *   }
 * }
 * ```
 */
export function Delete<TLanguage extends CoreLanguageCode = CoreLanguageCode>(
  path: string,
  options: RouteDecoratorOptions<TLanguage> = {},
): MethodDecorator {
  return createHttpMethodDecorator('delete', path, options);
}

/**
 * PATCH method decorator with OpenAPI support.
 * Registers a PATCH route handler with optional OpenAPI metadata.
 *
 * @param path - Route path (e.g., '/users/:id')
 * @param options - Route options including validation, auth, and OpenAPI metadata
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @ApiController('/api/users')
 * class UserController {
 *   @Patch('/:id', {
 *     summary: 'Partially update user',
 *     tags: ['Users'],
 *     auth: true,
 *   })
 *   async patchUser(@Param('id') id: string, @Body() data: PatchUserDto) {
 *     return this.userService.patch(id, data);
 *   }
 * }
 * ```
 */
export function Patch<TLanguage extends CoreLanguageCode = CoreLanguageCode>(
  path: string,
  options: RouteDecoratorOptions<TLanguage> = {},
): MethodDecorator {
  return createHttpMethodDecorator('patch', path, options);
}

// Re-export types for convenience
export type { RouteDecoratorOptions } from '../interfaces/openApi/decoratorOptions';
