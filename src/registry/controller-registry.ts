/**
 * @fileoverview Controller registry for OpenAPI generation.
 * Collects route definitions from all controllers for automatic OpenAPI spec generation.
 * @module registry/controller-registry
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { RouteConfig } from '../types';

/**
 * Represents a registered controller with its base path and routes
 */
export interface RegisteredController {
  /** The base path where the controller is mounted (e.g., '/blocks') */
  basePath: string;
  /** Unique name for the controller */
  controllerName: string;
  /** The route definitions from the controller */
  routeDefinitions: RouteConfig<any, any>[];
}

/**
 * Registry that collects controller route definitions for OpenAPI generation.
 * Controllers register themselves here, and the OpenAPIController uses this
 * to build the OpenAPI specification dynamically.
 *
 * @example
 * ```typescript
 * // In a controller's initRouteDefinitions:
 * ControllerRegistry.register('/blocks', 'BlocksController', this.routeDefinitions);
 *
 * // In OpenAPIController:
 * const controllers = ControllerRegistry.getAll();
 * ```
 */
class ControllerRegistryClass {
  private controllers: Map<string, RegisteredController> = new Map();

  /**
   * Register a controller with its routes.
   * @param basePath - The base path where the controller is mounted (e.g., '/blocks')
   * @param controllerName - Unique name for the controller
   * @param routeDefinitions - The route definitions from the controller
   */
  register(
    basePath: string,
    controllerName: string,
    routeDefinitions: RouteConfig<any, any>[],
  ): void {
    this.controllers.set(controllerName, {
      basePath,
      controllerName,
      routeDefinitions,
    });
  }

  /**
   * Unregister a controller (useful for testing).
   * @param controllerName - The name of the controller to unregister
   */
  unregister(controllerName: string): void {
    this.controllers.delete(controllerName);
  }

  /**
   * Get all registered controllers.
   * @returns Array of all registered controllers
   */
  getAll(): RegisteredController[] {
    return Array.from(this.controllers.values());
  }

  /**
   * Get a specific controller by name.
   * @param controllerName - The name of the controller
   * @returns The registered controller or undefined
   */
  get(controllerName: string): RegisteredController | undefined {
    return this.controllers.get(controllerName);
  }

  /**
   * Clear all registrations (useful for testing).
   */
  clear(): void {
    this.controllers.clear();
  }

  /**
   * Get count of registered controllers.
   */
  get size(): number {
    return this.controllers.size;
  }

  /**
   * Check if a controller is registered.
   * @param controllerName - The name of the controller
   * @returns True if the controller is registered
   */
  has(controllerName: string): boolean {
    return this.controllers.has(controllerName);
  }
}

/**
 * Singleton instance of the controller registry.
 * Use this to register controllers and retrieve them for OpenAPI generation.
 */
export const ControllerRegistry = new ControllerRegistryClass();
