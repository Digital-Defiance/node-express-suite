/**
 * @fileoverview OpenAPI request body interface.
 * Defines the structure for OpenAPI operation request bodies.
 * @module interfaces/openApi/requestBody
 */

/**
 * OpenAPI request body definition.
 * @property {string} schema - Reference name like 'StoreBlockRequest'
 * @property {boolean} [required] - Whether the request body is required
 * @property {string} [description] - Description of the request body
 * @property {unknown} [example] - Example value for documentation
 */
export interface OpenAPIRequestBody {
  schema: string;
  required?: boolean;
  description?: string;
  example?: unknown;
}

/**
 * Type guard to check if object is a valid OpenAPI request body.
 * @param {unknown} obj - Object to validate
 * @returns {boolean} True if object matches OpenAPIRequestBody interface
 */
export function isOpenAPIRequestBody(obj: unknown): obj is OpenAPIRequestBody {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const body = obj as Record<string, unknown>;
  if (typeof body.schema !== 'string') {
    return false;
  }
  if (body.required !== undefined && typeof body.required !== 'boolean') {
    return false;
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    return false;
  }
  // example can be any type, so no validation needed
  return true;
}
