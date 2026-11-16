/**
 * @fileoverview Public surface of the service container.
 * Lets consumers satisfy the application contract with a plain object,
 * since the ServiceContainer class has private members and is therefore nominal.
 * @module interfaces/service-container
 */
import type { ServiceMap } from '../container/service-definitions';

/**
 * Factory function for creating service instances.
 * @template T - Service type
 */
export type ServiceFactory<T> = () => T;

/**
 * Public contract of a dependency injection service container.
 * Implemented by {@link ServiceContainer}.
 */
export interface IServiceContainer {
  /** Registers a well-known service; the factory is type-checked against {@link ServiceMap}. */
  register<K extends keyof ServiceMap>(
    key: K,
    factory: ServiceFactory<ServiceMap[K]>,
    singleton?: boolean,
  ): void;
  /** Registers an ad-hoc service under a string key. */
  register<T>(
    key: string,
    factory: ServiceFactory<T>,
    singleton?: boolean,
  ): void;
  /** Resolves a well-known service. */
  get<K extends keyof ServiceMap>(key: K): ServiceMap[K];
  /** Resolves an ad-hoc service by string key. */
  get<T>(key: string): T;
  /** Whether a service is registered under the key. */
  has(key: string): boolean;
  /**
   * Clears cached singleton instances.
   * Optional so that minimal containers (register, get, has) satisfy the
   * interface; nothing in this package calls it through IApplication.
   */
  clear?(): void;
}
