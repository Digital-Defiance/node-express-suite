/**
 * @fileoverview Unit tests for SwaggerUIMiddleware
 */

import express, { Express } from 'express';
import request from 'supertest';
import {
  SwaggerUIMiddleware,
  createSwaggerUIHandler,
  generateSwaggerUIHtml,
  SwaggerUIOptions,
} from '../../../src/openapi/middleware/swagger-ui';
import { OpenAPISpec } from '../../../src/openapi/builder';

// Create a minimal valid OpenAPI spec for testing
const createMockSpec = (overrides: Partial<OpenAPISpec> = {}): OpenAPISpec => ({
  openapi: '3.0.3',
  info: {
    title: 'Test API',
    version: '1.0.0',
    description: 'Test API description',
  },
  servers: [{ url: '/api', description: 'API server' }],
  paths: {},
  components: {
    schemas: {},
    securitySchemes: {},
  },
  ...overrides,
});

describe('SwaggerUIMiddleware', () => {
  let app: Express;
  let mockSpec: OpenAPISpec;

  beforeEach(() => {
    app = express();
    mockSpec = createMockSpec();
  });

  describe('basic functionality', () => {
    it('should serve Swagger UI at root path', async () => {
      app.use('/docs', SwaggerUIMiddleware(mockSpec));

      const response = await request(app)
        .get('/docs/')
        .expect(200)
        .expect('Content-Type', /html/);

      expect(response.text).toContain('<!DOCTYPE html>');
      expect(response.text).toContain('swagger-ui');
      expect(response.text).toContain('SwaggerUIBundle');
    });

    it('should serve Swagger UI at /index.html', async () => {
      app.use('/docs', SwaggerUIMiddleware(mockSpec));

      const response = await request(app)
        .get('/docs/index.html')
        .expect(200)
        .expect('Content-Type', /html/);

      expect(response.text).toContain('<!DOCTYPE html>');
      expect(response.text).toContain('swagger-ui');
    });

    it('should include the spec in the HTML', async () => {
      app.use('/docs', SwaggerUIMiddleware(mockSpec));

      const response = await request(app).get('/docs/').expect(200);

      expect(response.text).toContain('Test API');
      expect(response.text).toContain('3.0.3');
    });

    it('should use spec title as page title by default', async () => {
      app.use('/docs', SwaggerUIMiddleware(mockSpec));

      const response = await request(app).get('/docs/').expect(200);

      expect(response.text).toContain('<title>Test API</title>');
    });
  });

  describe('spec provider function', () => {
    it('should accept a function that returns the spec', async () => {
      const specProvider = () => mockSpec;
      app.use('/docs', SwaggerUIMiddleware(specProvider));

      const response = await request(app).get('/docs/').expect(200);

      expect(response.text).toContain('Test API');
    });

    it('should accept an async function that returns the spec', async () => {
      const asyncSpecProvider = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return mockSpec;
      };
      app.use('/docs', SwaggerUIMiddleware(asyncSpecProvider));

      const response = await request(app).get('/docs/').expect(200);

      expect(response.text).toContain('Test API');
    });

    it('should handle errors from spec provider', async () => {
      const errorProvider = () => {
        throw new Error('Failed to build spec');
      };
      app.use('/docs', SwaggerUIMiddleware(errorProvider));

      const response = await request(app).get('/docs/').expect(500);

      expect(response.body.error.code).toBe('SWAGGER_UI_ERROR');
      expect(response.body.error.message).toBe('Failed to build spec');
    });
  });

  describe('customization options', () => {
    it('should use custom title when provided', async () => {
      app.use(
        '/docs',
        SwaggerUIMiddleware(mockSpec, { title: 'Custom Title' }),
      );

      const response = await request(app).get('/docs/').expect(200);

      expect(response.text).toContain('<title>Custom Title</title>');
    });

    it('should use siteTitle over title when both provided', async () => {
      app.use(
        '/docs',
        SwaggerUIMiddleware(mockSpec, {
          title: 'Title',
          siteTitle: 'Site Title',
        }),
      );

      const response = await request(app).get('/docs/').expect(200);

      expect(response.text).toContain('<title>Site Title</title>');
    });

    it('should use custom favicon when provided', async () => {
      app.use(
        '/docs',
        SwaggerUIMiddleware(mockSpec, {
          favicon: 'https://example.com/favicon.ico',
        }),
      );

      const response = await request(app).get('/docs/').expect(200);

      expect(response.text).toContain('https://example.com/favicon.ico');
    });

    it('should inject custom CSS when provided', async () => {
      app.use(
        '/docs',
        SwaggerUIMiddleware(mockSpec, {
          customCss: '.custom-class { color: red; }',
        }),
      );

      const response = await request(app).get('/docs/').expect(200);

      expect(response.text).toContain('.custom-class { color: red; }');
    });

    it('should include custom CSS URL when provided', async () => {
      app.use(
        '/docs',
        SwaggerUIMiddleware(mockSpec, {
          customCssUrl: 'https://example.com/custom.css',
        }),
      );

      const response = await request(app).get('/docs/').expect(200);

      expect(response.text).toContain(
        '<link rel="stylesheet" href="https://example.com/custom.css">',
      );
    });

    it('should inject custom JavaScript when provided', async () => {
      app.use(
        '/docs',
        SwaggerUIMiddleware(mockSpec, {
          customJs: 'console.log("custom js");',
        }),
      );

      const response = await request(app).get('/docs/').expect(200);

      expect(response.text).toContain('console.log("custom js");');
    });

    it('should include custom JS URL when provided', async () => {
      app.use(
        '/docs',
        SwaggerUIMiddleware(mockSpec, {
          customJsUrl: 'https://example.com/custom.js',
        }),
      );

      const response = await request(app).get('/docs/').expect(200);

      expect(response.text).toContain(
        '<script src="https://example.com/custom.js"></script>',
      );
    });

    it('should hide top bar when showTopBar is false', async () => {
      app.use('/docs', SwaggerUIMiddleware(mockSpec, { showTopBar: false }));

      const response = await request(app).get('/docs/').expect(200);

      expect(response.text).toContain('.topbar { display: none; }');
    });

    it('should show top bar by default', async () => {
      app.use('/docs', SwaggerUIMiddleware(mockSpec));

      const response = await request(app).get('/docs/').expect(200);

      expect(response.text).not.toContain('.topbar { display: none; }');
    });
  });

  describe('swagger options', () => {
    it('should pass docExpansion option', async () => {
      app.use(
        '/docs',
        SwaggerUIMiddleware(mockSpec, {
          swaggerOptions: { docExpansion: 'none' },
        }),
      );

      const response = await request(app).get('/docs/').expect(200);

      expect(response.text).toContain('docExpansion: "none"');
    });

    it('should pass filter option', async () => {
      app.use(
        '/docs',
        SwaggerUIMiddleware(mockSpec, {
          swaggerOptions: { filter: true },
        }),
      );

      const response = await request(app).get('/docs/').expect(200);

      expect(response.text).toContain('filter: true');
    });

    it('should pass persistAuthorization option', async () => {
      app.use(
        '/docs',
        SwaggerUIMiddleware(mockSpec, {
          swaggerOptions: { persistAuthorization: true },
        }),
      );

      const response = await request(app).get('/docs/').expect(200);

      expect(response.text).toContain('persistAuthorization: true');
    });

    it('should pass deepLinking option', async () => {
      app.use(
        '/docs',
        SwaggerUIMiddleware(mockSpec, {
          swaggerOptions: { deepLinking: true },
        }),
      );

      const response = await request(app).get('/docs/').expect(200);

      expect(response.text).toContain('deepLinking: true');
    });

    it('should pass displayRequestDuration option', async () => {
      app.use(
        '/docs',
        SwaggerUIMiddleware(mockSpec, {
          swaggerOptions: { displayRequestDuration: true },
        }),
      );

      const response = await request(app).get('/docs/').expect(200);

      expect(response.text).toContain('displayRequestDuration: true');
    });
  });
});

