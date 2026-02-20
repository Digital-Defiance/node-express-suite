/**
 * @fileoverview Enhanced base controller with comprehensive decorator support.
 * Extends BaseController to support all route decorators including:
 * - HTTP method decorators (@Get, @Post, etc.)
 * - Authentication decorators (@RequireAuth, @RequireCryptoAuth, @Public)
 * - Validation decorators (@ValidateBody, @ValidateParams, @ValidateQuery)
 * - Middleware decorators (@UseMiddleware, @RateLimit, @CacheResponse)
 * - Response decorators (@Returns, @RawJson, @Paginated)
 * - Lifecycle decorators (@OnSuccess, @OnError, @Before, @After)
 * - Parameter injection decorators (@Param, @Body, @Query, @Header, etc.)
 * - OpenAPI decorators (@ApiOperation, @ApiTags, @ApiSummary, etc.)
 * - Transaction decorator (@Transactional)
 * - Handler args decorator (@HandlerArgs)
 * @module decorators/base-controller
 */

import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { Request, Response } from 'express';
import 'reflect-metadata';
import { z } from 'zod';
import { BaseController } from '../controllers/base';
import { IMongoApplication } from '../interfaces/mongo-application';
import { ControllerRegistry } from '../registry';
import { ApiResponse, RouteConfig } from '../types';
import { getEffectiveAuthMetadata } from './auth';
import {
  ControllerMetadata,
  CONTROLLER_METADATA,
  ROUTES_METADATA,
  ValidationContext,
} from './controller';
import { EnhancedRouteMetadata } from './http-methods';
import { getHandlerArgs } from './handler-args';
import {
  executeAfterHooks,
  executeBeforeHooks,
  executeOnErrorHooks,
  executeOnSuccessHooks,
  hasLifecycleHooks,
  LifecycleContext,
} from './lifecycle';
import { getEffectiveMiddleware } from './middleware';
import { getEffectiveOpenAPIMetadata } from './openapi';
import {
  getOpenAPIParams,
  getRequestBodyMetadata,
  requestBodyMetadataToOpenAPI,
} from './openapi-params';
import { ParamMetadata } from '../interfaces/openApi/decoratorOptions';
import { getParamMetadata } from './params';
import { getEffectiveResponseMetadata, isRawJsonHandler } from './response';
import { getTransactionMetadata } from './transaction';
import { getEffectiveValidationMetadata } from './validation';
import { zodToExpressValidator } from './zod-validation';

/**
 * WeakMap to store collected metadata for each controller instance.
 * Using a WeakMap avoids class field initialization issues where
 * ES2022 class fields are initialized to undefined after super() returns.
 */
const collectedMetadataStore = new WeakMap<
  object,
  Map<string, CollectedRouteMetadata<CoreLanguageCode>>
>();

/**
 * Collected metadata for a single route from all decorators.
 */
export interface CollectedRouteMetadata<
  TLanguage extends CoreLanguageCode = CoreLanguageCode,
> {
  /** HTTP method */
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  /** Route path */
  path: string;
  /** Handler method name */
  handlerName: string;
  /** Whether authentication is required */
  useAuthentication: boolean;
  /** Whether crypto authentication is required */
  useCryptoAuthentication: boolean;
  /** Whether the route is explicitly public */
  isPublic: boolean;
  /** Custom auth failure status code */
  authFailureStatusCode?: number;
  /** Whether to use raw JSON response */
  rawJsonHandler: boolean;
  /** Whether to use transaction */
  useTransaction: boolean;
  /** Transaction timeout in milliseconds */
  transactionTimeout?: number;
  /** Merged middleware array */
  middleware: import('express').RequestHandler[];
  /** Validation metadata */
  validation?: EnhancedRouteMetadata<TLanguage>['options']['validation'];
  /** Handler arguments */
  handlerArgs: unknown[];
  /** Parameter injection metadata */
  paramMetadata: ParamMetadata[];
  /** Whether lifecycle hooks are defined */
  hasLifecycleHooks: boolean;
  /** OpenAPI metadata */
  openapi?: Partial<
    import('../interfaces/openApi/routeMetadata').OpenAPIRouteMetadata
  >;
}

