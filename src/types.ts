import { NextFunction, RequestHandler, Response } from 'express';
import { ValidationChain } from 'express-validator';
import { ClientSession } from 'mongoose';
import { IBaseDocument } from './documents';
import {
  IApiErrorResponse,
  IApiExpressValidationErrorResponse,
  IApiMessageResponse,
  IApiMongoValidationErrorResponse,
  IStatusCodeResponse,
} from './interfaces';
import { ISchema } from './interfaces/schema';

/**
 * Transaction callback type for withTransaction
 */
export type TransactionCallback<T> = (
  session: ClientSession | undefined,
  ...args: Array<unknown>
) => Promise<T>;

/**
 * Validated body for express-validator
 */
export type ValidatedBody<T extends string> = {
  [K in T]: unknown;
};

/**
 * Schema map interface
 */
type ModelDocMap<TModelDocs extends Record<string, IBaseDocument<any>>> = {
  [K in keyof TModelDocs]: TModelDocs[K];
};

export type SchemaMap<TModelDocs extends Record<string, IBaseDocument<any>>> = {
  /**
   * For each model name, contains the corresponding schema and model
   */
  [K in keyof ModelDocMap<TModelDocs>]: ISchema<ModelDocMap<TModelDocs>[K]>;
};

export type ApiRequestHandler<T extends ApiResponse> = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<IStatusCodeResponse<T>>;

export type TypedHandlers = {
  [key: string]: ApiRequestHandler<ApiResponse>;
};

export interface IRouteDefinition<
  T extends TypedHandlers,
  TLanguage extends string,
> {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  path: string;
  options: {
    handlerKey: keyof T;
    validation?: (validationLanguage: TLanguage) => ValidationChain[];
    useAuthentication: boolean;
    useCryptoAuthentication: boolean;
  };
}

export type RouteHandlers = Record<string, ApiRequestHandler<ApiResponse>>;

export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

export interface RouteConfig<H extends object, TLanguage extends string> {
  method: HttpMethod;
  path: string;
  handlerKey: keyof H;
  handlerArgs?: Array<unknown>;
  useAuthentication: boolean;
  useCryptoAuthentication: boolean;
  middleware?: RequestHandler[];
  validation?: FlexibleValidationChain<TLanguage>;
  rawJsonHandler?: boolean;
  authFailureStatusCode?: number;
  useTransaction?: boolean;
  transactionTimeout?: number;
}

export function routeConfig<T extends object, TLanguage extends string>(
  method: 'get' | 'post' | 'put' | 'delete' | 'patch',
  path: string,
  options: {
    handlerKey: keyof T;
    validation?: (validationLanguage: TLanguage) => ValidationChain[];
    useAuthentication: boolean;
    useCryptoAuthentication: boolean;
  },
): RouteConfig<T, TLanguage> {
  return {
    method,
    path,
    handlerKey: options.handlerKey,
    validation: options.validation,
    useAuthentication: options.useAuthentication,
    useCryptoAuthentication: options.useCryptoAuthentication,
  };
}

export type THandlerArgs<T extends Array<unknown>> = T;

export type FlexibleValidationChain<TLanguage extends string> =
  | ValidationChain[]
  | ((lang: TLanguage) => ValidationChain[]);

export type JsonPrimitive = string | number | boolean | null | undefined;

export type JsonResponse =
  | JsonPrimitive
  | { [key: string]: JsonResponse }
  | JsonResponse[];

export type ApiErrorResponse =
  | IApiErrorResponse
  | IApiExpressValidationErrorResponse
  | IApiMongoValidationErrorResponse;

export type ApiResponse = IApiMessageResponse | ApiErrorResponse | JsonResponse;

export type SendFunction<T extends ApiResponse> = (
  statusCode: number,
  data: T,
  res: Response<T>,
) => void;
