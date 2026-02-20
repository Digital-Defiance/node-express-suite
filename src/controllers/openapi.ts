/* eslint-disable @typescript-eslint/no-explicit-any */
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
// Import to trigger schema registration
import '../openapi/schemas';
import { IApiMessageResponse } from '@digitaldefiance/suite-core-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  routeConfig,
  TypedHandlers,
} from '../types';
import { BaseController } from './base';
import { OpenAPIBuilder } from '../openapi';
import { IStatusCodeResponse } from '../interfaces';
import { IMongoApplication } from '../interfaces/mongo-application';
import { ControllerRegistry } from '../registry';

/**
 * OpenAPI specification response
 */
export interface IOpenAPIResponse extends IApiMessageResponse {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, any>;
  components: {
    schemas: Record<string, any>;
    securitySchemes: Record<string, any>;
  };
  [key: string]: unknown;
}

type DocsApiResponse = IOpenAPIResponse | ApiErrorResponse;

interface DocsHandlers extends TypedHandlers {
  getDocs: ApiRequestHandler<IOpenAPIResponse | ApiErrorResponse>;
}

/**
 * Controller for API documentation endpoint.
 *
 * Provides the OpenAPI specification.
 * The specification is built dynamically from registered controllers
 * using their route definitions and OpenAPI metadata.
 *
 * ## Endpoints
 *
 * ### GET /api/openapi
 * Returns the OpenAPI specification in JSON format.
 *
 * **Response:**
 * - OpenAPI 3.0.3 specification with all endpoints
 * - Request/response schemas for each endpoint
 * - Authentication requirements per endpoint
 * - Example requests and responses
 *
 * @requirements 10.1, 10.2, 10.3, 10.4
 */
export class OpenApiController<
  TID extends PlatformID = Buffer,
> extends BaseController<DocsApiResponse, DocsHandlers, CoreLanguageCode, TID> {
  private static readonly API_VERSION = '0.12.0';
  private readonly builder: OpenAPIBuilder;

  constructor(application: IMongoApplication<TID>) {
    super(application);

    this.builder = new OpenAPIBuilder({
      title: 'Express Suite API',
      version: OpenApiController.API_VERSION,
      description: 'REST API for an Express Suite Servier',
      servers: [{ url: '/api', description: 'API server' }],
    });
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/', {
        handlerKey: 'getDocs',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get OpenAPI specification',
          description: 'Returns the OpenAPI specification in JSON format.',
          tags: ['Documentation'],
          responses: {
            200: {
              schema: 'OpenAPISpec',
              description: 'OpenAPI specification',
            },
          },
        },
      }),
    ];

    // Register this controller
    ControllerRegistry.register(
      '/openapi',
      'OpenApiController',
      this.routeDefinitions,
    );

    this.handlers = {
      getDocs: this.handleGetOpenApi.bind(this),
    };
  }

  /**
   * GET /api/openapi
   * Returns the OpenAPI specification in JSON format.
   *
   * @requirements 10.1, 10.2, 10.3, 10.4
   */
  private async handleGetOpenApi(): Promise<
    IStatusCodeResponse<IOpenAPIResponse | ApiErrorResponse>
  > {
    const spec = this.builder.build();

    return {
      statusCode: 200,
      response: {
        message: 'OpenAPI specification',
        openapi: spec.openapi,
        info: spec.info,
        servers: spec.servers,
        paths: spec.paths,
        components: spec.components,
      },
    };
  }
}
