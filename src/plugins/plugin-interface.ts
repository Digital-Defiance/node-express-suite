/**
 * @fileoverview Application plugin interface.
 * Defines contract for application plugins. The interface is declared in
 * interfaces/plugin-manager (it refers to the plugin manager contract) and
 * re-exported here so existing imports keep working.
 * @module plugins/plugin-interface
 */
export type { IApplicationPlugin } from '../interfaces/plugin-manager';
