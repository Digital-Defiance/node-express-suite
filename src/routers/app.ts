import {
  CoreI18nComponentId,
  PluginTranslatableGenericError,
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
  Request,
  Response,
} from 'express';
import { existsSync, readdirSync } from 'fs';
import { Types } from 'mongoose';
import { basename, resolve, sep } from 'path';
import { IBaseDocument } from '../documents';
import { Environment } from '../environment';
import { IConstants } from '../interfaces';
import { IApplication } from '../interfaces/application';
import { debugLog, handleError, sendApiMessageResponse } from '../utils';
import { BaseRouter } from './base';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function keepEJS() {
  ejs.compile(''); // Compile an empty string, doesn't generate anything meaningful
}

/**
 * Application router
 * Sets up the API and static file serving
 */
export class AppRouter<
  TApplication extends IApplication<
    any,
    Types.ObjectId,
    IBaseDocument<any, Types.ObjectId>,
    Environment,
    IConstants
  > = IApplication<
    any,
    Types.ObjectId,
    IBaseDocument<any, Types.ObjectId>,
    Environment,
    IConstants
  >,
> {
  private readonly viewsPath: string;
  private readonly indexPath: string;
  private readonly assetsDir: string;
  private readonly reactDistDir: string;

  private readonly apiRouter: BaseRouter<TApplication>;
  private readonly application: TApplication;

  constructor(apiRouter: BaseRouter<TApplication>) {
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
   * Initialize the application router
   * @param app Express application
   * @param debugRoutes Whether to log routes
   */
  public init(app: Application) {
    if (
      basename(this.apiRouter.application.environment.reactDistDir) !== 'dist'
    ) {
      throw new PluginTranslatableGenericError<SuiteCoreStringKey, string>(
        CoreI18nComponentId,
        SuiteCoreStringKey.Error_AppDoesNotAppearToBeRunningWithinDistTemplate,
        { dir: this.apiRouter.application.environment.reactDistDir },
      );
    }
    if (!existsSync(this.indexPath)) {
      throw new PluginTranslatableGenericError<SuiteCoreStringKey, string>(
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
    app.use((req: Request, res: Response) => {
      const cspNonce = res.locals['cspNonce'];
      if (req.url.endsWith('.js')) {
        res.type('application/javascript');
      }

      const SiteName = this.application.constants.Site;
      const SiteTagline = this.application.constants.SiteTagline;
      const SiteDescription = this.application.constants.SiteDescription;
      const hostname = req.hostname;
      const jsFile = this.getAssetFilename(this.assetsDir, /^index-.*\.js$/);
      const cssFile = this.getAssetFilename(this.assetsDir, /^index-.*\.css$/);
      const server =
        (req.socket.localPort === 443 && req.protocol === 'https') ||
        (req.socket.localPort === 80 && req.protocol === 'http')
          ? `${req.protocol}://${hostname}`
          : `${req.protocol}://${hostname}:${req.socket.localPort}`;

      res.render(
        'index',
        {
          cspNonce,
          title: SiteName,
          tagline: SiteTagline,
          description: SiteDescription,
          server: server,
          siteUrl: this.apiRouter.application.environment.serverUrl,
          baseHref: this.apiRouter.application.environment.basePath,
          hostname: hostname,
          siteTitle: SiteName,
          jsFile: jsFile ? `assets/${jsFile}` : undefined,
          cssFile: cssFile ? `assets/${cssFile}` : undefined,
        },
        (err, html) => {
          // Render 'index.ejs'
          if (err) {
            const errMsg =
              err && typeof err === 'object' && 'message' in err
                ? String(err.message).replace(/[\r\n]/g, ' ')
                : 'Unknown error';
            console.error('Error rendering: ' + errMsg);
            if (!res.headersSent) {
              res.status(500).send('An error occurred'); // Send a generic error message or render a separate error view
            }
            return;
          }
          res.send(html);
        },
      );
    });
  }
}
