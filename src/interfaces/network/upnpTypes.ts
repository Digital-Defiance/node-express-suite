/**
 * UPnP protocol type for port mapping.
 *
 * Determines which NAT traversal protocol the service should use
 * when communicating with the router.
 *
 * @example
 * ```typescript
 * import { UpnpProtocol } from '@digitaldefiance/node-express-suite';
 *
 * // Auto-detect the best available protocol
 * const protocol = UpnpProtocol.AUTO;
 *
 * // Force UPnP (most common)
 * const upnp = UpnpProtocol.UPNP;
 *
 * // Force NAT-PMP (Apple routers)
 * const natpmp = UpnpProtocol.NATPMP;
 * ```
 */
export enum UpnpProtocol {
  /** Standard UPnP IGD protocol (most routers) */
  UPNP = 'upnp',
  /** NAT-PMP protocol (common on Apple routers) */
  NATPMP = 'natpmp',
  /** Auto-detect: try UPnP first, fall back to NAT-PMP */
  AUTO = 'auto',
}

/**
 * Transport protocol for port mappings.
 *
 * @example
 * ```typescript
 * const protocol: PortMappingProtocol = 'tcp';
 * ```
 */
export type PortMappingProtocol = 'tcp' | 'udp';

/**
 * Represents a single UPnP port mapping on the router.
 *
 * @example
 * ```typescript
 * const mapping: IUpnpMapping = {
 *   public: 3000,
 *   private: 3000,
 *   protocol: 'tcp',
 *   description: 'Express App HTTP',
 *   ttl: 3600,
 * };
 * ```
 */
export interface IUpnpMapping {
  /** External (public) port number */
  public: number;
  /** Internal (private) port number */
  private: number;
  /** Transport protocol */
  protocol: PortMappingProtocol;
  /** Human-readable description of the mapping */
  description: string;
  /** Time-to-live in seconds */
  ttl: number;
}

/**
 * UPnP service configuration.
 *
 * All fields have sensible defaults provided by {@link UPNP_CONFIG_DEFAULTS}.
 * In production, values are typically loaded from environment variables
 * via {@link UpnpConfig.fromEnvironment}.
 *
 * @see UPNP_CONFIG_DEFAULTS for default values
 *
 * @example
 * ```typescript
 * const config: IUpnpConfig = {
 *   enabled: true,
 *   httpPort: 8080,
 *   websocketPort: 8080,
 *   ttl: 3600,
 *   refreshInterval: 1800000,
 *   protocol: UpnpProtocol.AUTO,
 *   retryAttempts: 3,
 *   retryDelay: 5000,
 * };
 * ```
 */
export interface IUpnpConfig {
  /** Whether UPnP is enabled */
  enabled: boolean;
  /** HTTP/Express port to map */
  httpPort: number;
  /** WebSocket port to map */
  websocketPort: number;
  /** Mapping time-to-live in seconds */
  ttl: number;
  /** Refresh interval in milliseconds */
  refreshInterval: number;
  /** UPnP protocol to use */
  protocol: UpnpProtocol;
  /** Number of retry attempts */
  retryAttempts: number;
  /** Delay between retries in milliseconds */
  retryDelay: number;
}

/**
 * Default UPnP configuration values.
 *
 * Used as fallback when environment variables are not set.
 * UPnP is disabled by default (opt-in).
 *
 * @example
 * ```typescript
 * import { UPNP_CONFIG_DEFAULTS } from '@digitaldefiance/node-express-suite';
 *
 * // Use defaults with overrides
 * const config = { ...UPNP_CONFIG_DEFAULTS, enabled: true, httpPort: 8080 };
 * ```
 */
export const UPNP_CONFIG_DEFAULTS: Readonly<IUpnpConfig> = {
  enabled: false,
  httpPort: 3000,
  websocketPort: 3000,
  ttl: 3600,
  refreshInterval: 1800000,
  protocol: UpnpProtocol.AUTO,
  retryAttempts: 3,
  retryDelay: 5000,
} as const;
