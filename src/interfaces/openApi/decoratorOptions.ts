/**
 * @fileoverview Decorator options interfaces for the Express Suite decorator API.
 * Provides TypeScript interfaces for all decorator configuration options.
 * @module interfaces/openApi/decoratorOptions
 */

import { RequestHandler } from 'express';
import { ValidationChain } from 'express-validator';
import { z } from 'zod';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { IConstants } from '../constants';
import {
  OpenAPIParameter,
  OpenAPIParameterLocation,
  OpenAPIParameterSchema,
} from './parameter';
import { OpenAPIRequestBody } from './requestBody';
import { OpenAPIResponseDef } from './responseDef';
import { OpenAPIRouteMetadata } from './routeMetadata';

/**
 * Options for the @ApiController decorator.
 * Configures controller-level OpenAPI metadata and registration.
 */
export interface ApiControllerOptions {
  /**
   * Tags to apply to all routes in this controller.
   * Can be overridden at the method level.
   */
  tags?: string[];

  /**
   * Description of the controller for OpenAPI documentation.
   */
  description?: string;

  /**
   * Whether all routes in this controller are deprecated.
   * Can be overridden at the method level.
   */
  deprecated?: boolean;

  /**
   * Custom name for the controller.
   * Defaults to the class name if not specified.
   */
  name?: string;
}

/**
 * Type guard to check if an object is a valid ApiControllerOptions.
 * @param obj - Object to validate
 * @returns True if object matches ApiControllerOptions interface
 */
export function isApiControllerOptions(
  obj: unknown,
): obj is ApiControllerOptions {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const options = obj as Record<string, unknown>;

  if (options.tags !== undefined) {
    if (
      !Array.isArray(options.tags) ||
      !options.tags.every((t) => typeof t === 'string')
    ) {
      return false;
    }
  }
  if (
    options.description !== undefined &&
    typeof options.description !== 'string'
  ) {
    return false;
  }
  if (
    options.deprecated !== undefined &&
    typeof options.deprecated !== 'boolean'
  ) {
    return false;
  }
  if (options.name !== undefined && typeof options.name !== 'string') {
    return false;
  }
  return true;
}

/**
 * Validation context with constants - all properties are guaranteed to exist at runtime.
 * The constants object is injected by the base controller during route initialization.
 */
export type ValidationContext<TConstants extends IConstants = IConstants> = {
  constants: TConstants;
};

/**
 * Extended route options with OpenAPI support.
 * Used by HTTP method decorators (@Get, @Post, @Put, @Delete, @Patch).
 */
export interface RouteDecoratorOptions<
  TLanguage extends CoreLanguageCode = CoreLanguageCode,
  TConstants extends IConstants = IConstants,
> {
  /**
   * Validation chains or language-aware validation function.
   */
  validation?:
    | ValidationChain[]
    | ((
        this: ValidationContext<TConstants>,
        lang: TLanguage,
      ) => ValidationChain[]);

  /**
   * Zod schema for request body validation.
   */
  schema?: z.ZodSchema;

  /**
   * Express middleware to apply to this route.
   */
  middleware?: RequestHandler[];

  /**
   * Whether JWT authentication is required.
   */
  auth?: boolean;

  /**
   * Whether ECIES crypto authentication is required.
   */
  cryptoAuth?: boolean;

  /**
   * Whether to bypass the standard response wrapper.
   */
  rawJson?: boolean;

  /**
   * Whether to wrap the handler in a MongoDB transaction.
   */
  transaction?: boolean;

  /**
   * Transaction timeout in milliseconds.
   */
  transactionTimeout?: number;

  /**
   * OpenAPI metadata for this route.
   */
  openapi?: Partial<OpenAPIRouteMetadata>;

  /**
   * Short summary of the operation (OpenAPI).
   */
  summary?: string;

  /**
   * Detailed description of the operation (OpenAPI).
   */
  description?: string;

  /**
   * Tags for grouping operations (OpenAPI).
   */
  tags?: string[];

  /**
   * Unique identifier for the operation (OpenAPI).
   */
  operationId?: string;

  /**
   * Whether the operation is deprecated (OpenAPI).
   */
  deprecated?: boolean;
}

/**
 * Type guard to check if an object is a valid RouteDecoratorOptions.
 * @param obj - Object to validate
 * @returns True if object matches RouteDecoratorOptions interface
 */
