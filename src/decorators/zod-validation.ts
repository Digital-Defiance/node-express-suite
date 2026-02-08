/**
 * @fileoverview Zod schema validation decorator and OpenAPI conversion utilities.
 * Converts Zod schemas to express-validator chains and OpenAPI schemas.
 * @module decorators/zod-validation
 */

import { ValidationChain, body } from 'express-validator';
import { z } from 'zod';
import { OpenAPIParameterSchema } from '../interfaces/openApi/parameterSchema';

/**
 * OpenAPI schema definition for complex types (objects with properties).
 * Extends OpenAPIParameterSchema with object-specific fields.
 */
export interface OpenAPIObjectSchema {
  type: 'object';
  properties?: Record<string, OpenAPISchemaType>;
  required?: string[];
  description?: string;
  example?: unknown;
  additionalProperties?: boolean | OpenAPISchemaType;
  nullable?: boolean;
  title?: string;
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
}

/**
 * OpenAPI schema for array types.
 */
export interface OpenAPIArraySchema {
  type: 'array';
  items: OpenAPISchemaType;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  description?: string;
  example?: unknown;
  nullable?: boolean;
  title?: string;
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
}

/**
 * OpenAPI schema for union types (oneOf, anyOf).
 */
export interface OpenAPIUnionSchema {
  oneOf?: OpenAPISchemaType[];
  anyOf?: OpenAPISchemaType[];
  description?: string;
  example?: unknown;
  nullable?: boolean;
  title?: string;
  discriminator?: {
    propertyName: string;
    mapping?: Record<string, string>;
  };
}

/**
 * Combined OpenAPI schema type that can represent any schema.
 */
export type OpenAPISchemaType =
  | OpenAPIParameterSchema
  | OpenAPIObjectSchema
  | OpenAPIArraySchema
  | OpenAPIUnionSchema;

/**
 * Extended OpenAPI parameter schema with additional fields for descriptions and examples.
 */
export interface ZodOpenAPIParameterSchema extends OpenAPIParameterSchema {
  description?: string;
  example?: unknown;
  title?: string;
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
  exclusiveMinimum?: boolean;
  exclusiveMaximum?: boolean;
  multipleOf?: number;
}

/**
 * Zod check type for internal use.
 */
interface ZodCheck {
  kind: string;
  value?: number;
  regex?: RegExp;
  message?: string;
  inclusive?: boolean;
}

/**
 * Metadata that can be attached to Zod schemas via openapi() extension.
 */
export interface ZodOpenAPIMetadata {
  description?: string;
  example?: unknown;
  examples?: unknown[];
  title?: string;
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  format?: string;
  default?: unknown;
}

/**
 * Extracts OpenAPI metadata from a Zod schema.
 * Checks for description via .describe() and custom metadata via ._def.
 *
 * @param schema - The Zod schema to extract metadata from
 * @returns The extracted metadata object
 */
export function extractZodMetadata(schema: z.ZodType): ZodOpenAPIMetadata {
  const metadata: ZodOpenAPIMetadata = {};

  // Extract description from .describe()
  if (schema._def.description) {
    metadata.description = schema._def.description;
  }

  // Check for custom openapi metadata stored in _def
  const def = schema._def as Record<string, unknown>;
  if (def.openapi && typeof def.openapi === 'object') {
    const openapi = def.openapi as ZodOpenAPIMetadata;
    if (openapi.description) metadata.description = openapi.description;
    if (openapi.example !== undefined) metadata.example = openapi.example;
    if (openapi.examples) metadata.examples = openapi.examples;
    if (openapi.title) metadata.title = openapi.title;
    if (openapi.deprecated !== undefined)
      metadata.deprecated = openapi.deprecated;
    if (openapi.readOnly !== undefined) metadata.readOnly = openapi.readOnly;
    if (openapi.writeOnly !== undefined) metadata.writeOnly = openapi.writeOnly;
    if (openapi.format) metadata.format = openapi.format;
    if (openapi.default !== undefined) metadata.default = openapi.default;
  }

  return metadata;
}

