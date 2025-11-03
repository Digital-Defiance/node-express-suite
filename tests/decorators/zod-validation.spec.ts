import { z } from 'zod';
import { zodToExpressValidator, ZodValidate } from '../../src/decorators/zod-validation';
import 'reflect-metadata';

describe('Zod Validation', () => {
  describe('zodToExpressValidator', () => {
    it('should convert simple string schema', () => {
      const schema = z.object({
        name: z.string(),
      });

      const validator = zodToExpressValidator(schema);
      const chains = validator('en');
      expect(chains).toHaveLength(1);
    });

    it('should handle optional fields', () => {
      const schema = z.object({
        name: z.string().optional(),
      });

      const validator = zodToExpressValidator(schema);
      const chains = validator('en');
      expect(chains).toHaveLength(1);
    });

    it('should handle multiple fields', () => {
      const schema = z.object({
        name: z.string(),
        email: z.string(),
        age: z.number().optional(),
      });

      const validator = zodToExpressValidator(schema);
      const chains = validator('en');
      expect(chains.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-object schemas', () => {
      const schema = z.string();
      const validator = zodToExpressValidator(schema);
      const chains = validator('en');
      expect(chains).toEqual([]);
    });
  });

  describe('@ZodValidate', () => {
    it('should store schema metadata', () => {
      const schema = z.object({ name: z.string() });

      class TestClass {
        @ZodValidate(schema)
        testMethod() {}
      }

      const metadata = Reflect.getMetadata('zodSchema', TestClass.prototype, 'testMethod');
      expect(metadata).toBe(schema);
    });
  });
});
