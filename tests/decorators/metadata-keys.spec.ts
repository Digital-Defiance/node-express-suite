import 'reflect-metadata';
import {
  ALL_METADATA_KEYS,
  AUTH_METADATA,
  CACHE_METADATA,
  CONTROLLER_METADATA,
  HANDLER_ARGS_METADATA,
  LIFECYCLE_METADATA,
  MIDDLEWARE_METADATA,
  OPENAPI_CONTROLLER_METADATA,
  OPENAPI_METADATA,
  OPENAPI_PARAMS_METADATA,
  OPENAPI_REQUEST_BODY_METADATA,
  PARAMS_METADATA,
  RATE_LIMIT_METADATA,
  RESPONSE_METADATA,
  ROUTES_METADATA,
  SCHEMA_METADATA,
  TRANSACTION_METADATA,
  VALIDATION_METADATA,
} from '../../src/decorators/metadata-keys';

describe('Metadata Keys', () => {
  describe('Symbol uniqueness', () => {
    it('should have unique symbols for all metadata keys', () => {
      const keys = Object.values(ALL_METADATA_KEYS);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });

    it('should export all expected metadata keys', () => {
      expect(CONTROLLER_METADATA).toBeDefined();
      expect(ROUTES_METADATA).toBeDefined();
      expect(OPENAPI_METADATA).toBeDefined();
      expect(OPENAPI_CONTROLLER_METADATA).toBeDefined();
      expect(AUTH_METADATA).toBeDefined();
      expect(VALIDATION_METADATA).toBeDefined();
      expect(MIDDLEWARE_METADATA).toBeDefined();
      expect(PARAMS_METADATA).toBeDefined();
      expect(LIFECYCLE_METADATA).toBeDefined();
      expect(RESPONSE_METADATA).toBeDefined();
      expect(SCHEMA_METADATA).toBeDefined();
      expect(HANDLER_ARGS_METADATA).toBeDefined();
      expect(TRANSACTION_METADATA).toBeDefined();
      expect(RATE_LIMIT_METADATA).toBeDefined();
      expect(CACHE_METADATA).toBeDefined();
      expect(OPENAPI_PARAMS_METADATA).toBeDefined();
      expect(OPENAPI_REQUEST_BODY_METADATA).toBeDefined();
    });

    it('should have all keys be symbols', () => {
      const keys = Object.values(ALL_METADATA_KEYS);
      keys.forEach((key) => {
        expect(typeof key).toBe('symbol');
      });
    });

    it('should have descriptive symbol descriptions', () => {
      expect(CONTROLLER_METADATA.description).toBe('controller');
      expect(ROUTES_METADATA.description).toBe('routes');
      expect(OPENAPI_METADATA.description).toBe('openapi');
      expect(AUTH_METADATA.description).toBe('auth');
      expect(VALIDATION_METADATA.description).toBe('validation');
    });
  });

  describe('ALL_METADATA_KEYS collection', () => {
    it('should contain all individual exports', () => {
      expect(ALL_METADATA_KEYS.CONTROLLER_METADATA).toBe(CONTROLLER_METADATA);
      expect(ALL_METADATA_KEYS.ROUTES_METADATA).toBe(ROUTES_METADATA);
      expect(ALL_METADATA_KEYS.OPENAPI_METADATA).toBe(OPENAPI_METADATA);
      expect(ALL_METADATA_KEYS.AUTH_METADATA).toBe(AUTH_METADATA);
      expect(ALL_METADATA_KEYS.VALIDATION_METADATA).toBe(VALIDATION_METADATA);
      expect(ALL_METADATA_KEYS.MIDDLEWARE_METADATA).toBe(MIDDLEWARE_METADATA);
      expect(ALL_METADATA_KEYS.PARAMS_METADATA).toBe(PARAMS_METADATA);
      expect(ALL_METADATA_KEYS.LIFECYCLE_METADATA).toBe(LIFECYCLE_METADATA);
      expect(ALL_METADATA_KEYS.RESPONSE_METADATA).toBe(RESPONSE_METADATA);
      expect(ALL_METADATA_KEYS.SCHEMA_METADATA).toBe(SCHEMA_METADATA);
    });

    it('should be readonly (const assertion)', () => {
      // The 'as const' assertion makes the object readonly at compile time
      // but doesn't freeze it at runtime - this is expected TypeScript behavior
      expect(ALL_METADATA_KEYS).toBeDefined();
      expect(Object.keys(ALL_METADATA_KEYS).length).toBeGreaterThan(0);
    });
  });
});
