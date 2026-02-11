/**
 * UPnP Configuration Loader and Validator.
 *
 * Reads UPnP settings from environment variables, applies defaults
 * for missing values, and validates all configuration parameters.
 * Use the static {@link UpnpConfig.fromEnvironment} factory method
 * to create validated instances.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9
 */

import {
  IUpnpConfig,
  UPNP_CONFIG_DEFAULTS,
  UpnpProtocol,
} from '../interfaces/network/upnpTypes';

/**
 * Error thrown when UPnP configuration validation fails.
 *
 * @example
 * ```typescript
 * try {
 *   const config = UpnpConfig.fromEnvironment({ UPNP_HTTP_PORT: '99999' });
 * } catch (err) {
 *   if (err instanceof UpnpConfigValidationError) {
 *     console.error(`Invalid config: ${err.message}`);
 *   }
 * }
 * ```
 */
export class UpnpConfigValidationError extends Error {
  /**
   * @param message - Description of the validation failure
   */
  constructor(message: string) {
    super(message);
    this.name = 'UpnpConfigValidationError';
  }
}

/**
 * UPnP configuration loaded from environment variables.
 *
 * Reads `UPNP_*` env vars, falls back to {@link UPNP_CONFIG_DEFAULTS},
 * and validates all values on construction. Use the static
 * {@link UpnpConfig.fromEnvironment} factory method to create instances.
 *
 * @example
 * ```typescript
 * // Load from process.env (production usage)
 * const config = UpnpConfig.fromEnvironment();
 *
 * // Load from custom env (testing)
 * const testConfig = UpnpConfig.fromEnvironment({
 *   UPNP_ENABLED: 'true',
 *   UPNP_HTTP_PORT: '8080',
 * });
 *
 * console.log(config.enabled);   // false (default)
 * console.log(config.httpPort);  // 3000 (default)
 * ```
 */
export class UpnpConfig implements IUpnpConfig {
  /** Whether UPnP is enabled */
  public readonly enabled: boolean;
  /** HTTP/Express port to map externally */
  public readonly httpPort: number;
  /** WebSocket port to map externally */
  public readonly websocketPort: number;
  /** Mapping time-to-live in seconds */
  public readonly ttl: number;
  /** Refresh interval in milliseconds */
  public readonly refreshInterval: number;
  /** UPnP protocol to use (upnp, natpmp, or auto) */
  public readonly protocol: UpnpProtocol;
  /** Number of retry attempts for failed operations */
  public readonly retryAttempts: number;
  /** Delay between retries in milliseconds */
  public readonly retryDelay: number;

  /**
   * Private constructor — use {@link UpnpConfig.fromEnvironment} to create instances.
   *
   * @param config - Validated configuration values
   */
  private constructor(config: IUpnpConfig) {
    this.enabled = config.enabled;
    this.httpPort = config.httpPort;
    this.websocketPort = config.websocketPort;
    this.ttl = config.ttl;
    this.refreshInterval = config.refreshInterval;
    this.protocol = config.protocol;
    this.retryAttempts = config.retryAttempts;
    this.retryDelay = config.retryDelay;
  }

  /**
   * Create an UpnpConfig from the current process environment.
   * Missing variables fall back to {@link UPNP_CONFIG_DEFAULTS}.
   *
   * @param env - Environment variable map (defaults to `process.env`)
   * @returns A validated UpnpConfig instance
   * @throws {UpnpConfigValidationError} If any value is invalid
   *
   * @example
   * ```typescript
   * // Use process.env
   * const config = UpnpConfig.fromEnvironment();
   *
   * // Use custom env for testing
   * const config = UpnpConfig.fromEnvironment({
   *   UPNP_ENABLED: 'true',
   *   UPNP_HTTP_PORT: '8080',
   *   UPNP_TTL: '7200',
   * });
   * ```
   */
  public static fromEnvironment(
    env: Record<string, string | undefined> = process.env,
  ): UpnpConfig {
    const config: IUpnpConfig = {
      enabled:
        env['UPNP_ENABLED'] !== undefined
          ? env['UPNP_ENABLED'].toLowerCase() === 'true'
          : UPNP_CONFIG_DEFAULTS.enabled,
      httpPort: UpnpConfig.parseIntEnv(
        env['UPNP_HTTP_PORT'],
        UPNP_CONFIG_DEFAULTS.httpPort,
      ),
      websocketPort: UpnpConfig.parseIntEnv(
        env['UPNP_WEBSOCKET_PORT'],
        UPNP_CONFIG_DEFAULTS.websocketPort,
      ),
      ttl: UpnpConfig.parseIntEnv(env['UPNP_TTL'], UPNP_CONFIG_DEFAULTS.ttl),
      refreshInterval: UpnpConfig.parseIntEnv(
        env['UPNP_REFRESH_INTERVAL'],
        UPNP_CONFIG_DEFAULTS.refreshInterval,
      ),
      protocol: UpnpConfig.parseProtocol(
        env['UPNP_PROTOCOL'],
        UPNP_CONFIG_DEFAULTS.protocol,
      ),
      retryAttempts: UpnpConfig.parseIntEnv(
        env['UPNP_RETRY_ATTEMPTS'],
        UPNP_CONFIG_DEFAULTS.retryAttempts,
      ),
      retryDelay: UpnpConfig.parseIntEnv(
        env['UPNP_RETRY_DELAY'],
        UPNP_CONFIG_DEFAULTS.retryDelay,
      ),
    };

    UpnpConfig.validate(config);
    return new UpnpConfig(config);
  }