/**
 * Abstract base controller with comprehensive decorator support.
 * Automatically initializes routes from decorator metadata, including:
 * - Route definitions from HTTP method decorators
 * - Authentication settings from auth decorators
 * - Validation from validation decorators
 * - Middleware from middleware decorators
 * - Response metadata from response decorators
 * - Lifecycle hooks from lifecycle decorators
 * - Parameter injection from param decorators
 * - OpenAPI metadata from OpenAPI decorators
 * - Transaction settings from transaction decorator
 * - Handler arguments from handler args decorator
 *
 * Also auto-registers with ControllerRegistry for OpenAPI generation.
 *
 * @template TLanguage - Language code type (defaults to CoreLanguageCode)
 * @template TID - Platform ID type (defaults to Buffer)
 */
export abstract class DecoratorBaseController<
  TLanguage extends CoreLanguageCode = CoreLanguageCode,
  TID extends PlatformID = Buffer,
> extends BaseController<ApiResponse, Record<string, unknown>, TLanguage, TID> {
  /**
   * Gets the collected metadata map for this instance.
   * Uses a WeakMap to avoid class field initialization issues.
   */
  private getCollectedMetadataMap(): Map<
    string,
    CollectedRouteMetadata<TLanguage>
  > {
    let map = collectedMetadataStore.get(this) as
      | Map<string, CollectedRouteMetadata<TLanguage>>
      | undefined;
    if (!map) {
      map = new Map();
      collectedMetadataStore.set(
        this,
        map as Map<string, CollectedRouteMetadata<CoreLanguageCode>>,
      );
    }
    return map;
  }

  constructor(application: IMongoApplication<TID>) {
    super(application);
    // Auto-register with ControllerRegistry after routes are initialized
    this.registerWithControllerRegistry();
  }

  /**
   * Initializes route definitions by collecting all decorator metadata.
   * This method:
   * 1. Collects route metadata from HTTP method decorators
   * 2. Merges class-level and method-level metadata for each route
   * 3. Builds RouteConfig objects for the base controller
   * 4. Creates handler wrappers with parameter injection and lifecycle hooks
   */
  protected initRouteDefinitions(): void {
    const routes = (Reflect.getMetadata(ROUTES_METADATA, this.constructor) ||
      []) as EnhancedRouteMetadata<TLanguage>[];
    const constants = this.application.constants;
    const collectedMetadata = this.getCollectedMetadataMap();

    this.routeDefinitions = routes.map((route) => {
      // Collect all metadata for this route
      const collected = this.collectRouteMetadata(route);
      collectedMetadata.set(route.handlerName, collected);

      // Build validation from collected metadata
      const validation = this.buildValidation(route, collected, constants);

      return {
        method: route.method,
        path: route.path,
        handlerKey: route.handlerName,
        handlerArgs: collected.handlerArgs,
        useAuthentication: collected.useAuthentication,
        useCryptoAuthentication: collected.useCryptoAuthentication,
        authFailureStatusCode: collected.authFailureStatusCode,
        validation: validation,
        middleware: collected.middleware,
        rawJsonHandler: collected.rawJsonHandler,
        useTransaction: collected.useTransaction,
        transactionTimeout: collected.transactionTimeout,
        openapi: collected.openapi,
      } as RouteConfig<Record<string, unknown>, TLanguage>;
    });

    // Create handlers object from decorated methods with parameter injection and lifecycle hooks
    this.handlers = {};
    routes.forEach((route) => {
      const handler = (this as Record<string, unknown>)[route.handlerName];
      if (typeof handler === 'function') {
        const collected = collectedMetadata.get(route.handlerName);
        if (
          collected &&
          (collected.paramMetadata.length > 0 || collected.hasLifecycleHooks)
        ) {
          // Wrap handler with parameter injection and lifecycle hooks
          this.handlers[route.handlerName] = this.createWrappedHandler(
            handler.bind(this) as (...args: unknown[]) => Promise<unknown>,
            collected,
          );
        } else {
          // Use original handler
          this.handlers[route.handlerName] = handler.bind(this);
        }
      }
    });
  }

  /**
   * Collects all decorator metadata for a single route.
   * Merges class-level and method-level metadata.
   *
   * @param route - The route metadata from HTTP method decorator
   * @returns Collected metadata from all decorators
   */
  protected collectRouteMetadata(
    route: EnhancedRouteMetadata<TLanguage>,
  ): CollectedRouteMetadata<TLanguage> {
    const constructor = this.constructor;
    const handlerName = route.handlerName;

    // Get auth metadata (merged class + method level)
    const authMetadata = getEffectiveAuthMetadata(constructor, handlerName);

    // Get transaction metadata
    const transactionMetadata = getTransactionMetadata(
      constructor,
      handlerName,
    );

    // Get middleware (merged class + method level)
    const middleware = getEffectiveMiddleware(constructor, handlerName);

    // Get handler args
    const handlerArgs = getHandlerArgs(constructor, handlerName);

    // Get parameter injection metadata
    const paramMetadata = getParamMetadata(constructor, handlerName);

    // Check for lifecycle hooks
    const hasHooks = hasLifecycleHooks(constructor, handlerName);

    // Get raw JSON flag
    const rawJson =
      isRawJsonHandler(constructor, handlerName) ||
      route.options.rawJson === true;

    // Build OpenAPI metadata
    const openapi = this.buildOpenAPIMetadata(route, handlerName);

    // Determine authentication requirements
    // Method-level @Public overrides class-level @RequireAuth
    const isPublic = authMetadata.isPublic === true;
    const useAuth =
      !isPublic &&
      (authMetadata.requireAuth === true || route.options.auth === true);
    const useCryptoAuth =
      !isPublic &&
      (authMetadata.requireCryptoAuth === true ||
        route.options.cryptoAuth === true);

    return {
      method: route.method,
      path: route.path,
      handlerName,
      useAuthentication: useAuth,
      useCryptoAuthentication: useCryptoAuth,
      isPublic,
      authFailureStatusCode: authMetadata.failureStatusCode,
      rawJsonHandler: rawJson,
      useTransaction:
        transactionMetadata?.useTransaction ??
        route.options.transaction ??
        false,
      transactionTimeout:
        transactionMetadata?.timeout ?? route.options.transactionTimeout,
      middleware,
      handlerArgs,
      paramMetadata,
      hasLifecycleHooks: hasHooks,
      openapi,
    };
  }

  /**
   * Builds validation from route options and validation decorators.
   *
   * @param route - The route metadata
   * @param collected - The collected metadata
   * @param constants - Application constants
   * @returns Validation chain or function
   */
  protected buildValidation(
    route: EnhancedRouteMetadata<TLanguage>,
    collected: CollectedRouteMetadata<TLanguage>,
    constants: import('../interfaces').IConstants,
  ): EnhancedRouteMetadata<TLanguage>['options']['validation'] {
    // Get validation from decorators
    const validationMetadata = getEffectiveValidationMetadata(
      this.constructor,
      route.handlerName,
    );

    // Priority: decorator validation > route option validation > route option schema
    let validation = route.options.validation;

    // Check for validation decorator metadata
    if (
      validationMetadata.body ||
      validationMetadata.params ||
      validationMetadata.query
    ) {
      // Build combined validation from decorator metadata
      const validationChains: import('express-validator').ValidationChain[] =
        [];
      let hasZodValidation = false;
      const zodValidators: Array<
        (_lang: TLanguage) => import('express-validator').ValidationChain[]
      > = [];

      // Process body validation
      if (validationMetadata.body) {
        const bodyValidation = validationMetadata.body;
        if (bodyValidation instanceof z.ZodType) {
          const zodValidation =
            zodToExpressValidator<TLanguage>(bodyValidation);
          zodValidators.push(zodValidation);
          hasZodValidation = true;
        } else if (Array.isArray(bodyValidation)) {
          validationChains.push(...bodyValidation);
        } else if (typeof bodyValidation === 'function') {
          // Language-aware validation function - will be handled separately
          const context: ValidationContext = { constants };
          const originalValidation = bodyValidation;
          validation = ((lang: TLanguage) => {
            return originalValidation.call(context, lang);
          }) as typeof validation;
        }
      }

      // Process params validation
      if (validationMetadata.params) {
        const paramsValidation = validationMetadata.params;
        if (paramsValidation instanceof z.ZodType) {
          const zodValidation =
            zodToExpressValidator<TLanguage>(paramsValidation);
          zodValidators.push(zodValidation);
          hasZodValidation = true;
        } else if (Array.isArray(paramsValidation)) {
          validationChains.push(...paramsValidation);
        }
      }

      // Process query validation
      if (validationMetadata.query) {
        const queryValidation = validationMetadata.query;
        if (queryValidation instanceof z.ZodType) {
          const zodValidation =
            zodToExpressValidator<TLanguage>(queryValidation);
          zodValidators.push(zodValidation);
          hasZodValidation = true;
        } else if (Array.isArray(queryValidation)) {
          validationChains.push(...queryValidation);
        }
      }

      // If we have Zod validators, create a combined validation function
      if (hasZodValidation) {
        validation = (lang: TLanguage) => {
          const chains = [...validationChains];
          for (const zodValidator of zodValidators) {
            chains.push(...zodValidator(lang));
          }
          return chains;
        };
      } else if (validationChains.length > 0 && !validation) {
        // If we have validation chains and no function validation, use the chains
        validation = validationChains;
      }
    }

    // Bind validation function to preserve 'this' context and inject constants
    if (typeof validation === 'function') {
      const context: ValidationContext = { constants };
      const originalValidation = validation;
      validation = ((lang: TLanguage) => {
        return (
          originalValidation as (
            this: ValidationContext,
            lang: TLanguage,
          ) => import('express-validator').ValidationChain[]
        ).call(context, lang);
      }) as typeof validation;
    }

    // Convert Zod schema to validation if present and no validation yet
    if (route.options.schema && !validation) {
      const schemaValidation = zodToExpressValidator<TLanguage>(
        route.options.schema,
      );
      if (Array.isArray(schemaValidation)) {
        validation = schemaValidation;
      } else {
        validation = (lang: TLanguage) => schemaValidation(lang);
      }
    }

    return validation;
  }

  /**
   * Builds OpenAPI metadata from all decorator sources.
   *
   * @param route - The route metadata
   * @param handlerName - The handler method name
   * @returns OpenAPI route metadata (partial)
   */
  protected buildOpenAPIMetadata(
    route: EnhancedRouteMetadata<TLanguage>,
    handlerName: string,
  ):
    | Partial<
        import('../interfaces/openApi/routeMetadata').OpenAPIRouteMetadata
      >
    | undefined {
    const constructor = this.constructor;

    // Get OpenAPI metadata from decorators (merged class + method level)
    const openApiMeta = getEffectiveOpenAPIMetadata(constructor, handlerName);

    // Get response metadata
    const responses = getEffectiveResponseMetadata(constructor, handlerName);

    // Get OpenAPI parameters
    const params = getOpenAPIParams(constructor, handlerName);

    // Get request body metadata
    const requestBodyMeta = getRequestBodyMetadata(constructor, handlerName);

    // Start with route options openapi if present
    const baseOpenApi = route.options.openapi ?? {};

    // Build merged OpenAPI metadata
    const openapi: Partial<
      import('../interfaces/openApi/routeMetadata').OpenAPIRouteMetadata
    > = {
      ...baseOpenApi,
    };

    // Merge decorator metadata
    if (openApiMeta.summary) {
      openapi.summary = openApiMeta.summary;
    }
    if (openApiMeta.description) {
      openapi.description = openApiMeta.description;
    }
    if (openApiMeta.tags && openApiMeta.tags.length > 0) {
      openapi.tags = [...(openapi.tags ?? []), ...openApiMeta.tags];
      // Remove duplicates
      openapi.tags = [...new Set(openapi.tags)];
    }
    if (openApiMeta.operationId) {
      openapi.operationId = openApiMeta.operationId;
    }
    if (openApiMeta.deprecated !== undefined) {
      openapi.deprecated = openApiMeta.deprecated;
    }

    // Merge parameters
    if (params.length > 0) {
      const existingParams = openapi.parameters ?? [];
      const existingParamKeys = new Set(
        existingParams.map((p) => `${p.name}:${p.in}`),
      );
      const newParams = params.filter(
        (p) => !existingParamKeys.has(`${p.name}:${p.in}`),
      );
      openapi.parameters = [...existingParams, ...newParams];
    }

    // Merge responses
    if (responses.length > 0) {
      const responsesObj: Record<
        string,
        { description: string; schema?: string }
      > = {};
      for (const response of responses) {
        const statusKey = String(response.statusCode);
        if (!responsesObj[statusKey]) {
          responsesObj[statusKey] = {
            description:
              response.description ?? `Response ${response.statusCode}`,
            ...(response.schema && { schema: response.schema }),
          };
        }
      }
      // Merge with existing responses
      openapi.responses = {
        ...(openapi.responses ?? {}),
        ...responsesObj,
      } as import('../interfaces/openApi/routeMetadata').OpenAPIResponses;
    }

    // Merge request body
    if (requestBodyMeta) {
      openapi.requestBody = requestBodyMetadataToOpenAPI(requestBodyMeta);
    }

    // Return undefined if no OpenAPI metadata
    if (Object.keys(openapi).length === 0) {
      return undefined;
    }

    return openapi;
  }

  /**
   * Creates a wrapped handler with parameter injection and lifecycle hook execution.
   *
   * @param originalHandler - The original handler function
   * @param collected - The collected metadata for this route
   * @returns Wrapped handler function
   */
  protected createWrappedHandler(
    originalHandler: (...args: unknown[]) => Promise<unknown>,
    collected: CollectedRouteMetadata<TLanguage>,
  ): (req: Request, ...args: unknown[]) => Promise<unknown> {
    const constructor = this.constructor;
    const handlerName = collected.handlerName;

    // Use arrow function to capture 'this' lexically
    return async (
      req: Request,
      ...handlerArgs: unknown[]
    ): Promise<unknown> => {
      // Get response from the active context (set by base controller)
      const res = this.res;

      // Create lifecycle context
      const lifecycleContext: LifecycleContext = {
        req,
        res,
      };

      try {
        // Execute before hooks
        if (collected.hasLifecycleHooks) {
          await executeBeforeHooks(constructor, handlerName, lifecycleContext);
        }

        // Build injected parameters
        let args: unknown[];
        if (collected.paramMetadata.length > 0) {
          args = this.injectParameters(req, res, collected.paramMetadata);
        } else {
          // No parameter injection - pass request and handler args
          args = [req, ...handlerArgs];
        }

        // Call original handler
        const result = await originalHandler(...args);

        // Update lifecycle context with result
        lifecycleContext.result = result;

        // Execute onSuccess hooks
        if (collected.hasLifecycleHooks) {
          await executeOnSuccessHooks(
            constructor,
            handlerName,
            lifecycleContext,
          );
        }

        // Execute after hooks
        if (collected.hasLifecycleHooks) {
          await executeAfterHooks(constructor, handlerName, lifecycleContext);
        }

        return result;
      } catch (error) {
        // Update lifecycle context with error
        lifecycleContext.error = error as Error;

        // Execute onError hooks
        if (collected.hasLifecycleHooks) {
          await executeOnErrorHooks(constructor, handlerName, lifecycleContext);
        }

        // Execute after hooks (even on error)
        if (collected.hasLifecycleHooks) {
          await executeAfterHooks(constructor, handlerName, lifecycleContext);
        }

        // Re-throw the error
        throw error;
      }
    };
  }

  /**
   * Injects parameters based on parameter decorator metadata.
   *
   * @param req - Express request object
   * @param res - Express response object
   * @param paramMetadata - Parameter metadata array
   * @returns Array of injected parameter values
   */
  protected injectParameters(
    req: Request,
    res: Response,
    paramMetadata: ParamMetadata[],
  ): unknown[] {
    // Sort by index to ensure correct order
    const sortedParams = [...paramMetadata].sort((a, b) => a.index - b.index);

    // Build args array with gaps filled
    const maxIndex =
      sortedParams.length > 0
        ? Math.max(...sortedParams.map((p) => p.index))
        : -1;
    const args: unknown[] = new Array(maxIndex + 1).fill(undefined);

    for (const param of sortedParams) {
      let value: unknown;

      switch (param.type) {
        case 'param':
          value = param.name ? req.params[param.name] : req.params;
          // Apply type coercion if schema specifies integer/number
          if (
            param.options?.schema?.type === 'integer' ||
            param.options?.schema?.type === 'number'
          ) {
            value = Number(value);
          }
          break;

        case 'body':
          value = param.name ? req.body?.[param.name] : req.body;
          break;

        case 'query':
          value = param.name ? req.query[param.name] : req.query;
          // Apply type coercion if schema specifies integer/number
          if (
            param.options?.schema?.type === 'integer' ||
            param.options?.schema?.type === 'number'
          ) {
            value = Number(value);
          }
          break;

        case 'header':
          value = param.name ? req.get(param.name) : req.headers;
          break;

        case 'user':
          value = req.user;
          break;

        case 'eciesUser':
          value = (req as Request & { eciesUser?: unknown }).eciesUser;
          break;

        case 'req':
          value = req;
          break;

        case 'res':
          value = res;
          break;

        case 'next':
          // Next function is not typically injected this way
          // but we support it for completeness
          value = undefined;
          break;

        default:
          value = undefined;
      }

      args[param.index] = value;
    }

    return args;
  }

  /**
   * Registers this controller with the ControllerRegistry for OpenAPI generation.
   * Called automatically after route initialization.
   */
  protected registerWithControllerRegistry(): void {
    // Get controller metadata
    const controllerMetadata = Reflect.getMetadata(
      CONTROLLER_METADATA,
      this.constructor,
    ) as ControllerMetadata | undefined;

    if (!controllerMetadata) {
      // No controller metadata - skip registration
      return;
    }

    const basePath = controllerMetadata.basePath;
    const controllerName = controllerMetadata.name ?? this.constructor.name;

    // Register with ControllerRegistry
    ControllerRegistry.register(
      basePath,
      controllerName,
      this.routeDefinitions,
    );
  }

  /**
   * Gets the collected metadata for a specific route.
   * Useful for testing and debugging.
   *
   * @param handlerName - The handler method name
   * @returns Collected metadata or undefined
   */
  public getCollectedMetadata(
    handlerName: string,
  ): CollectedRouteMetadata<TLanguage> | undefined {
    return this.getCollectedMetadataMap().get(handlerName);
  }

  /**
   * Gets all collected metadata.
   * Useful for testing and debugging.
   *
   * @returns Map of handler names to collected metadata
   */
  public getAllCollectedMetadata(): Map<
    string,
    CollectedRouteMetadata<TLanguage>
  > {
    return new Map(this.getCollectedMetadataMap());
  }
}
