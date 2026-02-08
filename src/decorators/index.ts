/**
 * @fileoverview Decorator module exports.
 * Provides all decorator exports for Express Suite.
 * @module decorators
 */

// Auth decorators
export * from './auth';

// Base controller with decorator support
export * from './base-controller';

// Controller decorators
export * from './controller';

// Handler args decorator
export * from './handler-args';

// HTTP method decorators - export specific items to avoid conflicts
export { Get, Post, Put, Delete, Patch } from './http-methods';
export type {
  EnhancedRouteMetadata,
  RouteDecoratorOptions,
} from './http-methods';

// Lifecycle decorators - export specific items to avoid conflicts with interfaces
export {
  OnSuccess,
  OnError,
  Before,
  After,
  getLifecycleMetadata,
  getClassLifecycleMetadata,
  getEffectiveLifecycleMetadata,
  hasLifecycleHooks,
  executeBeforeHooks,
  executeAfterHooks,
  executeOnSuccessHooks,
  executeOnErrorHooks,
} from './lifecycle';
export type {
  LifecycleContext,
  LifecycleCallback,
  LifecycleMetadata,
} from './lifecycle';

// Metadata utilities
export * from './metadata-collector';
export * from './metadata-keys';

// Middleware decorators
export * from './middleware';

// OpenAPI decorators
export * from './openapi';
export * from './openapi-params';

// Parameter injection decorators
export * from './params';

// Response decorators
export * from './response';

// Schema decorators
export * from './schema';

// Transaction decorator - export specific items to avoid conflicts with interfaces
export {
  Transactional,
  getTransactionMetadata,
  isTransactional,
  getTransactionTimeout,
} from './transaction';
export type { TransactionMetadata } from './transaction';

// Validation decorators
export * from './validation';

// Zod validation utilities
export * from './zod-validation';
