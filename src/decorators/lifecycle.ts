/**
 * @fileoverview Lifecycle decorators for Express Suite.
 * Provides @OnSuccess, @OnError, @Before, and @After decorators
 * for hooking into request lifecycle events.
 * Supports both class-level and method-level application.
 * @module decorators/lifecycle
 */

import 'reflect-metadata';
import { Request, Response } from 'express';
import { LIFECYCLE_METADATA } from './metadata-keys';
import {
  getMetadata,
  setMetadata,
  getMetadataOrDefault,
} from './metadata-collector';

/**
 * Context passed to lifecycle callbacks.
 */
export interface LifecycleContext<TResult = unknown, TError = Error> {
  /**
   * The Express request object.
   */
  req: Request;

  /**
   * The Express response object.
   */
  res: Response;

  /**
   * The result from the handler (available in onSuccess and after hooks).
   */
  result?: TResult;

  /**
   * The error that occurred (available in onError and after hooks).
   */
  error?: TError;
}

/**
 * Lifecycle callback function type.
 */
export type LifecycleCallback<TResult = unknown, TError = Error> = (
  context: LifecycleContext<TResult, TError>,
) => void | Promise<void>;

/**
 * Metadata stored for lifecycle hooks.
 */
export interface LifecycleMetadata {
  /**
   * Callbacks to execute on successful response.
   */
  onSuccess: LifecycleCallback[];

  /**
   * Callbacks to execute on error.
   */
  onError: LifecycleCallback[];

  /**
   * Callbacks to execute before the handler.
   */
  before: LifecycleCallback[];

  /**
   * Callbacks to execute after the handler (success or error).
   */
  after: LifecycleCallback[];
}

/**
 * Creates an empty lifecycle metadata object.
 */
function createEmptyLifecycleMetadata(): LifecycleMetadata {
  return {
    onSuccess: [],
    onError: [],
    before: [],
    after: [],
  };
}

/**
 * Generic constructor type for class decorators.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor = new (...args: any[]) => object;

/**
 * Creates a lifecycle decorator that can be applied to both classes and methods.
 * @param hookType - The type of lifecycle hook
 * @param callback - The callback function to execute
 * @returns A decorator function
 */
