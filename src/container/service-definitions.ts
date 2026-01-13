/**
 * @fileoverview Service key definitions for dependency injection.
 * Defines constants for service registration keys.
 * @module container/service-definitions
 */

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
} as const;

/**
 * Union type of all service keys.
 */
export type ServiceKey = (typeof ServiceKeys)[keyof typeof ServiceKeys];
