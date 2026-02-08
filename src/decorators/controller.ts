/**
 * @fileoverview Controller and route decorators.
 * Provides TypeScript decorators for defining Express routes.
 * @module decorators/controller
 */

import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { RequestHandler } from 'express';
import { ValidationChain } from 'express-validator';
import 'reflect-metadata';
import { z } from 'zod';
import { IConstants } from '../interfaces';
import { ApiControllerOptions } from '../interfaces/openApi/decoratorOptions';
import {
  CONTROLLER_METADATA,
  OPENAPI_CONTROLLER_METADATA,
} from './metadata-keys';

// Re-export metadata keys for backward compatibility
export {
  CONTROLLER_METADATA,
  OPENAPI_CONTROLLER_METADATA,
  ROUTES_METADATA,
} from './metadata-keys';

// Re-export ApiControllerOptions for convenience
export type { ApiControllerOptions } from '../interfaces/openApi/decoratorOptions';

// Validation context with constants - all properties are guaranteed to exist at runtime
// The constants object is injected by the base controller during route initialization
export type ValidationContext<TConstants extends IConstants = IConstants> = {
  constants: TConstants;
};

// Route decorator options
export interface RouteOptions<
  TLanguage extends CoreLanguageCode = CoreLanguageCode,
  TConstants extends IConstants = IConstants,
> {
  validation?:
    | ValidationChain[]
    | ((
        this: ValidationContext<TConstants>,
        lang: TLanguage,
      ) => ValidationChain[]);
  schema?: z.ZodSchema;
  middleware?: RequestHandler[];
  auth?: boolean;
  cryptoAuth?: boolean;
  rawJson?: boolean;
  transaction?: boolean;
  transactionTimeout?: number;
}

// Route metadata structure
export interface RouteMetadata<
  TLanguage extends CoreLanguageCode = CoreLanguageCode,
> {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  path: string;
  handlerName: string;
  options: RouteOptions<TLanguage>;
}

/**
 * Controller metadata structure stored by @Controller and @ApiController decorators.
 */
export interface ControllerMetadata {
  /** Base path for all routes in this controller */
  basePath: string;
  /** Optional controller name (defaults to class name) */
  name?: string;
}

/**
 * OpenAPI controller metadata structure stored by @ApiController decorator.
 */
export interface OpenApiControllerMetadata {
  /** Tags to apply to all routes in this controller */
  tags?: string[];
  /** Description of the controller for OpenAPI documentation */
  description?: string;
  /** Whether all routes in this controller are deprecated */
  deprecated?: boolean;
}

/**
 * Basic controller decorator for defining route base path.
 * Use @ApiController for OpenAPI-enabled controllers.
 *
 * @param basePath - Base path for all routes in this controller
 * @returns Class decorator function
 *
 * @example
 * ```typescript
 * @Controller('/api/users')
 * class UserController {
 *   @Get('/:id')
 *   getUser() {}
 * }
 * ```
 */
export function Controller(basePath: string = '') {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const metadata: ControllerMetadata = { basePath };
    Reflect.defineMetadata(CONTROLLER_METADATA, metadata, constructor);
    return constructor;
  };
}

/**
 * Enhanced controller decorator with OpenAPI support.
 * Registers the controller with both base path and OpenAPI metadata.
 *
 * @param basePath - Base path for all routes in this controller
 * @param options - Optional OpenAPI configuration (tags, description, deprecated, name)
 * @returns Class decorator function
 *
 * @example
 * ```typescript
 * @ApiController('/api/users', {
 *   tags: ['Users'],
 *   description: 'User management endpoints',
 * })
 * class UserController {
 *   @Get('/:id')
 *   getUser() {}
 * }
 * ```
 */
export function ApiController(
  basePath: string = '',
  options: ApiControllerOptions = {},
) {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    // Store base controller metadata (basePath and optional name)
    const controllerMetadata: ControllerMetadata = {
      basePath,
      name: options.name ?? constructor.name,
    };
    Reflect.defineMetadata(
      CONTROLLER_METADATA,
      controllerMetadata,
      constructor,
    );

    // Store OpenAPI-specific controller metadata
    const openApiMetadata: OpenApiControllerMetadata = {
      tags: options.tags,
      description: options.description,
      deprecated: options.deprecated,
    };
    Reflect.defineMetadata(
      OPENAPI_CONTROLLER_METADATA,
      openApiMetadata,
      constructor,
    );

    return constructor;
  };
}

// Re-export enhanced HTTP method decorators from http-methods.ts
// These provide OpenAPI metadata support while maintaining backward compatibility
export { Delete, Get, Patch, Post, Put } from './http-methods';

// Convenience decorators
export function Auth(_cryptoAuth: boolean = false) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    // This would be combined with route decorators
    return descriptor;
  };
}

export function Validate<TLanguage extends CoreLanguageCode = CoreLanguageCode>(
  _validation: ValidationChain[] | ((lang: TLanguage) => ValidationChain[]),
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    // This would be combined with route decorators
    return descriptor;
  };
}
