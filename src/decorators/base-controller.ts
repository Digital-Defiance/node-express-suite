import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import 'reflect-metadata';
import { BaseController } from '../controllers/base';
import { IApplication } from '../interfaces/application';
import { ApiResponse } from '../types';
import { ROUTES_METADATA, RouteMetadata, ValidationContext } from './controller';
import { zodToExpressValidator } from './zod-validation';

export abstract class DecoratorBaseController<
  TLanguage extends CoreLanguageCode = CoreLanguageCode,
> extends BaseController<ApiResponse, Record<string, any>, TLanguage> {
  constructor(application: IApplication) {
    super(application);
  }

  protected initRouteDefinitions(): void {
    const routes = (Reflect.getMetadata(ROUTES_METADATA, this.constructor) ||
      []) as RouteMetadata<TLanguage>[];
    const constants = this.application.constants;

    this.routeDefinitions = routes.map((route) => {
      let validation = route.options.validation;

      // Bind validation function to preserve 'this' context and inject constants
      if (typeof validation === 'function') {
        const context: ValidationContext = { constants };
        const originalValidation = validation;
        validation = ((lang: TLanguage) => {
          return (originalValidation as (this: ValidationContext, lang: TLanguage) => any).call(context, lang);
        }) as typeof validation;
      }

      // Convert Zod schema to validation if present
      if (route.options.schema && !validation) {
        const schemaValidation = zodToExpressValidator<TLanguage>(
          route.options.schema,
        );
        if (Array.isArray(schemaValidation)) {
          validation = schemaValidation;
        } else {
          validation = ((lang: TLanguage) =>
            schemaValidation(lang)) as typeof route.options.validation;
        }
      }

      return {
        method: route.method,
        path: route.path,
        handlerKey: route.handlerName,
        useAuthentication: route.options.auth ?? false,
        useCryptoAuthentication: route.options.cryptoAuth ?? false,
        validation: validation as any,
        middleware: route.options.middleware,
        rawJsonHandler: route.options.rawJson ?? false,
        useTransaction: route.options.transaction ?? false,
        transactionTimeout: route.options.transactionTimeout,
      };
    });

    // Create handlers object from decorated methods
    this.handlers = {};
    routes.forEach((route) => {
      const handler = (this as any)[route.handlerName];
      if (typeof handler === 'function') {
        this.handlers[route.handlerName] = handler.bind(this);
      }
    });
  }
}
