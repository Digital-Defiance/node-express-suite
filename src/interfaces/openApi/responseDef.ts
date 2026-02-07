/**
 * @fileoverview OpenAPI response definition interface.
 * Defines the structure for OpenAPI operation responses.
 * @module interfaces/openApi/responseDef
 */

/**
 * OpenAPI response definition.
 * @property {string} [schema] - Reference name for the response schema
 * @property {string} [description] - Description of the response
 * @property {unknown} [example] - Example value for documentation
 */
export interface OpenAPIResponseDef {
  schema?: string;
  description?: string;
  example?: unknown;
}

/**
 * Type guard to check if object is a valid OpenAPI response definition.
 * @param {unknown} obj - Object to validate
 * @returns {boolean} True if object matches OpenAPIResponseDef interface
 */
export function isOpenAPIResponseDef(obj: unknown): obj is OpenAPIResponseDef {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const response = obj as Record<string, unknown>;
  if (response.schema !== undefined && typeof response.schema !== 'string') {
    return false;
  }
  if (
    response.description !== undefined &&
    typeof response.description !== 'string'
  ) {
    return false;
  }
  // example can be any type, so no validation needed
  return true;
}
