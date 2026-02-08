/**
 * @fileoverview OpenAPI operation decorators for Express Suite.
 * Provides @ApiOperation, @ApiTags, @ApiSummary, @ApiDescription, @Deprecated,
 * @ApiOperationId, and @ApiExample decorators for documenting API operations.
 * Supports both class-level and method-level application.
 * @module decorators/openapi
 */

import 'reflect-metadata';
import {
  ApiExampleDecoratorOptions,
  ApiOperationDecoratorOptions,
} from '../interfaces/openApi/decoratorOptions';
import { OPENAPI_CONTROLLER_METADATA, OPENAPI_METADATA } from './metadata-keys';
import {
  deepMergeMetadata,
  getMetadata,
  getMetadataOrDefault,
  mergeMetadata,
} from './metadata-collector';

/**
 * Internal interface for OpenAPI metadata stored on methods.
 */
export interface OpenAPIMethodMetadata {
  summary?: string;
  description?: string;
  tags?: string[];
  operationId?: string;
  deprecated?: boolean;
  examples?: ApiExampleDecoratorOptions[];
}

/**
 * Internal interface for OpenAPI metadata stored on classes.
 */
export interface OpenAPIClassMetadata {
  tags?: string[];
  description?: string;
  deprecated?: boolean;
}

/**
 * Creates a decorator that can be applied to both classes and methods.
 * @param applyMetadata - Function to apply the metadata
 * @returns A decorator function
 */
function createOpenAPIDecorator(
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
 * Decorator that sets full OpenAPI operation metadata on a method.
 * Can also be applied at class level to set default values for all methods.
 *
 * @param options - OpenAPI operation options
 * @returns Class or method decorator
 *
 * @example
 * ```typescript
 * class UserController {
 *   @ApiOperation({
 *     summary: 'Get user by ID',
 *     description: 'Retrieves a user by their unique identifier',
 *     tags: ['Users'],
 *     operationId: 'getUserById',
 *     deprecated: false
 *   })
 *   @Get('/:id')
 *   getUser() {}
 * }
 * ```
 */
export function ApiOperation(
  options: ApiOperationDecoratorOptions,
): ClassDecorator & MethodDecorator {
  return createOpenAPIDecorator((target, propertyKey) => {
    if (propertyKey !== undefined) {
      // Method-level: merge into OPENAPI_METADATA
      const metadata: OpenAPIMethodMetadata = {
        summary: options.summary,
        description: options.description,
        tags: options.tags,
        operationId: options.operationId,
        deprecated: options.deprecated,
      };
      // Remove undefined values
      Object.keys(metadata).forEach((key) => {
        if (metadata[key as keyof OpenAPIMethodMetadata] === undefined) {
          delete metadata[key as keyof OpenAPIMethodMetadata];
        }
      });
      deepMergeMetadata(OPENAPI_METADATA, metadata, target, propertyKey);
    } else {
      // Class-level: merge into OPENAPI_CONTROLLER_METADATA
      const metadata: OpenAPIClassMetadata = {
        tags: options.tags,
        description: options.description,
        deprecated: options.deprecated,
      };
      // Remove undefined values
      Object.keys(metadata).forEach((key) => {
        if (metadata[key as keyof OpenAPIClassMetadata] === undefined) {
          delete metadata[key as keyof OpenAPIClassMetadata];
        }
      });
      deepMergeMetadata(OPENAPI_CONTROLLER_METADATA, metadata, target);
    }
  });
}

/**
 * Decorator that adds tags to an operation or all operations in a controller.
 * Tags are used to group operations in OpenAPI documentation.
 * When applied at method level, tags are added to (not replace) class-level tags.
 *
 * @param tags - One or more tags to add
 * @returns Class or method decorator
 *
 * @example
 * ```typescript
 * @ApiTags('Users', 'Admin')
 * @ApiController('/api/users')
 * class UserController {
 *   @Get('/')
 *   listUsers() {} // Has tags: ['Users', 'Admin']
 *
 *   @ApiTags('Public')
 *   @Get('/public')
 *   publicUsers() {} // Has tags: ['Users', 'Admin', 'Public']
 * }
 * ```
 */
export function ApiTags(...tags: string[]): ClassDecorator & MethodDecorator {
  return createOpenAPIDecorator((target, propertyKey) => {
    if (propertyKey !== undefined) {
      // Method-level: add to existing tags
      const existing = getMetadataOrDefault<OpenAPIMethodMetadata>(
        OPENAPI_METADATA,
        target,
        propertyKey,
        {},
      );
      const existingTags = existing.tags ?? [];
      const mergedTags = [...existingTags, ...tags];
      mergeMetadata(
        OPENAPI_METADATA,
        { tags: mergedTags },
        target,
        propertyKey,
      );
    } else {
      // Class-level: set tags
      const existing = getMetadataOrDefault<OpenAPIClassMetadata>(
        OPENAPI_CONTROLLER_METADATA,
        target,
        undefined,
        {},
      );
      const existingTags = existing.tags ?? [];
      const mergedTags = [...existingTags, ...tags];
      mergeMetadata(OPENAPI_CONTROLLER_METADATA, { tags: mergedTags }, target);
    }
  });
}

/**
 * Decorator that sets the summary for an operation.
 * The summary is a short description of the operation.
 *
 * @param summary - Short summary text
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * class UserController {
 *   @ApiSummary('Get user by ID')
 *   @Get('/:id')
 *   getUser() {}
 * }
 * ```
 */
export function ApiSummary(summary: string): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    mergeMetadata(
      OPENAPI_METADATA,
      { summary },
      target.constructor,
      propertyKey,
    );
    return descriptor;
  };
}

