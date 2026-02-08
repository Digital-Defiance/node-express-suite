/**
 * @fileoverview Validation decorators for Express Suite.
 * Provides @ValidateBody, @ValidateParams, @ValidateQuery decorators.
 * Supports Zod schemas, express-validator chains, and language-aware validation functions.
 * Automatically adds 400 response to OpenAPI spec.
 * @module decorators/validation
 */

import 'reflect-metadata';
import { ValidationChain } from 'express-validator';
import { z } from 'zod';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { IConstants } from '../interfaces/constants';
import {
  ValidationContext,
  ValidationMetadata,
} from '../interfaces/openApi/decoratorOptions';
import { RESPONSE_METADATA, VALIDATION_METADATA } from './metadata-keys';
import {
  getMetadataOrDefault,
  mergeMetadata,
  setMetadata,
} from './metadata-collector';

/**
 * Response metadata for 400 Bad Request response.
 */
const BAD_REQUEST_RESPONSE = {
  statusCode: 400,
  description: 'Bad Request - Validation failed',
  schema: 'ValidationErrorResponse',
};

/**
 * Adds 400 response to OpenAPI metadata for validated routes.
 * @param target - The target object (class constructor or prototype)
 * @param propertyKey - Optional property key for method-level metadata
 */
function addBadRequestResponse(
  target: object,
  propertyKey?: string | symbol,
): void {
  const existingResponses = getMetadataOrDefault<
    Array<{ statusCode: number; description?: string; schema?: string }>
  >(RESPONSE_METADATA, target, propertyKey, []);

  // Check if 400 response already exists
  const has400 = existingResponses.some((r) => r.statusCode === 400);
  if (!has400) {
    existingResponses.push(BAD_REQUEST_RESPONSE);
    setMetadata(RESPONSE_METADATA, existingResponses, target, propertyKey);
  }
}

/**
 * Type for validation input - can be Zod schema, validation chains, or language-aware function.
 */
export type ValidationInput<
  TLanguage extends CoreLanguageCode = CoreLanguageCode,
  TConstants extends IConstants = IConstants,
> =
  | z.ZodSchema
  | ValidationChain[]
  | ((
      this: ValidationContext<TConstants>,
      lang: TLanguage,
    ) => ValidationChain[]);

/**
 * Creates a decorator that can be applied to both classes and methods for validation.
 * @param field - The field to validate ('body', 'params', or 'query')
 * @param validation - The validation schema or chains
 * @returns A decorator function
 */
function createValidationDecorator<
  TLanguage extends CoreLanguageCode = CoreLanguageCode,
  TConstants extends IConstants = IConstants,
