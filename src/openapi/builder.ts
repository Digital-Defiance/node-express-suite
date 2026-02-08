/**
 * @fileoverview OpenAPI specification builder.
 * Builds OpenAPI 3.0.3 specification from registered controllers.
 * Supports external documentation, tag definitions, and decorator metadata.
 * @module openapi/builder
 */

import {
  ControllerRegistry,
  RegisteredController,
} from '../registry/controller-registry';
import { RouteConfig } from '../types';
import { OpenAPISchemaRegistry } from './schemas';

/**
 * Type alias for RouteConfig with generic handler type.
 * Used internally by the builder to avoid type constraint issues.
 */
type AnyRouteConfig = RouteConfig<Record<string, unknown>, string>;

/**
 * OpenAPI parameter definition.
 */
export interface OpenAPIParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  description?: string;
  deprecated?: boolean;
  schema?: OpenAPIParameterSchema;
  example?: unknown;
}

/**
 * OpenAPI parameter schema definition.
 */
export interface OpenAPIParameterSchema {
  type?: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  default?: unknown;
  enum?: (string | number)[];
  $ref?: string;
  example?: unknown;
}

/**
 * OpenAPI request body definition.
 */
export interface OpenAPIRequestBody {
  required?: boolean;
  description?: string;
  schema?: string | Record<string, unknown>;
  example?: unknown;
}

/**
 * OpenAPI response definition.
 */
export interface OpenAPIResponse {
  description?: string;
  schema?: string | Record<string, unknown>;
  example?: unknown;
}

/**
 * OpenAPI operation metadata.
 */
export interface OpenAPIOperationMetadata {
  summary?: string;
  description?: string;
  tags?: string[];
  operationId?: string;
  deprecated?: boolean;
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses?: Record<number | string, OpenAPIResponse>;
}

/**
 * OpenAPI external documentation definition.
 */
export interface OpenAPIExternalDocs {
  description?: string;
  url: string;
}

/**
 * OpenAPI tag definition with description and external docs.
 */
export interface OpenAPITagDefinition {
  name: string;
  description?: string;
  externalDocs?: OpenAPIExternalDocs;
}

/**
 * Configuration for the OpenAPI spec builder.
 */
export interface OpenAPIBuilderConfig {
  /** API title */
  title: string;
  /** API version */
  version: string;
  /** API description */
  description: string;
  /** Server definitions */
  servers?: Array<{ url: string; description: string }>;
  /** Contact information */
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  /** License information */
  license?: {
    name: string;
    url?: string;
  };
  /** Terms of service URL */
  termsOfService?: string;
  /** External documentation */
  externalDocs?: OpenAPIExternalDocs;
  /** Tag definitions with descriptions */
  tags?: OpenAPITagDefinition[];
  /** Whether to auto-generate tag definitions from routes (default: true) */
  autoGenerateTags?: boolean;
}

/**
 * Complete OpenAPI specification type.
 */
export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    contact?: {
      name?: string;
      url?: string;
      email?: string;
    };
    license?: {
      name: string;
      url?: string;
    };
    termsOfService?: string;
  };
  servers: Array<{ url: string; description: string }>;
  paths: Record<string, Record<string, unknown>>;
  components: {
    schemas: Record<string, unknown>;
    securitySchemes: Record<string, unknown>;
  };
  externalDocs?: OpenAPIExternalDocs;
  tags?: OpenAPITagDefinition[];
}

/**
 * Builds OpenAPI 3.0.3 specification from registered controllers.
 *
 * @example
 * ```typescript
 * const builder = new OpenAPIBuilder({
 *   title: 'My API',
 *   version: '1.0.0',
 *   description: 'My awesome API',
 *   externalDocs: {
 *     description: 'Full documentation',
 *     url: 'https://docs.example.com'
 *   },
 *   tags: [
 *     { name: 'Users', description: 'User management endpoints' },
 *     { name: 'Posts', description: 'Blog post endpoints' }
 *   ]
 * });
 * const spec = builder.build();
 * ```
 */
export class OpenAPIBuilder {
  private config: OpenAPIBuilderConfig;

  constructor(config: OpenAPIBuilderConfig) {
    this.config = config;
  }

