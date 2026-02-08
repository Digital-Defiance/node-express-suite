/**
 * @fileoverview Authentication decorators for Express Suite.
 * Provides @RequireAuth, @RequireCryptoAuth, @Public, and @AuthFailureStatus decorators.
 * Supports both class-level and method-level application.
 * @module decorators/auth
 */

import 'reflect-metadata';
import { AuthMetadata } from '../interfaces/openApi/decoratorOptions';
import { AUTH_METADATA, RESPONSE_METADATA } from './metadata-keys';
import {
  getMetadata,
  getMetadataOrDefault,
  mergeMetadata,
  setMetadata,
} from './metadata-collector';

/**
 * Response metadata for 401 Unauthorized response.
 */
const UNAUTHORIZED_RESPONSE = {
  statusCode: 401,
  description: 'Unauthorized - Authentication required',
  schema: 'ErrorResponse',
};

/**
 * Adds 401 response to OpenAPI metadata for authenticated routes.
 * @param target - The target object (class constructor or prototype)
 * @param propertyKey - Optional property key for method-level metadata
 */
function addUnauthorizedResponse(
  target: object,
  propertyKey?: string | symbol,
): void {
  const existingResponses = getMetadataOrDefault<
    Array<{ statusCode: number; description?: string; schema?: string }>
  >(RESPONSE_METADATA, target, propertyKey, []);

  // Check if 401 response already exists
  const has401 = existingResponses.some((r) => r.statusCode === 401);
  if (!has401) {
    existingResponses.push(UNAUTHORIZED_RESPONSE);
    setMetadata(RESPONSE_METADATA, existingResponses, target, propertyKey);
  }
}

/**
 * Creates a decorator that can be applied to both classes and methods.
 * @param applyMetadata - Function to apply the metadata
 * @returns A decorator function
 */
