/**
 * @fileoverview OpenAPI route metadata interface.
 * Defines the structure for OpenAPI operation metadata attached to routes.
 * @module interfaces/openApi/routeMetadata
 */

import { OpenAPIParameter, isOpenAPIParameter } from './parameter';
import { OpenAPIRequestBody, isOpenAPIRequestBody } from './requestBody';
import { OpenAPIResponseDef, isOpenAPIResponseDef } from './responseDef';

/**
 * Type for OpenAPI responses map - allows numeric status codes and 'default'.
 * Uses a mapped type to make all keys optional while preserving the key constraint.
 */
export type OpenAPIResponses = {
  [K in number | 'default']?: OpenAPIResponseDef;
};

/**
 * OpenAPI route metadata definition.
 * @property {string} summary - Short summary of the operation
 * @property {string} [description] - Detailed description of the operation
 * @property {string[]} tags - Tags for grouping operations
 * @property {string} [operationId] - Unique identifier for the operation
 * @property {boolean} [deprecated] - Whether the operation is deprecated
 * @property {OpenAPIRequestBody} [requestBody] - Request body definition
 * @property {OpenAPIResponses} responses - Response definitions by status code
 * @property {OpenAPIParameter[]} [parameters] - Parameter definitions
 */
export interface OpenAPIRouteMetadata {
  summary: string;
  description?: string;
  tags: string[];
  operationId?: string;
  deprecated?: boolean;
  requestBody?: OpenAPIRequestBody;
  responses: OpenAPIResponses;
  parameters?: OpenAPIParameter[];
}

/**
 * Validates that a key is a valid response status code (number or 'default').
 * @param {string} key - The key to validate
 * @returns {boolean} True if key is a valid status code
 */
function isValidResponseKey(key: string): boolean {
  if (key === 'default') {
    return true;
  }
  const num = parseInt(key, 10);
  return !isNaN(num) && num >= 100 && num < 600;
}

/**
 * Type guard to check if object is valid OpenAPI route metadata.
 * @param {unknown} obj - Object to validate
 * @returns {boolean} True if object matches OpenAPIRouteMetadata interface
 */
export function isOpenAPIRouteMetadata(
  obj: unknown,
): obj is OpenAPIRouteMetadata {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const metadata = obj as Record<string, unknown>;

  // Required fields
  if (typeof metadata.summary !== 'string') {
    return false;
  }
  if (!Array.isArray(metadata.tags)) {
    return false;
  }
  if (!metadata.tags.every((tag) => typeof tag === 'string')) {
    return false;
  }
  if (!metadata.responses || typeof metadata.responses !== 'object') {
    return false;
  }

  // Optional fields
  if (
    metadata.description !== undefined &&
    typeof metadata.description !== 'string'
  ) {
    return false;
  }
  if (
    metadata.operationId !== undefined &&
    typeof metadata.operationId !== 'string'
  ) {
    return false;
  }
  if (
    metadata.deprecated !== undefined &&
    typeof metadata.deprecated !== 'boolean'
  ) {
    return false;
  }
  if (
    metadata.requestBody !== undefined &&
    !isOpenAPIRequestBody(metadata.requestBody)
  ) {
    return false;
  }

  // Validate responses
  const responses = metadata.responses as Record<string, unknown>;
  for (const [key, value] of Object.entries(responses)) {
    if (!isValidResponseKey(key)) {
      return false;
    }
    if (!isOpenAPIResponseDef(value)) {
      return false;
    }
  }

  // Validate parameters
  if (metadata.parameters !== undefined) {
    if (!Array.isArray(metadata.parameters)) {
      return false;
    }
    if (!metadata.parameters.every((param) => isOpenAPIParameter(param))) {
      return false;
    }
  }

  return true;
}
