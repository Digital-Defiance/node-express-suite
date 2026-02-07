import {
  OpenAPIRouteMetadata,
  isOpenAPIRouteMetadata,
} from '../../../src/interfaces/openApi/routeMetadata';

describe('OpenAPIRouteMetadata', () => {
  describe('isOpenAPIRouteMetadata', () => {
    it('should return true for minimal valid metadata', () => {
      const metadata: OpenAPIRouteMetadata = {
        summary: 'Get user by ID',
        tags: ['Users'],
        responses: {
          200: { schema: 'UserResponse' },
        },
      };
      expect(isOpenAPIRouteMetadata(metadata)).toBe(true);
    });

    it('should return true for metadata with all fields', () => {
      const metadata: OpenAPIRouteMetadata = {
        summary: 'Create a new user',
        description: 'Creates a new user account with the provided details',
        tags: ['Users', 'Admin'],
        operationId: 'createUser',
        deprecated: false,
        requestBody: {
          schema: 'CreateUserRequest',
          required: true,
          description: 'User creation payload',
        },
        responses: {
          201: { schema: 'UserResponse', description: 'User created' },
          400: { schema: 'ErrorResponse', description: 'Validation error' },
          401: { schema: 'ErrorResponse', description: 'Unauthorized' },
        },
        parameters: [
          {
            name: 'X-Request-ID',
            in: 'header',
            required: false,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
      };
      expect(isOpenAPIRouteMetadata(metadata)).toBe(true);
    });

    it('should return true for metadata with default response', () => {
      const metadata: OpenAPIRouteMetadata = {
        summary: 'Test endpoint',
        tags: ['Test'],
        responses: {
          200: { schema: 'SuccessResponse' },
          default: { schema: 'ErrorResponse', description: 'Unexpected error' },
        },
      };
      expect(isOpenAPIRouteMetadata(metadata)).toBe(true);
    });

    it('should return true for deprecated endpoint', () => {
      const metadata: OpenAPIRouteMetadata = {
        summary: 'Legacy endpoint',
        tags: ['Legacy'],
        deprecated: true,
        responses: {
          200: { description: 'Success' },
        },
      };
      expect(isOpenAPIRouteMetadata(metadata)).toBe(true);
    });

    it('should return true for metadata with multiple parameters', () => {
      const metadata: OpenAPIRouteMetadata = {
        summary: 'Search users',
        tags: ['Users'],
        responses: {
          200: { schema: 'UserListResponse' },
        },
        parameters: [
          {
            name: 'q',
            in: 'query',
            description: 'Search query',
            schema: { type: 'string' },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100 },
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer', minimum: 0 },
          },
        ],
      };
      expect(isOpenAPIRouteMetadata(metadata)).toBe(true);
    });

    it('should return true for empty tags array', () => {
      const metadata: OpenAPIRouteMetadata = {
        summary: 'Untagged endpoint',
        tags: [],
        responses: {
          200: { description: 'Success' },
        },
      };
      expect(isOpenAPIRouteMetadata(metadata)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isOpenAPIRouteMetadata(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isOpenAPIRouteMetadata(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isOpenAPIRouteMetadata('string')).toBe(false);
      expect(isOpenAPIRouteMetadata(123)).toBe(false);
      expect(isOpenAPIRouteMetadata(true)).toBe(false);
    });

    it('should return false for missing summary', () => {
      const metadata = {
        tags: ['Test'],
        responses: { 200: {} },
      };
      expect(isOpenAPIRouteMetadata(metadata)).toBe(false);
    });

    it('should return false for non-string summary', () => {
      const metadata = {
        summary: 123,
        tags: ['Test'],
        responses: { 200: {} },
      };
      expect(isOpenAPIRouteMetadata(metadata)).toBe(false);
    });

    it('should return false for missing tags', () => {
      const metadata = {
        summary: 'Test',
        responses: { 200: {} },
      };
      expect(isOpenAPIRouteMetadata(metadata)).toBe(false);
    });

    it('should return false for non-array tags', () => {
      const metadata = {
        summary: 'Test',
        tags: 'Users',
        responses: { 200: {} },
      };
      expect(isOpenAPIRouteMetadata(metadata)).toBe(false);
    });

    it('should return false for tags with non-string elements', () => {
      const metadata = {
        summary: 'Test',
        tags: ['Users', 123],
        responses: { 200: {} },
      };
      expect(isOpenAPIRouteMetadata(metadata)).toBe(false);
    });

    it('should return false for missing responses', () => {
      const metadata = {
        summary: 'Test',
        tags: ['Test'],
      };
      expect(isOpenAPIRouteMetadata(metadata)).toBe(false);
    });

    it('should return false for non-object responses', () => {
      const metadata = {
        summary: 'Test',
        tags: ['Test'],
        responses: 'invalid',
      };
      expect(isOpenAPIRouteMetadata(metadata)).toBe(false);
    });

    it('should return false for non-string description', () => {
      const metadata = {
        summary: 'Test',
        description: 123,
        tags: ['Test'],
        responses: { 200: {} },
      };
      expect(isOpenAPIRouteMetadata(metadata)).toBe(false);
    });

    it('should return false for non-string operationId', () => {
      const metadata = {
        summary: 'Test',
        operationId: 123,
        tags: ['Test'],
        responses: { 200: {} },
      };
      expect(isOpenAPIRouteMetadata(metadata)).toBe(false);
    });

    it('should return false for non-boolean deprecated', () => {
      const metadata = {
        summary: 'Test',
        deprecated: 'true',
        tags: ['Test'],
        responses: { 200: {} },
      };
      expect(isOpenAPIRouteMetadata(metadata)).toBe(false);
    });

    it('should return false for invalid requestBody', () => {
      const metadata = {
        summary: 'Test',
        tags: ['Test'],
        requestBody: { required: true }, // missing schema
        responses: { 200: {} },
      };
      expect(isOpenAPIRouteMetadata(metadata)).toBe(false);
    });

    it('should return false for invalid response key', () => {
      const metadata = {
        summary: 'Test',
        tags: ['Test'],
        responses: {
          200: {},
          invalid: {}, // not a number or 'default'
        },
      };
      expect(isOpenAPIRouteMetadata(metadata)).toBe(false);
    });

    it('should return false for invalid response definition', () => {
      const metadata = {
        summary: 'Test',
        tags: ['Test'],
        responses: {
          200: { schema: 123 }, // schema must be string
        },
      };
      expect(isOpenAPIRouteMetadata(metadata)).toBe(false);
    });

    it('should return false for non-array parameters', () => {
      const metadata = {
        summary: 'Test',
        tags: ['Test'],
        responses: { 200: {} },
        parameters: 'invalid',
      };
      expect(isOpenAPIRouteMetadata(metadata)).toBe(false);
    });

    it('should return false for invalid parameter in array', () => {
      const metadata = {
        summary: 'Test',
        tags: ['Test'],
        responses: { 200: {} },
        parameters: [
          { name: 'valid', in: 'query', schema: { type: 'string' } },
          { name: 'invalid' }, // missing 'in' and 'schema'
        ],
      };
      expect(isOpenAPIRouteMetadata(metadata)).toBe(false);
    });

    it('should return false for out-of-range status codes', () => {
      const metadata = {
        summary: 'Test',
        tags: ['Test'],
        responses: {
          99: {}, // below 100
        },
      };
      expect(isOpenAPIRouteMetadata(metadata)).toBe(false);
    });

    it('should return false for status code 600 or above', () => {
      const metadata = {
        summary: 'Test',
        tags: ['Test'],
        responses: {
          600: {}, // 600 or above is invalid
        },
      };
      expect(isOpenAPIRouteMetadata(metadata)).toBe(false);
    });
  });
});
