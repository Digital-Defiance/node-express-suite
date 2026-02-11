/**
 * UPnP Plugin for the express-suite plugin system.
 *
 * Integrates the UPnP port mapping lifecycle (UpnpManager) with the
 * application plugin system. Register this plugin to automatically
 * manage UPnP port mappings during application startup and shutdown.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 *
 * @module plugins/upnp
 *
 * @example
 * ```typescript
 * import { UpnpPlugin } from '@digitaldefiance/node-express-suite';
 *
 * // Register with defaults (reads config from environment)
 * app.plugins.register(new UpnpPlugin());
 *
 * // Register with config overrides
 * app.plugins.register(new UpnpPlugin({
 *   config: { enabled: true, httpPort: 8080 },
 *   descriptionPrefix: 'My App',
 * }));
 * ```
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IApplication } from '../interfaces/application';
import { IApplicationPlugin } from './plugin-interface';
import { UpnpConfig } from '../services/upnp-config';
import { UpnpManager } from '../services/upnp-manager';
import { IUpnpConfig } from '../interfaces/network/upnpTypes';

/**
 * Options for configuring the UPnP plugin.
 *
 * @example
 * ```typescript
 * const options: UpnpPluginOptions = {
 *   config: { enabled: true, httpPort: 8080 },
 *   descriptionPrefix: 'My App',
 * };
 * ```
 */
export interface UpnpPluginOptions {
  /** Override config instead of reading from environment */
  config?: Partial<IUpnpConfig>;
  /** Description prefix for port mapping labels */
  descriptionPrefix?: string;
}

/**
 * UPnP plugin implementing {@link IApplicationPlugin}.
 *
 * Manages UPnP port mapping lifecycle through the express-suite plugin system.
 * On `init`, reads configuration (from environment or overrides) and starts
 * the UpnpManager. On `stop`, shuts down the manager and removes mappings.
 *
 * @template TID - Platform ID type (defaults to Buffer)
 *
 * @example
 * ```typescript
 * const plugin = new UpnpPlugin({ descriptionPrefix: 'My App' });
 * pluginManager.register(plugin);
 *
 * // After init, access the manager for endpoint queries
 * const endpoints = await plugin.getManager()?.getExternalEndpoints();
 * ```
 */
export class UpnpPlugin<
  TID extends PlatformID = Buffer,
> implements IApplicationPlugin<TID> {
  readonly name = 'upnp';
  readonly version = '1.0.0';

  private manager: UpnpManager | null = null;
  private readonly options: UpnpPluginOptions;

  /**
   * Create a new UpnpPlugin.
   *
   * @param options - Optional plugin configuration
   */
  constructor(options?: UpnpPluginOptions) {
    this.options = options ?? {};
  }

  /**
   * Initialize the UPnP plugin.
   *
   * Builds configuration from environment variables (with optional overrides),
   * creates a UpnpManager, and initializes port mappings.
   *
   * If UPnP is disabled in the configuration, skips initialization and logs
   * a message.
   *
   * **Validates: Requirements 5.2, 5.4, 5.5**
   *
   * @param _app - The application instance (unused, config comes from env)
   */
  async init(_app: IApplication<TID>): Promise<void> {
    // Build config: use override if provided, else load from environment
    const config = this.options.config
      ? UpnpConfig.fromEnvironment({
          ...process.env,
          ...this.envOverridesFromConfig(this.options.config),
        })
      : UpnpConfig.fromEnvironment();

    if (!config.enabled) {
      console.log('[UPnP Plugin] UPnP is disabled, skipping initialization');
      return;
    }

    this.manager = new UpnpManager({
      config,
      descriptionPrefix: this.options.descriptionPrefix,
    });

    await this.manager.initialize();
  }

  /**
   * Stop the UPnP plugin.
   *
   * Shuts down the UpnpManager, removing all port mappings and cleaning up.
   *
   * **Validates: Requirement 5.3**
   */
  async stop(): Promise<void> {
    if (this.manager) {
      await this.manager.shutdown();
      this.manager = null;
    }
  }

  /**
   * Get the underlying UpnpManager instance.
   *
   * Returns `null` if the plugin has not been initialized or UPnP is disabled.
   * Use this to query external endpoints or inspect manager state.
   *
   * @returns The UpnpManager instance, or `null` if not initialized
   *
   * @example
   * ```typescript
   * const manager = plugin.getManager();
   * if (manager) {
   *   const endpoints = await manager.getExternalEndpoints();
   *   console.log(endpoints);
   * }
   * ```
   */
  getManager(): UpnpManager | null {
    return this.manager;
  }

  /**
   * Convert a partial IUpnpConfig into environment variable overrides.
   *
   * Maps each defined config field to its corresponding `UPNP_*` environment
   * variable name, converting values to strings. These overrides are merged
   * with `process.env` before passing to `UpnpConfig.fromEnvironment`.
   *
   * @param config - Partial configuration with fields to override
   * @returns Record of environment variable name → string value
   */
  private envOverridesFromConfig(
    config: Partial<IUpnpConfig>,
  ): Record<string, string> {
    const env: Record<string, string> = {};
    if (config.enabled !== undefined)
      env['UPNP_ENABLED'] = String(config.enabled);
    if (config.httpPort !== undefined)
      env['UPNP_HTTP_PORT'] = String(config.httpPort);
    if (config.websocketPort !== undefined)
      env['UPNP_WEBSOCKET_PORT'] = String(config.websocketPort);
    if (config.ttl !== undefined) env['UPNP_TTL'] = String(config.ttl);
    if (config.refreshInterval !== undefined)
      env['UPNP_REFRESH_INTERVAL'] = String(config.refreshInterval);
    if (config.protocol !== undefined) env['UPNP_PROTOCOL'] = config.protocol;
    if (config.retryAttempts !== undefined)
      env['UPNP_RETRY_ATTEMPTS'] = String(config.retryAttempts);
    if (config.retryDelay !== undefined)
      env['UPNP_RETRY_DELAY'] = String(config.retryDelay);
    return env;
  }
}
