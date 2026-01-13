/**
 * @fileoverview CSP configuration interface with CORS whitelist.
 * Defines Content Security Policy and CORS settings.
 * @module interfaces/csp-config
 */

import { ISimpleCSPDef, isSimpleCSPDef } from './csp-definition';

/**
 * Content Security Policy configuration with CORS whitelist.
 * @property {string[]} corsWhitelist - Allowed CORS origins
 * @property {ISimpleCSPDef} csp - CSP directive definitions
 */
export interface ICSPConfig {
  corsWhitelist: string[];
  csp: ISimpleCSPDef;
}

/**
 * Type guard to check if object is valid CSP configuration.
 * @param {any} obj - Object to validate
 * @returns {boolean} True if object matches ICSPConfig interface
 */
export const isCSPConfig = (obj: any): obj is ICSPConfig => {
  return (
    !!obj &&
    typeof obj === 'object' &&
    'corsWhitelist' in obj &&
    'csp' in obj &&
    isSimpleCSPDef(obj.csp)
  );
};
