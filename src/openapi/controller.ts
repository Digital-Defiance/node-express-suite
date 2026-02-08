/**
 * @fileoverview Generic OpenAPI documentation controller.
 * Serves the OpenAPI specification built from registered controllers.
 * Supports JSON and YAML formats, tag filtering, and external documentation.
 * @module openapi/controller
 */

import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { Router, Request, Response } from 'express';
import { IApplication } from '../interfaces/application';
import { OpenAPIBuilder, OpenAPIBuilderConfig, OpenAPISpec } from './builder';

/**
 * Response type for the OpenAPI endpoint.
 * This is the HTTP response structure returned by the /openapi endpoint.
 */
export interface OpenAPIEndpointResponse {
  message: string;
  openapi: string;
  info: OpenAPISpec['info'];
  servers: OpenAPISpec['servers'];
  paths: OpenAPISpec['paths'];
  components: OpenAPISpec['components'];
  externalDocs?: OpenAPISpec['externalDocs'];
  tags?: OpenAPISpec['tags'];
}

/**
 * Options for configuring the OpenAPI controller.
 */
export interface OpenAPIControllerOptions {
  /** Whether to cache the spec (default: true in production) */
  cacheSpec?: boolean;
  /** Enable YAML format endpoint at /yaml (default: false) */
  enableYaml?: boolean;
  /** Enable tag filtering via ?tags query parameter (default: true) */
  enableTagFiltering?: boolean;
  /** Custom base path for the spec endpoints (default: '') */
  basePath?: string;
}

/**
 * Generic OpenAPI documentation controller.
 * Serves the OpenAPI specification at the configured endpoint.
 *
 * Unlike other controllers, this one doesn't extend BaseController to avoid
 * circular dependencies and keep it lightweight. It's designed to be mounted
 * directly on a router.
 *
 * Features:
 * - JSON format at / and /json
 * - Optional YAML format at /yaml
 * - Tag filtering via ?tags=tag1,tag2 query parameter
 * - Caching support for production environments
 * - External documentation support
 *
 * @example
 * ```typescript
 * // In your API router setup:
 * const openApiController = new OpenAPIController(application, {
 *   title: 'My API',
 *   version: '1.0.0',
 *   description: 'My awesome API',
 *   externalDocs: {
 *     description: 'Full documentation',
 *     url: 'https://docs.example.com'
 *   }
 * }, {
 *   enableYaml: true,
 *   enableTagFiltering: true
 * });
 * router.use('/openapi', openApiController.router);
 * ```
 */
export class OpenAPIController<TID extends PlatformID = Buffer> {
  public readonly router: Router;
  private readonly builder: OpenAPIBuilder;
  private readonly applicationRef: IApplication<TID>;
  private cachedSpec: OpenAPISpec | null = null;
  private readonly cacheEnabled: boolean;
  private readonly enableYaml: boolean;
  private readonly enableTagFiltering: boolean;

  /**
   * Create a new OpenAPI controller.
   * @param application - The application instance
   * @param config - OpenAPI builder configuration
   * @param options - Controller options
   */
  constructor(
    application: IApplication<TID>,
    config: OpenAPIBuilderConfig,
    options?: OpenAPIControllerOptions,
  ) {
    this.applicationRef = application;
    this.builder = new OpenAPIBuilder(config);
    this.router = Router();
    this.cacheEnabled =
      options?.cacheSpec ?? process.env.NODE_ENV === 'production';
    this.enableYaml = options?.enableYaml ?? false;
    this.enableTagFiltering = options?.enableTagFiltering ?? true;

    this.initializeRoutes();
  }

  /**
   * Get the application instance.
   * Useful for accessing application configuration or services.
   */
  public get application(): IApplication<TID> {
    return this.applicationRef;
  }

  /**
   * Initialize the routes.
   */
  private initializeRoutes(): void {
    // GET / - Returns the OpenAPI specification in JSON
    this.router.get('/', this.handleGetSpec.bind(this));

    // GET /json - Alias for the spec in JSON
    this.router.get('/json', this.handleGetSpec.bind(this));

    // GET /yaml - Returns the OpenAPI specification in YAML (if enabled)
    if (this.enableYaml) {
      this.router.get('/yaml', this.handleGetSpecYaml.bind(this));
    }

    // GET /raw - Returns the raw spec without wrapper
    this.router.get('/raw', this.handleGetRawSpec.bind(this));
  }

