/**
 * @fileoverview GreenlockManager encapsulates all greenlock-express interactions
 * for automated Let's Encrypt TLS certificate management.
 * @module greenlock-manager
 */

import { Application as ExpressApplication } from 'express';
import * as greenlockExpress from 'greenlock-express';
import {
  GreenlockChallengeConfig,
  GreenlockInitOptions,
  GreenlockInstance,
  GreenlockReadyContext,
  GreenlockSiteConfig,
} from 'greenlock-express';
import { Server } from 'http';
import { ILetsEncryptConfig } from './interfaces/environment';

type ServerWithOptionalClose = Server & { closeAllConnections?: () => void };

/**
 * Manages the greenlock-express lifecycle for automated Let's Encrypt
 * TLS certificate management. Handles HTTPS server on port 443 and
 * HTTP redirect server on port 80.
 */

/**
 * Pure function that determines the ACME challenge configuration
 * based on the provided hostnames. Wildcard hostnames (starting with `*.`)
 * require DNS-01 challenge validation; all configurations include HTTP-01.
 *
 * This is exported for testability — it mirrors the logic used internally
 * by {@link GreenlockManager.buildChallengeConfig}.
 */
export type { GreenlockChallengeConfig } from 'greenlock-express';

export function determineChallengeTypes(
  hostnames: string[],
): Record<string, GreenlockChallengeConfig> {
  const hasWildcard = hostnames.some((h) => h.startsWith('*.'));

  const challenges: Record<string, GreenlockChallengeConfig> = {
    'http-01': { module: 'acme-http-01-standalone' },
  };

  if (hasWildcard) {
    challenges['dns-01'] = { module: 'acme-dns-01-cli' };
  }

  return challenges;
}

export class GreenlockManager {
  private greenlockInstance: GreenlockInstance | null = null;
  private httpsServer: ServerWithOptionalClose | null = null;
  private redirectServer: ServerWithOptionalClose | null = null;

  constructor(private readonly config: ILetsEncryptConfig) {}

  /**
   * Determines the challenge configuration based on hostnames.
   * Wildcard hostnames require DNS-01 challenge validation;
   * standard hostnames use HTTP-01.
   */
  private buildChallengeConfig(): Record<string, GreenlockChallengeConfig> {
    return determineChallengeTypes(this.config.hostnames);
  }

  /**
   * Builds the Greenlock site configuration from the hostnames list.
   * The first non-wildcard hostname (or first hostname) is used as the subject.
   */
  private buildSiteConfig(): GreenlockSiteConfig[] {
    const subject =
      this.config.hostnames.find((h) => !h.startsWith('*.')) ??
      this.config.hostnames[0];

    return [
      {
        subject,
        altnames: this.config.hostnames,
      },
    ];
  }

  /**
   * Initialize Greenlock and start HTTPS + HTTP redirect servers.
   * Resolves when both servers are listening.
   *
   * If Greenlock initialization fails, the error is logged and the method
   * returns without starting HTTPS/redirect servers, allowing the primary
   * HTTP server to continue.
   */
  async start(expressApp: ExpressApplication): Promise<void> {
    const initOptions: GreenlockInitOptions = {
      packageRoot: process.cwd(),
      configDir: this.config.configDir,
      maintainerEmail: this.config.maintainerEmail,
      cluster: false,
      staging: this.config.staging,
      challenges: this.buildChallengeConfig(),
      sites: this.buildSiteConfig(),
    };

    try {
      this.greenlockInstance = greenlockExpress.init(initOptions);
    } catch (err) {
      console.error('Failed to initialize greenlock-express:', err);
      return;
    }

    return new Promise<void>((resolve) => {
      this.greenlockInstance!.ready((glx: GreenlockReadyContext) => {
        // Start HTTPS server on port 443
        try {
          this.httpsServer = glx.httpsServer(
            undefined,
            expressApp,
          ) as ServerWithOptionalClose;

          this.httpsServer.on('error', (err: NodeJS.ErrnoException) => {
            console.error('HTTPS server error on port 443:', err);
            if (process.env['NODE_ENV'] === 'test') {
              throw err;
            }
            process.exit(1);
          });

          this.httpsServer.listen(443, () => {
            console.log('[ ready ] https on port 443');
          });
        } catch (err) {
          console.error('Failed to start HTTPS server on port 443:', err);
          if (process.env['NODE_ENV'] === 'test') {
            throw err;
          }
          process.exit(1);
        }

        // Start HTTP redirect server on port 80
        try {
          this.redirectServer = glx.httpServer(
            undefined,
            expressApp,
          ) as ServerWithOptionalClose;

          this.redirectServer.on('error', (err: NodeJS.ErrnoException) => {
            console.error('HTTP redirect server error on port 80:', err);
            // Continue without redirect — HTTPS still works
          });

          this.redirectServer.listen(80, () => {
            console.log('[ ready ] http redirect on port 80');
          });
        } catch (err) {
          console.error(
            'Failed to start HTTP redirect server on port 80:',
            err,
          );
          // Continue without redirect — HTTPS still works
        }

        resolve();
      });
    });
  }

  /**
   * Gracefully shut down both the HTTPS and HTTP redirect servers,
   * closing all active connections first.
   */
  async stop(): Promise<void> {
    const closeServer = (server: ServerWithOptionalClose): Promise<void> =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections?.();
        server.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

    const shutdownPromises: Promise<void>[] = [];

    if (this.httpsServer) {
      shutdownPromises.push(closeServer(this.httpsServer));
      this.httpsServer = null;
    }

    if (this.redirectServer) {
      shutdownPromises.push(closeServer(this.redirectServer));
      this.redirectServer = null;
    }

    await Promise.all(shutdownPromises);
    this.greenlockInstance = null;
  }
}
