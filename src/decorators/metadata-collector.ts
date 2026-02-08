/**
 * @fileoverview Metadata collector utilities for decorator system.
 * Provides helper functions for getting, setting, and merging decorator metadata.
 * @module decorators/metadata-collector
 */

import 'reflect-metadata';
import {
  AUTH_METADATA,
  CACHE_METADATA,
  CONTROLLER_METADATA,
  HANDLER_ARGS_METADATA,
  LIFECYCLE_METADATA,
  MetadataKey,
  MIDDLEWARE_METADATA,
  OPENAPI_CONTROLLER_METADATA,
  OPENAPI_METADATA,
  OPENAPI_PARAMS_METADATA,
  OPENAPI_REQUEST_BODY_METADATA,
  PARAMS_METADATA,
  RATE_LIMIT_METADATA,
  RESPONSE_METADATA,
  ROUTES_METADATA,
  SCHEMA_METADATA,
  TRANSACTION_METADATA,
  VALIDATION_METADATA,
} from './metadata-keys';

// Re-export SCHEMA_METADATA for use in schema decorators
export { SCHEMA_METADATA };

/**
 * Gets metadata from a target (class or method).
 * @param key - The metadata key symbol
 * @param target - The target object (class constructor or prototype)
 * @param propertyKey - Optional property key for method-level metadata
 * @returns The metadata value or undefined
 */
export function getMetadata<T>(
  key: MetadataKey,
  target: object,
  propertyKey?: string | symbol,
): T | undefined {
  if (propertyKey !== undefined) {
    return Reflect.getMetadata(key, target, propertyKey) as T | undefined;
  }
  return Reflect.getMetadata(key, target) as T | undefined;
}

/**
 * Sets metadata on a target (class or method).
 * @param key - The metadata key symbol
 * @param value - The metadata value to set
 * @param target - The target object (class constructor or prototype)
 * @param propertyKey - Optional property key for method-level metadata
 */
export function setMetadata<T>(
  key: MetadataKey,
  value: T,
  target: object,
  propertyKey?: string | symbol,
): void {
  if (propertyKey !== undefined) {
    Reflect.defineMetadata(key, value, target, propertyKey);
  } else {
    Reflect.defineMetadata(key, value, target);
  }
}

/**
 * Gets metadata or returns a default value if not found.
 * @param key - The metadata key symbol
 * @param target - The target object
 * @param propertyKey - Optional property key for method-level metadata
 * @param defaultValue - Default value to return if metadata not found
 * @returns The metadata value or the default value
 */
export function getMetadataOrDefault<T>(
  key: MetadataKey,
  target: object,
  propertyKey: string | symbol | undefined,
  defaultValue: T,
): T {
  const value = getMetadata<T>(key, target, propertyKey);
  return value !== undefined ? value : defaultValue;
}

/**
 * Appends a value to an array stored in metadata.
 * Creates the array if it doesn't exist.
 * @param key - The metadata key symbol
 * @param value - The value to append
 * @param target - The target object
 * @param propertyKey - Optional property key for method-level metadata
 */
export function appendToMetadataArray<T>(
  key: MetadataKey,
  value: T,
  target: object,
  propertyKey?: string | symbol,
): void {
  const existing = getMetadataOrDefault<T[]>(key, target, propertyKey, []);
  existing.push(value);
  setMetadata(key, existing, target, propertyKey);
}

/**
 * Merges an object into existing metadata.
 * Creates the object if it doesn't exist.
 * @param key - The metadata key symbol
 * @param value - The object to merge
 * @param target - The target object
 * @param propertyKey - Optional property key for method-level metadata
 */
export function mergeMetadata<T extends object>(
  key: MetadataKey,
  value: Partial<T>,
  target: object,
  propertyKey?: string | symbol,
): void {
  const existing = getMetadataOrDefault<T>(key, target, propertyKey, {} as T);
  const merged = { ...existing, ...value };
  setMetadata(key, merged, target, propertyKey);
}