function createAuthDecorator(
  applyMetadata: (target: object, propertyKey?: string | symbol) => void,
): ClassDecorator & MethodDecorator {
  function decorator<TFunction extends new (...args: unknown[]) => unknown>(
    target: TFunction,
  ): TFunction | void;
  function decorator(
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor | void;
  function decorator<TFunction extends new (...args: unknown[]) => unknown>(
    target: TFunction | object,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ): TFunction | PropertyDescriptor | void {
    if (propertyKey !== undefined && descriptor !== undefined) {
      // Method decorator
      applyMetadata(target.constructor, propertyKey);
      return descriptor;
    } else {
      // Class decorator
      applyMetadata(target as object);
      return target as TFunction;
    }
  }

  return decorator as ClassDecorator & MethodDecorator;
}

/**
 * Decorator that requires JWT authentication for a route or all routes in a controller.
 * Can be applied at class level (affects all methods) or method level.
 * Automatically adds 401 response to OpenAPI spec.
 *
 * @returns Class or method decorator
 *
 * @example
 * ```typescript
 * // Class-level - all routes require auth
 * @RequireAuth()
 * @ApiController('/api/users')
 * class UserController {
 *   @Get('/')
 *   listUsers() {}
 * }
 *
 * // Method-level
 * @ApiController('/api/items')
 * class ItemController {
 *   @Get('/')
 *   listItems() {} // Public
 *
 *   @RequireAuth()
 *   @Post('/')
 *   createItem() {} // Requires auth
 * }
 * ```
 */
export function RequireAuth(): ClassDecorator & MethodDecorator {
  return createAuthDecorator((target, propertyKey) => {
    const authMetadata: AuthMetadata = {
      requireAuth: true,
    };
    mergeMetadata(AUTH_METADATA, authMetadata, target, propertyKey);
    addUnauthorizedResponse(target, propertyKey);
  });
}

/**
 * Decorator that requires ECIES crypto authentication for a route or all routes in a controller.
 * Can be applied at class level (affects all methods) or method level.
 * Automatically adds 401 response to OpenAPI spec.
 *
 * @returns Class or method decorator
 *
 * @example
 * ```typescript
 * // Class-level - all routes require crypto auth
 * @RequireCryptoAuth()
 * @ApiController('/api/secure')
 * class SecureController {
 *   @Get('/data')
 *   getData() {}
 * }
 *
 * // Method-level
 * @ApiController('/api/items')
 * class ItemController {
 *   @RequireCryptoAuth()
 *   @Post('/encrypted')
 *   createEncrypted() {} // Requires crypto auth
 * }
 * ```
 */
export function RequireCryptoAuth(): ClassDecorator & MethodDecorator {
  return createAuthDecorator((target, propertyKey) => {
    const authMetadata: AuthMetadata = {
      requireCryptoAuth: true,
    };
    mergeMetadata(AUTH_METADATA, authMetadata, target, propertyKey);
    addUnauthorizedResponse(target, propertyKey);
  });
}

/**
 * Decorator that explicitly marks a route as public (no authentication required).
 * Useful for overriding class-level authentication requirements.
 * Can be applied at class level or method level.
 *
 * @returns Class or method decorator
 *
 * @example
 * ```typescript
 * @RequireAuth() // All routes require auth by default
 * @ApiController('/api/users')
 * class UserController {
 *   @Get('/:id')
 *   getUser() {} // Requires auth (inherited)
 *
 *   @Public()
 *   @Get('/public-profile/:id')
 *   getPublicProfile() {} // No auth required (overridden)
 * }
 * ```
 */
export function Public(): ClassDecorator & MethodDecorator {
  return createAuthDecorator((target, propertyKey) => {
    const authMetadata: AuthMetadata = {
      isPublic: true,
    };
    mergeMetadata(AUTH_METADATA, authMetadata, target, propertyKey);
  });
}

/**
 * Decorator that sets a custom status code for authentication failures.
 * Can be applied at class level (affects all methods) or method level.
 *
 * @param statusCode - HTTP status code to return on auth failure (default is 401)
 * @returns Class or method decorator
 *
 * @example
 * ```typescript
 * @RequireAuth()
 * @AuthFailureStatus(403) // Return 403 instead of 401 for all routes
 * @ApiController('/api/admin')
 * class AdminController {
 *   @Get('/dashboard')
 *   getDashboard() {}
 *
 *   @AuthFailureStatus(404) // Return 404 for this specific route
 *   @Get('/secret')
 *   getSecret() {}
 * }
 * ```
 */
export function AuthFailureStatus(
  statusCode: number,
): ClassDecorator & MethodDecorator {
  return createAuthDecorator((target, propertyKey) => {
    const authMetadata: AuthMetadata = {
      failureStatusCode: statusCode,
    };
    mergeMetadata(AUTH_METADATA, authMetadata, target, propertyKey);
  });
}

/**
 * Gets the effective auth metadata for a method, merging class-level and method-level settings.
 * Method-level settings override class-level settings.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns The merged auth metadata
 */
export function getEffectiveAuthMetadata(
  target: object,
  propertyKey: string | symbol,
): AuthMetadata {
  // Get class-level auth metadata
  const classAuth = getMetadata<AuthMetadata>(AUTH_METADATA, target) ?? {};

  // Get method-level auth metadata
  const methodAuth =
    getMetadata<AuthMetadata>(AUTH_METADATA, target, propertyKey) ?? {};

  // Method-level overrides class-level
  const merged: AuthMetadata = { ...classAuth, ...methodAuth };

  // If method is explicitly public, clear auth requirements
  if (merged.isPublic) {
    return {
      isPublic: true,
      failureStatusCode: merged.failureStatusCode,
    };
  }

  return merged;
}

/**
 * Checks if a route requires authentication based on merged metadata.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns True if the route requires any form of authentication
 */
export function requiresAuthentication(
  target: object,
  propertyKey: string | symbol,
): boolean {
  const auth = getEffectiveAuthMetadata(target, propertyKey);
  if (auth.isPublic) {
    return false;
  }
  return auth.requireAuth === true || auth.requireCryptoAuth === true;
}