export function isRouteDecoratorOptions(
  obj: unknown,
): obj is RouteDecoratorOptions {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const options = obj as Record<string, unknown>;

  if (options.middleware !== undefined && !Array.isArray(options.middleware)) {
    return false;
  }
  if (options.auth !== undefined && typeof options.auth !== 'boolean') {
    return false;
  }
  if (
    options.cryptoAuth !== undefined &&
    typeof options.cryptoAuth !== 'boolean'
  ) {
    return false;
  }
  if (options.rawJson !== undefined && typeof options.rawJson !== 'boolean') {
    return false;
  }
  if (
    options.transaction !== undefined &&
    typeof options.transaction !== 'boolean'
  ) {
    return false;
  }
  if (
    options.transactionTimeout !== undefined &&
    typeof options.transactionTimeout !== 'number'
  ) {
    return false;
  }
  if (options.summary !== undefined && typeof options.summary !== 'string') {
    return false;
  }
  if (
    options.description !== undefined &&
    typeof options.description !== 'string'
  ) {
    return false;
  }
  if (options.tags !== undefined) {
    if (
      !Array.isArray(options.tags) ||
      !options.tags.every((t) => typeof t === 'string')
    ) {
      return false;
    }
  }
  if (
    options.operationId !== undefined &&
    typeof options.operationId !== 'string'
  ) {
    return false;
  }
  if (
    options.deprecated !== undefined &&
    typeof options.deprecated !== 'boolean'
  ) {
    return false;
  }
  return true;
}

/**
 * Options for authentication decorators.
 */
export interface AuthDecoratorOptions {
  /**
   * Custom status code for authentication failures.
   * Defaults to 401.
   */
  failureStatusCode?: number;
}

/**
 * Type guard to check if an object is a valid AuthDecoratorOptions.
 * @param obj - Object to validate
 * @returns True if object matches AuthDecoratorOptions interface
 */
export function isAuthDecoratorOptions(
  obj: unknown,
): obj is AuthDecoratorOptions {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const options = obj as Record<string, unknown>;

  if (
    options.failureStatusCode !== undefined &&
    typeof options.failureStatusCode !== 'number'
  ) {
    return false;
  }
  return true;
}

/**
 * Options for parameter injection decorators (@Param, @Query, @Header).
 */
export interface ParamDecoratorOptions {
  /**
   * Description of the parameter for OpenAPI documentation.
   */
  description?: string;

  /**
   * Example value for OpenAPI documentation.
   */
  example?: unknown;

  /**
   * Whether the parameter is required.
   * Path parameters are always required.
   */
  required?: boolean;

  /**
   * OpenAPI schema for the parameter.
   */
  schema?: OpenAPIParameterSchema;

  /**
   * Whether the parameter is deprecated.
   */
  deprecated?: boolean;
}

/**
 * Type guard to check if an object is a valid ParamDecoratorOptions.
 * @param obj - Object to validate
 * @returns True if object matches ParamDecoratorOptions interface
 */
export function isParamDecoratorOptions(
  obj: unknown,
): obj is ParamDecoratorOptions {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const options = obj as Record<string, unknown>;

  if (
    options.description !== undefined &&
    typeof options.description !== 'string'
  ) {
    return false;
  }
  if (options.required !== undefined && typeof options.required !== 'boolean') {
    return false;
  }
  if (
    options.deprecated !== undefined &&
    typeof options.deprecated !== 'boolean'
  ) {
    return false;
  }
  // schema and example can be complex types, basic validation only
  return true;
}

/**
 * Metadata stored for each injected parameter.
 */
export interface ParamMetadata {
  /**
   * Index of the parameter in the method signature.
   */
  index: number;

  /**
   * Type of parameter injection.
   */
  type:
    | 'param'
    | 'body'
    | 'query'
    | 'header'
    | 'user'
    | 'eciesUser'
    | 'req'
    | 'res'
    | 'next';

  /**
   * Name of the parameter to extract (for param, query, header, body field).
   */
  name?: string;

  /**
   * Options for the parameter.
   */
  options?: ParamDecoratorOptions;
}

/**
 * Type guard to check if an object is a valid ParamMetadata.
 * @param obj - Object to validate
 * @returns True if object matches ParamMetadata interface
 */
