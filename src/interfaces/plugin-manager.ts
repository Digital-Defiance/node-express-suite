/**
 * @fileoverview Public surface of the plugin manager.
 * Lets consumers satisfy the application contract with a plain object,
 * since the PluginManager class has private members and is therefore nominal.
 * @module interfaces/plugin-manager
 */
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type { IApplicationPlugin } from '../plugins/plugin-interface';
import type { IApplication } from './application';

/**
 * Public contract of an application plugin manager.
 * Implemented by {@link PluginManager}.
 * @template TID - Platform ID type (defaults to Buffer)
 */
export interface IPluginManager<TID extends PlatformID = Buffer> {
  /** Registers a plugin. Must be called before {@link initAll}. */
  register(plugin: IApplicationPlugin<TID>): void;
  /** Initializes all registered plugins in registration order. */
  initAll(app: IApplication<TID>): Promise<void>;
  /** Stops all registered plugins that define a stop hook. */
  stopAll(): Promise<void>;
  /** Looks up a plugin by name. */
  get(name: string): IApplicationPlugin<TID> | undefined;
  /** Whether a plugin with the name is registered. */
  has(name: string): boolean;
}
