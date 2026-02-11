/**
 * UPnP Manager for Express server integration.
 *
 * Orchestrates UPnP port mapping lifecycle: initialization, periodic refresh,
 * health monitoring, and graceful shutdown. Wraps the core UpnpService with
 * server-specific concerns like signal handling and exponential backoff on
 * refresh failures.
 *
 * All UPnP failures are non-fatal — the server continues operating even if
 * port mapping fails, with appropriate log messages for manual intervention.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10
 */

import {
  IUpnpConfig,
  IUpnpMapping,
  PortMappingProtocol,
} from '../interfaces/network/upnpTypes';
import { UpnpService } from './upnp';
import { UpnpConfig } from './upnp-config';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Maximum backoff multiplier for repeated refresh failures */
const MAX_BACKOFF_MULTIPLIER = 8;

/** Prefix for all UPnP log messages */
const LOG_PREFIX = '[UPnP]';

/** Default description prefix for port mapping labels */
const DEFAULT_DESCRIPTION_PREFIX = 'Express App';

// ─── Options ────────────────────────────────────────────────────────────────

/**
 * Options for constructing a UpnpManager.
 *
 * Allows passing a config along with an optional description prefix
 * for port mapping labels.
 *
 * @example
 * ```typescript
 * const manager = new UpnpManager({
 *   config: UpnpConfig.fromEnvironment(),
 *   descriptionPrefix: 'My App',
 * });
 * ```
 */
export interface UpnpManagerOptions {
  /** UPnP configuration (IUpnpConfig or UpnpConfig instance) */
  config: IUpnpConfig | UpnpConfig;
  /** Prefix for port mapping descriptions (defaults to 'Express App') */
  descriptionPrefix?: string;
}

// ─── Type Guard ─────────────────────────────────────────────────────────────

/**
 * Check whether the given value is a UpnpManagerOptions object
 * (as opposed to a plain IUpnpConfig or UpnpConfig).
 */
function isUpnpManagerOptions(
  value: IUpnpConfig | UpnpConfig | UpnpManagerOptions,
): value is UpnpManagerOptions {
  return (
    typeof value === 'object' &&
    value !== null &&
    'config' in value &&
    // UpnpConfig and IUpnpConfig both have 'enabled'; UpnpManagerOptions has 'config'
    typeof (value as UpnpManagerOptions).config === 'object'
  );
}

// ─── Manager ────────────────────────────────────────────────────────────────

/**
 * Manages UPnP port mappings for the Express server lifecycle.
 *
 * Handles:
 * - Creating HTTP port mapping on startup
 * - Creating WebSocket port mapping when on a separate port
 * - Removing mappings on shutdown
 * - Periodic health monitoring and refresh
 * - SIGTERM/SIGINT signal handling
 *
 * @example
 * ```typescript
 * const config = UpnpConfig.fromEnvironment();
 * const manager = new UpnpManager(config);
 *
 * await manager.initialize(); // creates mapping, starts refresh timer
 * // ... server runs ...
 * await manager.shutdown();   // removes mappings, cleans up
 * ```
 *
 * @example
 * ```typescript
 * // With custom description prefix
 * const manager = new UpnpManager({
 *   config: UpnpConfig.fromEnvironment(),
 *   descriptionPrefix: 'My App',
 * });
 * // Mappings will be labelled "My App HTTP" and "My App WebSocket"
 * ```
 */
export class UpnpManager {
  /** The underlying UPnP service */
  private readonly service: UpnpService;

  /** Server configuration */
  private readonly config: Readonly<IUpnpConfig>;

  /** Prefix used in port mapping descriptions */
  private readonly descriptionPrefix: string;

  /** Periodic refresh timer handle */
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  /** Consecutive refresh failure count (for exponential backoff) */
  private consecutiveRefreshFailures = 0;

  /** Whether the manager has been initialized */
  private initialized = false;

  /** Whether shutdown is in progress or complete */
  private shuttingDown = false;

  /** Bound signal handlers (stored for removal on shutdown) */
  private readonly boundSignalHandlers: {
    sigterm: () => void;
    sigint: () => void;
  };