>(
  field: 'body' | 'params' | 'query',
  validation: ValidationInput<TLanguage, TConstants>,
): ClassDecorator & MethodDecorator {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  function decorator<TFunction extends Function>(
    target: TFunction,
  ): TFunction | void;
  function decorator(
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor | void;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  function decorator<TFunction extends Function>(
    target: TFunction | object,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ): TFunction | PropertyDescriptor | void {
    if (propertyKey !== undefined && descriptor !== undefined) {
      // Method decorator
      const validationMetadata: Partial<
        ValidationMetadata<TLanguage, TConstants>
      > = {
        [field]: validation,
      };
      mergeMetadata(
        VALIDATION_METADATA,
        validationMetadata,
        target.constructor,
        propertyKey,
      );
      addBadRequestResponse(target.constructor, propertyKey);
      return descriptor;
    } else {
      // Class decorator
      const validationMetadata: Partial<
        ValidationMetadata<TLanguage, TConstants>
      > = {
        [field]: validation,
      };
      mergeMetadata(VALIDATION_METADATA, validationMetadata, target as object);
      addBadRequestResponse(target as object);
      return target as TFunction;
    }
  }

  return decorator as ClassDecorator & MethodDecorator;
}

/**
 * Decorator that validates the request body.
 * Supports Zod schemas, express-validator chains, and language-aware validation functions.
 * Automatically adds 400 response to OpenAPI spec.
 *
 * @param validation - Zod schema, ValidationChain[], or language-aware validation function
 * @returns Class or method decorator
 *
 * @example
 * ```typescript
 * // With Zod schema
 * const CreateUserSchema = z.object({
 *   name: z.string().min(1),
 *   email: z.string().email(),
 * });
 *
 * @ApiController('/api/users')
 * class UserController {
 *   @ValidateBody(CreateUserSchema)
 *   @Post('/')
 *   createUser(@Body() data: z.infer<typeof CreateUserSchema>) {
 *     return this.userService.create(data);
 *   }
 * }
 *
 * // With express-validator chains
 * @ApiController('/api/items')
 * class ItemController {
 *   @ValidateBody([
 *     body('name').isString().notEmpty(),
 *     body('price').isNumeric(),
 *   ])
 *   @Post('/')
 *   createItem(@Body() data: CreateItemDto) {
 *     return this.itemService.create(data);
 *   }
 * }
 *
 * // With language-aware validation function
 * @ApiController('/api/products')
 * class ProductController {
 *   @ValidateBody(function(lang) {
 *     return [
 *       body('name').isString().withMessage(this.constants.messages[lang].nameRequired),
 *     ];
 *   })
 *   @Post('/')
 *   createProduct(@Body() data: CreateProductDto) {
 *     return this.productService.create(data);
 *   }
 * }
 * ```
 */
export function ValidateBody<
  TLanguage extends CoreLanguageCode = CoreLanguageCode,
  TConstants extends IConstants = IConstants,
>(
  validation: ValidationInput<TLanguage, TConstants>,
): ClassDecorator & MethodDecorator {
  return createValidationDecorator<TLanguage, TConstants>('body', validation);
}

/**
 * Decorator that validates path parameters.
 * Supports Zod schemas, express-validator chains, and language-aware validation functions.
 * Automatically adds 400 response to OpenAPI spec.
 *
 * @param validation - Zod schema, ValidationChain[], or language-aware validation function
 * @returns Class or method decorator
 *
 * @example
 * ```typescript
 * // With Zod schema
 * const IdParamSchema = z.object({
 *   id: z.string().uuid(),
 * });
 *
 * @ApiController('/api/users')
 * class UserController {
 *   @ValidateParams(IdParamSchema)
 *   @Get('/:id')
 *   getUser(@Param('id') id: string) {
 *     return this.userService.findById(id);
 *   }
 * }
 *
 * // With express-validator chains
 * @ApiController('/api/items')
 * class ItemController {
 *   @ValidateParams([
 *     param('id').isMongoId().withMessage('Invalid item ID'),
 *   ])
 *   @Get('/:id')
 *   getItem(@Param('id') id: string) {
 *     return this.itemService.findById(id);
 *   }
 * }
 * ```
 */
export function ValidateParams<
  TLanguage extends CoreLanguageCode = CoreLanguageCode,
  TConstants extends IConstants = IConstants,
>(
  validation: ValidationInput<TLanguage, TConstants>,
): ClassDecorator & MethodDecorator {
  return createValidationDecorator<TLanguage, TConstants>('params', validation);
}

/**
 * Decorator that validates query parameters.
 * Supports Zod schemas, express-validator chains, and language-aware validation functions.
 * Automatically adds 400 response to OpenAPI spec.
 *
 * @param validation - Zod schema, ValidationChain[], or language-aware validation function
 * @returns Class or method decorator
 *
 * @example
 * ```typescript
 * // With Zod schema
 * const PaginationSchema = z.object({
 *   page: z.coerce.number().int().positive().optional().default(1),
 *   limit: z.coerce.number().int().positive().max(100).optional().default(10),
 * });
 *
 * @ApiController('/api/users')
 * class UserController {
 *   @ValidateQuery(PaginationSchema)
 *   @Get('/')
 *   listUsers(@Query('page') page: number, @Query('limit') limit: number) {
 *     return this.userService.findAll({ page, limit });
 *   }
 * }
 *
 * // With express-validator chains
 * @ApiController('/api/search')
 * class SearchController {
 *   @ValidateQuery([
 *     query('q').isString().notEmpty().withMessage('Search query is required'),
 *     query('page').optional().isInt({ min: 1 }),
 *   ])
 *   @Get('/')
 *   search(@Query('q') q: string, @Query('page') page?: number) {
 *     return this.searchService.search(q, page);
 *   }
 * }
 * ```
 */
export function ValidateQuery<
  TLanguage extends CoreLanguageCode = CoreLanguageCode,
  TConstants extends IConstants = IConstants,
>(
  validation: ValidationInput<TLanguage, TConstants>,
): ClassDecorator & MethodDecorator {
  return createValidationDecorator<TLanguage, TConstants>('query', validation);
}

/**
 * Gets the effective validation metadata for a method, merging class-level and method-level settings.
 * Method-level settings override class-level settings for the same field.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns The merged validation metadata
 */
export function getEffectiveValidationMetadata<
  TLanguage extends CoreLanguageCode = CoreLanguageCode,
  TConstants extends IConstants = IConstants,
>(
  target: object,
  propertyKey: string | symbol,
): ValidationMetadata<TLanguage, TConstants> {
  // Get class-level validation metadata
  const classValidation = getMetadataOrDefault<
    ValidationMetadata<TLanguage, TConstants>
  >(VALIDATION_METADATA, target, undefined, {});

  // Get method-level validation metadata
  const methodValidation = getMetadataOrDefault<
    ValidationMetadata<TLanguage, TConstants>
  >(VALIDATION_METADATA, target, propertyKey, {});

  // Method-level overrides class-level for each field
  return {
    ...classValidation,
    ...methodValidation,
  };
}

/**
 * Checks if a route has any validation configured.
 *
 * @param target - The class constructor
 * @param propertyKey - The method name
 * @returns True if the route has any validation
 */
export function hasValidation(
  target: object,
  propertyKey: string | symbol,
): boolean {
  const validation = getEffectiveValidationMetadata(target, propertyKey);
  return !!(validation.body || validation.params || validation.query);
}

/**
 * Checks if a validation input is a Zod schema.
 *
 * @param validation - The validation input to check
 * @returns True if the validation is a Zod schema
 */
export function isZodSchema(
  validation: ValidationInput,
): validation is z.ZodSchema {
  return validation instanceof z.ZodType;
}

/**
 * Checks if a validation input is an array of ValidationChains.
 *
 * @param validation - The validation input to check
 * @returns True if the validation is an array of ValidationChains
 */
export function isValidationChainArray(
  validation: ValidationInput,
): validation is ValidationChain[] {
  return Array.isArray(validation);
}

/**
 * Checks if a validation input is a language-aware validation function.
 *
 * @param validation - The validation input to check
 * @returns True if the validation is a function
 */
export function isValidationFunction<
  TLanguage extends CoreLanguageCode = CoreLanguageCode,
  TConstants extends IConstants = IConstants,
>(
  validation: ValidationInput<TLanguage, TConstants>,
): validation is (
  this: ValidationContext<TConstants>,
  lang: TLanguage,
) => ValidationChain[] {
  return typeof validation === 'function';
}
