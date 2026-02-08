import { z } from 'zod';
import {
  ApiControllerOptions,
  isApiControllerOptions,
  RouteDecoratorOptions,
  isRouteDecoratorOptions,
  AuthDecoratorOptions,
  isAuthDecoratorOptions,
  ParamDecoratorOptions,
  isParamDecoratorOptions,
  ParamMetadata,
  isParamMetadata,
  ReturnsDecoratorOptions,
  isReturnsDecoratorOptions,
  ResponseMetadata,
  isResponseMetadata,
  PaginatedDecoratorOptions,
  isPaginatedDecoratorOptions,
  CacheDecoratorOptions,
  isCacheDecoratorOptions,
  RateLimitDecoratorOptions,
  isRateLimitDecoratorOptions,
  TransactionalDecoratorOptions,
  isTransactionalDecoratorOptions,
  ApiParamDecoratorOptions,
  isApiParamDecoratorOptions,
  OpenAPIParamMetadata,
  isOpenAPIParamMetadata,
  ApiRequestBodyDecoratorOptions,
  isApiRequestBodyDecoratorOptions,
  LifecycleMetadata,
  isLifecycleMetadata,
  ApiSchemaDecoratorOptions,
  isApiSchemaDecoratorOptions,
  ApiPropertyDecoratorOptions,
  isApiPropertyDecoratorOptions,
  SchemaPropertyMetadata,
  isSchemaPropertyMetadata,
  SchemaMetadata,
  isSchemaMetadata,
  ApiOperationDecoratorOptions,
  isApiOperationDecoratorOptions,
  ApiExampleDecoratorOptions,
  isApiExampleDecoratorOptions,
  AuthMetadata,
  isAuthMetadata,
  ValidationMetadata,
  isValidationMetadata,
  MiddlewareMetadata,
  isMiddlewareMetadata,
  TransactionMetadata,
  isTransactionMetadata,
} from '../../../src/interfaces/openApi/decoratorOptions';

