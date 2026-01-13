/**
 * @fileoverview Plugin manager for application plugins.
 * Manages registration and lifecycle of application plugins.
 * @module plugins/plugin-manager
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IApplication } from '../interfaces/application';
import { IApplicationPlugin } from './plugin-interface';

/**
 * Manager for application plugins.
 * @template TID - Platform ID type (defaults to Buffer)
 */
export class PluginManager<TID extends PlatformID = Buffer> {
  private plugins = new Map<string, IApplicationPlugin<TID>>();
  private initialized = false;

  register(plugin: IApplicationPlugin<TID>): void {
    if (this.initialized) {
      throw new Error(
        `Cannot register plugin ${plugin.name} after initialization`,
      );
    }
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} already registered`);
    }
    this.plugins.set(plugin.name, plugin);
  }

  async initAll(app: IApplication<TID>): Promise<void> {
    for (const plugin of this.plugins.values()) {
      await plugin.init(app);
    }
    this.initialized = true;
  }

  async stopAll(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.stop) {
        await plugin.stop();
      }
    }
  }

  get(name: string): IApplicationPlugin<TID> | undefined {
    return this.plugins.get(name);
  }

  has(name: string): boolean {
    return this.plugins.has(name);
  }
}