describe('createSwaggerUIHandler', () => {
  let app: Express;
  let mockSpec: OpenAPISpec;

  beforeEach(() => {
    app = express();
    mockSpec = createMockSpec();
  });

  it('should create a request handler that serves Swagger UI', async () => {
    app.get('/docs', createSwaggerUIHandler(mockSpec));

    const response = await request(app)
      .get('/docs')
      .expect(200)
      .expect('Content-Type', /html/);

    expect(response.text).toContain('swagger-ui');
  });

  it('should accept customization options', async () => {
    app.get(
      '/docs',
      createSwaggerUIHandler(mockSpec, { title: 'Handler Title' }),
    );

    const response = await request(app).get('/docs').expect(200);

    expect(response.text).toContain('<title>Handler Title</title>');
  });

  it('should accept a spec provider function', async () => {
    app.get(
      '/docs',
      createSwaggerUIHandler(() => mockSpec),
    );

    const response = await request(app).get('/docs').expect(200);

    expect(response.text).toContain('Test API');
  });

  it('should handle errors from spec provider', async () => {
    app.get(
      '/docs',
      createSwaggerUIHandler(() => {
        throw new Error('Provider error');
      }),
    );

    const response = await request(app).get('/docs').expect(500);

    expect(response.body.error.code).toBe('SWAGGER_UI_ERROR');
    expect(response.body.error.message).toBe('Provider error');
  });
});

