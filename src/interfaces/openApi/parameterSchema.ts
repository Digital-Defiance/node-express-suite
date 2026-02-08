/**
 * @fileoverview OpenAPI parameter schema interface.
 * Defines the schema structure for OpenAPI parameters.
 * @module interfaces/openApi/parameterSchema
 */

/**
 * OpenAPI parameter schema definition.
 * @property {string} type - The data type (string, number, integer, boolean, array, object)
 * @property {string} [format] - The format hint (date-time, email, uuid, etc.)
 * @property {string[]} [enum] - Allowed values for the parameter
 * @property {unknown} [default] - Default value if not provided
 * @property {number} [minimum] - Minimum value for numeric types
 * @property {number} [maximum] - Maximum value for numeric types
 * @property {number} [minLength] - Minimum length for string types
 * @property {number} [maxLength] - Maximum length for string types
 * @property {string} [pattern] - Regex pattern for string validation
 * @property {OpenAPIParameterSchema} [items] - Schema for array items
 * @property {boolean} [nullable] - Whether the value can be null (OpenAPI 3.0)
 */
export interface OpenAPIParameterSchema {
  type: string;
  format?: string;
  enum?: string[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: OpenAPIParameterSchema;
  nullable?: boolean;
}

/**
 * Type guard to check if object is a valid OpenAPI parameter schema.
 * @param {unknown} obj - Object to validate
 * @returns {boolean} True if object matches OpenAPIParameterSchema interface
 */
export function isOpenAPIParameterSchema(
  obj: unknown,
): obj is OpenAPIParameterSchema {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const schema = obj as Record<string, unknown>;
  if (typeof schema.type !== 'string') {
    return false;
  }
  if (schema.format !== undefined && typeof schema.format !== 'string') {
    return false;
  }
  if (schema.enum !== undefined && !Array.isArray(schema.enum)) {
    return false;
  }
  if (schema.minimum !== undefined && typeof schema.minimum !== 'number') {
    return false;
  }
  if (schema.maximum !== undefined && typeof schema.maximum !== 'number') {
    return false;
  }
  if (schema.minLength !== undefined && typeof schema.minLength !== 'number') {
    return false;
  }
  if (schema.maxLength !== undefined && typeof schema.maxLength !== 'number') {
    return false;
  }
  if (schema.pattern !== undefined && typeof schema.pattern !== 'string') {
    return false;
  }
  if (schema.items !== undefined && !isOpenAPIParameterSchema(schema.items)) {
    return false;
  }
  if (schema.nullable !== undefined && typeof schema.nullable !== 'boolean') {
    return false;
  }
  return true;
}
