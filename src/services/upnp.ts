/**
 * UPnP Port Mapping Service.
 *
 * Provides automatic port forwarding via UPnP/NAT-PMP protocols,
 * enabling servers behind NAT routers to be reachable from the internet.
 * Uses nat-upnp as the primary client with retry logic and exponential
 * backoff for resilience against slow or unreliable routers.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10
 */

import * as natUpnp from 'nat-upnp';

import { IUpnpService } from '../interfaces/network/upnpService';
import {
  IUpnpConfig,
  IUpnpMapping,
  PortMappingProtocol,
  UPNP_CONFIG_DEFAULTS,
} from '../interfaces/network/upnpTypes';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Minimum valid port number */
const MIN_PORT = 1;

/** Maximum valid port number */
const MAX_PORT = 65535;

/** Default external IP cache TTL in milliseconds (5 minutes) */
const DEFAULT_IP_CACHE_TTL_MS = 5 * 60 * 1000;

// ─── Error classes ──────────────────────────────────────────────────────────

/**
 * Error thrown when a port number is outside the valid range (1-65535).
 *
 * @example
 * ```typescript
 * try {
 *   UpnpService.validatePort(70000);
 * } catch (err) {
 *   if (err instanceof PortRangeError) {
 *     console.error(err.message); // "Port 70000 is outside the valid range (1-65535)"
 *   }
 * }
 * ```
 */
export class PortRangeError extends Error {
  constructor(port: number) {
    super(`Port ${port} is outside the valid range (${MIN_PORT}-${MAX_PORT})`);
    this.name = 'PortRangeError';
  }
}

/**
 * Error thrown when UPnP operations fail after all retry attempts.
 *
 * @example
 * ```typescript
 * try {
 *   await service.getExternalIp();
 * } catch (err) {
 *   if (err instanceof UpnpOperationError) {
 *     console.error(`Operation failed: ${err.message}`);
 *   }
 * }
 * ```
 */
export class UpnpOperationError extends Error {
  constructor(operation: string, cause?: string) {
    const message = cause
      ? `UPnP ${operation} failed: ${cause}`
      : `UPnP ${operation} failed`;
    super(message);
    this.name = 'UpnpOperationError';
  }
}

/**
 * Error thrown when the UPnP service has been closed and an operation is attempted.
 *
 * @example
 * ```typescript
 * const service = new UpnpService();
 * await service.close();
 *
 * try {
 *   await service.getExternalIp(); // throws UpnpServiceClosedError
 * } catch (err) {
 *   if (err instanceof UpnpServiceClosedError) {
 *     console.error('Service already closed');
 *   }
 * }
 * ```
 */
export class UpnpServiceClosedError extends Error {
  constructor() {
    super('UPnP service has been closed');
    this.name = 'UpnpServiceClosedError';
  }
}

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * UPnP port mapping service implementation.
 *
 * Manages port mappings on a NAT router via the UPnP protocol, with
 * support for external IP discovery, mapping lifecycle management,
 * and retry logic with exponential backoff.
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10**
 *
 * @example
 * ```typescript
 * const service = new UpnpService();
 *
 * const externalIp = await service.getExternalIp();
 * await service.createPortMapping({
 *   public: 3000,
 *   private: 3000,
 *   protocol: 'tcp',
 *   description: 'Express App HTTP',
 *   ttl: 3600,
 * });
 *
 * // On shutdown
 * await service.close();
 * ```
 */
export class UpnpService implements IUpnpService {
  /** The nat-upnp client instance */
  private client: natUpnp.Client;

  /** Service configuration */
  private readonly config: Readonly<IUpnpConfig>;

  /** Active port mappings tracked in memory (keyed by "port:protocol") */
  private readonly activeMappings: Map<string, IUpnpMapping> = new Map();

  /** Cached external IP address */
  private cachedExternalIp: string | null = null;

  /** Timestamp when the external IP was last fetched */
  private ipCacheTimestamp = 0;

  /** TTL for the external IP cache in milliseconds */
  private readonly ipCacheTtlMs: number;

  /** Whether the service has been closed */
  private closed = false;

