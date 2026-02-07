/**
 * @fileoverview Route builder for fluent route configuration.
 * Provides builder pattern for defining Express routes.
 * @module routing/route-builder
 */

import { RequestHandler } from 'express';
import { ValidationChain } from 'express-validator';
import { z } from 'zod';

/**
 * Builder for constructing route configurations with fluent API.
 * @template TLanguage - Language code type (defaults to string)
 */
export class RouteBuilder<TLanguage extends string = string> {
  private config: {
    method?: 'get' | 'post' | 'put' | 'delete' | 'patch';
    path?: string;
    handler?: RequestHandler;
    auth?: boolean;
    cryptoAuth?: boolean;
    validation?: ValidationChain[] | ((lang: TLanguage) => ValidationChain[]);
    schema?: z.ZodSchema;
    middleware?: RequestHandler[];
    transaction?: boolean;
    transactionTimeout?: number;
    rawJson?: boolean;
  } = {};

  /**
   * Creates a new RouteBuilder instance.
   * @template T - Language code type
   * @returns {RouteBuilder<T>} New builder instance
   */
  static create<T extends string = string>(): RouteBuilder<T> {
    return new RouteBuilder<T>();
  }

  /**
   * Sets GET method and path.
   * @param {string} path - Route path
   * @returns {this} This builder for chaining
   */
  get(path: string): this {
    this.config.method = 'get';
    this.config.path = path;
    return this;
  }

  /**
   * Sets POST method and path.
   * @param {string} path - Route path
   * @returns {this} This builder for chaining
   */
  post(path: string): this {
    this.config.method = 'post';
    this.config.path = path;
    return this;
  }

  /**
   * Sets PUT method and path.
   * @param {string} path - Route path
   * @returns {this} This builder for chaining
   */
  put(path: string): this {
    this.config.method = 'put';
    this.config.path = path;
    return this;
  }

  /**
   * Sets DELETE method and path.
   * @param {string} path - Route path
   * @returns {this} This builder for chaining
   */
  delete(path: string): this {
    this.config.method = 'delete';
    this.config.path = path;
    return this;
  }

  /**
   * Sets PATCH method and path.
   * @param {string} path - Route path
   * @returns {this} This builder for chaining
   */
  patch(path: string): this {
    this.config.method = 'patch';
    this.config.path = path;
    return this;
  }

  /**
   * Enables authentication.
   * @param {boolean} [enabled=true] - Whether to enable authentication
   * @returns {this} This builder for chaining
   */
  auth(enabled = true): this {
    this.config.auth = enabled;
    return this;
  }

  /**
   * Enables crypto authentication.
   * @param {boolean} [enabled=true] - Whether to enable crypto authentication
   * @returns {this} This builder for chaining
   */
  cryptoAuth(enabled = true): this {
    this.config.cryptoAuth = enabled;
    return this;
  }

  /**
   * Sets validation chains.
   * @param {ValidationChain[] | Function} validation - Validation chains or factory function
   * @returns {this} This builder for chaining
   */
  validate(
    validation: ValidationChain[] | ((lang: TLanguage) => ValidationChain[]),
  ): this {
    this.config.validation = validation;
    return this;
  }

  /**
   * Sets Zod schema for validation.
   * @param {z.ZodSchema} schema - Zod schema
   * @returns {this} This builder for chaining
   */
  schema(schema: z.ZodSchema): this {
    this.config.schema = schema;
    return this;
  }

  /**
   * Adds middleware to the route.
   * @param {...RequestHandler[]} middleware - Middleware functions
   * @returns {this} This builder for chaining
   */
  use(...middleware: RequestHandler[]): this {
    this.config.middleware = [...(this.config.middleware || []), ...middleware];
    return this;
  }

  /**
   * Enables transaction support.
   * @param {boolean} [enabled=true] - Whether to enable transactions
   * @param {number} [timeout] - Transaction timeout in milliseconds
   * @returns {this} This builder for chaining
   */
  transaction(enabled = true, timeout?: number): this {
    this.config.transaction = enabled;
    if (timeout) this.config.transactionTimeout = timeout;
    return this;
  }

  /**
   * Enables raw JSON handling.
   * @param {boolean} [enabled=true] - Whether to enable raw JSON
   * @returns {this} This builder for chaining
   */
  rawJson(enabled = true): this {
    this.config.rawJson = enabled;
    return this;
  }

  /**
   * Builds the route configuration with handler.
   * @param {RequestHandler} handler - Route handler function
   * @returns {BuilderRouteConfig<TLanguage>} Complete route configuration
   * @throws {Error} If method or path not set
   */
  handle(handler: RequestHandler): BuilderRouteConfig<TLanguage> {
    if (!this.config.method || !this.config.path) {
      throw new Error('Method and path must be set before calling handle()');
    }
    return {
      method: this.config.method,
      path: this.config.path,
      handler,
      options: {
        auth: this.config.auth,
        cryptoAuth: this.config.cryptoAuth,
        validation: this.config.validation,
        schema: this.config.schema,
        middleware: this.config.middleware,
        transaction: this.config.transaction,
        transactionTimeout: this.config.transactionTimeout,
        rawJson: this.config.rawJson,
      },
    };
  }
}

/**
 * Route configuration output from RouteBuilder.
 * @template TLanguage - Language code type (defaults to string)
 */
export interface BuilderRouteConfig<TLanguage extends string = string> {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  path: string;
  handler: RequestHandler;
  options: {
    auth?: boolean;
    cryptoAuth?: boolean;
    validation?: ValidationChain[] | ((lang: TLanguage) => ValidationChain[]);
    schema?: z.ZodSchema;
    middleware?: RequestHandler[];
    transaction?: boolean;
    transactionTimeout?: number;
    rawJson?: boolean;
  };
}