  /**
   * Validate all configuration values. Throws on the first invalid value.
   *
   * @param config - The configuration object to validate
   * @throws {UpnpConfigValidationError} If any value is outside its valid range:
   *   - `httpPort` / `websocketPort`: must be 1–65535
   *   - `ttl`: must be 60–86400 seconds (24 hours max)
   *   - `refreshInterval`: must be positive and less than `ttl * 1000`
   *   - `retryAttempts`: must be 1–10
   *   - `retryDelay`: must be 1000–60000 ms
   *   - `protocol`: must be a valid {@link UpnpProtocol} value
   */
  public static validate(config: IUpnpConfig): void {
    // Port validation (1–65535)
    if (
      !Number.isInteger(config.httpPort) ||
      config.httpPort < 1 ||
      config.httpPort > 65535
    ) {
      throw new UpnpConfigValidationError(
        `httpPort must be an integer between 1 and 65535, got ${config.httpPort}`,
      );
    }
    if (
      !Number.isInteger(config.websocketPort) ||
      config.websocketPort < 1 ||
      config.websocketPort > 65535
    ) {
      throw new UpnpConfigValidationError(
        `websocketPort must be an integer between 1 and 65535, got ${config.websocketPort}`,
      );
    }

    // TTL validation (minimum 60 seconds, maximum 86400 seconds / 24 hours)
    if (
      !Number.isInteger(config.ttl) ||
      config.ttl < 60 ||
      config.ttl > 86400
    ) {
      throw new UpnpConfigValidationError(
        `ttl must be an integer between 60 and 86400 seconds (24 hours), got ${config.ttl}`,
      );
    }

    // Refresh interval must be less than TTL * 1000 (TTL is seconds, refresh is ms)
    if (
      !Number.isInteger(config.refreshInterval) ||
      config.refreshInterval <= 0
    ) {
      throw new UpnpConfigValidationError(
        `refreshInterval must be a positive integer, got ${config.refreshInterval}`,
      );
    }
    if (config.refreshInterval >= config.ttl * 1000) {
      throw new UpnpConfigValidationError(
        `refreshInterval (${config.refreshInterval}ms) must be less than ttl * 1000 (${config.ttl * 1000}ms)`,
      );
    }

    // Retry attempts (1–10)
    if (
      !Number.isInteger(config.retryAttempts) ||
      config.retryAttempts < 1 ||
      config.retryAttempts > 10
    ) {
      throw new UpnpConfigValidationError(
        `retryAttempts must be an integer between 1 and 10, got ${config.retryAttempts}`,
      );
    }

    // Retry delay (1000–60000ms)
    if (
      !Number.isInteger(config.retryDelay) ||
      config.retryDelay < 1000 ||
      config.retryDelay > 60000
    ) {
      throw new UpnpConfigValidationError(
        `retryDelay must be an integer between 1000 and 60000ms, got ${config.retryDelay}`,
      );
    }

    // Protocol validation
    const validProtocols = Object.values(UpnpProtocol) as string[];
    if (!validProtocols.includes(config.protocol)) {
      throw new UpnpConfigValidationError(
        `protocol must be one of ${validProtocols.join(', ')}, got ${config.protocol}`,
      );
    }
  }

  /**
   * Parse a string environment variable as an integer.
   *
   * @param value - The raw environment variable value
   * @param fallback - Default value when the variable is undefined or empty
   * @returns The parsed integer or the fallback value
   * @throws {UpnpConfigValidationError} If the value is not a valid integer
   */
  private static parseIntEnv(
    value: string | undefined,
    fallback: number,
  ): number {
    if (value === undefined || value === '') {
      return fallback;
    }
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      throw new UpnpConfigValidationError(
        `Expected integer value, got "${value}"`,
      );
    }
    return parsed;
  }

  /**
   * Parse a string environment variable as a {@link UpnpProtocol} value.
   *
   * @param value - The raw environment variable value
   * @param fallback - Default protocol when the variable is undefined or empty
   * @returns The parsed protocol or the fallback value
   * @throws {UpnpConfigValidationError} If the value is not a valid protocol
   */
  private static parseProtocol(
    value: string | undefined,
    fallback: UpnpProtocol,
  ): UpnpProtocol {
    if (value === undefined || value === '') {
      return fallback;
    }
    const lower = value.toLowerCase();
    const validProtocols = Object.values(UpnpProtocol) as string[];
    if (!validProtocols.includes(lower)) {
      throw new UpnpConfigValidationError(
        `protocol must be one of ${validProtocols.join(', ')}, got "${value}"`,
      );
    }
    return lower as UpnpProtocol;
  }
}
