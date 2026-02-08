/**
 * @fileoverview Swagger UI middleware for serving interactive API documentation.
 * Provides a configurable middleware that serves Swagger UI with the OpenAPI spec.
 * @module openapi/middleware/swagger-ui
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { OpenAPISpec } from '../builder';

/**
 * Options for customizing Swagger UI appearance and behavior.
 */
export interface SwaggerUIOptions {
  /** Custom title for the Swagger UI page (defaults to spec title) */
  title?: string;
  /** URL to a custom favicon */
  favicon?: string;
  /** Custom CSS to inject into the page */
  customCss?: string;
  /** URL to a custom CSS file */
  customCssUrl?: string;
  /** Custom JavaScript to inject into the page */
  customJs?: string;
  /** URL to a custom JavaScript file */
  customJsUrl?: string;
  /** Swagger UI configuration options */
  swaggerOptions?: SwaggerUIConfigOptions;
  /** Whether to show the top bar (default: true) */
  showTopBar?: boolean;
  /** Custom site title shown in browser tab */
  siteTitle?: string;
}

/**
 * Swagger UI configuration options passed to SwaggerUIBundle.
 * @see https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/
 */
export interface SwaggerUIConfigOptions {
  /** Controls the default expansion setting for operations and tags */
  docExpansion?: 'list' | 'full' | 'none';
  /** If set, enables filtering by tag */
  filter?: boolean | string;
  /** Controls how models are shown when the page is loaded */
  defaultModelsExpandDepth?: number;
  /** Controls how the model is shown when the page is loaded */
  defaultModelExpandDepth?: number;
  /** Controls the display of the request duration (in milliseconds) for "Try it out" requests */
  displayRequestDuration?: boolean;
  /** Controls whether the "Try it out" section should be enabled by default */
  tryItOutEnabled?: boolean;
  /** If set to true, it persists authorization data */
  persistAuthorization?: boolean;
  /** Controls sorting of operations and tags */
  operationsSorter?: 'alpha' | 'method' | ((a: unknown, b: unknown) => number);
  /** Controls sorting of tags */
  tagsSorter?: 'alpha' | ((a: unknown, b: unknown) => number);
  /** Enables deep linking for tags and operations */
  deepLinking?: boolean;
  /** Controls the display of vendor extension (x-) fields */
  showExtensions?: boolean;
  /** Controls the display of common extensions (pattern, maxLength, minLength, maximum, minimum) */
  showCommonExtensions?: boolean;
  /** OAuth2 redirect URL */
  oauth2RedirectUrl?: string;
  /** Syntax highlighting theme */
  syntaxHighlight?:
    | false
    | {
        activate?: boolean;
        theme?:
          | 'agate'
          | 'arta'
          | 'monokai'
          | 'nord'
          | 'obsidian'
          | 'tomorrow-night';
      };
}

/**
 * Default Swagger UI CDN URLs.
 */
const SWAGGER_UI_CDN = {
  css: 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css',
  bundle: 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js',
  standalonePreset:
    'https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js',
  favicon: 'https://unpkg.com/swagger-ui-dist@5/favicon-32x32.png',
};

/**
 * Generates the HTML page for Swagger UI.
 * @param spec - The OpenAPI specification object
 * @param options - Swagger UI customization options
 * @returns HTML string for the Swagger UI page
 */
