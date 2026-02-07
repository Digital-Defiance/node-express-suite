import {
  OpenAPIRequestBody,
  isOpenAPIRequestBody,
} from '../../../src/interfaces/openApi/requestBody';

describe('OpenAPIRequestBody', () => {
  describe('isOpenAPIRequestBody', () => {
    it('should return true for minimal valid request body', () => {
      const body: OpenAPIRequestBody = {
        schema: 'CreateUserRequest',
      };
      expect(isOpenAPIRequestBody(body)).toBe(true);
    });

    it('should return true for request body with all fields', () => {
      const body: OpenAPIRequestBody = {
        schema: 'CreateUserRequest',
        required: true,
        description: 'User creation payload',
        example: { name: 'John', email: 'john@example.com' },
      };
      expect(isOpenAPIRequestBody(body)).toBe(true);
    });

    it('should return true for request body with required false', () => {
      const body: OpenAPIRequestBody = {
        schema: 'OptionalPayload',
        required: false,
      };
      expect(isOpenAPIRequestBody(body)).toBe(true);
    });

    it('should return true for request body with various example types', () => {
      expect(
        isOpenAPIRequestBody({
          schema: 'Test',
          example: 'string example',
        }),
      ).toBe(true);
      expect(
        isOpenAPIRequestBody({
          schema: 'Test',
          example: 123,
        }),
      ).toBe(true);
      expect(
        isOpenAPIRequestBody({
          schema: 'Test',
          example: null,
        }),
      ).toBe(true);
      expect(
        isOpenAPIRequestBody({
          schema: 'Test',
          example: ['array', 'example'],
        }),
      ).toBe(true);
    });

    it('should return false for null', () => {
      expect(isOpenAPIRequestBody(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isOpenAPIRequestBody(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isOpenAPIRequestBody('string')).toBe(false);
      expect(isOpenAPIRequestBody(123)).toBe(false);
      expect(isOpenAPIRequestBody(true)).toBe(false);
    });

    it('should return false for missing schema', () => {
      const body = {
        required: true,
        description: 'Missing schema',
      };
      expect(isOpenAPIRequestBody(body)).toBe(false);
    });

    it('should return false for non-string schema', () => {
      const body = {
        schema: 123,
      };
      expect(isOpenAPIRequestBody(body)).toBe(false);
    });

    it('should return false for non-boolean required', () => {
      const body = {
        schema: 'Test',
        required: 'true',
      };
      expect(isOpenAPIRequestBody(body)).toBe(false);
    });

    it('should return false for non-string description', () => {
      const body = {
        schema: 'Test',
        description: 123,
      };
      expect(isOpenAPIRequestBody(body)).toBe(false);
    });
  });
});
