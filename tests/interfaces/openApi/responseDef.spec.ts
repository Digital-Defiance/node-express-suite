import {
  OpenAPIResponseDef,
  isOpenAPIResponseDef,
} from '../../../src/interfaces/openApi/responseDef';

describe('OpenAPIResponseDef', () => {
  describe('isOpenAPIResponseDef', () => {
    it('should return true for empty object (all fields optional)', () => {
      const response: OpenAPIResponseDef = {};
      expect(isOpenAPIResponseDef(response)).toBe(true);
    });

    it('should return true for response with schema only', () => {
      const response: OpenAPIResponseDef = {
        schema: 'UserResponse',
      };
      expect(isOpenAPIResponseDef(response)).toBe(true);
    });

    it('should return true for response with description only', () => {
      const response: OpenAPIResponseDef = {
        description: 'Successful response',
      };
      expect(isOpenAPIResponseDef(response)).toBe(true);
    });

    it('should return true for response with all fields', () => {
      const response: OpenAPIResponseDef = {
        schema: 'UserResponse',
        description: 'Returns the user object',
        example: { id: '123', name: 'John' },
      };
      expect(isOpenAPIResponseDef(response)).toBe(true);
    });

    it('should return true for response with various example types', () => {
      expect(
        isOpenAPIResponseDef({
          schema: 'Test',
          example: 'string example',
        }),
      ).toBe(true);
      expect(
        isOpenAPIResponseDef({
          schema: 'Test',
          example: 123,
        }),
      ).toBe(true);
      expect(
        isOpenAPIResponseDef({
          schema: 'Test',
          example: null,
        }),
      ).toBe(true);
      expect(
        isOpenAPIResponseDef({
          schema: 'Test',
          example: ['array', 'example'],
        }),
      ).toBe(true);
    });

    it('should return false for null', () => {
      expect(isOpenAPIResponseDef(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isOpenAPIResponseDef(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isOpenAPIResponseDef('string')).toBe(false);
      expect(isOpenAPIResponseDef(123)).toBe(false);
      expect(isOpenAPIResponseDef(true)).toBe(false);
    });

    it('should return false for non-string schema', () => {
      const response = {
        schema: 123,
      };
      expect(isOpenAPIResponseDef(response)).toBe(false);
    });

    it('should return false for non-string description', () => {
      const response = {
        description: 123,
      };
      expect(isOpenAPIResponseDef(response)).toBe(false);
    });
  });
});
