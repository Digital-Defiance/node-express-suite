/**
 * @fileoverview Application router for serving React frontend and API routes.
 * Handles static file serving, HTML template injection, and catch-all routing.
 *
 * Instead of EJS templates, this router reads the bundler-generated index.html
 * directly and injects runtime values (CSP nonce, app config, title, etc.)
 * via string replacement. This is bundler-agnostic — Vite, webpack, esbuild
 * output all just works because the bundler wrote the index.html.
 *
 * Subclasses override getIndexLocals() to provide app-specific values
 * and getIndexReplacements() for custom string replacements.
 *
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
import type { SuiteCoreStringKeyValue } from '@digitaldefiance/suite-core-lib';
import {
  Application,
  static as expressStatic,
  NextFunction,
  Request,
  Response,
} from 'express';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { resolve, sep } from 'path';
import { IApplication } from '../interfaces/application';
import { debugLog, handleError, sendApiMessageResponse } from '../utils';
import { BaseRouter } from './base';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Runtime values available for index.html injection.
 * Subclasses extend this via getIndexLocals().
 */
export interface IndexLocals {
  /** CSP nonce for script tags */
  cspNonce: string;
  /** Page title */
  title: string;
  /** Site tagline */
  tagline: string;
  /** Site description */
  description: string;
  /** Full server URL (protocol + host + port) */
  server: string;
  /** Configured site URL */
  siteUrl: string;
  /** Base href for the app */
  baseHref: string;
  /** Request hostname */
  hostname: string;
  /** Site title (alias) */
  siteTitle: string;
  /** Email domain for the site */
  emailDomain: string;
  /** Additional app-specific values */
  [key: string]: unknown;
}

/**
 * Application router for serving React frontend and API routes.
 * Sets up static file serving, HTML injection, and catch-all routing for SPA.
 *
 * The index.html served to clients is the one produced by the bundler (Vite, etc.).
 * Runtime values are injected via string replacement rather than a template engine.
 *
 * @template TID Platform-specific ID type
 * @template TApplication Application instance type
 */
export class AppRouter<
  TID extends PlatformID = Buffer,
  TApplication extends IApplication<TID> = IApplication<TID>,