/**
 * Applies extracted metadata to an OpenAPI schema.
 *
 * @param schema - The OpenAPI schema to apply metadata to
 * @param metadata - The metadata to apply
 * @returns The schema with metadata applied
 */
function applyMetadata<T extends OpenAPISchemaType>(
  schema: T,
  metadata: ZodOpenAPIMetadata,
): T {
  const result = { ...schema };

  if (metadata.description) {
    Object.assign(result, { description: metadata.description });
  }
  if (metadata.example !== undefined) {
    Object.assign(result, { example: metadata.example });
  }
  if (metadata.title) {
    Object.assign(result, { title: metadata.title });
  }
  if (metadata.deprecated !== undefined) {
    Object.assign(result, { deprecated: metadata.deprecated });
  }
  if (metadata.readOnly !== undefined) {
    Object.assign(result, { readOnly: metadata.readOnly });
  }
  if (metadata.writeOnly !== undefined) {
    Object.assign(result, { writeOnly: metadata.writeOnly });
  }
  if (metadata.format && 'type' in result && result.type === 'string') {
    Object.assign(result, { format: metadata.format });
  }

  return result;
}

/**
 * Converts a Zod schema to an OpenAPI schema.
 * Supports nested objects, arrays, unions, enums, and various Zod types.
 * Extracts descriptions and examples from Zod schema metadata.
 *
 * @param schema - The Zod schema to convert
 * @returns The OpenAPI schema representation
 *
 * @example
 * ```typescript
 * const UserSchema = z.object({
 *   id: z.string().uuid().describe('Unique user identifier'),
 *   name: z.string().min(1).max(100).describe('User display name'),
 *   email: z.string().email().describe('User email address'),
 *   age: z.number().int().positive().optional().describe('User age in years'),
 *   roles: z.array(z.enum(['admin', 'user', 'guest'])).describe('User roles'),
 * });
 *
 * const openApiSchema = zodToOpenAPI(UserSchema);
 * // Returns:
 * // {
 * //   type: 'object',
 * //   properties: {
 * //     id: { type: 'string', format: 'uuid', description: 'Unique user identifier' },
 * //     name: { type: 'string', minLength: 1, maxLength: 100, description: 'User display name' },
 * //     email: { type: 'string', format: 'email', description: 'User email address' },
 * //     age: { type: 'integer', minimum: 1, description: 'User age in years' },
 * //     roles: { type: 'array', items: { type: 'string', enum: ['admin', 'user', 'guest'] }, description: 'User roles' },
 * //   },
 * //   required: ['id', 'name', 'email', 'roles'],
 * // }
 * ```
 */
export function zodToOpenAPI(schema: z.ZodType): OpenAPISchemaType {
  return convertZodType(schema);
}

/**
 * Internal function to convert a Zod type to OpenAPI schema.
 * Handles all Zod type variants recursively.
 * Extracts and applies metadata (description, example, etc.) from Zod schemas.
 */
