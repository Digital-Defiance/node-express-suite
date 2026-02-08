/**
 * @fileoverview ReDoc middleware for serving interactive API documentation.
 * Provides a configurable middleware that serves ReDoc with the OpenAPI spec.
 * @module openapi/middleware/redoc
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { OpenAPISpec } from '../builder';

/**
 * Options for customizing ReDoc appearance and behavior.
 */
export interface ReDocOptions {
  /** Custom title for the ReDoc page (defaults to spec title) */
  title?: string;
  /** URL to a custom favicon */
  favicon?: string;
  /** Custom CSS to inject into the page */
  customCss?: string;
  /** URL to a custom CSS file */
  customCssUrl?: string;
  /** Custom site title shown in browser tab */
  siteTitle?: string;
  /** ReDoc configuration options */
  redocOptions?: ReDocConfigOptions;
}

/**
 * ReDoc configuration options.
 * @see https://redocly.com/docs/redoc/config/
 */
export interface ReDocConfigOptions {
  /** Disable search indexing and search box */
  disableSearch?: boolean;
  /** Enable expanding default server variables */
  expandDefaultServerVariables?: boolean;
  /** Expand responses with specified codes by default */
  expandResponses?: string;
  /** Expand single schema field in request/response body */
  expandSingleSchemaField?: boolean;
  /** Hide download button */
  hideDownloadButton?: boolean;
  /** Hide hostname in server URL */
  hideHostname?: boolean;
  /** Hide loading animation */
  hideLoading?: boolean;
  /** Hide the request sample tab */
  hideRequestPayloadSample?: boolean;
  /** Hide schema pattern */
  hideSchemaPattern?: boolean;
  /** Hide schema titles */
  hideSchemaTitles?: boolean;
  /** Hide single request sample tab */
  hideSingleRequestSampleTab?: boolean;
  /** JSON sample expand level */
  jsonSampleExpandLevel?: number | 'all';
  /** Maximum displayed depth of nested schema */
  maxDisplayedEnumValues?: number;
  /** Menu toggle behavior */
  menuToggle?: boolean;
  /** Native scrollbar */
  nativeScrollbars?: boolean;
  /** Disable automatic scrolling to hash on page load */
  noAutoAuth?: boolean;
  /** Only required in request samples */
  onlyRequiredInSamples?: boolean;
  /** Path in the middle panel */
  pathInMiddlePanel?: boolean;
  /** Required properties first */
  requiredPropsFirst?: boolean;
  /** Scroll Y offset */
  scrollYOffset?: number | string;
  /** Show extensions */
  showExtensions?: boolean | string[];
  /** Show object schema examples */
  showObjectSchemaExamples?: boolean;
  /** Simple one-of type label */
  simpleOneOfTypeLabel?: boolean;
  /** Sort enum values alphabetically */
  sortEnumValuesAlphabetically?: boolean;
  /** Sort operations alphabetically */
  sortOperationsAlphabetically?: boolean;
  /** Sort properties alphabetically */
  sortPropsAlphabetically?: boolean;
  /** Sort tags alphabetically */
  sortTagsAlphabetically?: boolean;
  /** Untrusted spec */
  untrustedSpec?: boolean;
  /** Theme configuration */
  theme?: ReDocThemeOptions;
}

/**
 * ReDoc theme configuration options.
 */
export interface ReDocThemeOptions {
  /** Spacing configuration */
  spacing?: {
    unit?: number;
    sectionHorizontal?: number;
    sectionVertical?: number;
  };
  /** Breakpoints configuration */
  breakpoints?: {
    small?: string;
    medium?: string;
    large?: string;
  };
  /** Colors configuration */
  colors?: {
    tonalOffset?: number;
    primary?: {
      main?: string;
      light?: string;
      dark?: string;
      contrastText?: string;
    };
    success?: {
      main?: string;
      light?: string;
      dark?: string;
      contrastText?: string;
    };
    warning?: {
      main?: string;
      light?: string;
      dark?: string;
      contrastText?: string;
    };
    error?: {
      main?: string;
      light?: string;
      dark?: string;
      contrastText?: string;
    };
    gray?: {
      50?: string;
      100?: string;
    };
    text?: {
      primary?: string;
      secondary?: string;
    };
    border?: {
      dark?: string;
      light?: string;
    };
    responses?: {
      success?: { color?: string; backgroundColor?: string };
      error?: { color?: string; backgroundColor?: string };
      redirect?: { color?: string; backgroundColor?: string };
      info?: { color?: string; backgroundColor?: string };
    };
    http?: {
      get?: string;
      post?: string;
      put?: string;
      options?: string;
      patch?: string;
      delete?: string;
      basic?: string;
      link?: string;
      head?: string;
    };
  };
  /** Schema configuration */
  schema?: {
    linesColor?: string;
    defaultDetailsWidth?: string;
    typeNameColor?: string;
    typeTitleColor?: string;
    requireLabelColor?: string;
    labelsTextSize?: string;
    nestingSpacing?: string;
    nestedBackground?: string;
    arrow?: {
      size?: string;
      color?: string;
    };
  };
  /** Typography configuration */
  typography?: {
    fontSize?: string;
    lineHeight?: string;
    fontWeightRegular?: string;
    fontWeightBold?: string;
    fontWeightLight?: string;
    fontFamily?: string;
    smoothing?: string;
    optimizeSpeed?: boolean;
    headings?: {
      fontFamily?: string;
      fontWeight?: string;
      lineHeight?: string;
    };
    code?: {
      fontSize?: string;
      fontFamily?: string;
      lineHeight?: string;
      fontWeight?: string;
      color?: string;
      backgroundColor?: string;
      wrap?: boolean;
    };
    links?: {
      color?: string;
      visited?: string;
      hover?: string;
    };
  };
  /** Sidebar configuration */
  sidebar?: {
    width?: string;
    backgroundColor?: string;
    textColor?: string;
    activeTextColor?: string;
    groupItems?: {
      activeBackgroundColor?: string;
      activeTextColor?: string;
    };
    level1Items?: {
      activeBackgroundColor?: string;
      activeTextColor?: string;
    };
    arrow?: {
      size?: string;
      color?: string;
    };
  };
  /** Logo configuration */
  logo?: {
    maxHeight?: string;
    maxWidth?: string;
    gutter?: string;
  };
  /** Right panel configuration */
  rightPanel?: {
    backgroundColor?: string;
    width?: string;
    textColor?: string;
  };
  /** FAB (floating action button) configuration */
  fab?: {
    backgroundColor?: string;
    color?: string;
  };
}