  /**
   * Create a new UpnpService.
   *
   * **Validates: Requirement 2.1** — Accepts partial config and merges with defaults
   *
   * @param config - UPnP configuration (uses defaults for omitted fields)
   * @param ipCacheTtlMs - External IP cache TTL in milliseconds (default 5 minutes)
   */
  constructor(
    config: Partial<IUpnpConfig> = {},
    ipCacheTtlMs: number = DEFAULT_IP_CACHE_TTL_MS,
  ) {
    this.config = { ...UPNP_CONFIG_DEFAULTS, ...config };
    this.ipCacheTtlMs = ipCacheTtlMs;
    this.client = natUpnp.createClient();
  }

  // ─── Public API ─────────────────────────────────────────────────────────

  /**
   * Query the router for the external (public) IP address.
   * Results are cached for the configured TTL to reduce router queries.
   *
   * **Validates: Requirement 2.8** — Return cached IP or query router and cache result
   *
   * @returns The external IP address as a string
   * @throws {UpnpServiceClosedError} If the service has been closed
   * @throws {UpnpOperationError} If the IP cannot be retrieved after retries
   */
  async getExternalIp(): Promise<string> {
    this.ensureNotClosed();

    // Return cached IP if still valid
    if (this.cachedExternalIp && !this.isIpCacheExpired()) {
      return this.cachedExternalIp;
    }

    const ip = await this.withRetry<string>('getExternalIp', () =>
      this.promisifiedExternalIp(),
    );

    this.cachedExternalIp = ip;
    this.ipCacheTimestamp = Date.now();

    return ip;
  }

  /**
   * Create a port mapping on the router.
   *
   * **Validates: Requirements 2.2, 2.3** — Validate ports and create mapping with tracking
   *
   * @param mapping - The port mapping configuration to create
   * @throws {PortRangeError} If any port is outside 1-65535
   * @throws {UpnpServiceClosedError} If the service has been closed
   * @throws {UpnpOperationError} If the mapping cannot be created after retries
   */
  async createPortMapping(mapping: IUpnpMapping): Promise<void> {
    this.ensureNotClosed();
    UpnpService.validatePort(mapping.public);
    UpnpService.validatePort(mapping.private);

    await this.withRetry<void>('createPortMapping', () =>
      this.promisifiedPortMapping({
        public: mapping.public,
        private: mapping.private,
        protocol: mapping.protocol,
        description: mapping.description,
        ttl: mapping.ttl,
      }),
    );

    // Track the mapping in memory
    const key = UpnpService.mappingKey(mapping.public, mapping.protocol);
    this.activeMappings.set(key, { ...mapping });
  }

  /**
   * Remove a specific port mapping from the router.
   *
   * **Validates: Requirement 2.4** — Remove mapping from router and in-memory tracking
   *
   * @param publicPort - The external port number to unmap
   * @param protocol - The transport protocol of the mapping to remove
   * @throws {PortRangeError} If the port is outside 1-65535
   * @throws {UpnpServiceClosedError} If the service has been closed
   * @throws {UpnpOperationError} If the mapping cannot be removed after retries
   */
  async removePortMapping(
    publicPort: number,
    protocol: PortMappingProtocol,
  ): Promise<void> {
    this.ensureNotClosed();
    UpnpService.validatePort(publicPort);

    await this.withRetry<void>('removePortMapping', () =>
      this.promisifiedPortUnmapping({
        public: publicPort,
        protocol,
      }),
    );

    // Remove from tracked mappings
    const key = UpnpService.mappingKey(publicPort, protocol);
    this.activeMappings.delete(key);
  }