function convertZodType(zodType: z.ZodType): OpenAPISchemaType {
  // Extract metadata from the schema
  const metadata = extractZodMetadata(zodType);

  // Handle ZodOptional - unwrap and mark as not required
  if (zodType instanceof z.ZodOptional) {
    const innerSchema = convertZodType(zodType._def.innerType);
    return applyMetadata(innerSchema, metadata);
  }

  // Handle ZodNullable - add nullable: true
  if (zodType instanceof z.ZodNullable) {
    const innerSchema = convertZodType(zodType._def.innerType);
    return applyMetadata({ ...innerSchema, nullable: true }, metadata);
  }

  // Handle ZodDefault - unwrap and add default value
  if (zodType instanceof z.ZodDefault) {
    const innerSchema = convertZodType(zodType._def.innerType);
    const defaultValue = zodType._def.defaultValue();
    return applyMetadata({ ...innerSchema, default: defaultValue }, metadata);
  }

  // Handle ZodEffects (refinements, transforms) - unwrap
  if (zodType instanceof z.ZodEffects) {
    const innerSchema = convertZodType(zodType._def.schema);
    return applyMetadata(innerSchema, metadata);
  }

  // Handle ZodCatch - unwrap
  if (zodType instanceof z.ZodCatch) {
    const innerSchema = convertZodType(zodType._def.innerType);
    return applyMetadata(innerSchema, metadata);
  }

  // Handle ZodBranded - unwrap
  if (zodType instanceof z.ZodBranded) {
    const innerSchema = convertZodType(zodType._def.type);
    return applyMetadata(innerSchema, metadata);
  }

  // Handle ZodReadonly - unwrap and mark as readOnly
  if (zodType instanceof z.ZodReadonly) {
    const innerSchema = convertZodType(zodType._def.innerType);
    return applyMetadata({ ...innerSchema, readOnly: true }, metadata);
  }

  // Handle ZodString
  if (zodType instanceof z.ZodString) {
    return applyMetadata(convertZodString(zodType), metadata);
  }

  // Handle ZodNumber
  if (zodType instanceof z.ZodNumber) {
    return applyMetadata(convertZodNumber(zodType), metadata);
  }

  // Handle ZodBigInt
  if (zodType instanceof z.ZodBigInt) {
    return applyMetadata({ type: 'integer', format: 'int64' }, metadata);
  }

  // Handle ZodBoolean
  if (zodType instanceof z.ZodBoolean) {
    return applyMetadata({ type: 'boolean' }, metadata);
  }

  // Handle ZodDate
  if (zodType instanceof z.ZodDate) {
    return applyMetadata({ type: 'string', format: 'date-time' }, metadata);
  }

  // Handle ZodEnum
  if (zodType instanceof z.ZodEnum) {
    return applyMetadata(
      {
        type: 'string',
        enum: zodType._def.values as string[],
      },
      metadata,
    );
  }

  // Handle ZodNativeEnum
  if (zodType instanceof z.ZodNativeEnum) {
    const enumValues = Object.values(zodType._def.values);
    // Filter out numeric keys for numeric enums
    const stringValues = enumValues.filter(
      (v): v is string => typeof v === 'string',
    );
    if (stringValues.length > 0) {
      return applyMetadata({ type: 'string', enum: stringValues }, metadata);
    }
    // Numeric enum
    return applyMetadata(
      {
        type: 'integer',
        enum: enumValues
          .filter((v): v is string => typeof v === 'number')
          .map(String),
      },
      metadata,
    );
  }

  // Handle ZodLiteral
  if (zodType instanceof z.ZodLiteral) {
    const value = zodType._def.value;
    if (typeof value === 'string') {
      return applyMetadata({ type: 'string', enum: [value] }, metadata);
    }
    if (typeof value === 'number') {
      return applyMetadata({ type: 'number', enum: [String(value)] }, metadata);
    }
    if (typeof value === 'boolean') {
      return applyMetadata({ type: 'boolean' }, metadata);
    }
    return applyMetadata({ type: 'string' }, metadata);
  }

  // Handle ZodArray
  if (zodType instanceof z.ZodArray) {
    return applyMetadata(convertZodArray(zodType), metadata);
  }

  // Handle ZodObject
  if (zodType instanceof z.ZodObject) {
    return applyMetadata(convertZodObject(zodType), metadata);
  }

  // Handle ZodUnion
  if (zodType instanceof z.ZodUnion) {
    const options = zodType._def.options as z.ZodType[];
    return applyMetadata(
      {
        oneOf: options.map((opt) => convertZodType(opt)),
      },
      metadata,
    );
  }

  // Handle ZodDiscriminatedUnion
  if (zodType instanceof z.ZodDiscriminatedUnion) {
    const discriminator = zodType._def.discriminator as string;
    const options = Array.from(zodType._def.optionsMap.values()) as z.ZodType[];
    const result: OpenAPIUnionSchema = {
      oneOf: options.map((opt) => convertZodType(opt)),
      discriminator: {
        propertyName: discriminator,
      },
    };
    return applyMetadata(result, metadata);
  }

  // Handle ZodIntersection
  if (zodType instanceof z.ZodIntersection) {
    const left = convertZodType(zodType._def.left);
    const right = convertZodType(zodType._def.right);
    // Merge the two schemas if they're both objects
    if (isObjectSchema(left) && isObjectSchema(right)) {
      return applyMetadata(
        {
          type: 'object',
          properties: { ...left.properties, ...right.properties },
          required: [...(left.required ?? []), ...(right.required ?? [])],
        },
        metadata,
      );
    }
    return applyMetadata(
      {
        anyOf: [left, right],
      },
      metadata,
    );
  }

  // Handle ZodRecord
  if (zodType instanceof z.ZodRecord) {
    const valueSchema = convertZodType(zodType._def.valueType);
    return applyMetadata(
      {
        type: 'object',
        additionalProperties: valueSchema,
      },
      metadata,
    );
  }

  // Handle ZodMap - convert to object with additionalProperties
  if (zodType instanceof z.ZodMap) {
    const valueSchema = convertZodType(zodType._def.valueType);
    return applyMetadata(
      {
        type: 'object',
        additionalProperties: valueSchema,
      },
      metadata,
    );
  }

  // Handle ZodSet - convert to array with uniqueItems
  if (zodType instanceof z.ZodSet) {
    const valueSchema = convertZodType(zodType._def.valueType);
    return applyMetadata(
      {
        type: 'array',
        items: valueSchema,
        uniqueItems: true,
      },
      metadata,
    );
  }

  // Handle ZodTuple
  if (zodType instanceof z.ZodTuple) {
    const items = zodType._def.items as z.ZodType[];
    return applyMetadata(
      {
        type: 'array',
        items:
          items.length === 1
            ? convertZodType(items[0])
            : { oneOf: items.map((item) => convertZodType(item)) },
        minItems: items.length,
        maxItems: items.length,
      },
      metadata,
    );
  }

  // Handle ZodAny, ZodUnknown
  if (zodType instanceof z.ZodAny || zodType instanceof z.ZodUnknown) {
    return applyMetadata({ type: 'object' }, metadata);
  }

  // Handle ZodVoid, ZodUndefined, ZodNull, ZodNever
  if (zodType instanceof z.ZodVoid || zodType instanceof z.ZodUndefined) {
    return applyMetadata({ type: 'string' }, metadata);
  }

  if (zodType instanceof z.ZodNull) {
    return applyMetadata({ type: 'string', nullable: true }, metadata);
  }

  if (zodType instanceof z.ZodNever) {
    // ZodNever represents an impossible type - return empty schema
    return applyMetadata({ type: 'string' }, metadata);
  }

  // Handle ZodNaN - represents NaN value
  if (zodType instanceof z.ZodNaN) {
    return applyMetadata({ type: 'number' }, metadata);
  }

  // Handle ZodLazy - evaluate and convert
  if (zodType instanceof z.ZodLazy) {
    const innerSchema = convertZodType(zodType._def.getter());
    return applyMetadata(innerSchema, metadata);
  }

  // Handle ZodPipeline
  if (zodType instanceof z.ZodPipeline) {
    const innerSchema = convertZodType(zodType._def.out);
    return applyMetadata(innerSchema, metadata);
  }

  // Handle ZodPromise - unwrap the inner type
  if (zodType instanceof z.ZodPromise) {
    const innerSchema = convertZodType(zodType._def.type);
    return applyMetadata(innerSchema, metadata);
  }

  // Handle ZodFunction - not directly representable in OpenAPI
  if (zodType instanceof z.ZodFunction) {
    return applyMetadata({ type: 'object' }, metadata);
  }

  // Handle ZodSymbol - not directly representable in OpenAPI
  if (zodType instanceof z.ZodSymbol) {
    return applyMetadata({ type: 'string' }, metadata);
  }

  // Default fallback
  return applyMetadata({ type: 'string' }, metadata);
}

