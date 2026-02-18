/**
 * Configuration for Let's Encrypt / Greenlock TLS certificate management.
 */
export interface ILetsEncryptConfig {
  /** Whether Let's Encrypt is enabled */
  enabled: boolean;
  /** Contact email for Let's Encrypt account (required when enabled) */
  maintainerEmail: string;
  /** List of hostnames to obtain certificates for */
  hostnames: string[];
  /** Use Let's Encrypt staging directory for testing */
  staging: boolean;
  /** Directory for Greenlock config and certificate storage */
  configDir: string;
}