/**
 * Deep merges an object into existing metadata.
 * Handles nested objects and arrays.
 * @param key - The metadata key symbol
 * @param value - The object to deep merge
 * @param target - The target object
 * @param propertyKey - Optional property key for method-level metadata
 */
export function deepMergeMetadata<T extends object>(
  key: MetadataKey,
  value: Partial<T>,
  target: object,
  propertyKey?: string | symbol,
): void {
  const existing = getMetadataOrDefault<T>(key, target, propertyKey, {} as T);
  const merged = deepMerge(existing, value);
  setMetadata(key, merged, target, propertyKey);
}

/**
 * Deep merges two objects.
 * Arrays are concatenated, objects are recursively merged.
 * @param target - The target object
 * @param source - The source object to merge from
 * @returns The merged object
 */
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
        // Concatenate arrays
        (result as Record<string, unknown>)[key] = [
          ...targetValue,
          ...sourceValue,
        ];
      } else if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
        // Recursively merge objects
        (result as Record<string, unknown>)[key] = deepMerge(
          targetValue as object,
          sourceValue as object,
        );
      } else if (sourceValue !== undefined) {
        // Override with source value
        (result as Record<string, unknown>)[key] = sourceValue;
      }
    }
  }

  return result;
}

/**
 * Checks if a value is a plain object (not an array, null, or other type).
 * @param value - The value to check
 * @returns True if the value is a plain object
 */