/**
 * Default ReDoc CDN URLs.
 */
const REDOC_CDN = {
  standalone: 'https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js',
  favicon: 'https://redocly.com/favicon.ico',
};

/**
 * Generates the HTML page for ReDoc.
 * @param spec - The OpenAPI specification object
 * @param options - ReDoc customization options
 * @returns HTML string for the ReDoc page
 */
export function generateReDocHtml(
  spec: OpenAPISpec,
  options: ReDocOptions = {},
): string {
  const title = options.siteTitle ?? options.title ?? spec.info.title;
  const favicon = options.favicon ?? REDOC_CDN.favicon;

  // Build ReDoc options as HTML attributes
  const redocAttributes = buildRedocAttributes(options.redocOptions);

  // Build custom styles
  let customStyles = '';
  if (options.customCss) {
    customStyles = options.customCss;
  }

  // Serialize spec to JSON for embedding
  const specJson = JSON.stringify(spec);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" type="image/x-icon" href="${escapeHtml(favicon)}">
  ${options.customCssUrl ? `<link rel="stylesheet" href="${escapeHtml(options.customCssUrl)}">` : ''}
  ${customStyles ? `<style>${customStyles}</style>` : ''}
  <style>
    body {
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  <div id="redoc-container"></div>
  <script src="${REDOC_CDN.standalone}"></script>
  <script>
    Redoc.init(${specJson}, ${redocAttributes}, document.getElementById('redoc-container'));
  </script>
</body>
</html>`;
}

/**
 * Builds ReDoc options as a JavaScript object string for the init call.
 * @param options - ReDoc configuration options
 * @returns JavaScript object string
 */
function buildRedocAttributes(options?: ReDocConfigOptions): string {
  if (!options) {
    return '{}';
  }

  return JSON.stringify(options);
}

/**
 * Escapes HTML special characters to prevent XSS.
 * @param str - String to escape
 * @returns Escaped string
 */
function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

/**
 * Type for spec provider function.
 * Can be synchronous or asynchronous.
 */
export type ReDocSpecProvider = () => OpenAPISpec | Promise<OpenAPISpec>;

/**
 * Creates Express middleware that serves ReDoc.
 *
 * @param specOrProvider - OpenAPI spec object or a function that returns the spec
 * @param options - ReDoc customization options
 * @returns Express Router configured to serve ReDoc
 *
 * @example
 * ```typescript
 * // With static spec
 * const spec = openApiBuilder.build();
 * app.use('/redoc', ReDocMiddleware(spec));
 *
 * // With dynamic spec provider
 * app.use('/redoc', ReDocMiddleware(() => openApiBuilder.build()));
 *
 * // With customization
 * app.use('/redoc', ReDocMiddleware(spec, {
 *   title: 'My API Documentation',
 *   redocOptions: {
 *     hideDownloadButton: true,
 *     expandResponses: '200,201',
 *     theme: {
 *       colors: {
 *         primary: { main: '#32329f' }
 *       }
 *     }
 *   }
 * }));
 * ```
 */
export function ReDocMiddleware(
  specOrProvider: OpenAPISpec | ReDocSpecProvider,
  options: ReDocOptions = {},
): Router {
  const router = Router();

  // Determine if we have a static spec or a provider function
  const isProvider = typeof specOrProvider === 'function';

  /**
   * Handler for serving the ReDoc HTML page.
   */
  const serveReDoc: RequestHandler = async (
    _req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const spec = isProvider
        ? await (specOrProvider as ReDocSpecProvider)()
        : (specOrProvider as OpenAPISpec);

      const html = generateReDocHtml(spec, options);
      res.type('html').send(html);
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'REDOC_ERROR',
          message:
            error instanceof Error ? error.message : 'Failed to generate ReDoc',
        },
      });
    }
  };

  // Serve ReDoc at root and /index.html
  router.get('/', serveReDoc);
  router.get('/index.html', serveReDoc);

  return router;
}

/**
 * Creates a simple middleware function (not a router) for serving ReDoc.
 * Useful when you need more control over routing.
 *
 * @param specOrProvider - OpenAPI spec object or a function that returns the spec
 * @param options - ReDoc customization options
 * @returns Express RequestHandler
 *
 * @example
 * ```typescript
 * app.get('/redoc', createReDocHandler(spec));
 * ```
 */
export function createReDocHandler(
  specOrProvider: OpenAPISpec | ReDocSpecProvider,
  options: ReDocOptions = {},
): RequestHandler {
  const isProvider = typeof specOrProvider === 'function';

  return async (_req: Request, res: Response): Promise<void> => {
    try {
      const spec = isProvider
        ? await (specOrProvider as ReDocSpecProvider)()
        : (specOrProvider as OpenAPISpec);

      const html = generateReDocHtml(spec, options);
      res.type('html').send(html);
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'REDOC_ERROR',
          message:
            error instanceof Error ? error.message : 'Failed to generate ReDoc',
        },
      });
    }
  };
}
