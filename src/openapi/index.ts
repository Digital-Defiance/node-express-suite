/**
 * @fileoverview OpenAPI module exports.
 * Provides OpenAPI builder, controller, schemas, middleware, and documentation generators.
 * @module openapi
 */

// Re-export builder class
export { OpenAPIBuilder } from './builder';

// Re-export builder types with explicit names to avoid conflicts
export type {
  OpenAPIBuilderConfig,
  OpenAPISpec,
  OpenAPIExternalDocs,
  OpenAPITagDefinition,
  OpenAPIOperationMetadata,
  // These types are also in interfaces/openApi, so we alias them
  OpenAPIParameter as BuilderOpenAPIParameter,
  OpenAPIParameterSchema as BuilderOpenAPIParameterSchema,
  OpenAPIRequestBody as BuilderOpenAPIRequestBody,
  OpenAPIResponse as BuilderOpenAPIResponse,
} from './builder';

// Re-export controller class
export { OpenAPIController } from './controller';

// Re-export controller types with explicit names
export type {
  OpenAPIControllerOptions,
  OpenAPIResponse as ControllerOpenAPIResponse,
} from './controller';

// Schema registry
export * from './schemas';

// Middleware (Swagger UI, ReDoc) and documentation generators
export * from './middleware';
