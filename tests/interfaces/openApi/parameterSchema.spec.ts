import {
  OpenAPIParameterSchema,
  isOpenAPIParameterSchema,
} from '../../../src/interfaces/openApi/parameterSchema';

describe('OpenAPIParameterSchema', () => {
  describe('isOpenAPIParameterSchema', () => {
    it('should return true for minimal valid schema', () => {
      const schema: OpenAPIParameterSchema = {
        type: 'string',
      };
      expect(isOpenAPIParameterSchema(schema)).toBe(true);
    });

    it('should return true for schema with all optional fields', () => {
      const schema: OpenAPIParameterSchema = {
        type: 'string',
        format: 'uuid',
        enum: ['active', 'inactive'],
        default: 'active',
        minimum: 0,
        maximum: 100,
        minLength: 1,
        maxLength: 255,
        pattern: '^[a-z]+$',
      };
      expect(isOpenAPIParameterSchema(schema)).toBe(true);
    });

    it('should return true for array schema with items', () => {
      const schema: OpenAPIParameterSchema = {
        type: 'array',
        items: {
          type: 'string',
        },
      };
      expect(isOpenAPIParameterSchema(schema)).toBe(true);
    });

    it('should return true for nested array schema', () => {
      const schema: OpenAPIParameterSchema = {
        type: 'array',
        items: {
          type: 'array',
          items: {
            type: 'integer',
            minimum: 0,
          },
        },
      };
      expect(isOpenAPIParameterSchema(schema)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isOpenAPIParameterSchema(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isOpenAPIParameterSchema(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isOpenAPIParameterSchema('string')).toBe(false);
      expect(isOpenAPIParameterSchema(123)).toBe(false);
      expect(isOpenAPIParameterSchema(true)).toBe(false);
    });

    it('should return false for missing type', () => {
      const schema = {
        format: 'uuid',
      };
      expect(isOpenAPIParameterSchema(schema)).toBe(false);
    });

    it('should return false for non-string type', () => {
      const schema = {
        type: 123,
      };
      expect(isOpenAPIParameterSchema(schema)).toBe(false);
    });

    it('should return false for non-string format', () => {
      const schema = {
        type: 'string',
        format: 123,
      };
      expect(isOpenAPIParameterSchema(schema)).toBe(false);
    });

    it('should return false for non-array enum', () => {
      const schema = {
        type: 'string',
        enum: 'not-an-array',
      };
      expect(isOpenAPIParameterSchema(schema)).toBe(false);
    });

    it('should return false for non-number minimum', () => {
      const schema = {
        type: 'integer',
        minimum: '0',
      };
      expect(isOpenAPIParameterSchema(schema)).toBe(false);
    });

    it('should return false for non-number maximum', () => {
      const schema = {
        type: 'integer',
        maximum: '100',
      };
      expect(isOpenAPIParameterSchema(schema)).toBe(false);
    });

    it('should return false for non-number minLength', () => {
      const schema = {
        type: 'string',
        minLength: '1',
      };
      expect(isOpenAPIParameterSchema(schema)).toBe(false);
    });

    it('should return false for non-number maxLength', () => {
      const schema = {
        type: 'string',
        maxLength: '255',
      };
      expect(isOpenAPIParameterSchema(schema)).toBe(false);
    });

    it('should return false for non-string pattern', () => {
      const schema = {
        type: 'string',
        pattern: 123,
      };
      expect(isOpenAPIParameterSchema(schema)).toBe(false);
    });

    it('should return false for invalid items schema', () => {
      const schema = {
        type: 'array',
        items: {
          // missing type
          format: 'uuid',
        },
      };
      expect(isOpenAPIParameterSchema(schema)).toBe(false);
    });
  });
});