export function isParamMetadata(obj: unknown): obj is ParamMetadata {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const metadata = obj as Record<string, unknown>;

  if (typeof metadata.index !== 'number') {
    return false;
  }
  const validTypes = [
    'param',
    'body',
    'query',
    'header',
    'user',
    'eciesUser',
    'req',
    'res',
    'next',
  ];
  if (
    typeof metadata.type !== 'string' ||
    !validTypes.includes(metadata.type)
  ) {
    return false;
  }
  if (metadata.name !== undefined && typeof metadata.name !== 'string') {
    return false;
  }
  if (
    metadata.options !== undefined &&
    !isParamDecoratorOptions(metadata.options)
  ) {
    return false;
  }
  return true;
}

/**
 * Options for the @Returns decorator.
 */
export interface ReturnsDecoratorOptions {
  /**
   * Description of the response.
   */
  description?: string;

  /**
   * Example response value.
   */
  example?: unknown;
}

/**
 * Type guard to check if an object is a valid ReturnsDecoratorOptions.
 * @param obj - Object to validate
 * @returns True if object matches ReturnsDecoratorOptions interface
 */
export function isReturnsDecoratorOptions(
  obj: unknown,
): obj is ReturnsDecoratorOptions {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const options = obj as Record<string, unknown>;

  if (
    options.description !== undefined &&
    typeof options.description !== 'string'
  ) {
    return false;
  }
  // example can be any type
  return true;
}

/**
 * Metadata stored for response definitions.
 */
export interface ResponseMetadata {
  /**
   * HTTP status code for this response.
   */
  statusCode: number;

  /**
   * Schema reference name or inline schema.
   */
  schema?: string;

  /**
   * Description of the response.
   */
  description?: string;

  /**
   * Example response value.
   */
  example?: unknown;
}

/**
 * Type guard to check if an object is a valid ResponseMetadata.
 * @param obj - Object to validate
 * @returns True if object matches ResponseMetadata interface
 */
export function isResponseMetadata(obj: unknown): obj is ResponseMetadata {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const metadata = obj as Record<string, unknown>;

  if (typeof metadata.statusCode !== 'number') {
    return false;
  }
  if (metadata.schema !== undefined && typeof metadata.schema !== 'string') {
    return false;
  }
  if (
    metadata.description !== undefined &&
    typeof metadata.description !== 'string'
  ) {
    return false;
  }
  return true;
}

/**
 * Options for the @Paginated decorator.
 */
export interface PaginatedDecoratorOptions {
  /**
   * Default page size.
   */
  defaultPageSize?: number;

  /**
   * Maximum allowed page size.
   */
  maxPageSize?: number;

  /**
   * Whether to use offset-based pagination instead of page-based.
   */
  useOffset?: boolean;
}

/**
 * Type guard to check if an object is a valid PaginatedDecoratorOptions.
 * @param obj - Object to validate
 * @returns True if object matches PaginatedDecoratorOptions interface
 */
export function isPaginatedDecoratorOptions(
  obj: unknown,
): obj is PaginatedDecoratorOptions {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const options = obj as Record<string, unknown>;

  if (
    options.defaultPageSize !== undefined &&
    typeof options.defaultPageSize !== 'number'
  ) {
    return false;
  }
  if (
    options.maxPageSize !== undefined &&
    typeof options.maxPageSize !== 'number'
  ) {
    return false;
  }
  if (
    options.useOffset !== undefined &&
    typeof options.useOffset !== 'boolean'
  ) {
    return false;
  }
  return true;
}

/**
 * Options for the @CacheResponse decorator.
 */
export interface CacheDecoratorOptions {
  /**
   * Time-to-live in seconds.
   */
  ttl: number;

  /**
   * Cache key prefix.
   */
  keyPrefix?: string;

  /**
   * Whether to vary cache by user.
   */
  varyByUser?: boolean;

  /**
   * Query parameters to include in cache key.
   */
  varyByQuery?: string[];
}

/**
 * Type guard to check if an object is a valid CacheDecoratorOptions.
 * @param obj - Object to validate
 * @returns True if object matches CacheDecoratorOptions interface
 */
