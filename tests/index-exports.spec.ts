/**
 * Tests for index file exports to improve coverage
 */

describe('Index exports', () => {
  it('should export from main index', () => {
    const exports = require('../src/index');
    expect(exports).toBeDefined();
    expect(typeof exports).toBe('object');
  });

  it('should export from builders index', () => {
    const exports = require('../src/builders/index');
    expect(exports).toBeDefined();
    // ApplicationBuilder moved to @digitaldefiance/node-express-suite-mongo
  });

  it('should export from controllers index', () => {
    const exports = require('../src/controllers/index');
    expect(exports).toBeDefined();
    expect(exports.BaseController).toBeDefined();
  });

  it('should export from database index', () => {
    const exports = require('../src/database/index');
    expect(exports).toBeDefined();
  });

  it('should export from decorators index', () => {
    const exports = require('../src/decorators/index');
    expect(exports).toBeDefined();
    expect(exports.Controller).toBeDefined();
  });

  it('should export from middlewares index', () => {
    const exports = require('../src/middlewares/index');
    expect(exports).toBeDefined();
    expect(exports.authenticateCrypto).toBeDefined();
  });

  it('should export from pipeline index', () => {
    const exports = require('../src/pipeline/index');
    expect(exports).toBeDefined();
    expect(typeof exports).toBe('object');
  });

  it('should export from responses index', () => {
    const exports = require('../src/responses/index');
    expect(exports).toBeDefined();
    expect(exports.ResponseBuilder).toBeDefined();
  });

  it('should export from routers index', () => {
    const exports = require('../src/routers/index');
    expect(exports).toBeDefined();
    expect(exports.BaseRouter).toBeDefined();
  });

  it('should export from routing index', () => {
    const exports = require('../src/routing/index');
    expect(exports).toBeDefined();
  });

  it('should export from services index', () => {
    const exports = require('../src/services/index');
    expect(exports).toBeDefined();
    expect(typeof exports).toBe('object');
  });

  it('should export from types index', () => {
    const exports = require('../src/types/index');
    expect(exports).toBeDefined();
  });

  it('should export from validation index', () => {
    const exports = require('../src/validation/index');
    expect(exports).toBeDefined();
    expect(exports.ValidationBuilder).toBeDefined();
  });

  it('should export from container index', () => {
    const exports = require('../src/container/index');
    expect(exports).toBeDefined();
    expect(exports.ServiceContainer).toBeDefined();
  });

  it('should export from interfaces/api-responses index', () => {
    const exports = require('../src/interfaces/api-responses/index');
    expect(exports).toBeDefined();
  });

  it('should export from interfaces/backend-objects index', () => {
    const exports = require('../src/interfaces/backend-objects/index');
    expect(exports).toBeDefined();
  });

  it('should export from plugins index', () => {
    const exports = require('../src/plugins/index');
    expect(exports).toBeDefined();
    expect(exports.PluginManager).toBeDefined();
  });

  it('should export from registry index', () => {
    const exports = require('../src/registry/index');
    expect(exports).toBeDefined();
    expect(exports.ControllerRegistry).toBeDefined();
  });

  it('should export from openapi index', () => {
    const exports = require('../src/openapi/index');
    expect(exports).toBeDefined();
    expect(exports.OpenAPIBuilder).toBeDefined();
    expect(exports.OpenAPIController).toBeDefined();
    expect(exports.OpenAPISchemaRegistry).toBeDefined();
  });

  it('should export from openapi/middleware index', () => {
    const exports = require('../src/openapi/middleware/index');
    expect(exports).toBeDefined();
    expect(exports.SwaggerUIMiddleware).toBeDefined();
    expect(exports.ReDocMiddleware).toBeDefined();
    expect(exports.generateMarkdownDocs).toBeDefined();
  });
});

