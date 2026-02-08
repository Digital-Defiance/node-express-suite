/**
 * @fileoverview OpenAPI parameter interface.
 * Defines the structure for OpenAPI operation parameters.
 * @module interfaces/openApi/parameter
 */

import {
  OpenAPIParameterSchema,
  isOpenAPIParameterSchema,
} from './parameterSchema';

// Re-export OpenAPIParameterSchema for convenience
export type { OpenAPIParameterSchema } from './parameterSchema';
export { isOpenAPIParameterSchema } from './parameterSchema';

/**
 * Valid locations for OpenAPI parameters.
 */
export const OPENAPI_PARAMETER_LOCATIONS = [
  'path',
  'query',
  'header',
  'cookie',
] as const;
export type OpenAPIParameterLocation =
  (typeof OPENAPI_PARAMETER_LOCATIONS)[number];

/**
 * OpenAPI parameter definition.
 * @property {string} name - The name of the parameter
 * @property {OpenAPIParameterLocation} in - The location of the parameter
 * @property {boolean} [required] - Whether the parameter is required
 * @property {string} [description] - Description of the parameter
 * @property {OpenAPIParameterSchema} schema - The schema defining the parameter type
 */
export interface OpenAPIParameter {
  name: string;
  in: OpenAPIParameterLocation;
  required?: boolean;
  description?: string;
  schema: OpenAPIParameterSchema;
}

/**
 * Type guard to check if a string is a valid OpenAPI parameter location.
 * @param {unknown} value - Value to validate
 * @returns {boolean} True if value is a valid parameter location
 */
export function isOpenAPIParameterLocation(
  value: unknown,
): value is OpenAPIParameterLocation {
  return (
    typeof value === 'string' &&
    OPENAPI_PARAMETER_LOCATIONS.includes(value as OpenAPIParameterLocation)
  );
}

/**
 * Type guard to check if object is a valid OpenAPI parameter.
 * @param {unknown} obj - Object to validate
 * @returns {boolean} True if object matches OpenAPIParameter interface
 */
export function isOpenAPIParameter(obj: unknown): obj is OpenAPIParameter {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const param = obj as Record<string, unknown>;
  if (typeof param.name !== 'string') {
    return false;
  }
  if (!isOpenAPIParameterLocation(param.in)) {
    return false;
  }
  if (param.required !== undefined && typeof param.required !== 'boolean') {
    return false;
  }
  if (
    param.description !== undefined &&
    typeof param.description !== 'string'
  ) {
    return false;
  }
  if (!isOpenAPIParameterSchema(param.schema)) {
    return false;
  }
  return true;
}
