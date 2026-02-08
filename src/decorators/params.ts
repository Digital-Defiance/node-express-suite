/**
 * @fileoverview Parameter injection decorators for Express Suite.
 * Provides @Param, @Body, @Query, @Header, @CurrentUser, @EciesUser, @Req, @Res, @Next decorators.
 * Automatically generates OpenAPI parameters for @Param, @Query, @Header.
 * @module decorators/params
 */

import 'reflect-metadata';
import {
  ParamDecoratorOptions,
  ParamMetadata,
} from '../interfaces/openApi/decoratorOptions';
import { OpenAPIParameter } from '../interfaces/openApi/parameter';
import { OPENAPI_PARAMS_METADATA, PARAMS_METADATA } from './metadata-keys';
import { getMetadataOrDefault, setMetadata } from './metadata-collector';

/**
 * Creates a parameter decorator that stores metadata for parameter injection.
 * @param type - The type of parameter injection
 * @param name - Optional name of the parameter to extract
 * @param options - Optional parameter options
 * @returns Parameter decorator function
 */
function createParamDecorator(
  type: ParamMetadata['type'],
  name?: string,
  options?: ParamDecoratorOptions,
): ParameterDecorator {
  return function (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ): void {
    if (propertyKey === undefined) {
      return;
    }

    const constructor = target.constructor;

    // Get existing params metadata or initialize empty array
    const existingParams = getMetadataOrDefault<ParamMetadata[]>(
      PARAMS_METADATA,
      constructor,
      propertyKey,
      [],
    );

    // Create param metadata
    const paramMetadata: ParamMetadata = {
      index: parameterIndex,
      type,
      name,
      options,
    };

    // Add to params array
    existingParams.push(paramMetadata);
    setMetadata(PARAMS_METADATA, existingParams, constructor, propertyKey);

    // Auto-add OpenAPI parameter for param, query, header types
    if (type === 'param' || type === 'query' || type === 'header') {
      addOpenAPIParameter(constructor, propertyKey, type, name, options);
    }
  };
}

/**
 * Adds an OpenAPI parameter definition for the decorated parameter.
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @param type - The parameter type (param, query, header)
 * @param name - The parameter name
 * @param options - Optional parameter options
 */
function addOpenAPIParameter(
  target: object,
  propertyKey: string | symbol,
  type: 'param' | 'query' | 'header',
  name?: string,
  options?: ParamDecoratorOptions,
): void {
  if (!name) {
    return;
  }

  // Map decorator type to OpenAPI 'in' location
  const locationMap: Record<
    'param' | 'query' | 'header',
    'path' | 'query' | 'header'
  > = {
    param: 'path',
    query: 'query',
    header: 'header',
  };

  const existingOpenAPIParams = getMetadataOrDefault<OpenAPIParameter[]>(
    OPENAPI_PARAMS_METADATA,
    target,
    propertyKey,
    [],
  );

  // Check if parameter already exists (avoid duplicates)
  const existingIndex = existingOpenAPIParams.findIndex(
    (p) => p.name === name && p.in === locationMap[type],
  );

  const openAPIParam: OpenAPIParameter = {
    name,
    in: locationMap[type],
    required: type === 'param' ? true : (options?.required ?? false),
    schema: options?.schema ?? { type: 'string' },
    ...(options?.description && { description: options.description }),
  };

  if (existingIndex >= 0) {
    // Update existing parameter
    existingOpenAPIParams[existingIndex] = openAPIParam;
  } else {
    // Add new parameter
    existingOpenAPIParams.push(openAPIParam);
  }

  setMetadata(
    OPENAPI_PARAMS_METADATA,
    existingOpenAPIParams,
    target,
    propertyKey,
  );
}

/**
 * Decorator that injects a path parameter value into the method parameter.
 * Automatically adds OpenAPI path parameter documentation.
 *
 * @param name - Name of the path parameter to extract
 * @param options - Optional parameter options (description, example, schema)
 * @returns Parameter decorator
 *
 * @example
 * ```typescript
 * @ApiController('/api/users')
 * class UserController {
 *   @Get('/:id')
 *   async getUser(@Param('id', { description: 'User ID' }) id: string) {
 *     return this.userService.findById(id);
 *   }
 * }
 * ```
 */
export function Param(
  name: string,
  options?: ParamDecoratorOptions,
): ParameterDecorator {
  return createParamDecorator('param', name, options);
}

/**
 * Decorator that injects the request body or a specific field from it.
 * Does not auto-generate OpenAPI parameters (use @ApiRequestBody for that).
 *
 * @param field - Optional field name to extract from the body
 * @returns Parameter decorator
 *
 * @example
 * ```typescript
 * @ApiController('/api/users')
 * class UserController {
 *   // Inject entire body
 *   @Post('/')
 *   async createUser(@Body() data: CreateUserDto) {
 *     return this.userService.create(data);
 *   }
 *
 *   // Inject specific field
 *   @Post('/login')
 *   async login(@Body('email') email: string, @Body('password') password: string) {
 *     return this.authService.login(email, password);
 *   }
 * }
 * ```
 */
export function Body(field?: string): ParameterDecorator {
  return createParamDecorator('body', field);
}