function isPlainObject(value: unknown): value is object {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Checks if metadata exists on a target.
 * @param key - The metadata key symbol
 * @param target - The target object
 * @param propertyKey - Optional property key for method-level metadata
 * @returns True if metadata exists
 */
export function hasMetadata(
  key: MetadataKey,
  target: object,
  propertyKey?: string | symbol,
): boolean {
  if (propertyKey !== undefined) {
    return Reflect.hasMetadata(key, target, propertyKey);
  }
  return Reflect.hasMetadata(key, target);
}

/**
 * Deletes metadata from a target.
 * @param key - The metadata key symbol
 * @param target - The target object
 * @param propertyKey - Optional property key for method-level metadata
 * @returns True if metadata was deleted
 */
export function deleteMetadata(
  key: MetadataKey,
  target: object,
  propertyKey?: string | symbol,
): boolean {
  if (propertyKey !== undefined) {
    return Reflect.deleteMetadata(key, target, propertyKey);
  }
  return Reflect.deleteMetadata(key, target);
}

/**
 * Gets all metadata keys defined on a target.
 * @param target - The target object
 * @param propertyKey - Optional property key for method-level metadata
 * @returns Array of metadata keys
 */
export function getMetadataKeys(
  target: object,
  propertyKey?: string | symbol,
): MetadataKey[] {
  if (propertyKey !== undefined) {
    return Reflect.getMetadataKeys(target, propertyKey) as MetadataKey[];
  }
  return Reflect.getMetadataKeys(target) as MetadataKey[];
}

/**
 * Collects all decorator metadata from a class and its methods.
 * @param target - The class constructor
 * @returns Object containing all collected metadata
 */
export function collectAllMetadata(
  target: new (...args: unknown[]) => unknown,
): CollectedMetadata {
  const controllerMetadata = getMetadata<ControllerMetadataValue>(
    CONTROLLER_METADATA,
    target,
  );
  const routesMetadata = getMetadata<RouteMetadataValue[]>(
    ROUTES_METADATA,
    target,
  );
  const openApiControllerMetadata = getMetadata<OpenApiControllerMetadataValue>(
    OPENAPI_CONTROLLER_METADATA,
    target,
  );

  return {
    controller: controllerMetadata,
    routes: routesMetadata ?? [],
    openApiController: openApiControllerMetadata,
  };
}

/**
 * Collects method-level metadata for a specific method.
 * @param target - The class prototype
 * @param propertyKey - The method name
 * @returns Object containing all method metadata
 */
export function collectMethodMetadata(
  target: object,
  propertyKey: string | symbol,
): MethodMetadata {
  return {
    openApi: getMetadata(OPENAPI_METADATA, target, propertyKey),
    auth: getMetadata(AUTH_METADATA, target, propertyKey),
    validation: getMetadata(VALIDATION_METADATA, target, propertyKey),
    middleware: getMetadata(MIDDLEWARE_METADATA, target, propertyKey),
    params: getMetadata(PARAMS_METADATA, target, propertyKey),
    lifecycle: getMetadata(LIFECYCLE_METADATA, target, propertyKey),
    response: getMetadata(RESPONSE_METADATA, target, propertyKey),
    handlerArgs: getMetadata(HANDLER_ARGS_METADATA, target, propertyKey),
    transaction: getMetadata(TRANSACTION_METADATA, target, propertyKey),
    rateLimit: getMetadata(RATE_LIMIT_METADATA, target, propertyKey),
    cache: getMetadata(CACHE_METADATA, target, propertyKey),
    openApiParams: getMetadata(OPENAPI_PARAMS_METADATA, target, propertyKey),
    openApiRequestBody: getMetadata(
      OPENAPI_REQUEST_BODY_METADATA,
      target,
      propertyKey,
    ),
  };
}

// Type definitions for collected metadata

/**
 * Controller metadata value type.
 */
export interface ControllerMetadataValue {
  basePath: string;
  name?: string;
}

/**
 * Route metadata value type.
 */
export interface RouteMetadataValue {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  path: string;
  handlerName: string;
  options: Record<string, unknown>;
}

/**
 * OpenAPI controller metadata value type.
 */
export interface OpenApiControllerMetadataValue {
  tags?: string[];
  description?: string;
  deprecated?: boolean;
}

/**
 * Collected metadata from a class.
 */
export interface CollectedMetadata {
  controller?: ControllerMetadataValue;
  routes: RouteMetadataValue[];
  openApiController?: OpenApiControllerMetadataValue;
}

/**
 * Method-level metadata collection.
 */
export interface MethodMetadata {
  openApi?: unknown;
  auth?: unknown;
  validation?: unknown;
  middleware?: unknown;
  params?: unknown;
  lifecycle?: unknown;
  response?: unknown;
  handlerArgs?: unknown;
  transaction?: unknown;
  rateLimit?: unknown;
  cache?: unknown;
  openApiParams?: unknown;
  openApiRequestBody?: unknown;
}

/**
 * Creates a class decorator that sets metadata.
 * @param key - The metadata key symbol
 * @param value - The metadata value
 * @returns A class decorator function
 */
export function createClassDecorator<T>(
  key: MetadataKey,
  value: T,
): ClassDecorator {
  return (target) => {
    setMetadata(key, value, target);
  };
}

/**
 * Creates a method decorator that sets metadata.
 * @param key - The metadata key symbol
 * @param value - The metadata value
 * @returns A method decorator function
 */
export function createMethodDecorator<T>(
  key: MetadataKey,
  value: T,
): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    setMetadata(key, value, target.constructor, propertyKey);
    return descriptor;
  };
}

/**
 * Creates a method decorator that appends to an array in metadata.
 * @param key - The metadata key symbol
 * @param value - The value to append
 * @returns A method decorator function
 */
export function createAppendingMethodDecorator<T>(
  key: MetadataKey,
  value: T,
): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    appendToMetadataArray(key, value, target.constructor, propertyKey);
    return descriptor;
  };
}

/**
 * Creates a method decorator that merges into metadata.
 * @param key - The metadata key symbol
 * @param value - The value to merge
 * @returns A method decorator function
 */
export function createMergingMethodDecorator<T extends object>(
  key: MetadataKey,
  value: Partial<T>,
): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    mergeMetadata(key, value, target.constructor, propertyKey);
    return descriptor;
  };
}
