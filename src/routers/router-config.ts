/**
 * @fileoverview Router configuration interface and defaults.
 * Defines configuration options for router setup including static paths, view engine, and middleware.
 * @module routers/router-config
 */

import { RequestHandler } from 'express';

/**
 * Configuration interface for router setup.
 */
export interface RouterConfig {
  /** Array of static path configurations with prefix and directory */
  staticPaths?: Array<{ prefix: string; directory: string }>;
  /** View engine configuration with name and views path */
  viewEngine?: { name: string; viewsPath: string };
  /** Array of middleware functions to apply */
  middleware?: RequestHandler[];
  /** CORS configuration options */
  cors?: {
    /** Allowed origin(s) for CORS */
    origin?: string | string[];
    /** Whether to allow credentials */
    credentials?: boolean;
  };
}

/**
 * Default router configuration with empty arrays.
 */
export const DefaultRouterConfig: RouterConfig = {
  staticPaths: [],
  middleware: [],
};