/**
 * Decorator that injects a query parameter value into the method parameter.
 * Automatically adds OpenAPI query parameter documentation.
 *
 * @param name - Name of the query parameter to extract
 * @param options - Optional parameter options (description, example, required, schema)
 * @returns Parameter decorator
 *
 * @example
 * ```typescript
 * @ApiController('/api/users')
 * class UserController {
 *   @Get('/')
 *   async listUsers(
 *     @Query('page', { description: 'Page number', schema: { type: 'integer' } }) page: number,
 *     @Query('limit', { description: 'Items per page' }) limit: number,
 *   ) {
 *     return this.userService.findAll({ page, limit });
 *   }
 * }
 * ```
 */
export function Query(
  name: string,
  options?: ParamDecoratorOptions,
): ParameterDecorator {
  return createParamDecorator('query', name, options);
}

/**
 * Decorator that injects a header value into the method parameter.
 * Automatically adds OpenAPI header parameter documentation.
 *
 * @param name - Name of the header to extract
 * @param options - Optional parameter options (description, example, required, schema)
 * @returns Parameter decorator
 *
 * @example
 * ```typescript
 * @ApiController('/api/data')
 * class DataController {
 *   @Get('/')
 *   async getData(
 *     @Header('X-Request-ID', { description: 'Request tracking ID' }) requestId: string,
 *     @Header('Accept-Language') language: string,
 *   ) {
 *     return this.dataService.get({ requestId, language });
 *   }
 * }
 * ```
 */
export function Header(
  name: string,
  options?: ParamDecoratorOptions,
): ParameterDecorator {
  return createParamDecorator('header', name, options);
}

/**
 * Decorator that injects the authenticated user from the request.
 * Injects `req.user` which is populated by JWT authentication middleware.
 *
 * @returns Parameter decorator
 *
 * @example
 * ```typescript
 * @RequireAuth()
 * @ApiController('/api/profile')
 * class ProfileController {
 *   @Get('/')
 *   async getProfile(@CurrentUser() user: AuthenticatedUser) {
 *     return this.profileService.getByUserId(user.id);
 *   }
 * }
 * ```
 */
export function CurrentUser(): ParameterDecorator {
  return createParamDecorator('user');
}

/**
 * Decorator that injects the ECIES authenticated member from the request.
 * Injects `req.eciesUser` which is populated by ECIES crypto authentication middleware.
 *
 * @returns Parameter decorator
 *
 * @example
 * ```typescript
 * @RequireCryptoAuth()
 * @ApiController('/api/secure')
 * class SecureController {
 *   @Get('/data')
 *   async getSecureData(@EciesUser() member: EciesMember) {
 *     return this.secureService.getDataForMember(member);
 *   }
 * }
 * ```
 */
export function EciesUser(): ParameterDecorator {
  return createParamDecorator('eciesUser');
}

/**
 * Decorator that injects the raw Express Request object.
 * Use sparingly - prefer specific parameter decorators when possible.
 *
 * @returns Parameter decorator
 *
 * @example
 * ```typescript
 * @ApiController('/api/upload')
 * class UploadController {
 *   @Post('/')
 *   async upload(@Req() req: Request) {
 *     // Access raw request for file uploads, etc.
 *     return this.uploadService.handleUpload(req);
 *   }
 * }
 * ```
 */
export function Req(): ParameterDecorator {
  return createParamDecorator('req');
}

/**
 * Decorator that injects the raw Express Response object.
 * Use sparingly - prefer returning values from handlers when possible.
 *
 * @returns Parameter decorator
 *
 * @example
 * ```typescript
 * @ApiController('/api/download')
 * class DownloadController {
 *   @Get('/:id')
 *   async download(@Param('id') id: string, @Res() res: Response) {
 *     // Stream file directly to response
 *     const stream = await this.fileService.getStream(id);
 *     stream.pipe(res);
 *   }
 * }
 * ```
 */
export function Res(): ParameterDecorator {
  return createParamDecorator('res');
}

/**
 * Decorator that injects the Express NextFunction.
 * Useful for middleware-like handlers that need to pass control.
 *
 * @returns Parameter decorator
 *
 * @example
 * ```typescript
 * @ApiController('/api/middleware')
 * class MiddlewareController {
 *   @Get('/')
 *   async handle(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
 *     if (someCondition) {
 *       return next();
 *     }
 *     res.json({ handled: true });
 *   }
 * }
 * ```
 */
export function Next(): ParameterDecorator {
  return createParamDecorator('next');
}

/**
 * Gets all parameter metadata for a method.
 * Returns parameters sorted by index for proper injection order.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns Array of parameter metadata sorted by index
 */
export function getParamMetadata(
  target: object,
  propertyKey: string | symbol,
): ParamMetadata[] {
  const params = getMetadataOrDefault<ParamMetadata[]>(
    PARAMS_METADATA,
    target,
    propertyKey,
    [],
  );
  // Sort by parameter index for proper injection order
  return [...params].sort((a, b) => a.index - b.index);
}

/**
 * Gets OpenAPI parameter definitions for a method.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns Array of OpenAPI parameter definitions
 */
export function getOpenAPIParamMetadata(
  target: object,
  propertyKey: string | symbol,
): OpenAPIParameter[] {
  return getMetadataOrDefault<OpenAPIParameter[]>(
    OPENAPI_PARAMS_METADATA,
    target,
    propertyKey,
    [],
  );
}