/**
 * Converts a ZodString to OpenAPI schema with all string validations.
 */
function convertZodString(zodString: z.ZodString): ZodOpenAPIParameterSchema {
  const schema: ZodOpenAPIParameterSchema = { type: 'string' };

  if (zodString._def.checks) {
    for (const check of zodString._def.checks as ZodCheck[]) {
      switch (check.kind) {
        case 'min':
          schema.minLength = check.value;
          break;
        case 'max':
          schema.maxLength = check.value;
          break;
        case 'length':
          schema.minLength = check.value;
          schema.maxLength = check.value;
          break;
        case 'email':
          schema.format = 'email';
          break;
        case 'url':
          schema.format = 'uri';
          break;
        case 'uuid':
          schema.format = 'uuid';
          break;
        case 'cuid':
        case 'cuid2':
          schema.format = 'cuid';
          break;
        case 'ulid':
          schema.format = 'ulid';
          break;
        case 'datetime':
          schema.format = 'date-time';
          break;
        case 'date':
          schema.format = 'date';
          break;
        case 'time':
          schema.format = 'time';
          break;
        case 'duration':
          schema.format = 'duration';
          break;
        case 'ip':
          schema.format = 'ip';
          break;
        case 'emoji':
          // No direct OpenAPI equivalent
          break;
        case 'base64':
          schema.format = 'byte';
          break;
        case 'nanoid':
          schema.format = 'nanoid';
          break;
        case 'regex':
          if (check.regex) {
            schema.pattern = check.regex.source;
          }
          break;
        case 'startsWith':
        case 'endsWith':
        case 'includes':
        case 'toLowerCase':
        case 'toUpperCase':
        case 'trim':
          // These don't have direct OpenAPI equivalents
          break;
      }
    }
  }

  return schema;
}