describe('Decorator barrel exports', () => {
  it('should export auth decorators', () => {
    const exports = require('../src/decorators/index');
    expect(exports.RequireAuth).toBeDefined();
    expect(exports.RequireCryptoAuth).toBeDefined();
    expect(exports.Public).toBeDefined();
    expect(exports.AuthFailureStatus).toBeDefined();
    expect(exports.getEffectiveAuthMetadata).toBeDefined();
    expect(exports.requiresAuthentication).toBeDefined();
  });

  it('should export controller decorators', () => {
    const exports = require('../src/decorators/index');
    expect(exports.Controller).toBeDefined();
    expect(exports.ApiController).toBeDefined();
  });

  it('should export HTTP method decorators', () => {
    const exports = require('../src/decorators/index');
    expect(exports.Get).toBeDefined();
    expect(exports.Post).toBeDefined();
    expect(exports.Put).toBeDefined();
    expect(exports.Delete).toBeDefined();
    expect(exports.Patch).toBeDefined();
  });

  it('should export lifecycle decorators', () => {
    const exports = require('../src/decorators/index');
    expect(exports.OnSuccess).toBeDefined();
    expect(exports.OnError).toBeDefined();
    expect(exports.Before).toBeDefined();
    expect(exports.After).toBeDefined();
    expect(exports.getLifecycleMetadata).toBeDefined();
    expect(exports.getClassLifecycleMetadata).toBeDefined();
    expect(exports.getEffectiveLifecycleMetadata).toBeDefined();
    expect(exports.hasLifecycleHooks).toBeDefined();
    expect(exports.executeBeforeHooks).toBeDefined();
    expect(exports.executeAfterHooks).toBeDefined();
    expect(exports.executeOnSuccessHooks).toBeDefined();
    expect(exports.executeOnErrorHooks).toBeDefined();
  });

  it('should export middleware decorators', () => {
    const exports = require('../src/decorators/index');
    expect(exports.UseMiddleware).toBeDefined();
    expect(exports.CacheResponse).toBeDefined();
    expect(exports.RateLimit).toBeDefined();
    expect(exports.getMiddlewareMetadata).toBeDefined();
    expect(exports.getEffectiveMiddleware).toBeDefined();
    expect(exports.getCacheMetadata).toBeDefined();
    expect(exports.getRateLimitMetadata).toBeDefined();
  });

  it('should export OpenAPI decorators', () => {
    const exports = require('../src/decorators/index');
    expect(exports.ApiOperation).toBeDefined();
    expect(exports.ApiTags).toBeDefined();
    expect(exports.ApiSummary).toBeDefined();
    expect(exports.ApiDescription).toBeDefined();
    expect(exports.Deprecated).toBeDefined();
    expect(exports.ApiOperationId).toBeDefined();
    expect(exports.ApiExample).toBeDefined();
    expect(exports.getEffectiveOpenAPIMetadata).toBeDefined();
  });

  it('should export OpenAPI parameter decorators', () => {
    const exports = require('../src/decorators/index');
    expect(exports.ApiParam).toBeDefined();
    expect(exports.ApiQuery).toBeDefined();
    expect(exports.ApiHeader).toBeDefined();
    expect(exports.ApiRequestBody).toBeDefined();
    expect(exports.getOpenAPIParams).toBeDefined();
    expect(exports.getRequestBodyMetadata).toBeDefined();
  });

  it('should export parameter injection decorators', () => {
    const exports = require('../src/decorators/index');
    expect(exports.Param).toBeDefined();
    expect(exports.Body).toBeDefined();
    expect(exports.Query).toBeDefined();
    expect(exports.Header).toBeDefined();
    expect(exports.CurrentUser).toBeDefined();
    expect(exports.EciesUser).toBeDefined();
    expect(exports.Req).toBeDefined();
    expect(exports.Res).toBeDefined();
    expect(exports.Next).toBeDefined();
    expect(exports.getParamMetadata).toBeDefined();
  });

  it('should export response decorators', () => {
    const exports = require('../src/decorators/index');
    expect(exports.Returns).toBeDefined();
    expect(exports.ResponseDoc).toBeDefined();
    expect(exports.RawJson).toBeDefined();
    expect(exports.Paginated).toBeDefined();
    expect(exports.getResponseMetadata).toBeDefined();
    expect(exports.getResponseForStatusCode).toBeDefined();
    expect(exports.isRawJsonHandler).toBeDefined();
    expect(exports.isPaginatedEndpoint).toBeDefined();
  });

  it('should export schema decorators', () => {
    const exports = require('../src/decorators/index');
    expect(exports.ApiSchema).toBeDefined();
    expect(exports.ApiProperty).toBeDefined();
    expect(exports.getSchemaMetadata).toBeDefined();
    expect(exports.getPropertyMetadata).toBeDefined();
    expect(exports.getAllPropertyMetadata).toBeDefined();
    expect(exports.hasSchemaMetadata).toBeDefined();
    expect(exports.registerSchema).toBeDefined();
  });

  it('should export transaction decorator', () => {
    const exports = require('../src/decorators/index');
    expect(exports.Transactional).toBeDefined();
    expect(exports.getTransactionMetadata).toBeDefined();
    expect(exports.isTransactional).toBeDefined();
    expect(exports.getTransactionTimeout).toBeDefined();
  });

  it('should export validation decorators', () => {
    const exports = require('../src/decorators/index');
    expect(exports.ValidateBody).toBeDefined();
    expect(exports.ValidateParams).toBeDefined();
    expect(exports.ValidateQuery).toBeDefined();
    expect(exports.getEffectiveValidationMetadata).toBeDefined();
    expect(exports.hasValidation).toBeDefined();
    expect(exports.isZodSchema).toBeDefined();
    expect(exports.isValidationChainArray).toBeDefined();
    expect(exports.isValidationFunction).toBeDefined();
  });

  it('should export handler args decorator', () => {
    const exports = require('../src/decorators/index');
    expect(exports.HandlerArgs).toBeDefined();
    expect(exports.getHandlerArgsMetadata).toBeDefined();
    expect(exports.getHandlerArgs).toBeDefined();
    expect(exports.hasHandlerArgs).toBeDefined();
  });

  it('should export metadata keys', () => {
    const exports = require('../src/decorators/index');
    expect(exports.CONTROLLER_METADATA).toBeDefined();
    expect(exports.ROUTES_METADATA).toBeDefined();
    expect(exports.OPENAPI_METADATA).toBeDefined();
    expect(exports.OPENAPI_CONTROLLER_METADATA).toBeDefined();
    expect(exports.AUTH_METADATA).toBeDefined();
    expect(exports.VALIDATION_METADATA).toBeDefined();
    expect(exports.MIDDLEWARE_METADATA).toBeDefined();
    expect(exports.PARAMS_METADATA).toBeDefined();
    expect(exports.LIFECYCLE_METADATA).toBeDefined();
    expect(exports.RESPONSE_METADATA).toBeDefined();
    expect(exports.SCHEMA_METADATA).toBeDefined();
    expect(exports.HANDLER_ARGS_METADATA).toBeDefined();
    expect(exports.TRANSACTION_METADATA).toBeDefined();
    expect(exports.RATE_LIMIT_METADATA).toBeDefined();
    expect(exports.CACHE_METADATA).toBeDefined();
    expect(exports.OPENAPI_PARAMS_METADATA).toBeDefined();
    expect(exports.OPENAPI_REQUEST_BODY_METADATA).toBeDefined();
    expect(exports.ALL_METADATA_KEYS).toBeDefined();
  });

  it('should export metadata collector utilities', () => {
    const exports = require('../src/decorators/index');
    expect(exports.getMetadata).toBeDefined();
    expect(exports.setMetadata).toBeDefined();
    expect(exports.getMetadataOrDefault).toBeDefined();
    expect(exports.appendToMetadataArray).toBeDefined();
    expect(exports.mergeMetadata).toBeDefined();
    expect(exports.deepMergeMetadata).toBeDefined();
    expect(exports.hasMetadata).toBeDefined();
    expect(exports.deleteMetadata).toBeDefined();
    expect(exports.getMetadataKeys).toBeDefined();
    expect(exports.collectAllMetadata).toBeDefined();
    expect(exports.collectMethodMetadata).toBeDefined();
  });

  it('should export Zod validation utilities', () => {
    const exports = require('../src/decorators/index');
    expect(exports.zodToOpenAPI).toBeDefined();
    expect(exports.zodToExpressValidator).toBeDefined();
    expect(exports.ZodValidate).toBeDefined();
    expect(exports.extractZodMetadata).toBeDefined();
    expect(exports.getZodDescription).toBeDefined();
    expect(exports.getZodExample).toBeDefined();
    expect(exports.getZodExamples).toBeDefined();
    expect(exports.getZodTitle).toBeDefined();
    expect(exports.isZodDeprecated).toBeDefined();
  });

  it('should export base controller', () => {
    const exports = require('../src/decorators/index');
    expect(exports.DecoratorBaseController).toBeDefined();
  });
});

describe('OpenAPI barrel exports', () => {
  it('should export OpenAPI builder', () => {
    const exports = require('../src/openapi/index');
    expect(exports.OpenAPIBuilder).toBeDefined();
  });

  it('should export OpenAPI controller', () => {
    const exports = require('../src/openapi/index');
    expect(exports.OpenAPIController).toBeDefined();
  });

  it('should export OpenAPI schema registry', () => {
    const exports = require('../src/openapi/index');
    expect(exports.OpenAPISchemaRegistry).toBeDefined();
  });

  it('should export Swagger UI middleware', () => {
    const exports = require('../src/openapi/index');
    expect(exports.SwaggerUIMiddleware).toBeDefined();
    expect(exports.createSwaggerUIHandler).toBeDefined();
    expect(exports.generateSwaggerUIHtml).toBeDefined();
  });

  it('should export ReDoc middleware', () => {
    const exports = require('../src/openapi/index');
    expect(exports.ReDocMiddleware).toBeDefined();
    expect(exports.createReDocHandler).toBeDefined();
    expect(exports.generateReDocHtml).toBeDefined();
  });

  it('should export markdown generator', () => {
    const exports = require('../src/openapi/index');
    expect(exports.generateMarkdownDocs).toBeDefined();
  });
});