  /**
   * Remove all port mappings created by this service.
   *
   * **Validates: Requirement 2.9** — Remove all active mappings on close
   *
   * Attempts to remove each mapping individually. Failures on individual
   * mappings are logged but do not prevent removal of remaining mappings.
   */
  async removeAllMappings(): Promise<void> {
    this.ensureNotClosed();

    const mappings = Array.from(this.activeMappings.values());
    const errors: Array<{ mapping: IUpnpMapping; error: Error }> = [];

    for (const mapping of mappings) {
      try {
        await this.removePortMapping(mapping.public, mapping.protocol);
      } catch (error) {
        errors.push({
          mapping,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    // Clear all tracked mappings even if some removals failed
    this.activeMappings.clear();

    if (errors.length > 0) {
      const details = errors
        .map(
          (e) =>
            `${e.mapping.public}/${e.mapping.protocol}: ${e.error.message}`,
        )
        .join('; ');
      throw new UpnpOperationError('removeAllMappings', details);
    }
  }

  /**
   * Get all active port mappings managed by this service.
   *
   * **Validates: Requirement 2.5** — Return all mappings tracked in memory
   *
   * @returns Array of active port mappings
   */
  async getMappings(): Promise<IUpnpMapping[]> {
    this.ensureNotClosed();
    return Array.from(this.activeMappings.values());
  }

  /**
   * Close the UPnP client and release resources.
   * Removes all active mappings before closing.
   *
   * **Validates: Requirement 2.9** — Remove all mappings, close client, reject subsequent ops
   *
   * @throws {UpnpServiceClosedError} If the service has already been closed
   */
  async close(): Promise<void> {
    this.ensureNotClosed();

    // Best-effort removal of all mappings before closing
    try {
      await this.removeAllMappings();
    } catch {
      // Swallow errors during cleanup — we're shutting down
    }

    this.client.close();
    this.closed = true;
    this.cachedExternalIp = null;
  }

  // ─── Static helpers ─────────────────────────────────────────────────────

  /**
   * Validate that a port number is within the valid range (1-65535).
   *
   * @param port - The port number to validate
   * @throws {PortRangeError} If the port is outside the valid range
   */
  static validatePort(port: number): void {
    if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
      throw new PortRangeError(port);
    }
  }

  /**
   * Generate a unique key for a mapping based on port and protocol.
   *
   * @param port - The public port number
   * @param protocol - The transport protocol
   * @returns A string key in the format "port:protocol"
   */
  static mappingKey(port: number, protocol: PortMappingProtocol): string {
    return `${port}:${protocol}`;
  }

  // ─── Private helpers ────────────────────────────────────────────────────

  /**
   * Ensure the service has not been closed.
   *
   * @throws {UpnpServiceClosedError} If the service has been closed
   */
  private ensureNotClosed(): void {
    if (this.closed) {
      throw new UpnpServiceClosedError();
    }
  }

  /**
   * Check whether the cached external IP has expired.
   *
   * @returns true if the cache has expired or was never set
   */
  private isIpCacheExpired(): boolean {
    return Date.now() - this.ipCacheTimestamp > this.ipCacheTtlMs;
  }

  /**
   * Execute an operation with retry logic and exponential backoff.
   *
   * **Validates: Requirements 2.6, 2.7** — Retry with exponential backoff, throw UpnpOperationError on exhaustion
   *
   * @param operationName - Name of the operation (for error messages)
   * @param operation - The async operation to execute
   * @returns The result of the operation
   * @throws {UpnpOperationError} If all retry attempts are exhausted
   */
  private async withRetry<T>(
    operationName: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't delay after the last attempt
        if (attempt < this.config.retryAttempts) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await UpnpService.sleep(delay);
        }
      }
    }

    throw new UpnpOperationError(
      operationName,
      lastError?.message ?? 'unknown error',
    );
  }

  /**
   * Promisified wrapper around the nat-upnp externalIp callback API.
   *
   * @returns The external IP address
   */
  private promisifiedExternalIp(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.client.externalIp((err, ip) => {
        if (err) {
          reject(err);
        } else if (ip) {
          resolve(ip);
        } else {
          reject(new Error('No external IP returned'));
        }
      });
    });
  }

  /**
   * Promisified wrapper around the nat-upnp portMapping callback API.
   *
   * @param options - Port mapping options
   */
  private promisifiedPortMapping(
    options: natUpnp.NewPortMappingOpts,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.client.portMapping(options, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Promisified wrapper around the nat-upnp portUnmapping callback API.
   *
   * @param options - Port unmapping options
   */
  private promisifiedPortUnmapping(
    options: natUpnp.DeletePortMappingOpts,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.client.portUnmapping(options, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Sleep for the specified duration.
   *
   * @param ms - Duration in milliseconds
   * @returns A promise that resolves after the specified duration
   */
  static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