/**
 * Converts a ZodNumber to OpenAPI schema with all number validations.
 */
function convertZodNumber(zodNumber: z.ZodNumber): ZodOpenAPIParameterSchema {
  const schema: ZodOpenAPIParameterSchema = { type: 'number' };

  if (zodNumber._def.checks) {
    for (const check of zodNumber._def.checks as ZodCheck[]) {
      switch (check.kind) {
        case 'int':
          schema.type = 'integer';
          break;
        case 'min':
          schema.minimum = check.value;
          if (check.inclusive === false) {
            schema.exclusiveMinimum = true;
          }
          break;
        case 'max':
          schema.maximum = check.value;
          if (check.inclusive === false) {
            schema.exclusiveMaximum = true;
          }
          break;
        case 'multipleOf':
          schema.multipleOf = check.value;
          break;
        case 'finite':
        case 'safe':
          // These don't have direct OpenAPI equivalents
          break;
      }
    }
  }

  return schema;
}

/**
 * Converts a ZodArray to OpenAPI array schema.
 */
function convertZodArray(zodArray: z.ZodArray<z.ZodType>): OpenAPIArraySchema {
  const itemSchema = convertZodType(zodArray._def.type);
  const schema: OpenAPIArraySchema = {
    type: 'array',
    items: itemSchema,
  };

  if (
    zodArray._def.minLength !== null &&
    zodArray._def.minLength !== undefined
  ) {
    schema.minItems = zodArray._def.minLength.value;
  }

  if (
    zodArray._def.maxLength !== null &&
    zodArray._def.maxLength !== undefined
  ) {
    schema.maxItems = zodArray._def.maxLength.value;
  }

  if (
    zodArray._def.exactLength !== null &&
    zodArray._def.exactLength !== undefined
  ) {
    schema.minItems = zodArray._def.exactLength.value;
    schema.maxItems = zodArray._def.exactLength.value;
  }

  return schema;
}