  /**
   * Build the complete OpenAPI specification.
   * @returns Complete OpenAPI 3.0.3 specification
   */
  build(): OpenAPISpec {
    const paths = this.buildPaths();

    // Collect all tags used in operations
    const usedTags = this.collectUsedTags(paths);

    // Build tag definitions
    const tags = this.buildTagDefinitions(usedTags);

    const spec: OpenAPISpec = {
      openapi: '3.0.3',
      info: {
        title: this.config.title,
        version: this.config.version,
        description: this.config.description,
        ...(this.config.contact && { contact: this.config.contact }),
        ...(this.config.license && { license: this.config.license }),
        ...(this.config.termsOfService && {
          termsOfService: this.config.termsOfService,
        }),
      },
      servers: this.config.servers ?? [
        { url: '/api', description: 'API server' },
      ],
      paths,
      components: {
        schemas: OpenAPISchemaRegistry.getAllSchemas(),
        securitySchemes: OpenAPISchemaRegistry.getAllSecuritySchemes(),
      },
    };

    // Add external docs if configured
    if (this.config.externalDocs) {
      spec.externalDocs = this.config.externalDocs;
    }

    // Add tags if any
    if (tags.length > 0) {
      spec.tags = tags;
    }

    return spec;
  }

  /**
   * Collect all unique tags used in operations.
   * @param paths - The paths object
   * @returns Set of tag names
   */
  private collectUsedTags(
    paths: Record<string, Record<string, unknown>>,
  ): Set<string> {
    const tags = new Set<string>();

    for (const methods of Object.values(paths)) {
      for (const operation of Object.values(methods)) {
        const op = operation as { tags?: string[] };
        if (op.tags) {
          op.tags.forEach((tag) => tags.add(tag));
        }
      }
    }

    return tags;
  }

