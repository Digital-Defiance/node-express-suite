/**
 * @fileoverview Service key definitions and type map for dependency injection.
 * Defines constants for service registration keys and maps them to their types.
 * @module container/service-definitions
 */

import type { IEmailService } from '../interfaces/email-service';

/**
 * Service registration keys.
 */
export const ServiceKeys = {
  JWT: 'jwt',
  EMAIL: 'email',
  ECIES: 'ecies',
  KEY_WRAPPING: 'keyWrapping',
  ROLE: 'role',
  USER: 'user',
  BACKUP_CODE: 'backupCode',
  TOTP: 'totp',
} as const;

/**
 * Union type of all service keys.
 */
export type ServiceKey = (typeof ServiceKeys)[keyof typeof ServiceKeys];

/**
 * Maps well-known service keys to their expected types.
 * Extend this interface to add type-safe service registrations.
 *
 * Services not listed here can still be registered using string keys
 * with explicit type parameters.
 *
 * Note: JWT, ROLE, USER, BACKUP_CODE, and ECIES are typed loosely here
 * because their concrete types are generic and defined in downstream packages
 * (e.g. node-express-suite-mongo). Downstream consumers get the correct types
 * via the generic parameter on `get<T>()`.
 */
export interface ServiceMap {
  [ServiceKeys.EMAIL]: IEmailService;
  [ServiceKeys.JWT]: unknown;
  [ServiceKeys.ECIES]: unknown;
  [ServiceKeys.KEY_WRAPPING]: unknown;
  [ServiceKeys.ROLE]: unknown;
  [ServiceKeys.USER]: unknown;
  [ServiceKeys.BACKUP_CODE]: unknown;
  [ServiceKeys.TOTP]: unknown;
}
