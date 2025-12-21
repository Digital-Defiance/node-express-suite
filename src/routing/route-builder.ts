import { RequestHandler } from 'express';
import { ValidationChain } from 'express-validator';
import { z } from 'zod';

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

  static create<T extends string = string>(): RouteBuilder<T> {
    return new RouteBuilder<T>();
  }

  get(path: string): this {
    this.config.method = 'get';
    this.config.path = path;
    return this;
  }

  post(path: string): this {
    this.config.method = 'post';
    this.config.path = path;
    return this;
  }

  put(path: string): this {
    this.config.method = 'put';
    this.config.path = path;
    return this;
  }

  delete(path: string): this {
    this.config.method = 'delete';
    this.config.path = path;
    return this;
  }

  patch(path: string): this {
    this.config.method = 'patch';
    this.config.path = path;
    return this;
  }

  auth(enabled = true): this {
    this.config.auth = enabled;
    return this;
  }

  cryptoAuth(enabled = true): this {
    this.config.cryptoAuth = enabled;
    return this;
  }

  validate(
    validation: ValidationChain[] | ((lang: TLanguage) => ValidationChain[]),
  ): this {
    this.config.validation = validation;
    return this;
  }

  schema(schema: z.ZodSchema): this {
    this.config.schema = schema;
    return this;
  }

  use(...middleware: RequestHandler[]): this {
    this.config.middleware = [...(this.config.middleware || []), ...middleware];
    return this;
  }

  transaction(enabled = true, timeout?: number): this {
    this.config.transaction = enabled;
    if (timeout) this.config.transactionTimeout = timeout;
    return this;
  }

  rawJson(enabled = true): this {
    this.config.rawJson = enabled;
    return this;
  }

  handle(handler: RequestHandler): RouteConfig<TLanguage> {
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

export interface RouteConfig<TLanguage extends string = string> {
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