export function isCacheDecoratorOptions(
  obj: unknown,
): obj is CacheDecoratorOptions {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const options = obj as Record<string, unknown>;

  if (typeof options.ttl !== 'number') {
    return false;
  }
  if (
    options.keyPrefix !== undefined &&
    typeof options.keyPrefix !== 'string'
  ) {
    return false;
  }
  if (
    options.varyByUser !== undefined &&
    typeof options.varyByUser !== 'boolean'
  ) {
    return false;
  }
  if (options.varyByQuery !== undefined) {
    if (
      !Array.isArray(options.varyByQuery) ||
      !options.varyByQuery.every((q) => typeof q === 'string')
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Options for the @RateLimit decorator.
 */
export interface RateLimitDecoratorOptions {
  /**
   * Maximum number of requests allowed in the window.
   */
  requests: number;

  /**
   * Time window in seconds.
   */
  window: number;

  /**
   * Custom message for rate limit exceeded response.
   */
  message?: string;

  /**
   * Whether to vary rate limit by user.
   */
  byUser?: boolean;

  /**
   * Custom key generator function.
   */
  keyGenerator?: (req: Request) => string;
}

/**
 * Type guard to check if an object is a valid RateLimitDecoratorOptions.
 * @param obj - Object to validate
 * @returns True if object matches RateLimitDecoratorOptions interface
 */
export function isRateLimitDecoratorOptions(
  obj: unknown,
): obj is RateLimitDecoratorOptions {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const options = obj as Record<string, unknown>;

  if (typeof options.requests !== 'number') {
    return false;
  }
  if (typeof options.window !== 'number') {
    return false;
  }
  if (options.message !== undefined && typeof options.message !== 'string') {
    return false;
  }
  if (options.byUser !== undefined && typeof options.byUser !== 'boolean') {
    return false;
  }
  if (
    options.keyGenerator !== undefined &&
    typeof options.keyGenerator !== 'function'
  ) {
    return false;
  }
  return true;
}

/**
 * Options for the @Transactional decorator.
 */
export interface TransactionalDecoratorOptions {
  /**
   * Transaction timeout in milliseconds.
   */
  timeout?: number;
}

/**
 * Type guard to check if an object is a valid TransactionalDecoratorOptions.
 * @param obj - Object to validate
 * @returns True if object matches TransactionalDecoratorOptions interface
 */
export function isTransactionalDecoratorOptions(
  obj: unknown,
): obj is TransactionalDecoratorOptions {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const options = obj as Record<string, unknown>;

  if (options.timeout !== undefined && typeof options.timeout !== 'number') {
    return false;
  }
  return true;
}

/**
 * Options for OpenAPI parameter decorators (@ApiParam, @ApiQuery, @ApiHeader).
 */
export interface ApiParamDecoratorOptions {
  /**
   * OpenAPI schema for the parameter.
   */
  schema?: OpenAPIParameterSchema | string;

  /**
   * Description of the parameter.
   */
  description?: string;

  /**
   * Whether the parameter is required.
   */
  required?: boolean;

  /**
   * Example value for the parameter.
   */
  example?: unknown;

  /**
   * Whether the parameter is deprecated.
   */
  deprecated?: boolean;

  /**
   * Allowed values (enum).
   */
  enum?: string[];
}

/**
 * Type guard to check if an object is a valid ApiParamDecoratorOptions.
 * @param obj - Object to validate
 * @returns True if object matches ApiParamDecoratorOptions interface
 */
export function isApiParamDecoratorOptions(
  obj: unknown,
): obj is ApiParamDecoratorOptions {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const options = obj as Record<string, unknown>;

  if (
    options.description !== undefined &&
    typeof options.description !== 'string'
  ) {
    return false;
  }
  if (options.required !== undefined && typeof options.required !== 'boolean') {
    return false;
  }
  if (
    options.deprecated !== undefined &&
    typeof options.deprecated !== 'boolean'
  ) {
    return false;
  }
  if (options.enum !== undefined) {
    if (
      !Array.isArray(options.enum) ||
      !options.enum.every((e) => typeof e === 'string')
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Metadata stored for OpenAPI parameters.
 */
export interface OpenAPIParamMetadata {
  /**
   * Name of the parameter.
   */
  name: string;

  /**
   * Location of the parameter.
   */
  in: OpenAPIParameterLocation;

  /**
   * Options for the parameter.
   */
  options: ApiParamDecoratorOptions;
}

/**
 * Type guard to check if an object is a valid OpenAPIParamMetadata.
 * @param obj - Object to validate
 * @returns True if object matches OpenAPIParamMetadata interface
 */
export function isOpenAPIParamMetadata(
  obj: unknown,
): obj is OpenAPIParamMetadata {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const metadata = obj as Record<string, unknown>;

  if (typeof metadata.name !== 'string') {
    return false;
  }
  const validLocations = ['path', 'query', 'header', 'cookie'];
  if (
    typeof metadata.in !== 'string' ||
    !validLocations.includes(metadata.in)
  ) {
    return false;
  }
  if (!metadata.options || !isApiParamDecoratorOptions(metadata.options)) {
    return false;
  }
  return true;
}

/**
 * Options for the @ApiRequestBody decorator.
 */
export interface ApiRequestBodyDecoratorOptions {
  /**
   * Schema reference name or Zod schema.
   */
  schema: string | z.ZodSchema;

  /**
   * Description of the request body.
   */
  description?: string;

  /**
   * Whether the request body is required.
   */
  required?: boolean;

  /**
   * Example request body value.
   */
  example?: unknown;

  /**
   * Content type (defaults to 'application/json').
   */
  contentType?: string;
}

/**
 * Type guard to check if an object is a valid ApiRequestBodyDecoratorOptions.
 * @param obj - Object to validate
 * @returns True if object matches ApiRequestBodyDecoratorOptions interface
 */
export function isApiRequestBodyDecoratorOptions(
  obj: unknown,
): obj is ApiRequestBodyDecoratorOptions {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const options = obj as Record<string, unknown>;

  // schema is required and can be string or ZodSchema
  if (options.schema === undefined) {
    return false;
  }
  if (
    typeof options.schema !== 'string' &&
    !(options.schema instanceof z.ZodType)
  ) {
    return false;
  }
  if (
    options.description !== undefined &&
    typeof options.description !== 'string'
  ) {
    return false;
  }
  if (options.required !== undefined && typeof options.required !== 'boolean') {
    return false;
  }
  if (
    options.contentType !== undefined &&
    typeof options.contentType !== 'string'
  ) {
    return false;
  }
  return true;
}

/**
 * Lifecycle hook callback type.
 */
export type LifecycleCallback<TResult = unknown, TError = Error> = (context: {
  req: Request;
  res: Response;
  result?: TResult;
  error?: TError;
}) => void | Promise<void>;

/**
 * Metadata stored for lifecycle hooks.
 */
export interface LifecycleMetadata {
  /**
   * Callbacks to execute on successful response.
   */
  onSuccess?: LifecycleCallback[];

  /**
   * Callbacks to execute on error.
   */
  onError?: LifecycleCallback[];

  /**
   * Callbacks to execute before the handler.
   */
  before?: LifecycleCallback[];

  /**
   * Callbacks to execute after the handler (success or error).
   */
  after?: LifecycleCallback[];
}

/**
 * Type guard to check if an object is a valid LifecycleMetadata.
 * @param obj - Object to validate
 * @returns True if object matches LifecycleMetadata interface
 */
export function isLifecycleMetadata(obj: unknown): obj is LifecycleMetadata {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const metadata = obj as Record<string, unknown>;

  const validateCallbackArray = (arr: unknown): boolean => {
    if (!Array.isArray(arr)) {
      return false;
    }
    return arr.every((cb) => typeof cb === 'function');
  };

  if (
    metadata.onSuccess !== undefined &&
    !validateCallbackArray(metadata.onSuccess)
  ) {
    return false;
  }
  if (
    metadata.onError !== undefined &&
    !validateCallbackArray(metadata.onError)
  ) {
    return false;
  }
  if (
    metadata.before !== undefined &&
    !validateCallbackArray(metadata.before)
  ) {
    return false;
  }
  if (metadata.after !== undefined && !validateCallbackArray(metadata.after)) {
    return false;
  }
  return true;
}

/**
 * Options for the @ApiSchema decorator.
 */
export interface ApiSchemaDecoratorOptions {
  /**
   * Custom name for the schema.
   * Defaults to the class name.
   */
  name?: string;

  /**
   * Description of the schema.
   */
  description?: string;

  /**
   * Example value for the schema.
   */
  example?: unknown;
}

/**
 * Type guard to check if an object is a valid ApiSchemaDecoratorOptions.
 * @param obj - Object to validate
 * @returns True if object matches ApiSchemaDecoratorOptions interface
 */
export function isApiSchemaDecoratorOptions(
  obj: unknown,
): obj is ApiSchemaDecoratorOptions {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const options = obj as Record<string, unknown>;

  if (options.name !== undefined && typeof options.name !== 'string') {
    return false;
  }
  if (
    options.description !== undefined &&
    typeof options.description !== 'string'
  ) {
    return false;
  }
  return true;
}

/**
 * Options for the @ApiProperty decorator.
 */
export interface ApiPropertyDecoratorOptions {
  /**
   * OpenAPI type of the property.
   */
  type?: string;

  /**
   * Format hint for the property (e.g., 'date-time', 'email', 'uuid').
   */
  format?: string;

  /**
   * Description of the property.
   */
  description?: string;

  /**
   * Whether the property is required.
   */
  required?: boolean;

  /**
   * Example value for the property.
   */
  example?: unknown;

  /**
   * Allowed values (enum).
   */
  enum?: string[];

  /**
   * Whether the property is nullable.
   */
  nullable?: boolean;

  /**
   * Minimum value for numeric types.
   */
  minimum?: number;

  /**
   * Maximum value for numeric types.
   */
  maximum?: number;

  /**
   * Minimum length for string types.
   */
  minLength?: number;

  /**
   * Maximum length for string types.
   */
  maxLength?: number;

  /**
   * Regex pattern for string validation.
   */
  pattern?: string;

  /**
   * Schema for array items.
   */
  items?: OpenAPIParameterSchema | string;

  /**
   * Reference to another schema.
   */
  $ref?: string;
}

/**
 * Type guard to check if an object is a valid ApiPropertyDecoratorOptions.
 * @param obj - Object to validate
 * @returns True if object matches ApiPropertyDecoratorOptions interface
 */
export function isApiPropertyDecoratorOptions(
  obj: unknown,
): obj is ApiPropertyDecoratorOptions {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const options = obj as Record<string, unknown>;

  if (options.type !== undefined && typeof options.type !== 'string') {
    return false;
  }
  if (options.format !== undefined && typeof options.format !== 'string') {
    return false;
  }
  if (
    options.description !== undefined &&
    typeof options.description !== 'string'
  ) {
    return false;
  }
  if (options.required !== undefined && typeof options.required !== 'boolean') {
    return false;
  }
  if (options.nullable !== undefined && typeof options.nullable !== 'boolean') {
    return false;
  }
  if (options.minimum !== undefined && typeof options.minimum !== 'number') {
    return false;
  }
  if (options.maximum !== undefined && typeof options.maximum !== 'number') {
    return false;
  }
  if (
    options.minLength !== undefined &&
    typeof options.minLength !== 'number'
  ) {
    return false;
  }
  if (
    options.maxLength !== undefined &&
    typeof options.maxLength !== 'number'
  ) {
    return false;
  }
  if (options.pattern !== undefined && typeof options.pattern !== 'string') {
    return false;
  }
  if (options.$ref !== undefined && typeof options.$ref !== 'string') {
    return false;
  }
  if (options.enum !== undefined) {
    if (
      !Array.isArray(options.enum) ||
      !options.enum.every((e) => typeof e === 'string')
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Metadata stored for schema properties.
 */
export interface SchemaPropertyMetadata {
  /**
   * Property name.
   */
  propertyKey: string;

  /**
   * Property options.
   */
  options: ApiPropertyDecoratorOptions;
}

/**
 * Type guard to check if an object is a valid SchemaPropertyMetadata.
 * @param obj - Object to validate
 * @returns True if object matches SchemaPropertyMetadata interface
 */
export function isSchemaPropertyMetadata(
  obj: unknown,
): obj is SchemaPropertyMetadata {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const metadata = obj as Record<string, unknown>;

  if (typeof metadata.propertyKey !== 'string') {
    return false;
  }
  if (!metadata.options || !isApiPropertyDecoratorOptions(metadata.options)) {
    return false;
  }
  return true;
}

/**
 * Metadata stored for registered schemas.
 */
export interface SchemaMetadata {
  /**
   * Schema name.
   */
  name: string;

  /**
   * Schema options.
   */
  options: ApiSchemaDecoratorOptions;

  /**
   * Properties of the schema.
   */
  properties: SchemaPropertyMetadata[];
}

/**
 * Type guard to check if an object is a valid SchemaMetadata.
 * @param obj - Object to validate
 * @returns True if object matches SchemaMetadata interface
 */
export function isSchemaMetadata(obj: unknown): obj is SchemaMetadata {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const metadata = obj as Record<string, unknown>;

  if (typeof metadata.name !== 'string') {
    return false;
  }
  if (!metadata.options || !isApiSchemaDecoratorOptions(metadata.options)) {
    return false;
  }
  if (!Array.isArray(metadata.properties)) {
    return false;
  }
  if (!metadata.properties.every((p) => isSchemaPropertyMetadata(p))) {
    return false;
  }
  return true;
}

/**
 * Options for the @ApiOperation decorator.
 * Allows setting full OpenAPI operation metadata in one decorator.
 */
export interface ApiOperationDecoratorOptions {
  /**
   * Short summary of the operation.
   */
  summary?: string;

  /**
   * Detailed description of the operation.
   */
  description?: string;

  /**
   * Tags for grouping operations.
   */
  tags?: string[];

  /**
   * Unique identifier for the operation.
   */
  operationId?: string;

  /**
   * Whether the operation is deprecated.
   */
  deprecated?: boolean;

  /**
   * Request body definition.
   */
  requestBody?: OpenAPIRequestBody;

  /**
   * Response definitions by status code.
   */
  responses?: Record<number | 'default', OpenAPIResponseDef>;

  /**
   * Parameter definitions.
   */
  parameters?: OpenAPIParameter[];
}

/**
 * Type guard to check if an object is a valid ApiOperationDecoratorOptions.
 * @param obj - Object to validate
 * @returns True if object matches ApiOperationDecoratorOptions interface
 */
export function isApiOperationDecoratorOptions(
  obj: unknown,
): obj is ApiOperationDecoratorOptions {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const options = obj as Record<string, unknown>;

  if (options.summary !== undefined && typeof options.summary !== 'string') {
    return false;
  }
  if (
    options.description !== undefined &&
    typeof options.description !== 'string'
  ) {
    return false;
  }
  if (options.tags !== undefined) {
    if (
      !Array.isArray(options.tags) ||
      !options.tags.every((t) => typeof t === 'string')
    ) {
      return false;
    }
  }
  if (
    options.operationId !== undefined &&
    typeof options.operationId !== 'string'
  ) {
    return false;
  }
  if (
    options.deprecated !== undefined &&
    typeof options.deprecated !== 'boolean'
  ) {
    return false;
  }
  return true;
}

/**
 * Options for the @ApiExample decorator.
 */
export interface ApiExampleDecoratorOptions {
  /**
   * Name/key for the example.
   */
  name?: string;

  /**
   * Summary of the example.
   */
  summary?: string;

  /**
   * Description of the example.
   */
  description?: string;

  /**
   * The example value.
   */
  value: unknown;

  /**
   * Whether this is a request or response example.
   */
  type?: 'request' | 'response';

  /**
   * Status code for response examples.
   */
  statusCode?: number;
}

/**
 * Type guard to check if an object is a valid ApiExampleDecoratorOptions.
 * @param obj - Object to validate
 * @returns True if object matches ApiExampleDecoratorOptions interface
 */
export function isApiExampleDecoratorOptions(
  obj: unknown,
): obj is ApiExampleDecoratorOptions {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const options = obj as Record<string, unknown>;

  // value is required
  if (options.value === undefined) {
    return false;
  }
  if (options.name !== undefined && typeof options.name !== 'string') {
    return false;
  }
  if (options.summary !== undefined && typeof options.summary !== 'string') {
    return false;
  }
  if (
    options.description !== undefined &&
    typeof options.description !== 'string'
  ) {
    return false;
  }
  if (
    options.type !== undefined &&
    options.type !== 'request' &&
    options.type !== 'response'
  ) {
    return false;
  }
  if (
    options.statusCode !== undefined &&
    typeof options.statusCode !== 'number'
  ) {
    return false;
  }
  return true;
}

/**
 * Authentication metadata stored by auth decorators.
 */
export interface AuthMetadata {
  /**
   * Whether JWT authentication is required.
   */
  requireAuth?: boolean;

  /**
   * Whether ECIES crypto authentication is required.
   */
  requireCryptoAuth?: boolean;

  /**
   * Whether the route is explicitly public (no auth required).
   */
  isPublic?: boolean;

  /**
   * Custom status code for authentication failures.
   */
  failureStatusCode?: number;
}

/**
 * Type guard to check if an object is a valid AuthMetadata.
 * @param obj - Object to validate
 * @returns True if object matches AuthMetadata interface
 */
export function isAuthMetadata(obj: unknown): obj is AuthMetadata {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const metadata = obj as Record<string, unknown>;

  if (
    metadata.requireAuth !== undefined &&
    typeof metadata.requireAuth !== 'boolean'
  ) {
    return false;
  }
  if (
    metadata.requireCryptoAuth !== undefined &&
    typeof metadata.requireCryptoAuth !== 'boolean'
  ) {
    return false;
  }
  if (
    metadata.isPublic !== undefined &&
    typeof metadata.isPublic !== 'boolean'
  ) {
    return false;
  }
  if (
    metadata.failureStatusCode !== undefined &&
    typeof metadata.failureStatusCode !== 'number'
  ) {
    return false;
  }
  return true;
}

/**
 * Validation metadata stored by validation decorators.
 */
export interface ValidationMetadata<
  TLanguage extends CoreLanguageCode = CoreLanguageCode,
  TConstants extends IConstants = IConstants,
> {
  /**
   * Body validation schema or chains.
   */
  body?:
    | z.ZodSchema
    | ValidationChain[]
    | ((
        this: ValidationContext<TConstants>,
        lang: TLanguage,
      ) => ValidationChain[]);

  /**
   * Params validation schema or chains.
   */
  params?:
    | z.ZodSchema
    | ValidationChain[]
    | ((
        this: ValidationContext<TConstants>,
        lang: TLanguage,
      ) => ValidationChain[]);

  /**
   * Query validation schema or chains.
   */
  query?:
    | z.ZodSchema
    | ValidationChain[]
    | ((
        this: ValidationContext<TConstants>,
        lang: TLanguage,
      ) => ValidationChain[]);
}

/**
 * Type guard to check if an object is a valid ValidationMetadata.
 * Note: This performs basic structural validation only.
 * @param obj - Object to validate
 * @returns True if object matches ValidationMetadata interface
 */
export function isValidationMetadata(obj: unknown): obj is ValidationMetadata {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const metadata = obj as Record<string, unknown>;

  // Each field can be a ZodSchema, ValidationChain[], or function
  // We can only do basic type checking here
  const validateField = (field: unknown): boolean => {
    if (field === undefined) {
      return true;
    }
    // Check if it's a function
    if (typeof field === 'function') {
      return true;
    }
    // Check if it's an array (ValidationChain[])
    if (Array.isArray(field)) {
      return true;
    }
    // Check if it's a ZodSchema (has _def property)
    if (field instanceof z.ZodType) {
      return true;
    }
    return false;
  };

  if (!validateField(metadata.body)) {
    return false;
  }
  if (!validateField(metadata.params)) {
    return false;
  }
  if (!validateField(metadata.query)) {
    return false;
  }
  return true;
}

/**
 * Middleware metadata stored by middleware decorators.
 */
export interface MiddlewareMetadata {
  /**
   * Array of middleware functions to apply.
   */
  middleware: RequestHandler[];
}

/**
 * Type guard to check if an object is a valid MiddlewareMetadata.
 * @param obj - Object to validate
 * @returns True if object matches MiddlewareMetadata interface
 */
export function isMiddlewareMetadata(obj: unknown): obj is MiddlewareMetadata {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const metadata = obj as Record<string, unknown>;

  if (!Array.isArray(metadata.middleware)) {
    return false;
  }
  if (!metadata.middleware.every((m) => typeof m === 'function')) {
    return false;
  }
  return true;
}

/**
 * Transaction metadata stored by @Transactional decorator.
 */
export interface TransactionMetadata {
  /**
   * Whether to use a transaction.
   */
  useTransaction: boolean;

  /**
   * Transaction timeout in milliseconds.
   */
  timeout?: number;
}

/**
 * Type guard to check if an object is a valid TransactionMetadata.
 * @param obj - Object to validate
 * @returns True if object matches TransactionMetadata interface
 */
export function isTransactionMetadata(
  obj: unknown,
): obj is TransactionMetadata {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const metadata = obj as Record<string, unknown>;

  if (typeof metadata.useTransaction !== 'boolean') {
    return false;
  }
  if (metadata.timeout !== undefined && typeof metadata.timeout !== 'number') {
    return false;
  }
  return true;
}
