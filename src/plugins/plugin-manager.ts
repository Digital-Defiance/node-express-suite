import { IApplication } from '../interfaces/application';
import { IApplicationPlugin } from './plugin-interface';

export class PluginManager {
  private plugins = new Map<string, IApplicationPlugin>();
  private initialized = false;

  register(plugin: IApplicationPlugin): void {
    if (this.initialized) {
      throw new Error(`Cannot register plugin ${plugin.name} after initialization`);
    }
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} already registered`);
    }
    this.plugins.set(plugin.name, plugin);
  }

  async initAll(app: IApplication): Promise<void> {
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

  get(name: string): IApplicationPlugin | undefined {
    return this.plugins.get(name);
  }

  has(name: string): boolean {
    return this.plugins.has(name);
  }
}
