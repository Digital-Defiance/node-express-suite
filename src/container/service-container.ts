/**
 * @fileoverview Service container for dependency injection.
 * Manages service registration and lifecycle with singleton support.
 * Type-safe for well-known service keys defined in ServiceMap.
 * @module container/service-container
 */

import {
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';
import type { ServiceMap } from './service-definitions';

/**
 * Factory function for creating service instances.
 * @template T - Service type
 */
export type ServiceFactory<T> = () => T;

/**
 * Type-safe service container for dependency injection.
 *
 * Well-known keys from {@link ServiceMap} are type-checked at compile time.
 * Ad-hoc string keys still work via explicit generic parameters.
 *
 * @example
 * ```typescript
 * // Type-safe: returns IEmailService automatically
 * container.get(ServiceKeys.EMAIL);
 *
 * // Ad-hoc: explicit generic needed
 * container.get<MyService>('myCustomService');
 * ```
 */
export class ServiceContainer {
  private services = new Map<string, ServiceFactory<unknown>>();
  private instances = new Map<string, unknown>();
  private singletons = new Set<string>();

  /**
   * Registers a service with the container using a well-known key.
   * @param key - A key from ServiceMap
   * @param factory - Factory function to create service
   * @param singleton - Whether to cache as singleton (default: true)
   */
  register<K extends keyof ServiceMap>(
    key: K,
    factory: ServiceFactory<ServiceMap[K]>,
    singleton?: boolean,
  ): void;
  /**
   * Registers a service with the container using an ad-hoc string key.
   * @param key - Service identifier
   * @param factory - Factory function to create service
   * @param singleton - Whether to cache as singleton (default: true)
   */
  register<T>(
    key: string,
    factory: ServiceFactory<T>,
    singleton?: boolean,
  ): void;
  register(
    key: string,
    factory: ServiceFactory<unknown>,
    singleton = true,
  ): void {
    this.services.set(key, factory);
    if (singleton) {
      this.singletons.add(key);
    }
  }

  /**
   * Retrieves a service from the container using a well-known key.
   * @param key - A key from ServiceMap
   * @returns Service instance with the correct type
   * @throws {TranslatableSuiteError} If service is not registered
   */
  get<K extends keyof ServiceMap>(key: K): ServiceMap[K];
  /**
   * Retrieves a service from the container using an ad-hoc string key.
   * @param key - Service identifier
   * @returns Service instance
   * @throws {TranslatableSuiteError} If service is not registered
   */
  get<T>(key: string): T;
  get(key: string): unknown {
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
   * @param key - Service identifier
   * @returns True if service exists
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
