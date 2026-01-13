/**
 * @fileoverview Service container for dependency injection.
 * Manages service registration and lifecycle with singleton support.
 * @module container/service-container
 */

import {
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';

/**
 * Factory function for creating service instances.
 * @template T - Service type
 */
export type ServiceFactory<T = any> = () => T;

/**
 * Service container for dependency injection.
 */
export class ServiceContainer {
  private services = new Map<string, ServiceFactory>();
  private instances = new Map<string, any>();
  private singletons = new Set<string>();

  /**
   * Registers a service with the container.
   * @template T - Service type
   * @param {string} key - Service identifier
   * @param {ServiceFactory<T>} factory - Factory function to create service
   * @param {boolean} [singleton=true] - Whether to cache as singleton
   */
  register<T>(key: string, factory: ServiceFactory<T>, singleton = true): void {
    this.services.set(key, factory);
    if (singleton) {
      this.singletons.add(key);
    }
  }

  /**
   * Retrieves a service from the container.
   * @template T - Service type
   * @param {string} key - Service identifier
   * @returns {T} Service instance
   * @throws {TranslatableSuiteError} If service is not registered
   */
  get<T>(key: string): T {
    if (this.singletons.has(key)) {
      if (!this.instances.has(key)) {
        const factory = this.services.get(key);
        if (!factory)
          throw new TranslatableSuiteError(
            SuiteCoreStringKey.Error_ServiceIsNotRegisteredTemplate,
            { key },
          );
        this.instances.set(key, factory());
      }
      return this.instances.get(key);
    }

    const factory = this.services.get(key);
    if (!factory)
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_ServiceIsNotRegisteredTemplate,
        { key },
      );
    return factory();
  }

  /**
   * Checks if a service is registered.
   * @param {string} key - Service identifier
   * @returns {boolean} True if service exists
   */
  has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * Clears all cached singleton instances.
   */
  clear(): void {
    this.instances.clear();
  }
}
