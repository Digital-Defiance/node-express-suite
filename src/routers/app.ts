/**
 * @fileoverview Application router for serving React frontend and API routes.
 * Handles static file serving, EJS template rendering, and catch-all routing.
 * @module routers/app
 */

import {
  CoreI18nComponentId,
  TranslatableGenericError,
} from '@digitaldefiance/i18n-lib';
import {
  getSuiteCoreTranslation,
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';
import ejs from 'ejs';
import {
  Application,
  static as expressStatic,
  NextFunction,
  Request,
  Response,
} from 'express';
import { existsSync, readdirSync } from 'fs';
import { resolve, sep } from 'path';
import { IApplication } from '../interfaces/application';
import { debugLog, handleError, sendApiMessageResponse } from '../utils';
import { BaseRouter } from './base';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Dummy function to ensure EJS is included in the bundle.
 * @private
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function keepEJS() {
  ejs.compile(''); // Compile an empty string, doesn't generate anything meaningful
}

/**
 * Application router for serving React frontend and API routes.
 * Sets up static file serving, EJS template rendering, and catch-all routing for SPA.
 * @template TID Platform-specific ID type
 * @template TApplication Application instance type
 */
export class AppRouter<
  TID extends PlatformID = Buffer,
  TApplication extends IApplication<TID> = IApplication<TID>,
> {
  /** Path to EJS views directory */
  protected readonly viewsPath: string;
  /** Path to index.html file */
  protected readonly indexPath: string;
  /** Path to assets directory */
  protected readonly assetsDir: string;
  /** Path to React distribution directory */
  protected readonly reactDistDir: string;

  /** API router instance */
  protected readonly apiRouter: BaseRouter<TID, TApplication>;
  /** Application instance */
  protected readonly application: TApplication;

  /**
   * Creates a new application router instance.
   * Validates and resolves all paths to prevent directory traversal attacks.
   * @param apiRouter API router instance to mount under /api
   * @throws {TranslatableSuiteError} If paths contain invalid traversal sequences
   */
  constructor(apiRouter: BaseRouter<TID, TApplication>) {
    this.application = apiRouter.application;
    this.apiRouter = apiRouter;

    // Validate paths don't contain traversal sequences
    if (
      this.application.environment.apiDistDir.includes('..') ||
      this.application.environment.reactDistDir.includes('..')
    ) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_InvalidPathContainsParentDirectoryReference,
      );
    }

    const normalizedApiDistDir = resolve(
      this.application.environment.apiDistDir,
    );
    const viewsPath = resolve(normalizedApiDistDir, 'views');
    if (
      !viewsPath.startsWith(normalizedApiDistDir + sep) &&
      viewsPath !== normalizedApiDistDir
    ) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_InvalidViewsPathEscapesBaseDirectory,
      );
    }
    this.viewsPath = viewsPath;

    const normalizedReactDistDir = resolve(
      this.application.environment.reactDistDir,
    );
    this.reactDistDir = normalizedReactDistDir;

    const indexPath = resolve(normalizedReactDistDir, 'index.html');
    if (
      !indexPath.startsWith(normalizedReactDistDir + sep) &&
      indexPath !== normalizedReactDistDir
    ) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_InvalidIndexPathEscapesBaseDirectory,
      );
    }
    this.indexPath = indexPath;

    const assetsPath = resolve(normalizedReactDistDir, 'assets');
    if (
      !assetsPath.startsWith(normalizedReactDistDir + sep) &&
      assetsPath !== normalizedReactDistDir
    ) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_InvalidAssetsPathEscapesBaseDirectory,
      );
    }
    this.assetsDir = assetsPath;
  }

  /**
   * Gets the filename of an asset matching a pattern.
   * @param assetDir Directory to search in
   * @param pattern Regular expression pattern to match
   * @returns Filename if found, undefined otherwise
   */
  public getAssetFilename(
    assetDir: string,
    pattern: RegExp,
  ): string | undefined {
    try {
      // Prevent path traversal by validating assetDir is within expected directory
      // amazonq-ignore-next-line already addressed
      if (
        // amazonq-ignore-next-line
        assetDir.includes('..') ||
        !assetDir.startsWith(this.reactDistDir)
      ) {
        return undefined;
      }
      const files = readdirSync(assetDir, 'utf8');
      return files.find((f) => pattern.test(f));
    } catch {
      return undefined;
    }
  }

  /**
   * Gets base view locals for EJS template rendering.
   * Subclasses can override to add additional locals.
   * @param req Express request
   * @param res Express response
   * @returns Object containing base template variables
   */
  protected getBaseViewLocals(
    req: Request,
    res: Response,
  ): Record<string, unknown> {
    const SiteName = this.application.constants.Site;
    const SiteTagline = this.application.constants.SiteTagline;
    const SiteDescription = this.application.constants.SiteDescription;
    const hostname = req.hostname;
    const server =
      (req.socket.localPort === 443 && req.protocol === 'https') ||
      (req.socket.localPort === 80 && req.protocol === 'http')
        ? `${req.protocol}://${hostname}`
        : `${req.protocol}://${hostname}:${req.socket.localPort}`;

    return {
      cspNonce: res.locals['cspNonce'],
      title: SiteName,
      tagline: SiteTagline,
      description: SiteDescription,
      server,
      siteUrl: this.apiRouter.application.environment.serverUrl,
      baseHref: this.apiRouter.application.environment.basePath,
      hostname,
      siteTitle: SiteName,
    };
  }

  /**
   * Renders an EJS template with the provided locals.
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   * @param template Template name to render
   * @param locals Template variables
   */
  protected renderTemplate(
    req: Request,
    res: Response,
    next: NextFunction,
    template: string,
    locals: Record<string, unknown>,
  ): void {
    if (!/^[\w/-]+$/.test(template)) {
      next(new Error('Invalid template name requested'));
      return;
    }

    const sanitizedUrl = (req.url || '').replace(/[\r\n]/g, ' ');
    debugLog(
      this.apiRouter.application.environment.debug,
      'log',
      `Rendering view "${template}" for ${sanitizedUrl}`,
    );

    res.render(template, locals, (err, html) => {
      if (err) {
        const errMsg =
          err && typeof err === 'object' && 'message' in err
            ? String(err.message).replace(/[\r\n]/g, ' ')
            : 'Unknown error';
        console.error('Error rendering: ' + errMsg);
        const normalizedError = err instanceof Error ? err : new Error(errMsg);
        if (!res.headersSent) {
          res.status(500).send('An error occurred');
        }
        next(normalizedError);
        return;
      }

      if (!html) {
        next(new Error(`Rendered template "${template}" returned empty HTML`));
        return;
      }

      debugLog(
        this.apiRouter.application.environment.debug,
        'log',
        `Rendered view "${template}" for ${sanitizedUrl}`,
      );

      res.send(html);
    });
  }

  /**
   * Creates a view renderer function for a specific template.
   * @param template Template name to render
   * @param localsFactory Optional function to generate additional locals
   * @returns Express middleware function
   */
  protected createViewRenderer(
    template: string,
    localsFactory?: (req: Request, res: Response) => Record<string, unknown>,
  ): (req: Request, res: Response, next: NextFunction) => void {
    return (req, res, next) => {
      const baseLocals = this.getBaseViewLocals(req, res);
      const extraLocals = localsFactory ? localsFactory(req, res) : {};
      this.renderTemplate(req, res, next, template, {
        ...baseLocals,
        ...extraLocals,
      });
    };
  }

  /**
   * Override to register additional routes (e.g. other EJS pages) before the index catch-all.
   * @param app Express application
   */
  protected registerAdditionalRenderHooks(app: Application): void {
    void app;
  }

  /**
   * Renders the index.html page with injected asset paths.
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  public renderIndex(req: Request, res: Response, next: NextFunction): void {
    if (req.url.endsWith('.js')) {
      res.type('application/javascript');
    }

    const jsFile = this.getAssetFilename(this.assetsDir, /^index-.*\.js$/);
    const cssFile = this.getAssetFilename(this.assetsDir, /^index-.*\.css$/);
    const locals = {
      ...this.getBaseViewLocals(req, res),
      jsFile: jsFile ? `assets/${jsFile}` : undefined,
      cssFile: cssFile ? `assets/${cssFile}` : undefined,
    };

    this.renderTemplate(req, res, next, 'index', locals);
  }

  /**
   * Initializes the application router with all routes and middleware.
   * Sets up API routes, static file serving, and catch-all routing.
   * @param app Express application
   * @throws {TranslatableGenericError} If index file not found or invalid paths
   */
  public init(app: Application) {
    const reactDistHasDistSegment = this.reactDistDir
      .split(sep)
      .filter((segment) => segment.length > 0)
      .some((segment) => segment.toLowerCase() === 'dist');
    if (!reactDistHasDistSegment) {
      throw new TranslatableGenericError<SuiteCoreStringKey>(
        CoreI18nComponentId,
        SuiteCoreStringKey.Error_AppDoesNotAppearToBeRunningWithinDistTemplate,
        { dir: this.apiRouter.application.environment.reactDistDir },
      );
    }
    if (!existsSync(this.indexPath)) {
      throw new TranslatableGenericError<SuiteCoreStringKey>(
        CoreI18nComponentId,
        SuiteCoreStringKey.Error_IndexFileNotFoundTemplate,
        { path: this.indexPath },
      );
    }

    if (this.apiRouter.application.environment.debug) {
      app.use((req, res, next) => {
        const port =
          (req.socket.localPort === 443 && req.protocol === 'https') ||
          (req.socket.localPort === 80 && req.protocol === 'http')
            ? ''
            : `:${req.socket.localPort}`;
        // amazonq-ignore-next-line
        console.log(
          getSuiteCoreTranslation(SuiteCoreStringKey.Admin_ServingRoute) +
            ': method=' +
            req.method +
            ' url=' +
            req.protocol +
            '://' +
            req.hostname +
            port +
            (req.url || '').replace(/[\r\n]/g, ' '),
        );
        next();
      });
    }

    app.use('/api', this.apiRouter.router);

    app.set('views', this.viewsPath);
    app.set('view engine', 'ejs');

    // Serve static files from the React app build directory (validated in constructor)
    app.use('/assets', expressStatic(this.assetsDir));
    const serveStaticWithLogging = expressStatic(this.reactDistDir);
    app.use('/static/js', expressStatic(this.reactDistDir));
    app.use((req, res, next) => {
      if (req.url === '/') {
        next();
        return;
      }
      debugLog(
        this.apiRouter.application.environment.debug,
        'log',
        `Trying to serve static for ${(req.url || '').replace(/[\r\n]/g, ' ')}`,
      );
      if (req.url.endsWith('.js')) {
        res.type('application/javascript');
      }
      serveStaticWithLogging(req, res, (err) => {
        if (err) {
          const sanitizedErr =
            err instanceof Error
              ? err.message.replace(/[\r\n]/g, ' ')
              : String(err).replace(/[\r\n]/g, ' ');
          debugLog(
            this.apiRouter.application.environment.debug,
            'error',
            'Error serving static file:',
            sanitizedErr,
          );
          handleError(err, res, sendApiMessageResponse, next);
          return;
        }
        next();
      });
    });

    // The "catchall" handler: for any request that doesn't
    // match one above, send back React's index.html file.
    // app.get('*', (req, res) => {
    //   res.sendFile(path.join(__dirname,'..', '..', '..', 'myapp-react', 'index.html'));
    // });
    this.registerAdditionalRenderHooks(app);

    app.use((req: Request, res: Response, next: NextFunction) => {
      this.renderIndex(req, res, next);
    });
  }
}
