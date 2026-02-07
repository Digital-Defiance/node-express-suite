import {
  OpenAPIParameter,
  OpenAPIParameterLocation,
  OPENAPI_PARAMETER_LOCATIONS,
  isOpenAPIParameter,
  isOpenAPIParameterLocation,
} from '../../../src/interfaces/openApi/parameter';

describe('OpenAPIParameter', () => {
  describe('OPENAPI_PARAMETER_LOCATIONS', () => {
    it('should contain all valid locations', () => {
      expect(OPENAPI_PARAMETER_LOCATIONS).toContain('path');
      expect(OPENAPI_PARAMETER_LOCATIONS).toContain('query');
      expect(OPENAPI_PARAMETER_LOCATIONS).toContain('header');
      expect(OPENAPI_PARAMETER_LOCATIONS).toContain('cookie');
      expect(OPENAPI_PARAMETER_LOCATIONS).toHaveLength(4);
    });
  });

  describe('isOpenAPIParameterLocation', () => {
    it('should return true for valid locations', () => {
      expect(isOpenAPIParameterLocation('path')).toBe(true);
      expect(isOpenAPIParameterLocation('query')).toBe(true);
      expect(isOpenAPIParameterLocation('header')).toBe(true);
      expect(isOpenAPIParameterLocation('cookie')).toBe(true);
    });

    it('should return false for invalid locations', () => {
      expect(isOpenAPIParameterLocation('body')).toBe(false);
      expect(isOpenAPIParameterLocation('formData')).toBe(false);
      expect(isOpenAPIParameterLocation('')).toBe(false);
      expect(isOpenAPIParameterLocation('PATH')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isOpenAPIParameterLocation(null)).toBe(false);
      expect(isOpenAPIParameterLocation(undefined)).toBe(false);
      expect(isOpenAPIParameterLocation(123)).toBe(false);
      expect(isOpenAPIParameterLocation({})).toBe(false);
    });
  });

  describe('isOpenAPIParameter', () => {
    it('should return true for minimal valid parameter', () => {
      const param: OpenAPIParameter = {
        name: 'userId',
        in: 'path',
        schema: { type: 'string' },
      };
      expect(isOpenAPIParameter(param)).toBe(true);
    });

    it('should return true for parameter with all fields', () => {
      const param: OpenAPIParameter = {
        name: 'limit',
        in: 'query',
        required: false,
        description: 'Maximum number of items to return',
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 10,
        },
      };
      expect(isOpenAPIParameter(param)).toBe(true);
    });

    it('should return true for all valid locations', () => {
      const locations: OpenAPIParameterLocation[] = [
        'path',
        'query',
        'header',
        'cookie',
      ];
      for (const location of locations) {
        const param: OpenAPIParameter = {
          name: 'test',
          in: location,
          schema: { type: 'string' },
        };
        expect(isOpenAPIParameter(param)).toBe(true);
      }
    });

    it('should return true for required path parameter', () => {
      const param: OpenAPIParameter = {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
      };
      expect(isOpenAPIParameter(param)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isOpenAPIParameter(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isOpenAPIParameter(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isOpenAPIParameter('string')).toBe(false);
      expect(isOpenAPIParameter(123)).toBe(false);
      expect(isOpenAPIParameter(true)).toBe(false);
    });

    it('should return false for missing name', () => {
      const param = {
        in: 'path',
        schema: { type: 'string' },
      };
      expect(isOpenAPIParameter(param)).toBe(false);
    });

    it('should return false for non-string name', () => {
      const param = {
        name: 123,
        in: 'path',
        schema: { type: 'string' },
      };
      expect(isOpenAPIParameter(param)).toBe(false);
    });

    it('should return false for missing in', () => {
      const param = {
        name: 'test',
        schema: { type: 'string' },
      };
      expect(isOpenAPIParameter(param)).toBe(false);
    });

    it('should return false for invalid in location', () => {
      const param = {
        name: 'test',
        in: 'body',
        schema: { type: 'string' },
      };
      expect(isOpenAPIParameter(param)).toBe(false);
    });

    it('should return false for non-boolean required', () => {
      const param = {
        name: 'test',
        in: 'query',
        required: 'true',
        schema: { type: 'string' },
      };
      expect(isOpenAPIParameter(param)).toBe(false);
    });

    it('should return false for non-string description', () => {
      const param = {
        name: 'test',
        in: 'query',
        description: 123,
        schema: { type: 'string' },
      };
      expect(isOpenAPIParameter(param)).toBe(false);
    });

    it('should return false for missing schema', () => {
      const param = {
        name: 'test',
        in: 'query',
      };
      expect(isOpenAPIParameter(param)).toBe(false);
    });

    it('should return false for invalid schema', () => {
      const param = {
        name: 'test',
        in: 'query',
        schema: { format: 'uuid' }, // missing type
      };
      expect(isOpenAPIParameter(param)).toBe(false);
    });
  });
});
