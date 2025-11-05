import { ServiceContainer } from '../../src/container/service-container';
import { TranslatableSuiteError } from '@digitaldefiance/suite-core-lib';

describe('ServiceContainer', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe('register and get', () => {
    it('should register and retrieve singleton service', () => {
      const service = { value: 42 };
      container.register('test', () => service, true);
      
      const retrieved1 = container.get('test');
      const retrieved2 = container.get('test');
      
      expect(retrieved1).toBe(service);
      expect(retrieved2).toBe(service);
      expect(retrieved1).toBe(retrieved2);
    });

    it('should register and retrieve transient service', () => {
      let counter = 0;
      container.register('test', () => ({ value: ++counter }), false);
      
      const retrieved1 = container.get('test');
      const retrieved2 = container.get('test');
      
      expect(retrieved1.value).toBe(1);
      expect(retrieved2.value).toBe(2);
      expect(retrieved1).not.toBe(retrieved2);
    });

    it('should throw error for unregistered service', () => {
      expect(() => container.get('nonexistent')).toThrow(TranslatableSuiteError);
    });

    it('should lazy-initialize singleton services', () => {
      let initialized = false;
      container.register('test', () => {
        initialized = true;
        return { value: 42 };
      }, true);
      
      expect(initialized).toBe(false);
      container.get('test');
      expect(initialized).toBe(true);
    });

    it('should handle multiple services', () => {
      container.register('service1', () => ({ name: 'one' }), true);
      container.register('service2', () => ({ name: 'two' }), true);
      container.register('service3', () => ({ name: 'three' }), false);
      
      expect(container.get('service1').name).toBe('one');
      expect(container.get('service2').name).toBe('two');
      expect(container.get('service3').name).toBe('three');
    });
  });

  describe('has', () => {
    it('should return true for registered service', () => {
      container.register('test', () => ({}));
      expect(container.has('test')).toBe(true);
    });

    it('should return false for unregistered service', () => {
      expect(container.has('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear singleton instances', () => {
      let counter = 0;
      container.register('test', () => ({ value: ++counter }), true);
      
      const first = container.get('test');
      expect(first.value).toBe(1);
      
      container.clear();
      
      const second = container.get('test');
      expect(second.value).toBe(2);
      expect(first).not.toBe(second);
    });

    it('should not affect transient services', () => {
      let counter = 0;
      container.register('test', () => ({ value: ++counter }), false);
      
      container.get('test');
      container.clear();
      const result = container.get('test');
      
      expect(result.value).toBe(2);
    });
  });

  describe('type safety', () => {
    it('should support typed services', () => {
      interface TestService {
        getValue(): number;
      }
      
      const service: TestService = {
        getValue: () => 42
      };
      
      container.register<TestService>('test', () => service);
      const retrieved = container.get<TestService>('test');
      
      expect(retrieved.getValue()).toBe(42);
    });
  });

  describe('edge cases', () => {
    it('should handle factory returning null', () => {
      container.register('null', () => null);
      expect(container.get('null')).toBeNull();
    });

    it('should handle factory returning undefined', () => {
      container.register('undefined', () => undefined);
      expect(container.get('undefined')).toBeUndefined();
    });

    it('should handle factory throwing error', () => {
      container.register('error', () => {
        throw new Error('Factory error');
      });
      
      expect(() => container.get('error')).toThrow('Factory error');
    });

    it('should allow overwriting service registration', () => {
      container.register('test', () => ({ value: 1 }));
      container.register('test', () => ({ value: 2 }));
      
      expect(container.get('test').value).toBe(2);
    });
  });
});
