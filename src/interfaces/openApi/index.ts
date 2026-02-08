// Export from decoratorOptions but exclude types that are also defined in decorators
export {
  // Options interfaces
  type ApiControllerOptions,
  type RouteDecoratorOptions,
  type ApiParamDecoratorOptions,
  type ApiRequestBodyDecoratorOptions,
  type CacheDecoratorOptions,
  type RateLimitDecoratorOptions,
  type TransactionalDecoratorOptions,
  type ReturnsDecoratorOptions,
  type PaginatedDecoratorOptions,
  type ResponseMetadata,
  type ApiOperationDecoratorOptions,
  type ApiExampleDecoratorOptions,
  type ParamDecoratorOptions,
  type ParamMetadata,
  type AuthMetadata,
  type ValidationMetadata,
  // Type guards
  isApiControllerOptions,
  isRouteDecoratorOptions,
  isApiParamDecoratorOptions,
  isApiRequestBodyDecoratorOptions,
  isCacheDecoratorOptions,
  isRateLimitDecoratorOptions,
  isTransactionalDecoratorOptions,
  isReturnsDecoratorOptions,
  isPaginatedDecoratorOptions,
  isResponseMetadata,
  isApiOperationDecoratorOptions,
  isApiExampleDecoratorOptions,
  isParamDecoratorOptions,
  isParamMetadata,
  isAuthMetadata,
  isValidationMetadata,
  isLifecycleMetadata,
  isMiddlewareMetadata,
  isTransactionMetadata,
} from './decoratorOptions';
export * from './parameter';
export * from './parameterSchema';
export * from './requestBody';
export * from './responseDef';
export * from './routeMetadata';
export type { OpenAPIResponses } from './routeMetadata';
