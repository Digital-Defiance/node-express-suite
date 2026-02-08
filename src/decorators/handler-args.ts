/**
 * @fileoverview Handler arguments decorator for Express Suite.
 * Provides @HandlerArgs decorator for passing additional arguments to handler methods.
 * @module decorators/handler-args
 */

import 'reflect-metadata';
import { HANDLER_ARGS_METADATA } from './metadata-keys';
import { getMetadata, setMetadata } from './metadata-collector';

/**
 * Metadata stored for handler arguments.
 */
export interface HandlerArgsMetadata {
  /**
   * Additional arguments to pass to the handler method.
   */
  args: unknown[];
}

/**
 * Decorator that specifies additional arguments to pass to a route handler method.
 * These arguments are passed to the handler after the standard request parameter.
 *
 * @param args - Additional arguments to pass to the handler
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @ApiController('/api/items')
 * class ItemController {
 *   // Pass a configuration object to the handler
 *   @HandlerArgs({ maxItems: 100 })
 *   @Get('/')
 *   listItems(req: Request, config: { maxItems: number }) {
 *     // config.maxItems === 100
 *   }
 *
 *   // Pass multiple arguments
 *   @HandlerArgs('prefix', 42, { option: true })
 *   @Post('/')
 *   createItem(req: Request, prefix: string, count: number, options: { option: boolean }) {
 *     // prefix === 'prefix', count === 42, options.option === true
 *   }
 * }
 * ```
 */
export function HandlerArgs(...args: unknown[]): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const metadata: HandlerArgsMetadata = {
      args,
    };

    setMetadata(
      HANDLER_ARGS_METADATA,
      metadata,
      target.constructor,
      propertyKey,
    );

    return descriptor;
  };
}

/**
 * Gets handler args metadata for a method.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns Handler args metadata or undefined if not set
 */
export function getHandlerArgsMetadata(
  target: object,
  propertyKey: string | symbol,
): HandlerArgsMetadata | undefined {
  return getMetadata<HandlerArgsMetadata>(
    HANDLER_ARGS_METADATA,
    target,
    propertyKey,
  );
}

/**
 * Gets the handler arguments array for a method.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns Array of handler arguments or empty array if not set
 */
export function getHandlerArgs(
  target: object,
  propertyKey: string | symbol,
): unknown[] {
  const metadata = getHandlerArgsMetadata(target, propertyKey);
  return metadata?.args ?? [];
}

/**
 * Checks if a method has handler args defined.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns True if the method has handler args
 */
export function hasHandlerArgs(
  target: object,
  propertyKey: string | symbol,
): boolean {
  const metadata = getHandlerArgsMetadata(target, propertyKey);
  return metadata !== undefined && metadata.args.length > 0;
}