  /**
   * Create a new UpnpManager.
   *
   * Accepts either a config directly (backward compatible) or an options
   * object with an optional `descriptionPrefix`.
   *
   * @param configOrOptions - UPnP configuration or options object
   *
   * @example
   * ```typescript
   * // Direct config (backward compatible)
   * const manager = new UpnpManager(config);
   *
   * // Options object with custom prefix
   * const manager = new UpnpManager({
   *   config,
   *   descriptionPrefix: 'My App',
   * });
   * ```
   */
  constructor(configOrOptions: IUpnpConfig | UpnpConfig | UpnpManagerOptions) {
    let resolvedConfig: IUpnpConfig | UpnpConfig;
    let prefix: string;

    if (isUpnpManagerOptions(configOrOptions)) {
      resolvedConfig = configOrOptions.config;
      prefix = configOrOptions.descriptionPrefix ?? DEFAULT_DESCRIPTION_PREFIX;
    } else {
      resolvedConfig = configOrOptions;
      prefix = DEFAULT_DESCRIPTION_PREFIX;
    }

    this.config = resolvedConfig;
    this.descriptionPrefix = prefix;
    this.service = new UpnpService({
      enabled: resolvedConfig.enabled,
      httpPort: resolvedConfig.httpPort,
      websocketPort: resolvedConfig.websocketPort,
      ttl: resolvedConfig.ttl,
      refreshInterval: resolvedConfig.refreshInterval,
      protocol: resolvedConfig.protocol,
      retryAttempts: resolvedConfig.retryAttempts,
      retryDelay: resolvedConfig.retryDelay,
    });

    // Bind signal handlers so we can remove them later
    this.boundSignalHandlers = {
      sigterm: () => void this.handleSignal('SIGTERM'),
      sigint: () => void this.handleSignal('SIGINT'),
    };
  }

  // ─── Public API ─────────────────────────────────────────────────────────

  /**
   * Initialize UPnP: create HTTP port mapping and start the refresh timer.
   *
   * **Validates: Requirements 4.4**
   *
   * On failure, logs a warning with manual port-forwarding instructions
   * but does NOT throw — UPnP failure is non-fatal.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn(`${LOG_PREFIX} Already initialized, skipping`);
      return;
    }

    console.log(`${LOG_PREFIX} Initializing UPnP port mapping...`);

    // Register signal handlers for graceful shutdown
    this.registerSignalHandlers();

    try {
      // Discover external IP
      const externalIp = await this.service.getExternalIp();
      console.log(`${LOG_PREFIX} External IP: ${externalIp}`);

      // Create HTTP port mapping
      await this.createHttpMapping();

      console.log(
        `${LOG_PREFIX} HTTP port mapping created — ` +
          `external ${externalIp}:${this.config.httpPort} → ` +
          `internal :${this.config.httpPort}`,
      );

      // Create WebSocket port mapping if on a different port
      if (this.needsWebSocketMapping) {
        await this.createWebSocketMapping();
        console.log(
          `${LOG_PREFIX} WebSocket port mapping created — ` +
            `external ${externalIp}:${this.config.websocketPort} → ` +
            `internal :${this.config.websocketPort}`,
        );
      } else {
        console.log(
          `${LOG_PREFIX} WebSocket using same port as HTTP (${this.config.httpPort}), no additional mapping needed`,
        );
      }

      // Start periodic refresh timer
      this.startRefreshTimer();

      this.initialized = true;
      console.log(`${LOG_PREFIX} Initialization complete`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`${LOG_PREFIX} Initialization failed: ${message}`);
      this.logManualPortForwardingInstructions();
      // Non-fatal: server continues without UPnP
    }
  }

  /**
   * Shut down UPnP: stop refresh timer, remove all mappings, close service.
   *
   * **Validates: Requirements 4.5, 4.6**
   *
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  async shutdown(): Promise<void> {
    if (this.shuttingDown) {
      return;
    }
    this.shuttingDown = true;

    console.log(`${LOG_PREFIX} Shutting down...`);

    // Stop refresh timer
    this.stopRefreshTimer();

    // Remove signal handlers
    this.removeSignalHandlers();

    // Remove all mappings and close the service
    try {
      await this.service.close();
      console.log(`${LOG_PREFIX} All mappings removed and service closed`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${LOG_PREFIX} Error during shutdown: ${message}`);
    }
  }

  /**
   * Whether the manager has been successfully initialized.
   *
   * @returns `true` if {@link initialize} completed successfully
   */
  get isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Whether the manager is shutting down or has shut down.
   *
   * @returns `true` if {@link shutdown} has been called
   */
  get isShuttingDown(): boolean {
    return this.shuttingDown;
  }

