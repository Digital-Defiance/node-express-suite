import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { RequestHandler } from 'express';
import { ValidationChain } from 'express-validator';
import 'reflect-metadata';
import { z } from 'zod';

// Metadata keys for storing decorator information
export const CONTROLLER_METADATA = Symbol('controller');
export const ROUTES_METADATA = Symbol('routes');

// Route decorator options
export interface RouteOptions<
  TLanguage extends CoreLanguageCode = CoreLanguageCode,
> {
  validation?: ValidationChain[] | ((lang: TLanguage) => ValidationChain[]);
  schema?: z.ZodSchema;
  middleware?: RequestHandler[];
  auth?: boolean;
  cryptoAuth?: boolean;
  rawJson?: boolean;
}

// Route metadata structure
export interface RouteMetadata<
  TLanguage extends CoreLanguageCode = CoreLanguageCode,
> {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  path: string;
  handlerName: string;
  options: RouteOptions<TLanguage>;
}

// Controller decorator
export function Controller(basePath: string = '') {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    Reflect.defineMetadata(CONTROLLER_METADATA, { basePath }, constructor);
    return constructor;
  };
}

// HTTP method decorators
export function Get<TLanguage extends CoreLanguageCode = CoreLanguageCode>(
  path: string,
  options: RouteOptions<TLanguage> = {},
) {
  return createRouteDecorator('get', path, options);
}

export function Post<TLanguage extends CoreLanguageCode = CoreLanguageCode>(
  path: string,
  options: RouteOptions<TLanguage> = {},
) {
  return createRouteDecorator('post', path, options);
}

export function Put<TLanguage extends CoreLanguageCode = CoreLanguageCode>(
  path: string,
  options: RouteOptions<TLanguage> = {},
) {
  return createRouteDecorator('put', path, options);
}

export function Delete<TLanguage extends CoreLanguageCode = CoreLanguageCode>(
  path: string,
  options: RouteOptions<TLanguage> = {},
) {
  return createRouteDecorator('delete', path, options);
}

export function Patch<TLanguage extends CoreLanguageCode = CoreLanguageCode>(
  path: string,
  options: RouteOptions<TLanguage> = {},
) {
  return createRouteDecorator('patch', path, options);
}

// Helper to create route decorators
function createRouteDecorator<
  TLanguage extends CoreLanguageCode = CoreLanguageCode,
>(
  method: 'get' | 'post' | 'put' | 'delete' | 'patch',
  path: string,
  options: RouteOptions<TLanguage>,
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const existingRoutes: RouteMetadata<CoreLanguageCode>[] =
      Reflect.getMetadata(ROUTES_METADATA, target.constructor) || [];

    const route: RouteMetadata<CoreLanguageCode> = {
      method,
      path,
      handlerName: propertyKey,
      options: options as RouteOptions<CoreLanguageCode>,
    };

    existingRoutes.push(route);
    Reflect.defineMetadata(ROUTES_METADATA, existingRoutes, target.constructor);

    return descriptor;
  };
}

// Convenience decorators
export function Auth(cryptoAuth: boolean = false) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    // This would be combined with route decorators
    return descriptor;
  };
}

export function Validate<TLanguage extends CoreLanguageCode = CoreLanguageCode>(
  validation: ValidationChain[] | ((lang: TLanguage) => ValidationChain[]),
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    // This would be combined with route decorators
    return descriptor;
  };
}