function createLifecycleDecorator(
  hookType: keyof LifecycleMetadata,
  callback: LifecycleCallback,
): ClassDecorator & MethodDecorator {
  function decorator<TFunction extends Constructor>(
    target: TFunction,
  ): TFunction | void;
  function decorator(
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor | void;
  function decorator<TFunction extends Constructor>(
    target: TFunction | object,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ): TFunction | PropertyDescriptor | void {
    if (propertyKey !== undefined && descriptor !== undefined) {
      // Method decorator
      const existing = getMetadataOrDefault<LifecycleMetadata>(
        LIFECYCLE_METADATA,
        target.constructor,
        propertyKey,
        createEmptyLifecycleMetadata(),
      );
      existing[hookType].push(callback);
      setMetadata(
        LIFECYCLE_METADATA,
        existing,
        target.constructor,
        propertyKey,
      );
      return descriptor;
    } else {
      // Class decorator
      const existing = getMetadataOrDefault<LifecycleMetadata>(
        LIFECYCLE_METADATA,
        target as object,
        undefined,
        createEmptyLifecycleMetadata(),
      );
      existing[hookType].push(callback);
      setMetadata(LIFECYCLE_METADATA, existing, target as object);
      return target as TFunction;
    }
  }

  return decorator as ClassDecorator & MethodDecorator;
}

/**
 * Decorator that registers a callback to execute after a successful response.
 * Can be applied at class level (affects all methods) or method level.
 *
 * @param callback - Function to execute on success, receives context with req, res, and result
 * @returns Class or method decorator
 *
 * @example
 * ```typescript
 * // Method-level usage
 * @ApiController('/api/users')
 * class UserController {
 *   @OnSuccess(({ req, result }) => {
 *     console.log(`User ${req.params.id} fetched successfully:`, result);
 *   })
 *   @Get('/:id')
 *   getUser() {}
 * }
 *
 * // Class-level usage (applies to all methods)
 * @OnSuccess(({ req }) => {
 *   console.log(`Request to ${req.path} completed successfully`);
 * })
 * @ApiController('/api/items')
 * class ItemController {
 *   @Get('/')
 *   listItems() {}
 * }
 * ```
 */
export function OnSuccess<TResult = unknown>(
  callback: LifecycleCallback<TResult>,
): ClassDecorator & MethodDecorator {
  return createLifecycleDecorator('onSuccess', callback as LifecycleCallback);
}

/**
 * Decorator that registers a callback to execute when an error occurs.
 * Can be applied at class level (affects all methods) or method level.
 *
 * @param callback - Function to execute on error, receives context with req, res, and error
 * @returns Class or method decorator
 *
 * @example
 * ```typescript
 * // Method-level usage
 * @ApiController('/api/users')
 * class UserController {
 *   @OnError(({ req, error }) => {
 *     console.error(`Error fetching user ${req.params.id}:`, error);
 *   })
 *   @Get('/:id')
 *   getUser() {}
 * }
 *
 * // Class-level usage for logging all errors
 * @OnError(({ req, error }) => {
 *   logger.error(`Request to ${req.path} failed:`, error);
 * })
 * @ApiController('/api/items')
 * class ItemController {
 *   @Get('/')
 *   listItems() {}
 * }
 * ```
 */
export function OnError<TError = Error>(
  callback: LifecycleCallback<unknown, TError>,
): ClassDecorator & MethodDecorator {
  return createLifecycleDecorator('onError', callback as LifecycleCallback);
}

/**
 * Decorator that registers a callback to execute before the handler.
 * Can be applied at class level (affects all methods) or method level.
 * Useful for logging, auditing, or pre-processing.
 *
 * @param callback - Function to execute before handler, receives context with req and res
 * @returns Class or method decorator
 *
 * @example
 * ```typescript
 * // Method-level usage
 * @ApiController('/api/users')
 * class UserController {
 *   @Before(({ req }) => {
 *     console.log(`Fetching user ${req.params.id}`);
 *   })
 *   @Get('/:id')
 *   getUser() {}
 * }
 *
 * // Class-level usage for request logging
 * @Before(({ req }) => {
 *   console.log(`Incoming ${req.method} request to ${req.path}`);
 * })
 * @ApiController('/api/items')
 * class ItemController {
 *   @Get('/')
 *   listItems() {}
 * }
 * ```
 */
export function Before(
  callback: LifecycleCallback,
): ClassDecorator & MethodDecorator {
  return createLifecycleDecorator('before', callback);
}

/**
 * Decorator that registers a callback to execute after the handler completes.
 * Executes regardless of success or error.
 * Can be applied at class level (affects all methods) or method level.
 * Useful for cleanup, metrics, or finalization.
 *
 * @param callback - Function to execute after handler, receives context with req, res, result, and error
 * @returns Class or method decorator
 *
 * @example
 * ```typescript
 * // Method-level usage
 * @ApiController('/api/users')
 * class UserController {
 *   @After(({ req, result, error }) => {
 *     const status = error ? 'failed' : 'succeeded';
 *     console.log(`Request to ${req.path} ${status}`);
 *   })
 *   @Get('/:id')
 *   getUser() {}
 * }
 *
 * // Class-level usage for metrics
 * @After(({ req }) => {
 *   metrics.recordRequest(req.path);
 * })
 * @ApiController('/api/items')
 * class ItemController {
 *   @Get('/')
 *   listItems() {}
 * }
 * ```
 */
export function After(
  callback: LifecycleCallback,
): ClassDecorator & MethodDecorator {
  return createLifecycleDecorator('after', callback);
}

/**
 * Gets lifecycle metadata for a specific method.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns Lifecycle metadata or undefined if not set
 */
export function getLifecycleMetadata(
  target: object,
  propertyKey: string | symbol,
): LifecycleMetadata | undefined {
  return getMetadata<LifecycleMetadata>(
    LIFECYCLE_METADATA,
    target,
    propertyKey,
  );
}

/**
 * Gets class-level lifecycle metadata.
 *
 * @param target - The class constructor
 * @returns Lifecycle metadata or undefined if not set
 */
export function getClassLifecycleMetadata(
  target: object,
): LifecycleMetadata | undefined {
  return getMetadata<LifecycleMetadata>(LIFECYCLE_METADATA, target);
}

/**
 * Gets the effective lifecycle metadata for a method, merging class-level and method-level hooks.
 * Class-level hooks run first, then method-level hooks.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns Merged lifecycle metadata
 */
export function getEffectiveLifecycleMetadata(
  target: object,
  propertyKey: string | symbol,
): LifecycleMetadata {
  const classMetadata = getMetadataOrDefault<LifecycleMetadata>(
    LIFECYCLE_METADATA,
    target,
    undefined,
    createEmptyLifecycleMetadata(),
  );
  const methodMetadata = getMetadataOrDefault<LifecycleMetadata>(
    LIFECYCLE_METADATA,
    target,
    propertyKey,
    createEmptyLifecycleMetadata(),
  );

  // Merge: class-level hooks run first, then method-level
  return {
    onSuccess: [...classMetadata.onSuccess, ...methodMetadata.onSuccess],
    onError: [...classMetadata.onError, ...methodMetadata.onError],
    before: [...classMetadata.before, ...methodMetadata.before],
    after: [...classMetadata.after, ...methodMetadata.after],
  };
}

/**
 * Checks if a method has any lifecycle hooks defined.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns True if any lifecycle hooks are defined
 */
export function hasLifecycleHooks(
  target: object,
  propertyKey: string | symbol,
): boolean {
  const metadata = getEffectiveLifecycleMetadata(target, propertyKey);
  return (
    metadata.onSuccess.length > 0 ||
    metadata.onError.length > 0 ||
    metadata.before.length > 0 ||
    metadata.after.length > 0
  );
}

/**
 * Executes all before hooks for a method.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @param context - The lifecycle context
 */
export async function executeBeforeHooks(
  target: object,
  propertyKey: string | symbol,
  context: LifecycleContext,
): Promise<void> {
  const metadata = getEffectiveLifecycleMetadata(target, propertyKey);
  for (const callback of metadata.before) {
    await callback(context);
  }
}

/**
 * Executes all after hooks for a method.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @param context - The lifecycle context
 */
export async function executeAfterHooks(
  target: object,
  propertyKey: string | symbol,
  context: LifecycleContext,
): Promise<void> {
  const metadata = getEffectiveLifecycleMetadata(target, propertyKey);
  for (const callback of metadata.after) {
    await callback(context);
  }
}

/**
 * Executes all onSuccess hooks for a method.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @param context - The lifecycle context with result
 */
export async function executeOnSuccessHooks(
  target: object,
  propertyKey: string | symbol,
  context: LifecycleContext,
): Promise<void> {
  const metadata = getEffectiveLifecycleMetadata(target, propertyKey);
  for (const callback of metadata.onSuccess) {
    await callback(context);
  }
}

/**
 * Executes all onError hooks for a method.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @param context - The lifecycle context with error
 */
export async function executeOnErrorHooks(
  target: object,
  propertyKey: string | symbol,
  context: LifecycleContext,
): Promise<void> {
  const metadata = getEffectiveLifecycleMetadata(target, propertyKey);
  for (const callback of metadata.onError) {
    await callback(context);
  }
}
