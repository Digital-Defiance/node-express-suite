/**
 * @fileoverview Flexible CSP configuration interface.
 * Supports both simple CSP definitions and Helmet options.
 * @module interfaces/flexible-csp
 */

import { HelmetOptions } from 'helmet';
import { isHelmetOptions } from '../middleware-utils';
import { ISimpleCSPDef, isSimpleCSPDef } from './csp-definition';

/**
 * Flexible Content Security Policy configuration.
 * Accepts either simplified CSP definition or full Helmet options.
 * @property {string[]} corsWhitelist - Allowed CORS origins
 * @property {ISimpleCSPDef | HelmetOptions} csp - CSP configuration
 */
export interface IFlexibleCSP {
  corsWhitelist: string[];
  csp: ISimpleCSPDef | HelmetOptions;
}

/**
 * Type guard to check if object is flexible CSP configuration.
 * @param {any} obj - Object to validate
 * @returns {boolean} True if object matches IFlexibleCSP interface
 */
export const isFlexibleCSP = (obj: any): obj is IFlexibleCSP => {
  return (
    !!obj &&
    typeof obj === 'object' &&
    'corsWhitelist' in obj &&
    'csp' in obj &&
    (isSimpleCSPDef(obj.csp) || isHelmetOptions(obj.csp))
  );
};