export function generateSwaggerUIHtml(
  spec: OpenAPISpec,
  options: SwaggerUIOptions = {},
): string {
  const title = options.siteTitle ?? options.title ?? spec.info.title;
  const favicon = options.favicon ?? SWAGGER_UI_CDN.favicon;
  const showTopBar = options.showTopBar !== false;

  // Build Swagger UI config
  const swaggerConfig: Record<string, unknown> = {
    spec,
    dom_id: '#swagger-ui',
    presets: ['SwaggerUIBundle.presets.apis', 'SwaggerUIStandalonePreset'],
    plugins: ['SwaggerUIBundle.plugins.DownloadUrl'],
    layout: 'StandaloneLayout',
    ...options.swaggerOptions,
  };

  // Convert config to JavaScript object literal (not JSON)
  const configString = objectToJsLiteral(swaggerConfig);

  // Build custom CSS
  let customStyles = '';
  if (!showTopBar) {
    customStyles += '.topbar { display: none; }';
  }
  if (options.customCss) {
    customStyles += options.customCss;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" type="image/png" href="${escapeHtml(favicon)}">
  <link rel="stylesheet" href="${SWAGGER_UI_CDN.css}">
  ${options.customCssUrl ? `<link rel="stylesheet" href="${escapeHtml(options.customCssUrl)}">` : ''}
  ${customStyles ? `<style>${customStyles}</style>` : ''}
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${SWAGGER_UI_CDN.bundle}"></script>
  <script src="${SWAGGER_UI_CDN.standalonePreset}"></script>
  ${options.customJsUrl ? `<script src="${escapeHtml(options.customJsUrl)}"></script>` : ''}
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle(${configString});
    };
  </script>
  ${options.customJs ? `<script>${options.customJs}</script>` : ''}
</body>
</html>`;
}

/**
 * Converts a JavaScript object to a JS object literal string.
 * Handles special cases like function references (presets, plugins).
 * @param obj - Object to convert
 * @returns JavaScript object literal string
 */
function objectToJsLiteral(obj: Record<string, unknown>): string {
  const entries = Object.entries(obj).map(([key, value]) => {
    const formattedValue = formatValue(value);
    return `${key}: ${formattedValue}`;
  });
  return `{\n      ${entries.join(',\n      ')}\n    }`;
}

/**
 * Formats a value for JavaScript object literal.
 * @param value - Value to format
 * @returns Formatted string representation
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'string') {
    // Check if it's a reference to a global (like SwaggerUIBundle.presets.apis)
    if (
      value.startsWith('SwaggerUIBundle.') ||
      value.startsWith('SwaggerUIStandalonePreset')
    ) {
      return value;
    }
    return JSON.stringify(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => formatValue(item));
    return `[${items.join(', ')}]`;
  }

  if (typeof value === 'object') {
    // For nested objects (like spec), use JSON.stringify
    return JSON.stringify(value);
  }

  return String(value);
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
export type SpecProvider = () => OpenAPISpec | Promise<OpenAPISpec>;

/**
 * Creates Express middleware that serves Swagger UI.
 *
 * @param specOrProvider - OpenAPI spec object or a function that returns the spec
 * @param options - Swagger UI customization options
 * @returns Express Router configured to serve Swagger UI
 *
 * @example
 * ```typescript
 * // With static spec
 * const spec = openApiBuilder.build();
 * app.use('/docs', SwaggerUIMiddleware(spec));
 *
 * // With dynamic spec provider
 * app.use('/docs', SwaggerUIMiddleware(() => openApiBuilder.build()));
 *
 * // With customization
 * app.use('/docs', SwaggerUIMiddleware(spec, {
 *   title: 'My API Documentation',
 *   customCss: '.topbar { background-color: #333; }',
 *   swaggerOptions: {
 *     docExpansion: 'list',
 *     filter: true,
 *     persistAuthorization: true
 *   }
 * }));
 * ```
 */
export function SwaggerUIMiddleware(
  specOrProvider: OpenAPISpec | SpecProvider,
  options: SwaggerUIOptions = {},
): Router {
  const router = Router();

  // Determine if we have a static spec or a provider function
  const isProvider = typeof specOrProvider === 'function';

  /**
   * Handler for serving the Swagger UI HTML page.
   */
  const serveSwaggerUI: RequestHandler = async (
    _req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const spec = isProvider
        ? await (specOrProvider as SpecProvider)()
        : (specOrProvider as OpenAPISpec);

      const html = generateSwaggerUIHtml(spec, options);
      res.type('html').send(html);
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'SWAGGER_UI_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to generate Swagger UI',
        },
      });
    }
  };

  // Serve Swagger UI at root and /index.html
  router.get('/', serveSwaggerUI);
  router.get('/index.html', serveSwaggerUI);

  return router;
}

/**
 * Creates a simple middleware function (not a router) for serving Swagger UI.
 * Useful when you need more control over routing.
 *
 * @param specOrProvider - OpenAPI spec object or a function that returns the spec
 * @param options - Swagger UI customization options
 * @returns Express RequestHandler
 *
 * @example
 * ```typescript
 * app.get('/docs', createSwaggerUIHandler(spec));
 * ```
 */
export function createSwaggerUIHandler(
  specOrProvider: OpenAPISpec | SpecProvider,
  options: SwaggerUIOptions = {},
): RequestHandler {
  const isProvider = typeof specOrProvider === 'function';

  return async (_req: Request, res: Response): Promise<void> => {
    try {
      const spec = isProvider
        ? await (specOrProvider as SpecProvider)()
        : (specOrProvider as OpenAPISpec);

      const html = generateSwaggerUIHtml(spec, options);
      res.type('html').send(html);
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'SWAGGER_UI_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to generate Swagger UI',
        },
      });
    }
  };
}
