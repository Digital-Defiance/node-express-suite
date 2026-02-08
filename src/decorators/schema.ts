/**
 * @fileoverview Schema decorators for Express Suite.
 * Provides @ApiSchema and @ApiProperty decorators for registering
 * OpenAPI schemas declaratively from TypeScript classes.
 * @module decorators/schema
 */

import 'reflect-metadata';
import {
  ApiPropertyDecoratorOptions,
  ApiSchemaDecoratorOptions,
  SchemaMetadata,
  SchemaPropertyMetadata,
} from '../interfaces/openApi/decoratorOptions';
import { OpenAPISchemaRegistry } from '../openapi/schemas';
import { SCHEMA_METADATA } from './metadata-keys';
import { getMetadata, setMetadata } from './metadata-collector';

/**
 * Symbol key for storing property metadata on a class.
 */
const SCHEMA_PROPERTIES_METADATA = Symbol('schema:properties');

/**
 * Decorator that registers a class as an OpenAPI schema.
 * The class properties decorated with @ApiProperty will be converted
 * to OpenAPI schema properties.
 *
 * @param options - Schema options including name, description, and example
 * @returns Class decorator
 *
 * @example
 * ```typescript
 * @ApiSchema({ description: 'User entity' })
 * class User {
 *   @ApiProperty({ type: 'string', description: 'User ID' })
 *   id: string;
 *
 *   @ApiProperty({ type: 'string', format: 'email' })
 *   email: string;
 * }
 * ```
 */
export function ApiSchema(
  options: ApiSchemaDecoratorOptions = {},
): ClassDecorator {
  return (target: object): void => {
    const constructor = target as new (...args: unknown[]) => unknown;

    // Get schema name from options or class name
    const schemaName = options.name ?? constructor.name;

    // Collect properties from this class and parent classes
    const properties = collectAllProperties(constructor);

    // Create schema metadata
    const schemaMetadata: SchemaMetadata = {
      name: schemaName,
      options,
      properties,
    };

    // Store metadata on the class
    setMetadata(SCHEMA_METADATA, schemaMetadata, target);

    // Build and register the OpenAPI schema
    const openApiSchema = buildOpenAPISchema(schemaMetadata);
    OpenAPISchemaRegistry.registerSchema(schemaName, openApiSchema);
  };
}

/**
 * Decorator that marks a class property for inclusion in the OpenAPI schema.
 * Must be used in conjunction with @ApiSchema on the class.
 *
 * @param options - Property options including type, format, description, etc.
 * @returns Property decorator
 *
 * @example
 * ```typescript
 * class User {
 *   @ApiProperty({
 *     type: 'string',
 *     description: 'Unique identifier',
 *     example: '123e4567-e89b-12d3-a456-426614174000'
 *   })
 *   id: string;
 *
 *   @ApiProperty({
 *     type: 'string',
 *     format: 'email',
 *     required: true
 *   })
 *   email: string;
 *
 *   @ApiProperty({
 *     type: 'integer',
 *     minimum: 0,
 *     maximum: 150
 *   })
 *   age?: number;
 * }
 * ```
 */
export function ApiProperty(
  options: ApiPropertyDecoratorOptions = {},
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    // Get the constructor (class) from the prototype
    const constructor = target.constructor;

    // Get existing properties or create new array
    const existingProperties =
      (Reflect.getMetadata(
        SCHEMA_PROPERTIES_METADATA,
        constructor,
      ) as SchemaPropertyMetadata[]) ?? [];

    // Infer type from TypeScript metadata if not provided
    const inferredOptions = inferPropertyType(target, propertyKey, options);

    // Add this property
    const propertyMetadata: SchemaPropertyMetadata = {
      propertyKey: String(propertyKey),
      options: inferredOptions,
    };

    existingProperties.push(propertyMetadata);

    // Store updated properties
    Reflect.defineMetadata(
      SCHEMA_PROPERTIES_METADATA,
      existingProperties,
      constructor,
    );
  };
}

/**
 * Collects all properties from a class and its parent classes.
 * Supports inheritance by walking up the prototype chain.
 * Child class properties override parent class properties with the same name.
 *
 * @param target - The class constructor
 * @returns Array of all property metadata
 */
function collectAllProperties(
  target: new (...args: unknown[]) => unknown,
): SchemaPropertyMetadata[] {
  const propertyMap = new Map<string, SchemaPropertyMetadata>();

  // Collect classes in order from parent to child
  const classChain: object[] = [];
  let currentClass: object | null = target;
  while (currentClass && currentClass !== Function.prototype) {
    classChain.unshift(currentClass); // Add to beginning so parents come first
    currentClass = Object.getPrototypeOf(currentClass) as object | null;
  }

  // Process from parent to child, so child properties override parent
  for (const cls of classChain) {
    const properties =
      (Reflect.getMetadata(
        SCHEMA_PROPERTIES_METADATA,
        cls,
      ) as SchemaPropertyMetadata[]) ?? [];

    for (const prop of properties) {
      propertyMap.set(prop.propertyKey, prop);
    }
  }

  return Array.from(propertyMap.values());
}

/**
 * Infers the OpenAPI type from TypeScript design:type metadata.
 *
 * @param target - The class prototype
 * @param propertyKey - The property name
 * @param options - User-provided options
 * @returns Options with inferred type if not provided
 */
