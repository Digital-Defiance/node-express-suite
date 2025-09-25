import { RequestHandler } from 'express';
import { ValidationChain } from 'express-validator';
import 'reflect-metadata';
import { z } from 'zod';

// Metadata keys for storing decorator information
export const CONTROLLER_METADATA = Symbol('controller');
export const ROUTES_METADATA = Symbol('routes');

// Route decorator options
export interface RouteOptions<TLanguage extends string = string> {
  validation?: ValidationChain[] | ((lang: TLanguage) => ValidationChain[]);
  schema?: z.ZodSchema;
  middleware?: RequestHandler[];
  auth?: boolean;
  cryptoAuth?: boolean;
  rawJson?: boolean;
}

// Route metadata structure
export interface RouteMetadata<TLanguage extends string = string> {
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
export function Get(path: string, options: RouteOptions = {}) {
  return createRouteDecorator('get', path, options);
}

export function Post(path: string, options: RouteOptions = {}) {
  return createRouteDecorator('post', path, options);
}

export function Put(path: string, options: RouteOptions = {}) {
  return createRouteDecorator('put', path, options);
}

export function Delete(path: string, options: RouteOptions = {}) {
  return createRouteDecorator('delete', path, options);
}

export function Patch(path: string, options: RouteOptions = {}) {
  return createRouteDecorator('patch', path, options);
}

// Helper to create route decorators
function createRouteDecorator(
  method: 'get' | 'post' | 'put' | 'delete' | 'patch',
  path: string,
  options: RouteOptions,
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const existingRoutes: RouteMetadata[] =
      Reflect.getMetadata(ROUTES_METADATA, target.constructor) || [];

    const route: RouteMetadata = {
      method,
      path,
      handlerName: propertyKey,
      options,
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

export function Validate(
  validation: ValidationChain[] | ((lang: string) => ValidationChain[]),
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
