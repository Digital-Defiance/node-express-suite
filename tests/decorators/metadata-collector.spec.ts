import 'reflect-metadata';
import {
  appendToMetadataArray,
  collectAllMetadata,
  collectMethodMetadata,
  createAppendingMethodDecorator,
  createClassDecorator,
  createMergingMethodDecorator,
  createMethodDecorator,
  deepMergeMetadata,
  deleteMetadata,
  getMetadata,
  getMetadataKeys,
  getMetadataOrDefault,
  hasMetadata,
  mergeMetadata,
  setMetadata,
} from '../../src/decorators/metadata-collector';
import {
  AUTH_METADATA,
  CONTROLLER_METADATA,
  OPENAPI_METADATA,
  RESPONSE_METADATA,
  ROUTES_METADATA,
} from '../../src/decorators/metadata-keys';

describe('Metadata Collector', () => {
  describe('getMetadata and setMetadata', () => {
    it('should set and get class-level metadata', () => {
      class TestClass {}
      setMetadata(CONTROLLER_METADATA, { basePath: '/api' }, TestClass);
      const result = getMetadata<{ basePath: string }>(
        CONTROLLER_METADATA,
        TestClass,
      );
      expect(result).toEqual({ basePath: '/api' });
    });

    it('should set and get method-level metadata', () => {
      class TestClass {
        testMethod() {}
      }
      setMetadata(
        AUTH_METADATA,
        { required: true },
        TestClass.prototype,
        'testMethod',
      );
      const result = getMetadata<{ required: boolean }>(
        AUTH_METADATA,
        TestClass.prototype,
        'testMethod',
      );
      expect(result).toEqual({ required: true });
    });

    it('should return undefined for non-existent metadata', () => {
      class TestClass {}
      const result = getMetadata(CONTROLLER_METADATA, TestClass);
      expect(result).toBeUndefined();
    });
  });

  describe('getMetadataOrDefault', () => {
    it('should return metadata when it exists', () => {
      class TestClass {}
      setMetadata(CONTROLLER_METADATA, { basePath: '/api' }, TestClass);
      const result = getMetadataOrDefault(
        CONTROLLER_METADATA,
        TestClass,
        undefined,
        { basePath: '/default' },
      );
      expect(result).toEqual({ basePath: '/api' });
    });

    it('should return default when metadata does not exist', () => {
      class TestClass {}
      const result = getMetadataOrDefault(
        CONTROLLER_METADATA,
        TestClass,
        undefined,
        { basePath: '/default' },
      );
      expect(result).toEqual({ basePath: '/default' });
    });
  });

  describe('appendToMetadataArray', () => {
    it('should create array and append first item', () => {
      class TestClass {}
      appendToMetadataArray(ROUTES_METADATA, { path: '/test' }, TestClass);
      const result = getMetadata<Array<{ path: string }>>(
        ROUTES_METADATA,
        TestClass,
      );
      expect(result).toEqual([{ path: '/test' }]);
    });

    it('should append to existing array', () => {
      class TestClass {}
      appendToMetadataArray(ROUTES_METADATA, { path: '/first' }, TestClass);
      appendToMetadataArray(ROUTES_METADATA, { path: '/second' }, TestClass);
      const result = getMetadata<Array<{ path: string }>>(
        ROUTES_METADATA,
        TestClass,
      );
      expect(result).toEqual([{ path: '/first' }, { path: '/second' }]);
    });

    it('should append to method-level array', () => {
      class TestClass {
        testMethod() {}
      }
      appendToMetadataArray(
        RESPONSE_METADATA,
        { status: 200 },
        TestClass.prototype,
        'testMethod',
      );
      appendToMetadataArray(
        RESPONSE_METADATA,
        { status: 404 },
        TestClass.prototype,
        'testMethod',
      );
      const result = getMetadata<Array<{ status: number }>>(
        RESPONSE_METADATA,
        TestClass.prototype,
        'testMethod',
      );
      expect(result).toEqual([{ status: 200 }, { status: 404 }]);
    });
  });

  describe('mergeMetadata', () => {
    it('should create object and set first properties', () => {
      class TestClass {}
      mergeMetadata(OPENAPI_METADATA, { summary: 'Test' }, TestClass);
      const result = getMetadata<{ summary: string }>(
        OPENAPI_METADATA,
        TestClass,
      );
      expect(result).toEqual({ summary: 'Test' });
    });

    it('should merge with existing object', () => {
      class TestClass {}
      mergeMetadata(OPENAPI_METADATA, { summary: 'Test' }, TestClass);
      mergeMetadata(
        OPENAPI_METADATA,
        { description: 'Description' },
        TestClass,
      );
      const result = getMetadata<{ summary: string; description: string }>(
        OPENAPI_METADATA,
        TestClass,
      );
      expect(result).toEqual({ summary: 'Test', description: 'Description' });
    });

    it('should override existing properties', () => {
      class TestClass {}
      mergeMetadata(OPENAPI_METADATA, { summary: 'Original' }, TestClass);
      mergeMetadata(OPENAPI_METADATA, { summary: 'Updated' }, TestClass);
      const result = getMetadata<{ summary: string }>(
        OPENAPI_METADATA,
        TestClass,
      );
      expect(result).toEqual({ summary: 'Updated' });
    });
  });

  describe('deepMergeMetadata', () => {
    it('should deep merge nested objects', () => {
      class TestClass {}
      deepMergeMetadata(
        OPENAPI_METADATA,
        { responses: { 200: { description: 'OK' } } },
        TestClass,
      );
      deepMergeMetadata(
        OPENAPI_METADATA,
        { responses: { 404: { description: 'Not Found' } } },
        TestClass,
      );
      const result = getMetadata<{
        responses: Record<number, { description: string }>;
      }>(OPENAPI_METADATA, TestClass);
      expect(result).toEqual({
        responses: {
          200: { description: 'OK' },
          404: { description: 'Not Found' },
        },
      });
    });

    it('should concatenate arrays', () => {
      class TestClass {}
      deepMergeMetadata(OPENAPI_METADATA, { tags: ['tag1'] }, TestClass);
      deepMergeMetadata(OPENAPI_METADATA, { tags: ['tag2'] }, TestClass);
      const result = getMetadata<{ tags: string[] }>(
        OPENAPI_METADATA,
        TestClass,
      );
      expect(result).toEqual({ tags: ['tag1', 'tag2'] });
    });
  });

  describe('hasMetadata', () => {
    it('should return true when metadata exists', () => {
      class TestClass {}
      setMetadata(CONTROLLER_METADATA, { basePath: '/api' }, TestClass);
      expect(hasMetadata(CONTROLLER_METADATA, TestClass)).toBe(true);
    });

    it('should return false when metadata does not exist', () => {
      class TestClass {}
      expect(hasMetadata(CONTROLLER_METADATA, TestClass)).toBe(false);
    });

    it('should check method-level metadata', () => {
      class TestClass {
        testMethod() {}
      }
      setMetadata(
        AUTH_METADATA,
        { required: true },
        TestClass.prototype,
        'testMethod',
      );
      expect(
        hasMetadata(AUTH_METADATA, TestClass.prototype, 'testMethod'),
      ).toBe(true);
      expect(
        hasMetadata(AUTH_METADATA, TestClass.prototype, 'otherMethod'),
      ).toBe(false);
    });
  });

  describe('deleteMetadata', () => {
    it('should delete class-level metadata', () => {
      class TestClass {}
      setMetadata(CONTROLLER_METADATA, { basePath: '/api' }, TestClass);
      expect(hasMetadata(CONTROLLER_METADATA, TestClass)).toBe(true);
      deleteMetadata(CONTROLLER_METADATA, TestClass);
      expect(hasMetadata(CONTROLLER_METADATA, TestClass)).toBe(false);
    });

    it('should delete method-level metadata', () => {
      class TestClass {
        testMethod() {}
      }
      setMetadata(
        AUTH_METADATA,
        { required: true },
        TestClass.prototype,
        'testMethod',
      );
      deleteMetadata(AUTH_METADATA, TestClass.prototype, 'testMethod');
      expect(
        hasMetadata(AUTH_METADATA, TestClass.prototype, 'testMethod'),
      ).toBe(false);
    });
  });

  describe('getMetadataKeys', () => {
    it('should return all metadata keys on a target', () => {
      class TestClass {}
      setMetadata(CONTROLLER_METADATA, { basePath: '/api' }, TestClass);
      setMetadata(ROUTES_METADATA, [], TestClass);
      const keys = getMetadataKeys(TestClass);
      expect(keys).toContain(CONTROLLER_METADATA);
      expect(keys).toContain(ROUTES_METADATA);
    });
  });

  describe('collectAllMetadata', () => {
    it('should collect controller and routes metadata', () => {
      class TestClass {}
      setMetadata(CONTROLLER_METADATA, { basePath: '/api' }, TestClass);
      setMetadata(
        ROUTES_METADATA,
        [{ method: 'get', path: '/test', handlerName: 'test', options: {} }],
        TestClass,
      );
      const collected = collectAllMetadata(TestClass);
      expect(collected.controller).toEqual({ basePath: '/api' });
      expect(collected.routes).toHaveLength(1);
    });

    it('should return empty routes array when no routes defined', () => {
      class TestClass {}
      const collected = collectAllMetadata(TestClass);
      expect(collected.routes).toEqual([]);
    });
  });

  describe('collectMethodMetadata', () => {
    it('should collect all method-level metadata', () => {
      class TestClass {
        testMethod() {}
      }
      setMetadata(
        AUTH_METADATA,
        { required: true },
        TestClass.prototype,
        'testMethod',
      );
      setMetadata(
        OPENAPI_METADATA,
        { summary: 'Test' },
        TestClass.prototype,
        'testMethod',
      );
      const collected = collectMethodMetadata(
        TestClass.prototype,
        'testMethod',
      );
      expect(collected.auth).toEqual({ required: true });
      expect(collected.openApi).toEqual({ summary: 'Test' });
    });
  });

  describe('decorator factory functions', () => {
    describe('createClassDecorator', () => {
      it('should create a working class decorator', () => {
        const decorator = createClassDecorator(CONTROLLER_METADATA, {
          basePath: '/api',
        });

        @decorator
        class TestClass {}

        const metadata = getMetadata(CONTROLLER_METADATA, TestClass);
        expect(metadata).toEqual({ basePath: '/api' });
      });
    });

    describe('createMethodDecorator', () => {
      it('should create a working method decorator', () => {
        const decorator = createMethodDecorator(AUTH_METADATA, {
          required: true,
        });

        class TestClass {
          @decorator
          testMethod() {}
        }

        const metadata = getMetadata(AUTH_METADATA, TestClass, 'testMethod');
        expect(metadata).toEqual({ required: true });
      });
    });

    describe('createAppendingMethodDecorator', () => {
      it('should create a decorator that appends to array', () => {
        const decorator1 = createAppendingMethodDecorator(RESPONSE_METADATA, {
          status: 200,
        });
        const decorator2 = createAppendingMethodDecorator(RESPONSE_METADATA, {
          status: 404,
        });

        class TestClass {
          @decorator2
          @decorator1
          testMethod() {}
        }

        const metadata = getMetadata<Array<{ status: number }>>(
          RESPONSE_METADATA,
          TestClass,
          'testMethod',
        );
        expect(metadata).toEqual([{ status: 200 }, { status: 404 }]);
      });
    });

    describe('createMergingMethodDecorator', () => {
      it('should create a decorator that merges metadata', () => {
        const decorator1 = createMergingMethodDecorator(OPENAPI_METADATA, {
          summary: 'Test',
        });
        const decorator2 = createMergingMethodDecorator(OPENAPI_METADATA, {
          description: 'Description',
        });

        class TestClass {
          @decorator2
          @decorator1
          testMethod() {}
        }

        const metadata = getMetadata<{ summary: string; description: string }>(
          OPENAPI_METADATA,
          TestClass,
          'testMethod',
        );
        expect(metadata).toEqual({
          summary: 'Test',
          description: 'Description',
        });
      });
    });
  });
});