  /**
   * Get the external endpoints for advertisement.
   *
   * Returns the external IP:port for HTTP and WebSocket endpoints.
   *
   * **Validates: Requirement 4.10**
   *
   * @returns External endpoints or `null` if UPnP is not initialized or shutting down
   */
  async getExternalEndpoints(): Promise<{
    http: string;
    ws: string;
  } | null> {
    if (!this.initialized || this.shuttingDown) {
      return null;
    }

    try {
      const externalIp = await this.service.getExternalIp();
      return {
        http: `http://${externalIp}:${this.config.httpPort}`,
        ws: `ws://${externalIp}:${this.config.websocketPort}`,
      };
    } catch {
      return null;
    }
  }

  // ─── Private: Port Mapping ──────────────────────────────────────────────

  /**
   * Create the HTTP port mapping on the router.
   *
   * **Validates: Requirement 4.2** — Uses configurable description prefix
   */
  private async createHttpMapping(): Promise<void> {
    const mapping: IUpnpMapping = {
      public: this.config.httpPort,
      private: this.config.httpPort,
      protocol: 'tcp' as PortMappingProtocol,
      description: `${this.descriptionPrefix} HTTP`,
      ttl: this.config.ttl,
    };

    await this.service.createPortMapping(mapping);
  }

  /**
   * Create the WebSocket port mapping on the router.
   *
   * Only called when websocketPort differs from httpPort.
   *
   * **Validates: Requirement 4.3** — Uses configurable description prefix
   */
  private async createWebSocketMapping(): Promise<void> {
    const mapping: IUpnpMapping = {
      public: this.config.websocketPort,
      private: this.config.websocketPort,
      protocol: 'tcp' as PortMappingProtocol,
      description: `${this.descriptionPrefix} WebSocket`,
      ttl: this.config.ttl,
    };

    await this.service.createPortMapping(mapping);
  }

  /**
   * Whether the WebSocket port requires a separate mapping.
   *
   * @returns `true` if websocketPort differs from httpPort
   */
  private get needsWebSocketMapping(): boolean {
    return this.config.websocketPort !== this.config.httpPort;
  }

  // ─── Private: Refresh ───────────────────────────────────────────────────

  /**
   * Start the periodic refresh timer.
   *
   * **Validates: Requirement 4.8** — Refresh mappings before TTL expiration
   */
  private startRefreshTimer(): void {
    if (this.refreshTimer) {
      return;
    }

    const intervalMs = this.config.refreshInterval;
    console.log(
      `${LOG_PREFIX} Refresh timer started (interval: ${intervalMs}ms)`,
    );

    this.refreshTimer = setInterval(() => {
      void this.refresh();
    }, intervalMs);

    // Allow the process to exit even if the timer is still running
    if (
      this.refreshTimer &&
      typeof this.refreshTimer === 'object' &&
      'unref' in this.refreshTimer
    ) {
      this.refreshTimer.unref();
    }
  }