/**
 * Converts a ZodObject to OpenAPI object schema.
 */
function convertZodObject(
  zodObject: z.ZodObject<z.ZodRawShape>,
): OpenAPIObjectSchema {
  const properties: Record<string, OpenAPISchemaType> = {};
  const required: string[] = [];

  const shape = zodObject._def.shape();

  for (const [key, value] of Object.entries(shape)) {
    const zodValue = value as z.ZodType;
    properties[key] = convertZodType(zodValue);

    // Check if the field is required (not optional)
    if (!isOptionalType(zodValue)) {
      required.push(key);
    }
  }

  const schema: OpenAPIObjectSchema = {
    type: 'object',
    properties,
  };

  if (required.length > 0) {
    schema.required = required;
  }

  return schema;
}

/**
 * Checks if a Zod type is optional.
 */
function isOptionalType(zodType: z.ZodType): boolean {
  if (zodType instanceof z.ZodOptional) {
    return true;
  }
  if (zodType instanceof z.ZodDefault) {
    return true;
  }
  if (zodType instanceof z.ZodNullable) {
    return isOptionalType(zodType._def.innerType);
  }
  return false;
}

/**
 * Type guard to check if a schema is an object schema.
 */
function isObjectSchema(
  schema: OpenAPISchemaType,
): schema is OpenAPIObjectSchema {
  return 'type' in schema && schema.type === 'object' && 'properties' in schema;
}

/**
 * Extracts description from a Zod schema if available.
 *
 * @param schema - The Zod schema
 * @returns The description or undefined
 */
export function getZodDescription(schema: z.ZodType): string | undefined {
  // First check the direct description
  if (schema._def.description) {
    return schema._def.description;
  }

  // Check for custom openapi metadata
  const def = schema._def as Record<string, unknown>;
  if (def.openapi && typeof def.openapi === 'object') {
    const openapi = def.openapi as ZodOpenAPIMetadata;
    if (openapi.description) {
      return openapi.description;
    }
  }

  return undefined;
}

/**
 * Extracts example from a Zod schema if available.
 * Checks for custom openapi metadata that may contain examples.
 *
 * @param schema - The Zod schema
 * @returns The example or undefined
 */
export function getZodExample(schema: z.ZodType): unknown | undefined {
  // Check for custom openapi metadata
  const def = schema._def as Record<string, unknown>;
  if (def.openapi && typeof def.openapi === 'object') {
    const openapi = def.openapi as ZodOpenAPIMetadata;
    if (openapi.example !== undefined) {
      return openapi.example;
    }
    if (openapi.examples && openapi.examples.length > 0) {
      return openapi.examples[0];
    }
  }

  // Check for default value as a fallback example
  if (schema instanceof z.ZodDefault) {
    return schema._def.defaultValue();
  }

  return undefined;
}

/**
 * Extracts all examples from a Zod schema if available.
 *
 * @param schema - The Zod schema
 * @returns Array of examples or undefined
 */
export function getZodExamples(schema: z.ZodType): unknown[] | undefined {
  const def = schema._def as Record<string, unknown>;
  if (def.openapi && typeof def.openapi === 'object') {
    const openapi = def.openapi as ZodOpenAPIMetadata;
    if (openapi.examples && openapi.examples.length > 0) {
      return openapi.examples;
    }
    if (openapi.example !== undefined) {
      return [openapi.example];
    }
  }

  return undefined;
}

/**
 * Extracts the title from a Zod schema if available.
 *
 * @param schema - The Zod schema
 * @returns The title or undefined
 */
