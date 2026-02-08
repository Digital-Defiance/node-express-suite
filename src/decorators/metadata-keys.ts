/**
 * @fileoverview Metadata keys for decorator system.
 * Provides unique Symbol constants for storing decorator metadata.
 * @module decorators/metadata-keys
 */

/**
 * Metadata key for controller-level configuration.
 * Stores base path and controller options.
 */
export const CONTROLLER_METADATA = Symbol('controller');

/**
 * Metadata key for route definitions array.
 * Stores array of RouteMetadata objects for each decorated method.
 */
export const ROUTES_METADATA = Symbol('routes');

/**
 * Metadata key for OpenAPI-specific metadata per method.
 * Stores OpenAPIRouteMetadata for individual route operations.
 */
export const OPENAPI_METADATA = Symbol('openapi');

/**
 * Metadata key for controller-level OpenAPI metadata.
 * Stores tags, description, and other controller-wide OpenAPI settings.
 */
export const OPENAPI_CONTROLLER_METADATA = Symbol('openapi:controller');

/**
 * Metadata key for authentication settings per method.
 * Stores auth requirements (JWT, crypto auth, public).
 */
export const AUTH_METADATA = Symbol('auth');

/**
 * Metadata key for validation schemas per method.
 * Stores Zod schemas or express-validator chains.
 */
export const VALIDATION_METADATA = Symbol('validation');

/**
 * Metadata key for middleware array per method.
 * Stores Express middleware functions to be applied to routes.
 */
export const MIDDLEWARE_METADATA = Symbol('middleware');

/**
 * Metadata key for parameter injection metadata per method.
 * Stores parameter decorators info (@Param, @Body, @Query, etc.).
 */
export const PARAMS_METADATA = Symbol('params');

/**
 * Metadata key for lifecycle hooks per method.
 * Stores @OnSuccess, @OnError, @Before, @After callbacks.
 */
export const LIFECYCLE_METADATA = Symbol('lifecycle');

/**
 * Metadata key for response definitions per method.
 * Stores @Returns and @ApiResponse decorator data.
 */
export const RESPONSE_METADATA = Symbol('response');

/**
 * Metadata key for schema registration metadata.
 * Stores @ApiSchema and @ApiProperty decorator data.
 */
export const SCHEMA_METADATA = Symbol('schema');

/**
 * Metadata key for handler arguments.
 * Stores additional arguments to pass to handler methods.
 */
export const HANDLER_ARGS_METADATA = Symbol('handlerArgs');

/**
 * Metadata key for transaction settings per method.
 * Stores @Transactional decorator options.
 */
export const TRANSACTION_METADATA = Symbol('transaction');

/**
 * Metadata key for rate limiting settings per method.
 * Stores @RateLimit decorator options.
 */
export const RATE_LIMIT_METADATA = Symbol('rateLimit');

/**
 * Metadata key for cache settings per method.
 * Stores @CacheResponse decorator options.
 */
export const CACHE_METADATA = Symbol('cache');

/**
 * Metadata key for OpenAPI parameter definitions.
 * Stores @ApiParam, @ApiQuery, @ApiHeader decorator data.
 */
export const OPENAPI_PARAMS_METADATA = Symbol('openapi:params');

/**
 * Metadata key for OpenAPI request body definition.
 * Stores @ApiRequestBody decorator data.
 */
export const OPENAPI_REQUEST_BODY_METADATA = Symbol('openapi:requestBody');

/**
 * All metadata keys exported as a collection for iteration/validation.
 */
export const ALL_METADATA_KEYS = {
  CONTROLLER_METADATA,
  ROUTES_METADATA,
  OPENAPI_METADATA,
  OPENAPI_CONTROLLER_METADATA,
  AUTH_METADATA,
  VALIDATION_METADATA,
  MIDDLEWARE_METADATA,
  PARAMS_METADATA,
  LIFECYCLE_METADATA,
  RESPONSE_METADATA,
  SCHEMA_METADATA,
  HANDLER_ARGS_METADATA,
  TRANSACTION_METADATA,
  RATE_LIMIT_METADATA,
  CACHE_METADATA,
  OPENAPI_PARAMS_METADATA,
  OPENAPI_REQUEST_BODY_METADATA,
} as const;

/**
 * Type representing all metadata key names.
 */
export type MetadataKeyName = keyof typeof ALL_METADATA_KEYS;

/**
 * Type representing all metadata key symbols.
 */
export type MetadataKey = (typeof ALL_METADATA_KEYS)[MetadataKeyName];
