import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import {
  getSuiteCoreTranslation,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { IStatusCodeResponse } from '../interfaces';
import { ApiResponse } from '../types';

export class ResponseBuilder<T extends ApiResponse = ApiResponse> {
  private statusCode: number = 200;
  private responseData: Partial<T> = {};
  private responseHeaders?: Record<string, string>;

  static ok<T extends ApiResponse = ApiResponse>(): ResponseBuilder<T> {
    return new ResponseBuilder<T>().status(200);
  }

  static created<T extends ApiResponse = ApiResponse>(): ResponseBuilder<T> {
    return new ResponseBuilder<T>().status(201);
  }

  static accepted<T extends ApiResponse = ApiResponse>(): ResponseBuilder<T> {
    return new ResponseBuilder<T>().status(202);
  }

  static noContent(): ResponseBuilder<ApiResponse> {
    return new ResponseBuilder<ApiResponse>().status(204);
  }

  static badRequest<T extends ApiResponse = ApiResponse>(): ResponseBuilder<T> {
    return new ResponseBuilder<T>().status(400);
  }

  static unauthorized<
    T extends ApiResponse = ApiResponse,
  >(): ResponseBuilder<T> {
    return new ResponseBuilder<T>().status(401);
  }

  static forbidden<T extends ApiResponse = ApiResponse>(): ResponseBuilder<T> {
    return new ResponseBuilder<T>().status(403);
  }

  static notFound<T extends ApiResponse = ApiResponse>(): ResponseBuilder<T> {
    return new ResponseBuilder<T>().status(404);
  }

  static error<T extends ApiResponse = ApiResponse>(): ResponseBuilder<T> {
    return new ResponseBuilder<T>().status(500);
  }

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  message(
    key: SuiteCoreStringKey,
    params?: Record<string, string>,
    language?: string,
  ): this {
    (this.responseData as T & { message?: string }).message =
      getSuiteCoreTranslation(key, params, language as CoreLanguageCode);
    return this;
  }

  data(data: Partial<T>): this {
    this.responseData = { ...this.responseData, ...data };
    return this;
  }

  headers(headers: Record<string, string>): this {
    this.responseHeaders = headers;
    return this;
  }

  build(): IStatusCodeResponse<T> {
    return {
      statusCode: this.statusCode,
      response: this.responseData as T,
      ...(this.responseHeaders ? { headers: this.responseHeaders } : {}),
    };
  }
}

export const Response = ResponseBuilder;
