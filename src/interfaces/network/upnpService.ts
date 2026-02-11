import { IUpnpMapping, PortMappingProtocol } from './upnpTypes';

/**
 * Interface for UPnP/NAT-PMP port mapping service.
 *
 * Supports protocol auto-detection with fallback between UPnP and NAT-PMP.
 * Implementations should track active mappings in memory and provide
 * cleanup guarantees on close.
 *
 * @example
 * ```typescript
 * import { IUpnpService } from '@digitaldefiance/node-express-suite';
 *
 * async function setupPortMapping(service: IUpnpService): Promise<void> {
 *   const externalIp = await service.getExternalIp();
 *   await service.createPortMapping({
 *     public: 3000,
 *     private: 3000,
 *     protocol: 'tcp',
 *     description: 'Express App HTTP',
 *     ttl: 3600,
 *   });
 *   console.log(`Accessible at ${externalIp}:3000`);
 * }
 * ```
 */
export interface IUpnpService {
  /**
   * Query the router for the external (public) IP address.
   * Results may be cached by the implementation to reduce router queries.
   *
   * @returns The external IP address as a string (e.g. `"203.0.113.42"`)
   * @throws {UpnpServiceClosedError} If the service has been closed
   * @throws {UpnpOperationError} If the IP cannot be retrieved after retries
   */
  getExternalIp(): Promise<string>;

  /**
   * Create a port mapping on the router.
   *
   * @param mapping - The port mapping configuration to create
   * @throws {PortRangeError} If any port is outside 1-65535
   * @throws {UpnpServiceClosedError} If the service has been closed
   * @throws {UpnpOperationError} If the mapping cannot be created after retries
   */
  createPortMapping(mapping: IUpnpMapping): Promise<void>;

  /**
   * Remove a specific port mapping from the router.
   *
   * @param publicPort - The external port number to unmap
   * @param protocol - The transport protocol of the mapping to remove
   * @throws {PortRangeError} If the port is outside 1-65535
   * @throws {UpnpServiceClosedError} If the service has been closed
   * @throws {UpnpOperationError} If the mapping cannot be removed after retries
   */
  removePortMapping(
    publicPort: number,
    protocol: PortMappingProtocol,
  ): Promise<void>;

  /**
   * Remove all port mappings created by this service.
   *
   * Attempts to remove each mapping individually. Failures on individual
   * mappings do not prevent removal of remaining mappings.
   *
   * @throws {UpnpServiceClosedError} If the service has been closed
   * @throws {UpnpOperationError} If one or more mappings cannot be removed
   */
  removeAllMappings(): Promise<void>;

  /**
   * Get all active port mappings managed by this service.
   *
   * Returns only mappings tracked in memory by this service instance,
   * not all mappings on the router.
   *
   * @returns Array of active port mappings
   * @throws {UpnpServiceClosedError} If the service has been closed
   */
  getMappings(): Promise<IUpnpMapping[]>;

  /**
   * Close the UPnP client and release resources.
   *
   * Removes all active mappings before closing the underlying client.
   * Should be called during service shutdown. After calling close,
   * all subsequent operations will throw {@link UpnpServiceClosedError}.
   *
   * @throws {UpnpServiceClosedError} If the service has already been closed
   */
  close(): Promise<void>;
}
