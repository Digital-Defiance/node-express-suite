import { IApplication } from '../../src/interfaces/application';
import { IApplicationPlugin } from '../../src/plugins/plugin-interface';
import { PluginManager } from '../../src/plugins/plugin-manager';

describe('PluginManager', () => {
  let manager: PluginManager;
  let mockApp: jest.Mocked<IApplication>;

  beforeEach(() => {
    manager = new PluginManager();
    mockApp = {} as any;
  });

  describe('register', () => {
    it('should register plugin', () => {
      const plugin: IApplicationPlugin = {
        name: 'test-plugin',
        init: jest.fn(),
      };

      manager.register(plugin);

      expect(manager.has('test-plugin')).toBe(true);
    });

    it('should throw error when registering duplicate plugin', () => {
      const plugin: IApplicationPlugin = {
        name: 'test-plugin',
        init: jest.fn(),
      };

      manager.register(plugin);

      expect(() => manager.register(plugin)).toThrow(
        'Plugin test-plugin already registered',
      );
    });

    it('should throw error when registering after initialization', async () => {
      const plugin: IApplicationPlugin = {
        name: 'test-plugin',
        init: jest.fn(),
      };

      await manager.initAll(mockApp);

      expect(() => manager.register(plugin)).toThrow(
        'Cannot register plugin test-plugin after initialization',
      );
    });

    it('should register multiple plugins', () => {
      const plugin1: IApplicationPlugin = { name: 'plugin1', init: jest.fn() };
      const plugin2: IApplicationPlugin = { name: 'plugin2', init: jest.fn() };
      const plugin3: IApplicationPlugin = { name: 'plugin3', init: jest.fn() };

      manager.register(plugin1);
      manager.register(plugin2);
      manager.register(plugin3);

      expect(manager.has('plugin1')).toBe(true);
      expect(manager.has('plugin2')).toBe(true);
      expect(manager.has('plugin3')).toBe(true);
    });
  });

  describe('initAll', () => {
    it('should initialize all plugins', async () => {
      const plugin1: IApplicationPlugin = { name: 'plugin1', init: jest.fn() };
      const plugin2: IApplicationPlugin = { name: 'plugin2', init: jest.fn() };

      manager.register(plugin1);
      manager.register(plugin2);

      await manager.initAll(mockApp);

      expect(plugin1.init).toHaveBeenCalledWith(mockApp);
      expect(plugin2.init).toHaveBeenCalledWith(mockApp);
    });

    it('should initialize plugins in registration order', async () => {
      const order: string[] = [];

      const plugin1: IApplicationPlugin = {
        name: 'plugin1',
        init: async () => {
          order.push('plugin1');
        },
      };
      const plugin2: IApplicationPlugin = {
        name: 'plugin2',
        init: async () => {
          order.push('plugin2');
        },
      };
      const plugin3: IApplicationPlugin = {
        name: 'plugin3',
        init: async () => {
          order.push('plugin3');
        },
      };

      manager.register(plugin1);
      manager.register(plugin2);
      manager.register(plugin3);

      await manager.initAll(mockApp);

      expect(order).toEqual(['plugin1', 'plugin2', 'plugin3']);
    });

    it('should handle async plugin initialization', async () => {
      const plugin: IApplicationPlugin = {
        name: 'async-plugin',
        init: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
        },
      };

      manager.register(plugin);

      await expect(manager.initAll(mockApp)).resolves.not.toThrow();
    });

    it('should propagate plugin initialization errors', async () => {
      const plugin: IApplicationPlugin = {
        name: 'error-plugin',
        init: async () => {
          throw new Error('Init failed');
        },
      };

      manager.register(plugin);

      await expect(manager.initAll(mockApp)).rejects.toThrow('Init failed');
    });

    it('should handle empty plugin list', async () => {
      await expect(manager.initAll(mockApp)).resolves.not.toThrow();
    });
  });

  describe('stopAll', () => {
    it('should stop all plugins with stop method', async () => {
      const plugin1: IApplicationPlugin = {
        name: 'plugin1',
        init: jest.fn(),
        stop: jest.fn(),
      };
      const plugin2: IApplicationPlugin = {
        name: 'plugin2',
        init: jest.fn(),
        stop: jest.fn(),
      };

      manager.register(plugin1);
      manager.register(plugin2);

      await manager.stopAll();

      expect(plugin1.stop).toHaveBeenCalled();
      expect(plugin2.stop).toHaveBeenCalled();
    });

    it('should skip plugins without stop method', async () => {
      const plugin1: IApplicationPlugin = {
        name: 'plugin1',
        init: jest.fn(),
        stop: jest.fn(),
      };
      const plugin2: IApplicationPlugin = {
        name: 'plugin2',
        init: jest.fn(),
      };

      manager.register(plugin1);
      manager.register(plugin2);

      await expect(manager.stopAll()).resolves.not.toThrow();
      expect(plugin1.stop).toHaveBeenCalled();
    });

    it('should handle async stop methods', async () => {
      const plugin: IApplicationPlugin = {
        name: 'async-plugin',
        init: jest.fn(),
        stop: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
        },
      };

      manager.register(plugin);

      await expect(manager.stopAll()).resolves.not.toThrow();
    });

    it('should propagate stop errors', async () => {
      const plugin: IApplicationPlugin = {
        name: 'error-plugin',
        init: jest.fn(),
        stop: async () => {
          throw new Error('Stop failed');
        },
      };

      manager.register(plugin);

      await expect(manager.stopAll()).rejects.toThrow('Stop failed');
    });

    it('should handle empty plugin list', async () => {
      await expect(manager.stopAll()).resolves.not.toThrow();
    });
  });

  describe('get', () => {
    it('should return registered plugin', () => {
      const plugin: IApplicationPlugin = {
        name: 'test-plugin',
        init: jest.fn(),
      };

      manager.register(plugin);

      expect(manager.get('test-plugin')).toBe(plugin);
    });

    it('should return undefined for unregistered plugin', () => {
      expect(manager.get('nonexistent')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for registered plugin', () => {
      const plugin: IApplicationPlugin = {
        name: 'test-plugin',
        init: jest.fn(),
      };

      manager.register(plugin);

      expect(manager.has('test-plugin')).toBe(true);
    });

    it('should return false for unregistered plugin', () => {
      expect(manager.has('nonexistent')).toBe(false);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle logging plugin', async () => {
      const logs: string[] = [];

      const loggingPlugin: IApplicationPlugin = {
        name: 'logging',
        version: '1.0.0',
        init: async (app) => {
          logs.push('Logging plugin initialized');
        },
        stop: async () => {
          logs.push('Logging plugin stopped');
        },
      };

      manager.register(loggingPlugin);
      await manager.initAll(mockApp);
      await manager.stopAll();

      expect(logs).toEqual([
        'Logging plugin initialized',
        'Logging plugin stopped',
      ]);
    });

    it('should handle metrics plugin', async () => {
      const metricsPlugin: IApplicationPlugin = {
        name: 'metrics',
        version: '2.0.0',
        init: async (app) => {
          // Setup metrics collection
        },
        stop: async () => {
          // Flush metrics
        },
      };

      manager.register(metricsPlugin);
      await manager.initAll(mockApp);

      expect(manager.get('metrics')).toBe(metricsPlugin);
    });

    it('should handle database plugin', async () => {
      const initMock = jest.fn();
      const stopMock = jest.fn();

      const databasePlugin: IApplicationPlugin = {
        name: 'database',
        init: initMock,
        stop: stopMock,
      };

      manager.register(databasePlugin);
      await manager.initAll(mockApp);
      await manager.stopAll();

      expect(initMock).toHaveBeenCalled();
      expect(stopMock).toHaveBeenCalled();
    });

    it('should handle multiple plugins with dependencies', async () => {
      const initOrder: string[] = [];

      const configPlugin: IApplicationPlugin = {
        name: 'config',
        init: async () => {
          initOrder.push('config');
        },
      };

      const databasePlugin: IApplicationPlugin = {
        name: 'database',
        init: async () => {
          initOrder.push('database');
        },
      };

      const apiPlugin: IApplicationPlugin = {
        name: 'api',
        init: async () => {
          initOrder.push('api');
        },
      };

      manager.register(configPlugin);
      manager.register(databasePlugin);
      manager.register(apiPlugin);

      await manager.initAll(mockApp);

      expect(initOrder).toEqual(['config', 'database', 'api']);
    });
  });

  describe('edge cases', () => {
    it('should handle plugin with version', () => {
      const plugin: IApplicationPlugin = {
        name: 'versioned-plugin',
        version: '1.2.3',
        init: jest.fn(),
      };

      manager.register(plugin);

      const retrieved = manager.get('versioned-plugin');
      expect(retrieved?.version).toBe('1.2.3');
    });

    it('should handle plugin without version', () => {
      const plugin: IApplicationPlugin = {
        name: 'unversioned-plugin',
        init: jest.fn(),
      };

      manager.register(plugin);

      const retrieved = manager.get('unversioned-plugin');
      expect(retrieved?.version).toBeUndefined();
    });

    it('should handle plugin init that modifies app', async () => {
      const plugin: IApplicationPlugin = {
        name: 'modifier-plugin',
        init: async (app) => {
          (app as any).customProperty = 'modified';
        },
      };

      manager.register(plugin);
      await manager.initAll(mockApp);

      expect((mockApp as any).customProperty).toBe('modified');
    });

    it('should handle plugin with complex initialization', async () => {
      const plugin: IApplicationPlugin = {
        name: 'complex-plugin',
        init: async (app) => {
          await Promise.all([
            Promise.resolve('task1'),
            Promise.resolve('task2'),
            Promise.resolve('task3'),
          ]);
        },
      };

      manager.register(plugin);
      await expect(manager.initAll(mockApp)).resolves.not.toThrow();
    });
  });
});