  /**
   * Handle GET request for the OpenAPI specification in JSON format.
   */
  private handleGetSpec(req: Request, res: Response): void {
    try {
      let spec = this.getSpec();

      // Apply tag filtering if enabled and tags query param is present
      if (this.enableTagFiltering && req.query.tags) {
        const tags = String(req.query.tags)
          .split(',')
          .map((t) => t.trim());
        spec = this.filterSpecByTags(spec, tags);
      }

      const response: OpenAPIEndpointResponse = {
        message: 'OpenAPI specification',
        openapi: spec.openapi,
        info: spec.info,
        servers: spec.servers,
        paths: spec.paths,
        components: spec.components,
      };

      // Include optional fields if present
      if (spec.externalDocs) {
        response.externalDocs = spec.externalDocs;
      }
      if (spec.tags && spec.tags.length > 0) {
        response.tags = spec.tags;
      }

      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'OPENAPI_BUILD_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to build OpenAPI spec',
        },
      });
    }
  }

  /**
   * Handle GET request for the raw OpenAPI specification without wrapper.
   */
  private handleGetRawSpec(req: Request, res: Response): void {
    try {
      let spec = this.getSpec();

      // Apply tag filtering if enabled and tags query param is present
      if (this.enableTagFiltering && req.query.tags) {
        const tags = String(req.query.tags)
          .split(',')
          .map((t) => t.trim());
        spec = this.filterSpecByTags(spec, tags);
      }

      res.status(200).json(spec);
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'OPENAPI_BUILD_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to build OpenAPI spec',
        },
      });
    }
  }

  /**
   * Handle GET request for the OpenAPI specification in YAML format.
   */
  private handleGetSpecYaml(req: Request, res: Response): void {
    try {
      let spec = this.getSpec();

      // Apply tag filtering if enabled and tags query param is present
      if (this.enableTagFiltering && req.query.tags) {
        const tags = String(req.query.tags)
          .split(',')
          .map((t) => t.trim());
        spec = this.filterSpecByTags(spec, tags);
      }

      const yaml = this.convertToYaml(spec);
      res.status(200).type('text/yaml').send(yaml);
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'OPENAPI_BUILD_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to build OpenAPI spec',
        },
      });
    }
  }

  /**
   * Filter the OpenAPI spec to only include paths with specified tags.
   * @param spec - The full OpenAPI spec
   * @param tags - Tags to filter by
   * @returns Filtered spec
   */
  private filterSpecByTags(spec: OpenAPISpec, tags: string[]): OpenAPISpec {
    const tagSet = new Set(tags.map((t) => t.toLowerCase()));
    const filteredPaths: Record<string, Record<string, unknown>> = {};

    for (const [path, methods] of Object.entries(spec.paths)) {
      const filteredMethods: Record<string, unknown> = {};

      for (const [method, operation] of Object.entries(methods)) {
        const op = operation as { tags?: string[] };
        if (op.tags && op.tags.some((t) => tagSet.has(t.toLowerCase()))) {
          filteredMethods[method] = operation;
        }
      }

      if (Object.keys(filteredMethods).length > 0) {
        filteredPaths[path] = filteredMethods;
      }
    }

    return {
      ...spec,
      paths: filteredPaths,
    };
  }

  /**
   * Convert the OpenAPI spec to YAML format.
   * Uses a simple JSON-to-YAML conversion without external dependencies.
   * @param spec - The OpenAPI spec object
   * @returns YAML string representation
   */
  private convertToYaml(spec: OpenAPISpec): string {
    return this.jsonToYaml(spec, 0);
  }

  /**
   * Simple JSON to YAML converter.
   * @param obj - Object to convert
   * @param indent - Current indentation level
   * @returns YAML string
   */
  private jsonToYaml(obj: unknown, indent: number): string {
    const spaces = '  '.repeat(indent);

    if (obj === null || obj === undefined) {
      return 'null';
    }

    if (typeof obj === 'string') {
      // Check if string needs quoting
      if (
        obj.includes('\n') ||
        obj.includes(':') ||
        obj.includes('#') ||
        obj.startsWith(' ') ||
        obj.endsWith(' ') ||
        /^[0-9]/.test(obj) ||
        obj === '' ||
        ['true', 'false', 'null', 'yes', 'no'].includes(obj.toLowerCase())
      ) {
        return JSON.stringify(obj);
      }
      return obj;
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return String(obj);
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        return '[]';
      }
      return obj
        .map((item) => {
          const itemYaml = this.jsonToYaml(item, indent + 1);
          if (
            typeof item === 'object' &&
            item !== null &&
            !Array.isArray(item)
          ) {
            return `${spaces}- ${itemYaml.trimStart()}`;
          }
          return `${spaces}- ${itemYaml}`;
        })
        .join('\n');
    }

    if (typeof obj === 'object') {
      const entries = Object.entries(obj);
      if (entries.length === 0) {
        return '{}';
      }
      return entries
        .map(([key, value]) => {
          const valueYaml = this.jsonToYaml(value, indent + 1);
          if (
            typeof value === 'object' &&
            value !== null &&
            !Array.isArray(value) &&
            Object.keys(value as object).length > 0
          ) {
            return `${spaces}${key}:\n${valueYaml}`;
          }
          if (Array.isArray(value) && value.length > 0) {
            return `${spaces}${key}:\n${valueYaml}`;
          }
          return `${spaces}${key}: ${valueYaml}`;
        })
        .join('\n');
    }

    return String(obj);
  }

  /**
   * Get the OpenAPI specification, using cache if enabled.
   */
  private getSpec(): OpenAPISpec {
    if (this.cacheEnabled && this.cachedSpec) {
      return this.cachedSpec;
    }

    const spec = this.builder.build();

    if (this.cacheEnabled) {
      this.cachedSpec = spec;
    }

    return spec;
  }

  /**
   * Clear the cached specification.
   * Useful when routes are dynamically added.
   */
  public clearCache(): void {
    this.cachedSpec = null;
  }

  /**
   * Get the raw OpenAPI specification object.
   * Useful for programmatic access or testing.
   */
  public getSpecification(): OpenAPISpec {
    return this.getSpec();
  }

  /**
   * Get the OpenAPI specification filtered by tags.
   * @param tags - Tags to filter by
   * @returns Filtered OpenAPI spec
   */
  public getSpecificationByTags(tags: string[]): OpenAPISpec {
    return this.filterSpecByTags(this.getSpec(), tags);
  }

  /**
   * Get the OpenAPI builder instance.
   * Useful for advanced customization.
   */
  public getBuilder(): OpenAPIBuilder {
    return this.builder;
  }
}