function inferPropertyType(
  target: object,
  propertyKey: string | symbol,
  options: ApiPropertyDecoratorOptions,
): ApiPropertyDecoratorOptions {
  // If type is already provided, use it
  if (options.type) {
    return options;
  }

  // Try to get TypeScript design:type metadata
  const designType = Reflect.getMetadata('design:type', target, propertyKey);

  if (!designType) {
    return options;
  }

  // Map TypeScript types to OpenAPI types
  const typeMap: Record<string, string> = {
    String: 'string',
    Number: 'number',
    Boolean: 'boolean',
    Array: 'array',
    Object: 'object',
    Date: 'string',
  };

  const inferredType = typeMap[designType.name];

  if (inferredType) {
    const result = { ...options, type: inferredType };

    // Add format for Date
    if (designType.name === 'Date' && !options.format) {
      result.format = 'date-time';
    }

    return result;
  }

  return options;
}

/**
 * Builds an OpenAPI schema object from schema metadata.
 *
 * @param metadata - The schema metadata
 * @returns OpenAPI schema object
 */
function buildOpenAPISchema(metadata: SchemaMetadata): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    type: 'object',
  };

  // Add description if provided
  if (metadata.options.description) {
    schema.description = metadata.options.description;
  }

  // Add example if provided
  if (metadata.options.example !== undefined) {
    schema.example = metadata.options.example;
  }

  // Build properties
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const prop of metadata.properties) {
    const propSchema = buildPropertySchema(prop.options);
    properties[prop.propertyKey] = propSchema;

    // Track required properties
    if (prop.options.required) {
      required.push(prop.propertyKey);
    }
  }

  if (Object.keys(properties).length > 0) {
    schema.properties = properties;
  }

  if (required.length > 0) {
    schema.required = required;
  }

  return schema;
}

/**
 * Builds an OpenAPI property schema from property options.
 *
 * @param options - The property options
 * @returns OpenAPI property schema
 */
function buildPropertySchema(
  options: ApiPropertyDecoratorOptions,
): Record<string, unknown> {
  const schema: Record<string, unknown> = {};

  // Handle $ref separately
  if (options.$ref) {
    return { $ref: `#/components/schemas/${options.$ref}` };
  }

  // Type
  if (options.type) {
    schema.type = options.type;
  }

  // Format
  if (options.format) {
    schema.format = options.format;
  }

  // Description
  if (options.description) {
    schema.description = options.description;
  }

  // Example
  if (options.example !== undefined) {
    schema.example = options.example;
  }

  // Enum
  if (options.enum && options.enum.length > 0) {
    schema.enum = options.enum;
  }

  // Nullable
  if (options.nullable) {
    schema.nullable = options.nullable;
  }

  // Numeric constraints
  if (options.minimum !== undefined) {
    schema.minimum = options.minimum;
  }
  if (options.maximum !== undefined) {
    schema.maximum = options.maximum;
  }

  // String constraints
  if (options.minLength !== undefined) {
    schema.minLength = options.minLength;
  }
  if (options.maxLength !== undefined) {
    schema.maxLength = options.maxLength;
  }
  if (options.pattern) {
    schema.pattern = options.pattern;
  }

  // Array items
  if (options.items) {
    if (typeof options.items === 'string') {
      schema.items = { $ref: `#/components/schemas/${options.items}` };
    } else {
      schema.items = options.items;
    }
  }

  return schema;
}

/**
 * Gets the schema metadata for a class.
 *
 * @param target - The class constructor
 * @returns The schema metadata or undefined
 */
export function getSchemaMetadata(target: object): SchemaMetadata | undefined {
  return getMetadata<SchemaMetadata>(SCHEMA_METADATA, target);
}

/**
 * Gets the property metadata for a class (without inheritance).
 *
 * @param target - The class constructor
 * @returns Array of property metadata
 */
export function getPropertyMetadata(target: object): SchemaPropertyMetadata[] {
  return (
    (Reflect.getMetadata(
      SCHEMA_PROPERTIES_METADATA,
      target,
    ) as SchemaPropertyMetadata[]) ?? []
  );
}

/**
 * Gets all property metadata for a class including inherited properties.
 *
 * @param target - The class constructor
 * @returns Array of all property metadata
 */
export function getAllPropertyMetadata(
  target: new (...args: unknown[]) => unknown,
): SchemaPropertyMetadata[] {
  return collectAllProperties(target);
}

/**
 * Checks if a class has been decorated with @ApiSchema.
 *
 * @param target - The class constructor
 * @returns True if the class has schema metadata
 */
export function hasSchemaMetadata(target: object): boolean {
  return getSchemaMetadata(target) !== undefined;
}

/**
 * Manually registers a schema from a decorated class.
 * Useful when you need to re-register or update a schema.
 *
 * @param target - The class constructor decorated with @ApiSchema
 */
export function registerSchema(
  target: new (...args: unknown[]) => unknown,
): void {
  const metadata = getSchemaMetadata(target);
  if (metadata) {
    const openApiSchema = buildOpenAPISchema(metadata);
    OpenAPISchemaRegistry.registerSchema(metadata.name, openApiSchema);
  }
}
