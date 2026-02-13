declare module 'greenlock-express' {
  import { Application as ExpressApplication } from 'express';
  import { Server } from 'http';

  interface GreenlockSiteConfig {
    subject: string;
    altnames: string[];
  }

  interface GreenlockChallengeConfig {
    module: string;
  }

  interface GreenlockInitOptions {
    packageRoot: string;
    configDir: string;
    maintainerEmail: string;
    cluster: boolean;
    staging: boolean;
    challenges: Record<string, GreenlockChallengeConfig>;
    sites: GreenlockSiteConfig[];
  }

  interface GreenlockReadyContext {
    httpsServer(
      options?: Record<string, unknown>,
      app?: ExpressApplication,
    ): Server;
    httpServer(
      options?: Record<string, unknown>,
      app?: ExpressApplication,
    ): Server;
  }

  interface GreenlockInstance {
    serve(app: ExpressApplication): void;
    ready(callback: (glx: GreenlockReadyContext) => void): void;
  }

  function init(opts: GreenlockInitOptions): GreenlockInstance;

  export { init, GreenlockInitOptions, GreenlockInstance, GreenlockReadyContext, GreenlockSiteConfig, GreenlockChallengeConfig };
}
