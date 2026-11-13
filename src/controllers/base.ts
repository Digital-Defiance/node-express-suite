/**
 * @fileoverview Base controller class providing common functionality for all API controllers.
 * Handles routing, validation, authentication, transactions, and error handling.
 * @module controllers/base
 */

import {
  GlobalActiveContext,
  HandleableError,
  IActiveContext,
  PluginI18nEngine,
  TranslatableGenericError,
} from '@digitaldefiance/i18n-lib';
import {
  getSuiteCoreTranslation,
  IClientSession,
  IRequestUserDTO,
  SuiteCoreComponentId,
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';
import type { SuiteCoreStringKeyValue } from '@digitaldefiance/suite-core-lib';
import {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from 'express';
import {
  matchedData,
  ValidationChain,
  validationResult,
} from 'express-validator';
import { ExpressValidationError } from '../errors/express-validation';
import { MissingValidatedDataError } from '../errors/missing-validated-data';
import { IConstants } from '../interfaces';
import { IApplication } from '../interfaces/application';
import { authenticateCrypto } from '../middlewares/authenticate-crypto';
import { authenticateToken } from '../middlewares/authenticate-token';
import { setGlobalContextLanguageFromRequest } from '../middlewares/set-global-context-language';
import {
  getRequestContext,
  getRequestLanguage,
  RequestContext,
  runWithRequestContext,
} from '../request-context';
import {
  ApiErrorResponse,
  ApiResponse,
  FlexibleValidationChain,
  RouteConfig,
  SendFunction,
  TransactionCallback,
} from '../types';
import {
  handleError,
  sendApiMessageResponse,
  sendRawJsonResponse,
} from '../utils';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Abstract base controller for all API controllers.
 * Provides routing, validation, authentication, transaction management, and error handling.
 * @template T API response type
 * @template THandler Handler object type
 * @template TLanguage Language code type
 * @template TID Platform ID type
 * @template TApplication Application interface type
 */
export abstract class BaseController<
  T extends ApiResponse,
  THandler extends object,
  TLanguage extends string,
  TID extends PlatformID = Buffer,
  TApplication extends IApplication<TID> = IApplication<TID>,
> {
  public readonly router: Router;
  /**
   * Fallbacks used only when no request is executing (e.g. a handler invoked
   * directly from a unit test). While a request runs, the request, response
   * and session live in that request's RequestContext (AsyncLocalStorage), so
   * overlapping requests never see each other's state.
   */
  private fallbackRequest: Request | null = null;
  private fallbackResponse: Response | null = null;
  private fallbackSession: IClientSession | undefined = undefined;
  public readonly application: TApplication;
  protected routeDefinitions: RouteConfig<THandler, TLanguage>[] = [];
  protected get constants(): IConstants {
    if (!this.application.constants) {
      throw new Error('Constants not initialized');
    }
    return this.application.constants;
  }
  protected get pluginEngine(): PluginI18nEngine<TLanguage> {
    return PluginI18nEngine.getInstance<TLanguage>();
  }
  protected handlers: THandler;
  // Allowlist of registered validation functions to prevent code injection
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private static validationRegistry = new WeakSet<Function>();

  public constructor(application: TApplication) {
    this.application = application;
    this.router = Router();
    this.handlers = {} as THandler;
    this.initRouteDefinitions();
    this.registerValidationFunctions();
    this.initializeRoutes();
  }

  /**
   * Register validation functions in the allowlist.
   * Override this method to register custom validation functions.
   */
  protected registerValidationFunctions(): void {
    // Register validation functions from route definitions
    this.routeDefinitions.forEach((route) => {
      if (typeof route.validation === 'function') {
        BaseController.validationRegistry.add(route.validation);
      }
    });
  }

  protected abstract initRouteDefinitions(): void;

  private getAuthenticationMiddleware(
    route: RouteConfig<THandler, TLanguage>,
  ): RequestHandler[] {
    if (route.useAuthentication) {
      return [
        async (req, res, next) => {
          try {
            await this.authenticateRequest(route, req, res, next);
          } catch (err) {
            next(err);
          }
        },
      ];
    } else {
      return [];
    }
  }

  private getCryptoAuthenticationMiddleware(
    route: RouteConfig<THandler, TLanguage>,
  ): RequestHandler[] {
    if (route.useCryptoAuthentication) {
      return [
        async (req, res, next) => {
          try {
            await authenticateCrypto(this.application, req, res, next);
          } catch (err) {
            next(err);
          }
        },
      ];
    } else {
      return [];
    }
  }

  private getValidationMiddleware(
    route: RouteConfig<THandler, TLanguage>,
  ): RequestHandler[] {
    if (Array.isArray(route.validation) && route.validation.length > 0) {
      return [
        ...route.validation,
        this.createValidationHandler(route.validation),
      ];
    } else if (typeof route.validation === 'function') {
      return [this.createDynamicValidationHandler(route.validation)];
    }
    return [];
  }

  private createValidationHandler(
    validation: ValidationChain[],
  ): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        this.checkRequestValidationAndThrow(req, res, next, validation);
      } catch (error) {
        next(error);
      }
    };
  }

  private createDynamicValidationHandler(
    validationFn: (lang: TLanguage) => ValidationChain[],
  ): RequestHandler {
    // Verify the validation function is in the allowlist
    if (!BaseController.validationRegistry.has(validationFn)) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_ValidationFunctionNotRegisteredInAllowlist,
      );
    }

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const context = { constants: this.constants };
        const validationArray = validationFn.call(
          context,
          this.resolveRequestLanguage(),
        );
        // amazonq-ignore-next-line fixed above
        await Promise.all(validationArray.map((v) => v.run(req)));
        await this.checkRequestValidationAndThrow(
          req,
          res,
          next,
          validationArray,
        );
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * The language of the request currently executing. Falls back to the shared
   * language only when no request is running.
   */
  private resolveRequestLanguage(): TLanguage {
    return (getRequestLanguage() ??
      GlobalActiveContext.getInstance<TLanguage, IActiveContext<TLanguage>>()
        .userLanguage ??
      'en-US') as TLanguage;
  }

  private createRequestHandler(
    config: RouteConfig<THandler, TLanguage>,
  ): RequestHandler {
    return (req: Request, res: Response<T>, next: NextFunction) => {
      // Every request gets its own context. The request, response, transaction
      // session and language live here (not on the controller instance), so
      // overlapping requests cannot read each other's state across an await.
      const parent = getRequestContext();
      const localsLanguage = res.locals?.['language'];
      const context: RequestContext = {
        req,
        res,
        session: undefined,
        language:
          parent?.language ??
          (typeof localsLanguage === 'string' ? localsLanguage : undefined),
      };
      return runWithRequestContext(context, () =>
        this.handleRequest(config, context, req, res, next),
      );
    };
  }

  private async handleRequest(
    config: RouteConfig<THandler, TLanguage>,
    context: RequestContext,
    req: Request,
    res: Response<T>,
    next: NextFunction,
  ): Promise<void> {
    {
      if (config.useAuthentication && !req.user) {
        handleError(
          new HandleableError(
            new Error(
              getSuiteCoreTranslation(
                SuiteCoreStringKey.Common_Unauthorized,
                undefined,
                undefined,
                { constants: this.application.constants },
              ),
            ),
            {
              statusCode: 401,
            },
          ),
          res as Response<ApiResponse>,
          sendApiMessageResponse,
          next,
        );
        return;
      }

      try {
        const handler = this.handlers[config.handlerKey];
        const sendFunc: SendFunction<T> = config.rawJsonHandler
          ? sendRawJsonResponse.bind(this)
          : sendApiMessageResponse.bind(this);

        const handlerArgs = config.handlerArgs ?? [];

        type HandlerResult = {
          statusCode: number;
          response: T;
          headers?: Record<string, string>;
        };
        type HandlerFunction = (
          req: Request,
          ...args: unknown[]
        ) => Promise<HandlerResult>;
        const typedHandler = handler as HandlerFunction;

        let result: HandlerResult;
        if (config.useTransaction) {
          const db = this.application.database;
          if (db) {
            result = await db.withTransaction(async (session) =>
              // Re-enter the request context explicitly so it holds regardless
              // of how the database driver schedules this callback.
              runWithRequestContext(context, async () => {
                context.session = session;
                try {
                  return await typedHandler(req, ...handlerArgs);
                } finally {
                  context.session = undefined;
                }
              }),
            );
          } else {
            result = await typedHandler(req, ...handlerArgs);
          }
        } else {
          result = await typedHandler(req, ...handlerArgs);
        }

        const { statusCode, response, headers } = result;

        // If the handler already sent a response (e.g. binary stream),
        // don't attempt to send again — that would throw
        // "Cannot set headers after they are sent to the client".
        if (res.headersSent) {
          return;
        }

        if (headers) {
          res.set(headers);
        }
        sendFunc(statusCode, response, res);
      } catch (error) {
        context.session = undefined;
        if (res.headersSent) {
          return;
        }
        handleError(
          error,
          res as Response<ApiErrorResponse>,
          sendApiMessageResponse,
          next,
        );
      }
    }
  }

  /**
   * Initializes the routes for the controller.
   */
  private initializeRoutes(): void {
    Object.values(this.routeDefinitions).forEach(
      (config: RouteConfig<THandler, TLanguage>) => {
        this.router[config.method](
          config.path,
          ...[
            // Resolve the request's language first so authentication errors
            // are localized too. Authentication refines it with the user's
            // preference once the user is known.
            setGlobalContextLanguageFromRequest,
            ...this.getAuthenticationMiddleware(config),
            // Re-resolve once req.user is known (custom authenticateRequest
            // implementations may not do this themselves).
            ...(config.useAuthentication
              ? [setGlobalContextLanguageFromRequest]
              : []),
            ...this.getValidationMiddleware(config),
            ...this.getCryptoAuthenticationMiddleware(config),
            ...(config.middleware ?? []),
            this.createRequestHandler(config),
          ],
        );
      },
    );
  }

  /**
   * Authenticates the request by checking the token. Also populates the request with the user object.
   * @param route The route config
   * @param req The request object
   * @param res The response object
   * @param next The next function
   */
  protected async authenticateRequest(
    route: RouteConfig<THandler, TLanguage>,
    req: Request,
    res: Response<T>,
    next: NextFunction,
  ): Promise<void> {
    // Pass the real `next` function directly to the middleware.
    // It will now correctly control the request lifecycle.
    await authenticateToken<TID>(this.application, req, res, next);
  }

  private handleBooleanFields(
    validationArray: ValidationChain[],
    validatedBody: Record<string, unknown>,
  ): Record<string, unknown> {
    // false booleans will be missing from validatedBody, so we need to add them
    validationArray.forEach((validation: ValidationChain) => {
      const fieldChains = validation.builder.build().fields;

      fieldChains.forEach((field: string) => {
        const hasBooleanValidator = validation.builder
          .build()
          .stack.some((item: unknown) => {
            const validator = item as {
              validator?: { name?: string };
              negated?: boolean;
            };
            return (
              validator.validator &&
              validator.validator.name === 'isBoolean' &&
              !validator.negated
            );
          });

        // If the field has a boolean validator and it's not in the validated body, add it
        if (hasBooleanValidator && !(field in validatedBody)) {
          validatedBody[field] = false;
        }
      });
    });
    return validatedBody;
  }

  /**
   * If express-validator flagged any errors, throw an error.
   * @param req The request object
   * @param res The response object
   * @param next The next function
   * @param validationArray An array of express validation chains that were applied to the request.
   * @returns
   */
  protected checkRequestValidationAndThrow(
    req: Request,
    res: Response,
    next: NextFunction,
    validationArray: FlexibleValidationChain<TLanguage> = [],
  ): void {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ExpressValidationError(errors);
    }
    // Create an object with only the validated fields
    const validatedBody = matchedData(req, {
      locations: ['body'], // Only match data from request body
      includeOptionals: false, // Exclude fields that weren't validated
    });

    const language = this.resolveRequestLanguage();

    // If validationArray is a function, call it with the language
    const valArray =
      typeof validationArray === 'function'
        ? validationArray(language)
        : validationArray;

    // false booleans will be missing from validatedBody, so we need to add them
    // Attach the validated fields to the request object
    req.validatedBody = this.handleBooleanFields(valArray, validatedBody);

    next();
  }

  private get activeRequest(): Request | null {
    return getRequestContext()?.req ?? this.fallbackRequest;
  }

  private set activeRequest(req: Request | null) {
    const context = getRequestContext();
    if (context) {
      context.req = req ?? undefined;
    } else {
      this.fallbackRequest = req;
    }
  }

  private get activeResponse(): Response | null {
    return getRequestContext()?.res ?? this.fallbackResponse;
  }

  private set activeResponse(res: Response | null) {
    const context = getRequestContext();
    if (context) {
      context.res = res ?? undefined;
    } else {
      this.fallbackResponse = res;
    }
  }

  private get activeSession(): IClientSession | undefined {
    const context = getRequestContext();
    return context ? context.session : this.fallbackSession;
  }

  private set activeSession(session: IClientSession | undefined) {
    const context = getRequestContext();
    if (context) {
      context.session = session;
    } else {
      this.fallbackSession = session;
    }
  }

  public get user(): IRequestUserDTO {
    if (!this.activeRequest) {
      throw new TranslatableGenericError<SuiteCoreStringKeyValue>(
        SuiteCoreComponentId,
        SuiteCoreStringKey.Common_NoActiveRequest,
      );
    }
    if (!this.activeRequest.user) {
      throw new TranslatableGenericError<SuiteCoreStringKeyValue>(
        SuiteCoreComponentId,
        SuiteCoreStringKey.Common_NoUserOnRequest,
      );
    }
    return this.activeRequest.user;
  }

  public get validatedBody(): Record<string, unknown> {
    if (!this.activeRequest) {
      throw new TranslatableGenericError<SuiteCoreStringKeyValue>(
        SuiteCoreComponentId,
        SuiteCoreStringKey.Common_NoActiveRequest,
      );
    }
    if (!this.activeRequest.validatedBody) {
      throw new MissingValidatedDataError();
    }
    return this.activeRequest.validatedBody;
  }

  public get req(): Request {
    if (!this.activeRequest) {
      throw new TranslatableGenericError<SuiteCoreStringKeyValue>(
        SuiteCoreComponentId,
        SuiteCoreStringKey.Common_NoActiveRequest,
      );
    }
    return this.activeRequest;
  }

  public get res(): Response {
    if (!this.activeResponse) {
      throw new TranslatableGenericError<SuiteCoreStringKeyValue>(
        SuiteCoreComponentId,
        SuiteCoreStringKey.Common_NoActiveResponse,
      );
    }
    return this.activeResponse;
  }

  public get session(): IClientSession | undefined {
    return this.activeSession;
  }

  /**
   * Run a callback within a database transaction.
   *
   * Session rules:
   * - If a session is already in play (the `session` argument, otherwise the
   *   session of the transaction wrapping the current route), reuse it: the
   *   callback receives that session and no second transaction is opened.
   * - Otherwise, when IDatabase is available, open a transaction and pass the
   *   adapter's session to the callback, so the callback's operations commit
   *   or roll back with it.
   * - With no database, the callback runs without a session.
   */
  public async withTransaction<T>(
    callback: TransactionCallback<T>,
    session?: unknown,
    options?: { timeoutMs?: number },
    ...args: unknown[]
  ): Promise<T> {
    const existingSession = session ?? this.session;
    if (existingSession !== undefined) {
      return await callback(existingSession, ...args);
    }

    const db = this.application.database;
    if (db) {
      return await db.withTransaction(async (adapterSession) => {
        return await callback(adapterSession, ...args);
      });
    }

    return await callback(undefined, ...args);
  }
}