  /**
   * Build tag definitions from configured tags and used tags.
   * @param usedTags - Tags used in operations
   * @returns Array of tag definitions
   */
  private buildTagDefinitions(usedTags: Set<string>): OpenAPITagDefinition[] {
    const tagMap = new Map<string, OpenAPITagDefinition>();

    // Add configured tags first
    if (this.config.tags) {
      for (const tag of this.config.tags) {
        tagMap.set(tag.name, tag);
      }
    }

    // Auto-generate definitions for used tags not in config
    if (this.config.autoGenerateTags !== false) {
      for (const tagName of usedTags) {
        if (!tagMap.has(tagName) && tagName !== 'Untagged') {
          tagMap.set(tagName, { name: tagName });
        }
      }
    }

    // Sort tags alphabetically
    return Array.from(tagMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  /**
   * Build all API paths from registered controllers.
   */
  private buildPaths(): Record<string, Record<string, unknown>> {
    const paths: Record<string, Record<string, unknown>> = {};
    const controllers = ControllerRegistry.getAll();

    for (const controller of controllers) {
      this.addControllerPaths(paths, controller);
    }

    return paths;
  }

  /**
   * Add paths from a single controller.
   */
  private addControllerPaths(
    paths: Record<string, Record<string, unknown>>,
    controller: RegisteredController,
  ): void {
    for (const route of controller.routeDefinitions) {
      const fullPath = this.buildFullPath(controller.basePath, route.path);
      const method = route.method.toLowerCase();

      if (!paths[fullPath]) {
        paths[fullPath] = {};
      }

      // RouteConfig from RegisteredController uses 'any' for flexibility
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      paths[fullPath][method] = this.buildOperation(route);
    }
  }

  /**
   * Build the full OpenAPI path, converting Express params to OpenAPI format.
   * e.g., '/blocks/:blockId' -> '/blocks/{blockId}'
   */
  private buildFullPath(basePath: string, routePath: string): string {
    // Handle root path case - don't append '/' to basePath
    let combined: string;
    if (routePath === '/' || routePath === '') {
      combined = basePath;
    } else {
      combined = basePath + routePath;
    }
    return combined.replace(/:(\w+)/g, '{$1}');
  }

  /**
   * Build an OpenAPI operation object from a route config.
   */
  private buildOperation(route: AnyRouteConfig): Record<string, unknown> {
    const openapi = route.openapi as OpenAPIOperationMetadata | undefined;

    // If no openapi metadata, create a minimal operation
    if (!openapi) {
      return this.buildMinimalOperation(route);
    }

    const operation: Record<string, unknown> = {
      summary: openapi.summary,
      tags: openapi.tags,
    };

    if (openapi.description) {
      operation.description = openapi.description;
    }

    if (openapi.operationId) {
      operation.operationId = openapi.operationId;
    }

    if (openapi.deprecated) {
      operation.deprecated = openapi.deprecated;
    }

    // Security - derive from route config
    operation.security = this.buildSecurity(route);

    // Parameters - combine path params with explicit parameters
    const parameters = this.buildParameters(route, openapi.parameters);
    if (parameters.length > 0) {
      operation.parameters = parameters;
    }

    // Request body
    if (openapi.requestBody) {
      operation.requestBody = this.buildRequestBody(openapi.requestBody);
    }

    // Responses
    operation.responses = this.buildResponses(route, openapi.responses ?? {});

    return operation;
  }

  /**
   * Build a minimal operation when no openapi metadata is provided.
   */
  private buildMinimalOperation(
    route: AnyRouteConfig,
  ): Record<string, unknown> {
    const operation: Record<string, unknown> = {
      summary: `${route.method.toUpperCase()} ${route.path}`,
      tags: ['Untagged'],
      security: this.buildSecurity(route),
      responses: {
        '200': { description: 'Success' },
      },
    };

    // Extract path parameters
    const pathParams = this.extractPathParameters(route.path);
    if (pathParams.length > 0) {
      operation.parameters = pathParams;
    }

    return operation;
  }

  /**
   * Build security requirements based on route authentication settings.
   */
  private buildSecurity(
    route: AnyRouteConfig,
  ): Array<Record<string, unknown[]>> {
    if (route.useAuthentication || route.useCryptoAuthentication) {
      return [{ bearerAuth: [] }];
    }
    return [];
  }

  /**
   * Build parameters array, combining path params with explicit parameters.
   */
  private buildParameters(
    route: AnyRouteConfig,
    explicitParams?: OpenAPIParameter[],
  ): OpenAPIParameter[] {
    const parameters: OpenAPIParameter[] = [];

    // Extract path parameters from the route path
    const pathParams = this.extractPathParameters(route.path);
    parameters.push(...pathParams);

    // Add explicit parameters from openapi metadata
    if (explicitParams) {
      for (const param of explicitParams) {
        // Don't duplicate path params
        const isDuplicate = parameters.some(
          (p) => p.name === param.name && p.in === param.in,
        );
        if (!isDuplicate) {
          parameters.push(param);
        }
      }
    }

    return parameters;
  }

  /**
   * Extract path parameters from Express-style route path.
   */
  private extractPathParameters(path: string): OpenAPIParameter[] {
    const params: OpenAPIParameter[] = [];
    const paramRegex = /:(\w+)/g;
    let match;

    while ((match = paramRegex.exec(path)) !== null) {
      params.push({
        name: match[1],
        in: 'path',
        required: true,
        schema: { type: 'string' },
      });
    }

    return params;
  }

  /**
   * Build request body object.
   */
  private buildRequestBody(
    requestBody: OpenAPIRequestBody,
  ): Record<string, unknown> {
    const jsonContent: Record<string, unknown> = {};

    if (requestBody.schema !== undefined) {
      jsonContent.schema = this.resolveSchemaRef(requestBody.schema);
    }

    const body: Record<string, unknown> = {
      required: requestBody.required ?? true,
      content: {
        'application/json': jsonContent,
      },
    };

    if (requestBody.description) {
      body.description = requestBody.description;
    }

    if (requestBody.example !== undefined) {
      jsonContent.example = requestBody.example;
    }

    return body;
  }

  /**
   * Build responses object.
   */
  private buildResponses(
    route: AnyRouteConfig,
    responses: Record<number | string, OpenAPIResponse>,
  ): Record<string, Record<string, unknown>> {
    const result: Record<string, Record<string, unknown>> = {};

    for (const [statusCode, responseDef] of Object.entries(responses)) {
      result[statusCode] = this.buildResponse(responseDef);
    }

    // Auto-add 401 if authentication is required and not already defined
    if (
      (route.useAuthentication || route.useCryptoAuthentication) &&
      !result['401']
    ) {
      result['401'] = {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      };
    }

    return result;
  }

  /**
   * Build a single response object.
   */
  private buildResponse(responseDef: OpenAPIResponse): Record<string, unknown> {
    const response: Record<string, unknown> = {
      description: responseDef.description ?? 'Response',
    };

    if (responseDef.schema) {
      response.content = {
        'application/json': {
          schema: this.resolveSchemaRef(responseDef.schema),
        },
      };

      if (responseDef.example !== undefined) {
        (response.content as Record<string, Record<string, unknown>>)[
          'application/json'
        ].example = responseDef.example;
      }
    }

    return response;
  }

  /**
   * Resolve a schema name to a $ref, or return inline schema.
   */
  private resolveSchemaRef(
    schema: string | Record<string, unknown>,
  ): Record<string, unknown> {
    if (typeof schema === 'string') {
      return { $ref: `#/components/schemas/${schema}` };
    }
    return schema;
  }

  /**
   * Get the current configuration.
   * Useful for debugging or extending the builder.
   */
  public getConfig(): OpenAPIBuilderConfig {
    return { ...this.config };
  }

  /**
   * Update the configuration.
   * Note: This does not affect already built specs.
   * @param config - Partial configuration to merge
   */
  public updateConfig(config: Partial<OpenAPIBuilderConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