describe('generateSwaggerUIHtml', () => {
  let mockSpec: OpenAPISpec;

  beforeEach(() => {
    mockSpec = createMockSpec();
  });

  it('should generate valid HTML document', () => {
    const html = generateSwaggerUIHtml(mockSpec);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('</html>');
  });

  it('should include Swagger UI CDN resources', () => {
    const html = generateSwaggerUIHtml(mockSpec);

    expect(html).toContain('swagger-ui-dist');
    expect(html).toContain('swagger-ui.css');
    expect(html).toContain('swagger-ui-bundle.js');
    expect(html).toContain('swagger-ui-standalone-preset.js');
  });

  it('should include the spec in SwaggerUIBundle config', () => {
    const html = generateSwaggerUIHtml(mockSpec);

    expect(html).toContain('SwaggerUIBundle');
    expect(html).toContain('spec:');
  });

  it('should escape HTML special characters in title', () => {
    const specWithHtmlTitle = createMockSpec({
      info: {
        title: '<script>alert("xss")</script>',
        version: '1.0.0',
        description: 'Test',
      },
    });

    const html = generateSwaggerUIHtml(specWithHtmlTitle);

    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('should apply all customization options', () => {
    const options: SwaggerUIOptions = {
      title: 'Custom Title',
      favicon: 'https://example.com/favicon.ico',
      customCss: '.test { color: blue; }',
      customCssUrl: 'https://example.com/style.css',
      customJs: 'console.log("test");',
      customJsUrl: 'https://example.com/script.js',
      showTopBar: false,
      swaggerOptions: {
        docExpansion: 'full',
        filter: true,
      },
    };

    const html = generateSwaggerUIHtml(mockSpec, options);

    expect(html).toContain('<title>Custom Title</title>');
    expect(html).toContain('https://example.com/favicon.ico');
    expect(html).toContain('.test { color: blue; }');
    expect(html).toContain('https://example.com/style.css');
    expect(html).toContain('console.log("test");');
    expect(html).toContain('https://example.com/script.js');
    expect(html).toContain('.topbar { display: none; }');
    expect(html).toContain('docExpansion: "full"');
    expect(html).toContain('filter: true');
  });
});
