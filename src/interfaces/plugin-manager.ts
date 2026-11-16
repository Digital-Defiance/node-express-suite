/**
 * @fileoverview Public surface of the plugin manager and of the plugin contract.
 * Lets consumers satisfy the application contract with a plain object,
 * since the PluginManager class has private members and is therefore nominal.
 *
 * IApplicationPlugin, IPluginsPort, IApplicationPluginHost and IPluginManager
 * refer to each other (a plugin receives a host whose plugin manager registers
 * plugins), so they are declared together in this one file. That keeps the
 * interface graph free of import cycles between files.
 * @module interfaces/plugin-manager
 */
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type { IApplicationCore } from './application-ports';

/**
 * Port exposing the plugin manager.
 * @template TID - Platform ID type (defaults to Buffer)
 */
export interface IPluginsPort<TID extends PlatformID = Buffer> {
  /** Plugin manager for extensibility */
  readonly plugins: IPluginManager<TID>;
}

/**
 * What a plugin receives in {@link IApplicationPlugin.init}: everything on
 * `IApplication` except the lifecycle members (`ready`, `start`).
 * @template TID - Platform ID type (defaults to Buffer)
 */
export type IApplicationPluginHost<TID extends PlatformID = Buffer> =
  IApplicationCore<TID> & IPluginsPort<TID>;

/**
 * Interface for application plugins.
 * @template TID - Platform ID type (defaults to Buffer)
 */
export interface IApplicationPlugin<TID extends PlatformID = Buffer> {
  readonly name: string;
  readonly version?: string;
  init(app: IApplicationPluginHost<TID>): Promise<void>;
  stop?(): Promise<void>;
}

/**
 * Public contract of an application plugin manager.
 * Implemented by {@link PluginManager}.
 * @template TID - Platform ID type (defaults to Buffer)
 */
export interface IPluginManager<TID extends PlatformID = Buffer> {
  /** Registers a plugin. Must be called before {@link initAll}. */
  register(plugin: IApplicationPlugin<TID>): void;
  /** Initializes all registered plugins in registration order. */
  initAll(app: IApplicationPluginHost<TID>): Promise<void>;
  /** Stops all registered plugins that define a stop hook. */
  stopAll(): Promise<void>;
  /** Looks up a plugin by name. */
  get(name: string): IApplicationPlugin<TID> | undefined;
  /** Whether a plugin with the name is registered. */
  has(name: string): boolean;
}