  /**
   * Stop the periodic refresh timer.
   */
  private stopRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      console.log(`${LOG_PREFIX} Refresh timer stopped`);
    }
  }

  /**
   * Refresh all active port mappings.
   *
   * **Validates: Requirement 4.8** — Re-create each active mapping to renew TTL
   */
  private async refresh(): Promise<void> {
    if (this.shuttingDown) {
      return;
    }

    try {
      // Get current active mappings from the service
      const activeMappings = await this.service.getMappings();

      if (activeMappings.length === 0) {
        // No active mappings — try to recreate
        console.warn(
          `${LOG_PREFIX} No active mappings found during refresh, recreating...`,
        );
        await this.createHttpMapping();
        if (this.needsWebSocketMapping) {
          await this.createWebSocketMapping();
        }
        this.consecutiveRefreshFailures = 0;
        console.log(`${LOG_PREFIX} Mapping(s) recreated successfully`);
        return;
      }

      // Refresh each active mapping by re-creating it
      const errors: string[] = [];
      for (const mapping of activeMappings) {
        try {
          await this.service.createPortMapping(mapping);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          errors.push(`${mapping.public}/${mapping.protocol}: ${msg}`);
        }
      }

      if (errors.length > 0) {
        console.warn(
          `${LOG_PREFIX} Partial refresh failure: ${errors.join('; ')}`,
        );
        this.consecutiveRefreshFailures++;
        this.scheduleBackoffRefresh();
        return;
      }

      // Verify mappings still exist after refresh
      const verifiedMappings = await this.service.getMappings();
      if (verifiedMappings.length < activeMappings.length) {
        console.warn(
          `${LOG_PREFIX} Mapping verification failed — ` +
            `expected ${activeMappings.length}, found ${verifiedMappings.length}. Recreating...`,
        );
        await this.createHttpMapping();
        if (this.needsWebSocketMapping) {
          await this.createWebSocketMapping();
        }
      }

      this.consecutiveRefreshFailures = 0;
      console.log(
        `${LOG_PREFIX} Refresh complete (${verifiedMappings.length} mapping(s) active)`,
      );
    } catch (error) {
      this.consecutiveRefreshFailures++;
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `${LOG_PREFIX} Refresh failed (attempt ${this.consecutiveRefreshFailures}): ${message}`,
      );
      this.scheduleBackoffRefresh();
    }
  }

  /**
   * Schedule an additional refresh with exponential backoff.
   *
   * **Validates: Requirement 4.9** — Exponential backoff capped at 8× retryDelay
   */
  private scheduleBackoffRefresh(): void {
    const multiplier = Math.min(
      Math.pow(2, this.consecutiveRefreshFailures - 1),
      MAX_BACKOFF_MULTIPLIER,
    );
    const backoffMs = this.config.retryDelay * multiplier;

    console.warn(
      `${LOG_PREFIX} Scheduling backoff refresh in ${backoffMs}ms ` +
        `(failure #${this.consecutiveRefreshFailures})`,
    );

    const timer = setTimeout(() => {
      void this.refresh();
    }, backoffMs);

    // Don't prevent process exit
    if (timer && typeof timer === 'object' && 'unref' in timer) {
      timer.unref();
    }
  }

  // ─── Private: Signal Handling ───────────────────────────────────────────

  /**
   * Register SIGTERM and SIGINT handlers for graceful shutdown.
   *
   * **Validates: Requirement 4.4** — Register signal handlers during initialization
   */
  private registerSignalHandlers(): void {
    process.on('SIGTERM', this.boundSignalHandlers.sigterm);
    process.on('SIGINT', this.boundSignalHandlers.sigint);
  }

  /**
   * Remove previously registered signal handlers.
   */
  private removeSignalHandlers(): void {
    process.removeListener('SIGTERM', this.boundSignalHandlers.sigterm);
    process.removeListener('SIGINT', this.boundSignalHandlers.sigint);
  }

  /**
   * Handle a process signal by performing graceful shutdown.
   *
   * @param signal - The signal name (e.g. `'SIGTERM'`, `'SIGINT'`)
   */
  private async handleSignal(signal: string): Promise<void> {
    console.log(`${LOG_PREFIX} Received ${signal}, shutting down UPnP...`);
    await this.shutdown();
  }

  // ─── Private: Logging Helpers ───────────────────────────────────────────

  /**
   * Log manual port-forwarding instructions when UPnP is unavailable.
   *
   * **Validates: Requirement 4.7** — Log warning with manual instructions
   */
  private logManualPortForwardingInstructions(): void {
    let instructions =
      `${LOG_PREFIX} UPnP not available. Manual port forwarding required:\n` +
      `  Forward external port ${this.config.httpPort} to internal port ${this.config.httpPort}\n` +
      `  Protocol: TCP\n` +
      `  Description: ${this.descriptionPrefix} HTTP`;

    if (this.needsWebSocketMapping) {
      instructions +=
        `\n  Forward external port ${this.config.websocketPort} to internal port ${this.config.websocketPort}\n` +
        `  Protocol: TCP\n` +
        `  Description: ${this.descriptionPrefix} WebSocket`;
    }

    console.warn(instructions);
  }
}
