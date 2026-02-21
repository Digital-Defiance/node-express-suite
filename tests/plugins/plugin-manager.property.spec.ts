/**
 * Property-based tests for PluginManager.
 *
 * Feature: plugin-migration-cleanup
 * - Property 10: PluginManager register/get round trip
 * - Property 11: PluginManager duplicate registration throws
 * - Property 12: PluginManager.initAll calls init on all registered plugins
 * - Property 13: PluginManager.stopAll calls stop on all plugins with stop method
 *
 * Validates: Requirements 8.1, 8.3, 8.4, 8.5
 *
 * @module tests/plugins/plugin-manager.property
 */

import * as fc from 'fast-check';
import type { IApplication } from '../../src/interfaces/application';
import type { IApplicationPlugin } from '../../src/plugins/plugin-interface';
import { PluginManager } from '../../src/plugins/plugin-manager';

/**
 * Arbitrary for generating valid plugin names.
 * Filters to non-empty trimmed strings to avoid degenerate cases.
 */
const pluginNameArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);

/**
 * Arbitrary for generating arrays of unique plugin names.
 */
const uniquePluginNamesArb = fc
  .array(pluginNameArb, { minLength: 1, maxLength: 20 })
  .map((names) => [...new Set(names)])
  .filter((names) => names.length > 0);

/**
 * Creates a mock IApplicationPlugin with jest.fn() stubs.
 */
function createMockPlugin(
  name: string,
  options: { withStop?: boolean } = {},
): IApplicationPlugin<Buffer> {
  const plugin: IApplicationPlugin<Buffer> = {
    name,
    init: jest.fn().mockResolvedValue(undefined),
  };
  if (options.withStop) {
    plugin.stop = jest.fn().mockResolvedValue(undefined);
  }
  return plugin;
}

/** Minimal mock IApplication for initAll calls. */
const mockApp = {} as jest.Mocked<IApplication>;

// ─── Test Suite ───

describe('PluginManager property-based tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── Property 10: PluginManager register/get round trip ───

  describe('Feature: plugin-migration-cleanup, Property 10: PluginManager register/get round trip', () => {
    /**
     * **Validates: Requirements 8.1**
     *
     * For any plugin with a unique name, registering it with
     * PluginManager.register() and then calling get() with the same name
     * should return the exact same plugin instance.
     */

    it('register then get returns the exact same plugin instance', () => {
      fc.assert(
        fc.property(pluginNameArb, (name: string) => {
          const manager = new PluginManager();
          const plugin = createMockPlugin(name);

          manager.register(plugin);

          const retrieved = manager.get(name);
          expect(retrieved).toBe(plugin);
          expect(manager.has(name)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 11: PluginManager duplicate registration throws ───

  describe('Feature: plugin-migration-cleanup, Property 11: PluginManager duplicate registration throws', () => {
    /**
     * **Validates: Requirements 8.3**
     *
     * For any plugin name that is already registered, calling register()
     * with another plugin of the same name should throw an error.
     */

    it('registering a second plugin with the same name throws', () => {
      fc.assert(
        fc.property(pluginNameArb, (name: string) => {
          const manager = new PluginManager();
          const plugin1 = createMockPlugin(name);
          const plugin2 = createMockPlugin(name);

          manager.register(plugin1);

          expect(() => manager.register(plugin2)).toThrow(
            `Plugin ${name} already registered`,
          );
        }),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 12: PluginManager.initAll calls init on all registered plugins ───

  describe('Feature: plugin-migration-cleanup, Property 12: PluginManager.initAll calls init on all registered plugins', () => {
    /**
     * **Validates: Requirements 8.4**
     *
     * For any set of registered plugins, calling initAll(app) should
     * invoke init(app) on every registered plugin exactly once.
     */

    it('initAll calls init(app) on every registered plugin exactly once', async () => {
      await fc.assert(
        fc.asyncProperty(uniquePluginNamesArb, async (names: string[]) => {
          const manager = new PluginManager();
          const plugins = names.map((n) =>
            createMockPlugin(n, { withStop: true }),
          );

          for (const plugin of plugins) {
            manager.register(plugin);
          }

          await manager.initAll(mockApp);

          for (const plugin of plugins) {
            expect(plugin.init).toHaveBeenCalledTimes(1);
            expect(plugin.init).toHaveBeenCalledWith(mockApp);
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 13: PluginManager.stopAll calls stop on all plugins with stop method ───

  describe('Feature: plugin-migration-cleanup, Property 13: PluginManager.stopAll calls stop on all plugins with stop method', () => {
    /**
     * **Validates: Requirements 8.5**
     *
     * For any set of registered plugins, calling stopAll() should invoke
     * stop() on every plugin that has a stop method, and should not throw
     * for plugins without a stop method.
     */

    it('stopAll calls stop on plugins with stop, skips those without', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniquePluginNamesArb,
          fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }),
          async (names: string[], stopFlags: boolean[]) => {
            const manager = new PluginManager();
            const plugins = names.map((name, i) =>
              createMockPlugin(name, {
                withStop: stopFlags[i % stopFlags.length],
              }),
            );

            for (const plugin of plugins) {
              manager.register(plugin);
            }

            // stopAll should not throw regardless of stop method presence
            await expect(manager.stopAll()).resolves.not.toThrow();

            for (const plugin of plugins) {
              if (plugin.stop) {
                expect(plugin.stop).toHaveBeenCalledTimes(1);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
