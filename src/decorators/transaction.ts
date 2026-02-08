/**
 * @fileoverview Transaction decorator for Express Suite.
 * Provides @Transactional decorator for MongoDB transaction support.
 * @module decorators/transaction
 */

import 'reflect-metadata';
import { TransactionalDecoratorOptions } from '../interfaces/openApi/decoratorOptions';
import { TRANSACTION_METADATA } from './metadata-keys';
import { getMetadata, setMetadata } from './metadata-collector';

/**
 * Metadata stored for transaction settings.
 */
export interface TransactionMetadata {
  /**
   * Whether the route should use a transaction.
   */
  useTransaction: boolean;

  /**
   * Transaction timeout in milliseconds.
   */
  timeout?: number;
}

/**
 * Decorator that wraps a route handler in a MongoDB transaction.
 * The transaction is automatically committed on success and rolled back on error.
 *
 * @param options - Optional transaction options including timeout
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @ApiController('/api/orders')
 * class OrderController {
 *   // Basic transaction
 *   @Transactional()
 *   @Post('/')
 *   createOrder() {}
 *
 *   // Transaction with timeout
 *   @Transactional({ timeout: 30000 })
 *   @Post('/bulk')
 *   bulkCreateOrders() {}
 * }
 * ```
 */
export function Transactional(
  options?: TransactionalDecoratorOptions,
): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const metadata: TransactionMetadata = {
      useTransaction: true,
      timeout: options?.timeout,
    };

    setMetadata(
      TRANSACTION_METADATA,
      metadata,
      target.constructor,
      propertyKey,
    );

    return descriptor;
  };
}

/**
 * Gets transaction metadata for a method.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns Transaction metadata or undefined if not transactional
 */
export function getTransactionMetadata(
  target: object,
  propertyKey: string | symbol,
): TransactionMetadata | undefined {
  return getMetadata<TransactionMetadata>(
    TRANSACTION_METADATA,
    target,
    propertyKey,
  );
}

/**
 * Checks if a method is transactional.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns True if the method uses transactions
 */
export function isTransactional(
  target: object,
  propertyKey: string | symbol,
): boolean {
  const metadata = getTransactionMetadata(target, propertyKey);
  return metadata?.useTransaction === true;
}

/**
 * Gets the transaction timeout for a method.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns Transaction timeout in milliseconds or undefined
 */
export function getTransactionTimeout(
  target: object,
  propertyKey: string | symbol,
): number | undefined {
  const metadata = getTransactionMetadata(target, propertyKey);
  return metadata?.timeout;
}