/**
 * Decorator that sets the description for an operation.
 * The description provides detailed information about the operation.
 *
 * @param description - Detailed description text
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * class UserController {
 *   @ApiDescription('Retrieves a user by their unique identifier. Returns 404 if not found.')
 *   @Get('/:id')
 *   getUser() {}
 * }
 * ```
 */
export function ApiDescription(description: string): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    mergeMetadata(
      OPENAPI_METADATA,
      { description },
      target.constructor,
      propertyKey,
    );
    return descriptor;
  };
}

/**
 * Decorator that marks an operation or all operations in a controller as deprecated.
 * Deprecated operations are still functional but should not be used in new code.
 *
 * @returns Class or method decorator
 *
 * @example
 * ```typescript
 * class UserController {
 *   @Deprecated()
 *   @Get('/old-endpoint')
 *   oldEndpoint() {}
 * }
 *
 * // Or deprecate entire controller
 * @Deprecated()
 * @ApiController('/api/v1/users')
 * class LegacyUserController {}
 * ```
 */
export function Deprecated(): ClassDecorator & MethodDecorator {
  return createOpenAPIDecorator((target, propertyKey) => {
    if (propertyKey !== undefined) {
      mergeMetadata(
        OPENAPI_METADATA,
        { deprecated: true },
        target,
        propertyKey,
      );
    } else {
      mergeMetadata(OPENAPI_CONTROLLER_METADATA, { deprecated: true }, target);
    }
  });
}

/**
 * Decorator that sets a unique operation ID for an operation.
 * Operation IDs are used to uniquely identify operations in OpenAPI.
 *
 * @param operationId - Unique identifier for the operation
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * class UserController {
 *   @ApiOperationId('getUserById')
 *   @Get('/:id')
 *   getUser() {}
 * }
 * ```
 */
export function ApiOperationId(operationId: string): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    mergeMetadata(
      OPENAPI_METADATA,
      { operationId },
      target.constructor,
      propertyKey,
    );
    return descriptor;
  };
}

/**
 * Decorator that adds an example to an operation.
 * Examples can be for request bodies or responses.
 * Multiple examples can be added by stacking decorators.
 *
 * @param options - Example options including value, name, and type
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * class UserController {
 *   @ApiExample({
 *     name: 'validUser',
 *     summary: 'A valid user object',
 *     value: { id: '123', name: 'John Doe', email: 'john@example.com' },
 *     type: 'response',
 *     statusCode: 200
 *   })
 *   @ApiExample({
 *     name: 'createUserRequest',
 *     summary: 'Create user request body',
 *     value: { name: 'Jane Doe', email: 'jane@example.com' },
 *     type: 'request'
 *   })
 *   @Post('/')
 *   createUser() {}
 * }
 * ```
 */
export function ApiExample(
  options: ApiExampleDecoratorOptions,
): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const existing = getMetadataOrDefault<OpenAPIMethodMetadata>(
      OPENAPI_METADATA,
      target.constructor,
      propertyKey,
      {},
    );
    const existingExamples = existing.examples ?? [];
    existingExamples.push(options);
    mergeMetadata(
      OPENAPI_METADATA,
      { examples: existingExamples },
      target.constructor,
      propertyKey,
    );
    return descriptor;
  };
}

/**
 * Gets the effective OpenAPI metadata for a method, merging class-level and method-level settings.
 * Method-level settings override class-level settings, except for tags which are merged.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns The merged OpenAPI metadata
 */
export function getEffectiveOpenAPIMetadata(
  target: object,
  propertyKey: string | symbol,
): OpenAPIMethodMetadata {
  // Get class-level OpenAPI metadata
  const classMetadata =
    getMetadata<OpenAPIClassMetadata>(OPENAPI_CONTROLLER_METADATA, target) ??
    {};

  // Get method-level OpenAPI metadata
  const methodMetadata =
    getMetadata<OpenAPIMethodMetadata>(OPENAPI_METADATA, target, propertyKey) ??
    {};

  // Merge tags (class tags + method tags)
  const classTags = classMetadata.tags ?? [];
  const methodTags = methodMetadata.tags ?? [];
  const mergedTags = [...classTags, ...methodTags];

  // Method-level overrides class-level for other fields
  const merged: OpenAPIMethodMetadata = {
    description: methodMetadata.description ?? classMetadata.description,
    deprecated: methodMetadata.deprecated ?? classMetadata.deprecated,
    summary: methodMetadata.summary,
    operationId: methodMetadata.operationId,
    examples: methodMetadata.examples,
  };

  // Only add tags if there are any
  if (mergedTags.length > 0) {
    // Remove duplicates while preserving order
    merged.tags = [...new Set(mergedTags)];
  }

  // Remove undefined values
  Object.keys(merged).forEach((key) => {
    if (merged[key as keyof OpenAPIMethodMetadata] === undefined) {
      delete merged[key as keyof OpenAPIMethodMetadata];
    }
  });

  return merged;
}

/**
 * Gets the class-level OpenAPI metadata.
 *
 * @param target - The class constructor
 * @returns The class-level OpenAPI metadata
 */
export function getClassOpenAPIMetadata(
  target: object,
): OpenAPIClassMetadata | undefined {
  return getMetadata<OpenAPIClassMetadata>(OPENAPI_CONTROLLER_METADATA, target);
}

/**
 * Gets the method-level OpenAPI metadata without merging with class-level.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns The method-level OpenAPI metadata
 */
export function getMethodOpenAPIMetadata(
  target: object,
  propertyKey: string | symbol,
): OpenAPIMethodMetadata | undefined {
  return getMetadata<OpenAPIMethodMetadata>(
    OPENAPI_METADATA,
    target,
    propertyKey,
  );
}