export function getZodTitle(schema: z.ZodType): string | undefined {
  const def = schema._def as Record<string, unknown>;
  if (def.openapi && typeof def.openapi === 'object') {
    const openapi = def.openapi as ZodOpenAPIMetadata;
    return openapi.title;
  }
  return undefined;
}

/**
 * Checks if a Zod schema is marked as deprecated.
 *
 * @param schema - The Zod schema
 * @returns True if deprecated, false otherwise
 */
export function isZodDeprecated(schema: z.ZodType): boolean {
  const def = schema._def as Record<string, unknown>;
  if (def.openapi && typeof def.openapi === 'object') {
    const openapi = def.openapi as ZodOpenAPIMetadata;
    return openapi.deprecated === true;
  }
  return false;
}

// Convert Zod schema to express-validator chains
export function zodToExpressValidator<TLanguage extends string>(
  schema: z.ZodType,
): (_lang: TLanguage) => ValidationChain[] {
  return (_lang: TLanguage) => {
    const chains: ValidationChain[] = [];

    // Only process if it's a ZodObject with shape
    if (!(schema instanceof z.ZodObject)) {
      return chains;
    }

    const shape = schema._def.shape();

    Object.entries(shape).forEach(([key, zodType]) => {
      let chain = body(key);
      let currentType = zodType as z.ZodType;

      // Handle optional fields
      if (currentType instanceof z.ZodOptional) {
        chain = chain.optional();
        currentType = currentType._def.innerType;
      }

      // Handle nullable fields
      if (currentType instanceof z.ZodNullable) {
        chain = chain.optional({ values: 'null' });
        currentType = currentType._def.innerType;
      }

      // Handle default fields
      if (currentType instanceof z.ZodDefault) {
        chain = chain.optional();
        currentType = currentType._def.innerType;
      }

      // Handle string validations
      if (currentType instanceof z.ZodString) {
        chain = chain.isString();

        if (currentType._def.checks) {
          for (const check of currentType._def.checks as ZodCheck[]) {
            switch (check.kind) {
              case 'min':
                chain = chain.isLength({ min: check.value });
                break;
              case 'max':
                chain = chain.isLength({ max: check.value });
                break;
              case 'length':
                chain = chain.isLength({ min: check.value, max: check.value });
                break;
              case 'email':
                chain = chain.isEmail();
                break;
              case 'url':
                chain = chain.isURL();
                break;
              case 'uuid':
                chain = chain.isUUID();
                break;
            }
          }
        }
      }

      // Handle number validations
      if (currentType instanceof z.ZodNumber) {
        let isInt = false;
        const numericOptions: { min?: number; max?: number } = {};

        if (currentType._def.checks) {
          for (const check of currentType._def.checks as ZodCheck[]) {
            switch (check.kind) {
              case 'int':
                isInt = true;
                break;
              case 'min':
                numericOptions.min = check.value;
                break;
              case 'max':
                numericOptions.max = check.value;
                break;
            }
          }
        }

        if (isInt) {
          chain = chain.isInt(numericOptions);
        } else {
          chain = chain.isNumeric();
          if (numericOptions.min !== undefined) {
            chain = chain.custom(
              (value) => Number(value) >= numericOptions.min!,
            );
          }
          if (numericOptions.max !== undefined) {
            chain = chain.custom(
              (value) => Number(value) <= numericOptions.max!,
            );
          }
        }
      }

      // Handle boolean validations
      if (currentType instanceof z.ZodBoolean) {
        chain = chain.isBoolean();
      }

      // Handle array validations
      if (currentType instanceof z.ZodArray) {
        chain = chain.isArray();
      }

      chains.push(chain);
    });

    return chains;
  };
}

// Decorator that uses Zod schema
export function ZodValidate(schema: z.ZodType) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    // Store Zod schema metadata for runtime validation
    Reflect.defineMetadata('zodSchema', schema, target, propertyKey);
    return descriptor;
  };
}
