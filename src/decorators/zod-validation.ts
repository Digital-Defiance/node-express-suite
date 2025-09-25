import { ValidationChain, body } from 'express-validator';
import { z } from 'zod';

// Convert Zod schema to express-validator chains
export function zodToExpressValidator<TLanguage extends string>(
  schema: z.ZodType<any>,
): (lang: TLanguage) => ValidationChain[] {
  return (lang: TLanguage) => {
    const chains: ValidationChain[] = [];

    // Only process if it's a ZodObject with shape
    if (!(schema instanceof z.ZodObject)) {
      return chains;
    }

    Object.entries(schema.shape).forEach(([key, zodType]) => {
      let chain = body(key);

      // Handle optional fields
      if (zodType instanceof z.ZodOptional) {
        chain = chain.optional();
        zodType = zodType._def.innerType;
      }

      // Handle string validations
      if (zodType instanceof z.ZodString) {
        chain = chain.isString();

        // Handle min length
        if (zodType._def.checks) {
          zodType._def.checks.forEach((check: any) => {
            if (check.kind === 'min') {
              chain = chain.isLength({ min: check.value });
            }
          });
        }
      }

      chains.push(chain);
    });

    return chains;
  };
}

// Decorator that uses Zod schema
export function ZodValidate(schema: z.ZodType<any>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    // Store Zod schema metadata for runtime validation
    Reflect.defineMetadata('zodSchema', schema, target, propertyKey);
    return descriptor;
  };
}
