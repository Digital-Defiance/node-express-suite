/**
 * @fileoverview Simple CSP directive definition interface.
 * Defines Content Security Policy directives with static and dynamic sources.
 * @module interfaces/csp-definition
 */

import { HelmetOptions } from 'helmet';
import { IncomingMessage, ServerResponse } from 'http';

/**
 * Simplified Content Security Policy directive definition.
 * Each directive accepts static strings or dynamic functions for request-specific values.
 * @property {Array<string | Function>} defaultSrc - Default source directive
 * @property {Array<string | Function>} imgSrc - Image source directive
 * @property {Array<string | Function>} connectSrc - Connect source directive (XHR, WebSocket)
 * @property {Array<string | Function>} scriptSrc - Script source directive
 * @property {Array<string | Function>} styleSrc - Style source directive
 * @property {Array<string | Function>} fontSrc - Font source directive
 * @property {Array<string | Function>} frameSrc - Frame source directive
 */
export interface ISimpleCSPDef {
  defaultSrc: (
    | string
    | ((req: IncomingMessage, res: ServerResponse) => string)
  )[];
  imgSrc: (string | ((req: IncomingMessage, res: ServerResponse) => string))[];
  connectSrc: (
    | string
    | ((req: IncomingMessage, res: ServerResponse) => string)
  )[];
  scriptSrc: (
    | string
    | ((req: IncomingMessage, res: ServerResponse) => string)
  )[];
  styleSrc: (
    | string
    | ((req: IncomingMessage, res: ServerResponse) => string)
  )[];
  fontSrc: (string | ((req: IncomingMessage, res: ServerResponse) => string))[];
  frameSrc: (
    | string
    | ((req: IncomingMessage, res: ServerResponse) => string)
  )[];
}

/**
 * Type guard to check if object is simple CSP definition.
 * @param {ISimpleCSPDef | HelmetOptions} obj - Object to validate
 * @returns {boolean} True if object matches ISimpleCSPDef interface
 */
export const isSimpleCSPDef = (
  obj: ISimpleCSPDef | HelmetOptions,
): obj is ISimpleCSPDef => {
  return (
    obj &&
    'defaultSrc' in obj &&
    'imgSrc' in obj &&
    'connectSrc' in obj &&
    'scriptSrc' in obj &&
    'styleSrc' in obj &&
    'fontSrc' in obj &&
    'frameSrc' in obj &&
    Array.isArray(obj.defaultSrc) &&
    Array.isArray(obj.imgSrc) &&
    Array.isArray(obj.connectSrc) &&
    Array.isArray(obj.scriptSrc) &&
    Array.isArray(obj.styleSrc) &&
    Array.isArray(obj.fontSrc) &&
    Array.isArray(obj.frameSrc)
  );
};
