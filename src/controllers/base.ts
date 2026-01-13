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
import { ClientSession } from '@digitaldefiance/mongoose-types';
import {
  getSuiteCoreTranslation,
  IRequestUserDTO,
  SuiteCoreComponentId,
  SuiteCoreStringKey,
  TranslatableSuiteError,
  UserNotFoundError,
} from '@digitaldefiance/suite-core-lib';
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
import { IUserDocument } from '../documents/user';
import { BaseModelName } from '../enumerations/base-model-name';
import { ExpressValidationError } from '../errors/express-validation';
import { MissingValidatedDataError } from '../errors/missing-validated-data';
import { IConstants } from '../interfaces';
import { IApplication } from '../interfaces/application';
import { authenticateCrypto } from '../middlewares/authenticate-crypto';
import { authenticateToken } from '../middlewares/authenticate-token';
import { setGlobalContextLanguageFromRequest } from '../middlewares/set-global-context-language';
import { ModelRegistry } from '../model-registry';
import { TransactionManager } from '../transactions';
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
  TransactionOptions,
  withTransaction as utilsWithTransaction,
} from '../utils';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Abstract base controller for all API controllers.
 * Provides routing, validation, authentication, transaction management, and error handling.
 * @template T API response type
 * @template H Handler object type
 * @template TLanguage Language code type
 * @template I Platform ID type
 */
export abstract class BaseController<
  T extends ApiResponse,
  H extends object,
  TLanguage extends string,
  I extends PlatformID = Buffer,
> {
  public readonly router: Router;
  private activeRequest: Request | null = null;
  private activeResponse: Response | null = null;
  private activeSession: ClientSession | undefined = undefined;
  public readonly application: IApplication<I>;
  protected routeDefinitions: RouteConfig<H, TLanguage>[] = [];
  protected get constants(): IConstants {
    if (!this.application.constants) {
      throw new Error('Constants not initialized');
    }
    return this.application.constants;
  }
  protected get pluginEngine(): PluginI18nEngine<TLanguage> {
    return PluginI18nEngine.getInstance<TLanguage>();
  }
  protected handlers: H;
  // Allowlist of registered validation functions to prevent code injection
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private static validationRegistry = new WeakSet<Function>();
  protected transactionManager: TransactionManager;

  public constructor(application: IApplication<I>) {
    this.application = application;
    this.router = Router();
    this.handlers = {} as H;
    this.transactionManager = new TransactionManager(
      application.db.connection,
      application.environment.mongo.useTransactions,
    );
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
    route: RouteConfig<H, TLanguage>,
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
    route: RouteConfig<H, TLanguage>,
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
    route: RouteConfig<H, TLanguage>,
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
          GlobalActiveContext.getInstance<
            TLanguage,
            IActiveContext<TLanguage>
          >().userLanguage,
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

  private createRequestHandler(
    config: RouteConfig<H, TLanguage>,
  ): RequestHandler {
    return async (req: Request, res: Response<T>, next: NextFunction) => {
      this.activeRequest = req;
      this.activeResponse = res;

      if (config.useAuthentication && !this.activeRequest?.user) {
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
          result = await this.transactionManager.execute(
            async (session) => {
              this.activeSession = session;
              try {
                return await typedHandler(req, ...handlerArgs);
              } finally {
                this.activeSession = undefined;
              }
            },
            { timeoutMs: config.transactionTimeout },
          );
        } else {
          result = await typedHandler(req, ...handlerArgs);
        }

        const { statusCode, response, headers } = result;
        if (headers) {
          res.set(headers);
        }
        sendFunc(statusCode, response, res);
      } catch (error) {
        this.activeSession = undefined;
        handleError(
          error,
          res as Response<ApiErrorResponse>,
          sendApiMessageResponse,
          next,
        );
      }
    };
  }

  /**
   * Initializes the routes for the controller.
   */
  private initializeRoutes(): void {
    Object.values(this.routeDefinitions).forEach(
      (config: RouteConfig<H, TLanguage>) => {
        this.router[config.method](
          config.path,
          ...[
            ...this.getAuthenticationMiddleware(config),
            setGlobalContextLanguageFromRequest,
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
    route: RouteConfig<H, TLanguage>,
    req: Request,
    res: Response<T>,
    next: NextFunction,
  ): Promise<void> {
    // Pass the real `next` function directly to the middleware.
    // It will now correctly control the request lifecycle.
    await authenticateToken<I>(this.application, req, res, next);
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

    const language =
      GlobalActiveContext.getInstance<TLanguage, IActiveContext<TLanguage>>()
        .userLanguage ?? ('en-US' as TLanguage);

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

  public get user(): IRequestUserDTO {
    if (!this.activeRequest) {
      throw new TranslatableGenericError<SuiteCoreStringKey>(
        SuiteCoreComponentId,
        SuiteCoreStringKey.Common_NoActiveRequest,
      );
    }
    if (!this.activeRequest.user) {
      throw new TranslatableGenericError<SuiteCoreStringKey>(
        SuiteCoreComponentId,
        SuiteCoreStringKey.Common_NoUserOnRequest,
      );
    }
    return this.activeRequest.user;
  }

  public get validatedBody(): Record<string, unknown> {
    if (!this.activeRequest) {
      throw new TranslatableGenericError<SuiteCoreStringKey>(
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
      throw new TranslatableGenericError<SuiteCoreStringKey>(
        SuiteCoreComponentId,
        SuiteCoreStringKey.Common_NoActiveRequest,
      );
    }
    return this.activeRequest;
  }

  public get res(): Response {
    if (!this.activeResponse) {
      throw new TranslatableGenericError<SuiteCoreStringKey>(
        SuiteCoreComponentId,
        SuiteCoreStringKey.Common_NoActiveResponse,
      );
    }
    return this.activeResponse;
  }

  public get session(): ClientSession | undefined {
    return this.activeSession;
  }

  protected async validateAndFetchRequestUser(
    req: Request,
  ): Promise<IUserDocument<TLanguage, I>> {
    const UserModel = ModelRegistry.instance.getTypedModel<
      IUserDocument<TLanguage, I>
    >(BaseModelName.User);
    if (!req.user) {
      throw new HandleableError(
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
      );
    }
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      throw new UserNotFoundError();
    }
    return user;
  }

  public async withTransaction<T>(
    callback: TransactionCallback<T>,
    session?: ClientSession,
    options?: TransactionOptions<I>,
    ...args: any
  ) {
    return await utilsWithTransaction<T, I>(
      this.application.db.connection,
      this.application.environment.mongo.useTransactions,
      session,
      callback,
      { application: this.application, ...options },
      ...args,
    );
  }
}