describe('decoratorOptions', () => {
  describe('isApiControllerOptions', () => {
    it('should return true for valid options with all fields', () => {
      const options: ApiControllerOptions = {
        tags: ['users', 'admin'],
        description: 'User management controller',
        deprecated: false,
        name: 'UserController',
      };
      expect(isApiControllerOptions(options)).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(isApiControllerOptions({})).toBe(true);
    });

    it('should return false for null', () => {
      expect(isApiControllerOptions(null)).toBe(false);
    });

    it('should return false for non-string tags', () => {
      expect(isApiControllerOptions({ tags: [123] })).toBe(false);
    });

    it('should return false for non-boolean deprecated', () => {
      expect(isApiControllerOptions({ deprecated: 'yes' })).toBe(false);
    });
  });

  describe('isRouteDecoratorOptions', () => {
    it('should return true for valid options', () => {
      const options: RouteDecoratorOptions = {
        auth: true,
        summary: 'Get user by ID',
        tags: ['users'],
      };
      expect(isRouteDecoratorOptions(options)).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(isRouteDecoratorOptions({})).toBe(true);
    });

    it('should return false for non-boolean auth', () => {
      expect(isRouteDecoratorOptions({ auth: 'true' })).toBe(false);
    });

    it('should return false for non-number transactionTimeout', () => {
      expect(isRouteDecoratorOptions({ transactionTimeout: '5000' })).toBe(
        false,
      );
    });
  });

  describe('isAuthDecoratorOptions', () => {
    it('should return true for valid options', () => {
      const options: AuthDecoratorOptions = { failureStatusCode: 403 };
      expect(isAuthDecoratorOptions(options)).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(isAuthDecoratorOptions({})).toBe(true);
    });

    it('should return false for non-number failureStatusCode', () => {
      expect(isAuthDecoratorOptions({ failureStatusCode: '401' })).toBe(false);
    });
  });

  describe('isParamDecoratorOptions', () => {
    it('should return true for valid options', () => {
      const options: ParamDecoratorOptions = {
        description: 'User ID',
        required: true,
        deprecated: false,
      };
      expect(isParamDecoratorOptions(options)).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(isParamDecoratorOptions({})).toBe(true);
    });

    it('should return false for non-string description', () => {
      expect(isParamDecoratorOptions({ description: 123 })).toBe(false);
    });
  });

  describe('isParamMetadata', () => {
    it('should return true for valid metadata', () => {
      const metadata: ParamMetadata = {
        index: 0,
        type: 'param',
        name: 'id',
      };
      expect(isParamMetadata(metadata)).toBe(true);
    });

    it('should return true for all valid types', () => {
      const types = [
        'param',
        'body',
        'query',
        'header',
        'user',
        'eciesUser',
        'req',
        'res',
        'next',
      ] as const;
      for (const type of types) {
        expect(isParamMetadata({ index: 0, type })).toBe(true);
      }
    });

    it('should return false for invalid type', () => {
      expect(isParamMetadata({ index: 0, type: 'invalid' })).toBe(false);
    });

    it('should return false for missing index', () => {
      expect(isParamMetadata({ type: 'param' })).toBe(false);
    });
  });

  describe('isReturnsDecoratorOptions', () => {
    it('should return true for valid options', () => {
      const options: ReturnsDecoratorOptions = {
        description: 'User object',
        example: { id: '123', name: 'John' },
      };
      expect(isReturnsDecoratorOptions(options)).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(isReturnsDecoratorOptions({})).toBe(true);
    });

    it('should return false for non-string description', () => {
      expect(isReturnsDecoratorOptions({ description: 123 })).toBe(false);
    });
  });

  describe('isResponseMetadata', () => {
    it('should return true for valid metadata', () => {
      const metadata: ResponseMetadata = {
        statusCode: 200,
        schema: 'User',
        description: 'Success',
      };
      expect(isResponseMetadata(metadata)).toBe(true);
    });

    it('should return false for missing statusCode', () => {
      expect(isResponseMetadata({ schema: 'User' })).toBe(false);
    });

    it('should return false for non-number statusCode', () => {
      expect(isResponseMetadata({ statusCode: '200' })).toBe(false);
    });
  });

  describe('isPaginatedDecoratorOptions', () => {
    it('should return true for valid options', () => {
      const options: PaginatedDecoratorOptions = {
        defaultPageSize: 20,
        maxPageSize: 100,
        useOffset: true,
      };
      expect(isPaginatedDecoratorOptions(options)).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(isPaginatedDecoratorOptions({})).toBe(true);
    });

    it('should return false for non-number defaultPageSize', () => {
      expect(isPaginatedDecoratorOptions({ defaultPageSize: '20' })).toBe(
        false,
      );
    });
  });

  describe('isCacheDecoratorOptions', () => {
    it('should return true for valid options', () => {
      const options: CacheDecoratorOptions = {
        ttl: 300,
        keyPrefix: 'users',
        varyByUser: true,
        varyByQuery: ['page', 'limit'],
      };
      expect(isCacheDecoratorOptions(options)).toBe(true);
    });

    it('should return false for missing ttl', () => {
      expect(isCacheDecoratorOptions({})).toBe(false);
    });

    it('should return false for non-number ttl', () => {
      expect(isCacheDecoratorOptions({ ttl: '300' })).toBe(false);
    });

    it('should return false for non-string array varyByQuery', () => {
      expect(isCacheDecoratorOptions({ ttl: 300, varyByQuery: [123] })).toBe(
        false,
      );
    });
  });

  describe('isRateLimitDecoratorOptions', () => {
    it('should return true for valid options', () => {
      const options: RateLimitDecoratorOptions = {
        requests: 100,
        window: 60,
        message: 'Too many requests',
        byUser: true,
      };
      expect(isRateLimitDecoratorOptions(options)).toBe(true);
    });

    it('should return false for missing requests', () => {
      expect(isRateLimitDecoratorOptions({ window: 60 })).toBe(false);
    });

    it('should return false for missing window', () => {
      expect(isRateLimitDecoratorOptions({ requests: 100 })).toBe(false);
    });
  });

  describe('isTransactionalDecoratorOptions', () => {
    it('should return true for valid options', () => {
      const options: TransactionalDecoratorOptions = { timeout: 5000 };
      expect(isTransactionalDecoratorOptions(options)).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(isTransactionalDecoratorOptions({})).toBe(true);
    });

    it('should return false for non-number timeout', () => {
      expect(isTransactionalDecoratorOptions({ timeout: '5000' })).toBe(false);
    });
  });

  describe('isApiParamDecoratorOptions', () => {
    it('should return true for valid options', () => {
      const options: ApiParamDecoratorOptions = {
        description: 'User ID',
        required: true,
        deprecated: false,
        enum: ['active', 'inactive'],
      };
      expect(isApiParamDecoratorOptions(options)).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(isApiParamDecoratorOptions({})).toBe(true);
    });

    it('should return false for non-string array enum', () => {
      expect(isApiParamDecoratorOptions({ enum: [1, 2, 3] })).toBe(false);
    });
  });

  describe('isOpenAPIParamMetadata', () => {
    it('should return true for valid metadata', () => {
      const metadata: OpenAPIParamMetadata = {
        name: 'userId',
        in: 'path',
        options: { required: true },
      };
      expect(isOpenAPIParamMetadata(metadata)).toBe(true);
    });

    it('should return true for all valid locations', () => {
      const locations = ['path', 'query', 'header', 'cookie'] as const;
      for (const location of locations) {
        expect(
          isOpenAPIParamMetadata({ name: 'test', in: location, options: {} }),
        ).toBe(true);
      }
    });

    it('should return false for invalid location', () => {
      expect(
        isOpenAPIParamMetadata({ name: 'test', in: 'body', options: {} }),
      ).toBe(false);
    });

    it('should return false for missing name', () => {
      expect(isOpenAPIParamMetadata({ in: 'path', options: {} })).toBe(false);
    });
  });

  describe('isApiRequestBodyDecoratorOptions', () => {
    it('should return true for string schema', () => {
      const options: ApiRequestBodyDecoratorOptions = {
        schema: 'CreateUserRequest',
        description: 'User data',
        required: true,
      };
      expect(isApiRequestBodyDecoratorOptions(options)).toBe(true);
    });

    it('should return true for Zod schema', () => {
      const options: ApiRequestBodyDecoratorOptions = {
        schema: z.object({ name: z.string() }),
      };
      expect(isApiRequestBodyDecoratorOptions(options)).toBe(true);
    });

    it('should return false for missing schema', () => {
      expect(isApiRequestBodyDecoratorOptions({ description: 'test' })).toBe(
        false,
      );
    });

    it('should return false for invalid schema type', () => {
      expect(isApiRequestBodyDecoratorOptions({ schema: 123 })).toBe(false);
    });
  });

  describe('isLifecycleMetadata', () => {
    it('should return true for valid metadata with callbacks', () => {
      const metadata: LifecycleMetadata = {
        onSuccess: [() => {}],
        onError: [() => {}],
        before: [() => {}],
        after: [() => {}],
      };
      expect(isLifecycleMetadata(metadata)).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(isLifecycleMetadata({})).toBe(true);
    });

    it('should return false for non-function array', () => {
      expect(isLifecycleMetadata({ onSuccess: ['not a function'] })).toBe(
        false,
      );
    });
  });

  describe('isApiSchemaDecoratorOptions', () => {
    it('should return true for valid options', () => {
      const options: ApiSchemaDecoratorOptions = {
        name: 'User',
        description: 'User schema',
        example: { id: '123' },
      };
      expect(isApiSchemaDecoratorOptions(options)).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(isApiSchemaDecoratorOptions({})).toBe(true);
    });

    it('should return false for non-string name', () => {
      expect(isApiSchemaDecoratorOptions({ name: 123 })).toBe(false);
    });
  });

  describe('isApiPropertyDecoratorOptions', () => {
    it('should return true for valid options', () => {
      const options: ApiPropertyDecoratorOptions = {
        type: 'string',
        format: 'email',
        description: 'User email',
        required: true,
        nullable: false,
        minLength: 5,
        maxLength: 100,
      };
      expect(isApiPropertyDecoratorOptions(options)).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(isApiPropertyDecoratorOptions({})).toBe(true);
    });

    it('should return false for non-number minimum', () => {
      expect(isApiPropertyDecoratorOptions({ minimum: '0' })).toBe(false);
    });

    it('should return false for non-string array enum', () => {
      expect(isApiPropertyDecoratorOptions({ enum: [1, 2] })).toBe(false);
    });
  });

  describe('isSchemaPropertyMetadata', () => {
    it('should return true for valid metadata', () => {
      const metadata: SchemaPropertyMetadata = {
        propertyKey: 'email',
        options: { type: 'string', format: 'email' },
      };
      expect(isSchemaPropertyMetadata(metadata)).toBe(true);
    });

    it('should return false for missing propertyKey', () => {
      expect(isSchemaPropertyMetadata({ options: {} })).toBe(false);
    });

    it('should return false for missing options', () => {
      expect(isSchemaPropertyMetadata({ propertyKey: 'test' })).toBe(false);
    });
  });

  describe('isSchemaMetadata', () => {
    it('should return true for valid metadata', () => {
      const metadata: SchemaMetadata = {
        name: 'User',
        options: { description: 'User schema' },
        properties: [{ propertyKey: 'id', options: { type: 'string' } }],
      };
      expect(isSchemaMetadata(metadata)).toBe(true);
    });

    it('should return false for missing name', () => {
      expect(isSchemaMetadata({ options: {}, properties: [] })).toBe(false);
    });

    it('should return false for invalid properties', () => {
      expect(
        isSchemaMetadata({
          name: 'Test',
          options: {},
          properties: [{ invalid: true }],
        }),
      ).toBe(false);
    });
  });

  describe('isApiOperationDecoratorOptions', () => {
    it('should return true for valid options', () => {
      const options: ApiOperationDecoratorOptions = {
        summary: 'Get user',
        description: 'Retrieves a user by ID',
        tags: ['users'],
        operationId: 'getUser',
        deprecated: false,
      };
      expect(isApiOperationDecoratorOptions(options)).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(isApiOperationDecoratorOptions({})).toBe(true);
    });

    it('should return false for non-string array tags', () => {
      expect(isApiOperationDecoratorOptions({ tags: [123] })).toBe(false);
    });
  });

  describe('isApiExampleDecoratorOptions', () => {
    it('should return true for valid options', () => {
      const options: ApiExampleDecoratorOptions = {
        name: 'example1',
        summary: 'Example user',
        value: { id: '123', name: 'John' },
        type: 'response',
        statusCode: 200,
      };
      expect(isApiExampleDecoratorOptions(options)).toBe(true);
    });

    it('should return false for missing value', () => {
      expect(isApiExampleDecoratorOptions({ name: 'test' })).toBe(false);
    });

    it('should return false for invalid type', () => {
      expect(isApiExampleDecoratorOptions({ value: {}, type: 'invalid' })).toBe(
        false,
      );
    });
  });

  describe('isAuthMetadata', () => {
    it('should return true for valid metadata', () => {
      const metadata: AuthMetadata = {
        requireAuth: true,
        requireCryptoAuth: false,
        isPublic: false,
        failureStatusCode: 401,
      };
      expect(isAuthMetadata(metadata)).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(isAuthMetadata({})).toBe(true);
    });

    it('should return false for non-boolean requireAuth', () => {
      expect(isAuthMetadata({ requireAuth: 'true' })).toBe(false);
    });
  });

  describe('isValidationMetadata', () => {
    it('should return true for Zod schema', () => {
      const metadata: ValidationMetadata = {
        body: z.object({ name: z.string() }),
      };
      expect(isValidationMetadata(metadata)).toBe(true);
    });

    it('should return true for function', () => {
      const metadata: ValidationMetadata = {
        body: () => [],
      };
      expect(isValidationMetadata(metadata)).toBe(true);
    });

    it('should return true for array', () => {
      const metadata: ValidationMetadata = {
        body: [],
      };
      expect(isValidationMetadata(metadata)).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(isValidationMetadata({})).toBe(true);
    });

    it('should return false for invalid body type', () => {
      expect(isValidationMetadata({ body: 'invalid' })).toBe(false);
    });
  });

  describe('isMiddlewareMetadata', () => {
    it('should return true for valid metadata', () => {
      const metadata: MiddlewareMetadata = {
        middleware: [(_req, _res, next) => next()],
      };
      expect(isMiddlewareMetadata(metadata)).toBe(true);
    });

    it('should return false for missing middleware', () => {
      expect(isMiddlewareMetadata({})).toBe(false);
    });

    it('should return false for non-function array', () => {
      expect(isMiddlewareMetadata({ middleware: ['not a function'] })).toBe(
        false,
      );
    });
  });

  describe('isTransactionMetadata', () => {
    it('should return true for valid metadata', () => {
      const metadata: TransactionMetadata = {
        useTransaction: true,
        timeout: 5000,
      };
      expect(isTransactionMetadata(metadata)).toBe(true);
    });

    it('should return false for missing useTransaction', () => {
      expect(isTransactionMetadata({ timeout: 5000 })).toBe(false);
    });

    it('should return false for non-boolean useTransaction', () => {
      expect(isTransactionMetadata({ useTransaction: 'true' })).toBe(false);
    });
  });
});
