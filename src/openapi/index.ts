/**
 * @fileoverview OpenAPI module exports.
 * Provides OpenAPI builder, controller, schemas, middleware, and documentation generators.
 * @module openapi
 */

// Re-export builder class
export { OpenAPIBuilder } from './builder';

// Re-export builder types (excluding types already exported from interfaces)
export type {
  OpenAPIBuilderConfig,
  OpenAPISpec,
  OpenAPIExternalDocs,
  OpenAPITagDefinition,
  OpenAPIOperationMetadata,
} from './builder';

// Re-export controller class
export { OpenAPIController } from './controller';

// Re-export controller types
export type {
  OpenAPIControllerOptions,
  OpenAPIEndpointResponse,
} from './controller';

// Schema registry
export * from './schemas';

// Middleware (Swagger UI, ReDoc) and documentation generators
export * from './middleware';