> {
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

  /** Cached index.html template read from the React dist directory. */
  private indexHtmlTemplate: string | null = null;

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
      if (assetDir.includes('..') || !assetDir.startsWith(this.reactDistDir)) {
        return undefined;
      }
      const files = readdirSync(assetDir, 'utf8');
      return files.find((f) => pattern.test(f));
    } catch {
      return undefined;
    }
  }

  /**
   * Reads and caches the bundler-generated index.html from reactDistDir.
   * In development mode, the file is re-read on every request to support
   * rebuilds without server restart.
   * @returns The HTML string, or null if the file doesn't exist.
   */
  protected getIndexHtmlTemplate(): string | null {
    // In production, cache the template
    if (this.indexHtmlTemplate !== null) {
      return this.indexHtmlTemplate;
    }
    if (!existsSync(this.indexPath)) {
      return null;
    }
    const html = readFileSync(this.indexPath, 'utf8');
    // Only cache in production
    if (this.application.environment.production) {
      this.indexHtmlTemplate = html;
    }
    return html;
  }

  /**
   * Gets the base locals for index.html injection.
   * Subclasses should override this to add app-specific values.
   * @param req Express request
   * @param res Express response
   * @returns Object containing template variables
   */
  protected getIndexLocals(req: Request, res: Response): IndexLocals {
    const SiteName = this.application.constants.Site;
    const SiteTagline = this.application.constants.SiteTagline;
    const SiteDescription = this.application.constants.SiteDescription;
    const hostname = req.hostname;
    const port = req.socket.localPort;
    const server =
      (port === 443 && req.protocol === 'https') ||
      (port === 80 && req.protocol === 'http')
        ? `${req.protocol}://${hostname}`
        : `${req.protocol}://${hostname}:${port}`;

    return {
      cspNonce: (res.locals['cspNonce'] as string) || '',
      title: SiteName,
      tagline: SiteTagline,
      description: SiteDescription,
      server,
      siteUrl: this.apiRouter.application.environment.serverUrl || server,
      baseHref: this.apiRouter.application.environment.basePath,
      hostname,
      siteTitle: SiteName,
      emailDomain: this.apiRouter.application.environment.emailDomain,
    };
  }

  /**
   * Applies runtime replacements to the index.html template.
   * Override this in subclasses to add app-specific replacements
   * (e.g. Font Awesome kit injection, additional meta tags).
   *
   * The base implementation handles:
   *   1. Title injection
   *   2. APP_CONFIG placeholder replacement
   *   3. CSP nonce injection on all script tags
   *
   * @param html The raw index.html string
   * @param locals The locals from getIndexLocals()
   * @returns The transformed HTML string
   */
  protected applyIndexReplacements(html: string, locals: IndexLocals): string {
    let result = html;

    // 1. Inject title
    result = result.replace(
      /<title>[^<]*<\/title>/,
      `<title>${locals.title}</title>`,
    );

    // 2. Replace the APP_CONFIG placeholder with real runtime values
    //    The index.html should contain: window.APP_CONFIG = window.APP_CONFIG || {};
    result = result.replace(
      /window\.APP_CONFIG\s*=\s*window\.APP_CONFIG\s*\|\|\s*\{\s*\}\s*;?/,
      `window.APP_CONFIG = ${JSON.stringify({
        apiUrl: `${locals.siteUrl}/api`,
        serverUrl: locals.siteUrl,
        hostname: locals.hostname,
        siteTitle: locals.title,
        server: locals.server,
        emailDomain: locals.emailDomain,
      })};`,
    );

    // 3. Inject CSP nonce on all <script> tags that don't already have one
    if (locals.cspNonce) {
      result = result.replace(
        /<script(?![^>]*nonce)/g,
        `<script nonce="${locals.cspNonce}"`,
      );
    }

    // 4. Remove crossorigin attribute from same-origin stylesheet and script tags.
    //    Vite adds crossorigin by default, but when assets are served from the
    //    same origin it causes CORS-mode fetches for subresources (fonts loaded
    //    from CSS), which fail when the server sets Cross-Origin-Resource-Policy:
    //    same-origin via Helmet.
    result = result.replace(
      /(<(?:link|script)\b[^>]*?)\s+crossorigin(?:="[^"]*")?/gi,
      '$1',
    );

    return result;
  }

  /**
   * Override to register additional routes before the index catch-all.
   * @param app Express application
   */
  protected registerAdditionalRenderHooks(app: Application): void {
    void app;
  }

  /**
   * Renders the index.html page with injected runtime values.
   *
   * Reads the bundler-generated index.html, calls getIndexLocals() for
   * template variables, then applyIndexReplacements() for string injection.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  public renderIndex(req: Request, res: Response, next: NextFunction): void {
    const template = this.getIndexHtmlTemplate();
    if (!template) {
      next(
        new TranslatableSuiteError(
          SuiteCoreStringKey.Error_ReactIndexHtmlNotFoundInDistDirectory,
        ),
      );
      return;
    }

    const locals = this.getIndexLocals(req, res);
    const html = this.applyIndexReplacements(template, locals);

    res.type('html').send(html);
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
      throw new TranslatableGenericError<SuiteCoreStringKeyValue>(
        CoreI18nComponentId,
        SuiteCoreStringKey.Error_AppDoesNotAppearToBeRunningWithinDistTemplate,
        { dir: this.apiRouter.application.environment.reactDistDir },
      );
    }
    if (!existsSync(this.indexPath)) {
      throw new TranslatableGenericError<SuiteCoreStringKeyValue>(
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

    // Serve static files from the React app build directory (validated in constructor)
    app.use('/assets', expressStatic(this.assetsDir));
    const serveStaticWithLogging = expressStatic(this.reactDistDir);
    app.use('/static/js', expressStatic(this.reactDistDir));
    app.use((req, res, next) => {
      if (
        req.url === '/' ||
        req.url.startsWith('/api/') ||
        req.url === '/api'
      ) {
        next();
        return;
      }
      debugLog(
        this.apiRouter.application.environment.debug,
        'log',
        getSuiteCoreTranslation(
          SuiteCoreStringKey.Debug_TryingToServeStaticFor,
          { url: (req.url || '').replace(/[\r\n]/g, ' ') },
        ),
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
            getSuiteCoreTranslation(
              SuiteCoreStringKey.Debug_ErrorServingStaticFile,
              { error: sanitizedErr },
            ),
          );
          handleError(err, res, sendApiMessageResponse, next);
          return;
        }
        next();
      });
    });

    this.registerAdditionalRenderHooks(app);

    // Return 404 JSON for unmatched API routes instead of rendering the SPA
    app.use('/api', (req: Request, res: Response) => {
      res.status(404).json({
        message: getSuiteCoreTranslation(
          SuiteCoreStringKey.Error_ApiRouteNotFound,
        ),
        path: `/api${req.url}`,
      });
    });

    app.use((req: Request, res: Response, next: NextFunction) => {
      this.renderIndex(req, res, next);
    });
  }
}
