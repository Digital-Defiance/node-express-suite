/**
 * @fileoverview Unit tests for ReDocMiddleware
 */

import express, { Express } from 'express';
import request from 'supertest';
import {
  ReDocMiddleware,
  createReDocHandler,
  generateReDocHtml,
  ReDocOptions,
} from '../../../src/openapi/middleware/redoc';
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

describe('ReDocMiddleware', () => {
  let app: Express;
  let mockSpec: OpenAPISpec;

  beforeEach(() => {
    app = express();
    mockSpec = createMockSpec();
  });

  describe('basic functionality', () => {
    it('should serve ReDoc at root path', async () => {
      app.use('/redoc', ReDocMiddleware(mockSpec));

      const response = await request(app)
        .get('/redoc/')
        .expect(200)
        .expect('Content-Type', /html/);

      expect(response.text).toContain('<!DOCTYPE html>');
      expect(response.text).toContain('redoc-container');
      expect(response.text).toContain('Redoc.init');
    });

    it('should serve ReDoc at /index.html', async () => {
      app.use('/redoc', ReDocMiddleware(mockSpec));

      const response = await request(app)
        .get('/redoc/index.html')
        .expect(200)
        .expect('Content-Type', /html/);

      expect(response.text).toContain('<!DOCTYPE html>');
      expect(response.text).toContain('redoc-container');
    });

    it('should include the spec in the HTML', async () => {
      app.use('/redoc', ReDocMiddleware(mockSpec));

      const response = await request(app).get('/redoc/').expect(200);

      expect(response.text).toContain('Test API');
      expect(response.text).toContain('3.0.3');
    });

    it('should use spec title as page title by default', async () => {
      app.use('/redoc', ReDocMiddleware(mockSpec));

      const response = await request(app).get('/redoc/').expect(200);

      expect(response.text).toContain('<title>Test API</title>');
    });
  });

  describe('spec provider function', () => {
    it('should accept a function that returns the spec', async () => {
      const specProvider = () => mockSpec;
      app.use('/redoc', ReDocMiddleware(specProvider));

      const response = await request(app).get('/redoc/').expect(200);

      expect(response.text).toContain('Test API');
    });

    it('should accept an async function that returns the spec', async () => {
      const asyncSpecProvider = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return mockSpec;
      };
      app.use('/redoc', ReDocMiddleware(asyncSpecProvider));

      const response = await request(app).get('/redoc/').expect(200);

      expect(response.text).toContain('Test API');
    });

    it('should handle errors from spec provider', async () => {
      const errorProvider = () => {
        throw new Error('Failed to build spec');
      };
      app.use('/redoc', ReDocMiddleware(errorProvider));

      const response = await request(app).get('/redoc/').expect(500);

      expect(response.body.error.code).toBe('REDOC_ERROR');
      expect(response.body.error.message).toBe('Failed to build spec');
    });
  });

  describe('customization options', () => {
    it('should use custom title when provided', async () => {
      app.use('/redoc', ReDocMiddleware(mockSpec, { title: 'Custom Title' }));

      const response = await request(app).get('/redoc/').expect(200);

      expect(response.text).toContain('<title>Custom Title</title>');
    });

    it('should use siteTitle over title when both provided', async () => {
      app.use(
        '/redoc',
        ReDocMiddleware(mockSpec, {
          title: 'Title',
          siteTitle: 'Site Title',
        }),
      );

      const response = await request(app).get('/redoc/').expect(200);

      expect(response.text).toContain('<title>Site Title</title>');
    });

    it('should use custom favicon when provided', async () => {
      app.use(
        '/redoc',
        ReDocMiddleware(mockSpec, {
          favicon: 'https://example.com/favicon.ico',
        }),
      );

      const response = await request(app).get('/redoc/').expect(200);

      expect(response.text).toContain('https://example.com/favicon.ico');
    });

    it('should inject custom CSS when provided', async () => {
      app.use(
        '/redoc',
        ReDocMiddleware(mockSpec, {
          customCss: '.custom-class { color: red; }',
        }),
      );

      const response = await request(app).get('/redoc/').expect(200);

      expect(response.text).toContain('.custom-class { color: red; }');
    });

    it('should include custom CSS URL when provided', async () => {
      app.use(
        '/redoc',
        ReDocMiddleware(mockSpec, {
          customCssUrl: 'https://example.com/custom.css',
        }),
      );

      const response = await request(app).get('/redoc/').expect(200);

      expect(response.text).toContain(
        '<link rel="stylesheet" href="https://example.com/custom.css">',
      );
    });
  });

  describe('redoc options', () => {
    it('should pass hideDownloadButton option', async () => {
      app.use(
        '/redoc',
        ReDocMiddleware(mockSpec, {
          redocOptions: { hideDownloadButton: true },
        }),
      );

      const response = await request(app).get('/redoc/').expect(200);

      expect(response.text).toContain('"hideDownloadButton":true');
    });

    it('should pass expandResponses option', async () => {
      app.use(
        '/redoc',
        ReDocMiddleware(mockSpec, {
          redocOptions: { expandResponses: '200,201' },
        }),
      );

      const response = await request(app).get('/redoc/').expect(200);

      expect(response.text).toContain('"expandResponses":"200,201"');
    });

    it('should pass disableSearch option', async () => {
      app.use(
        '/redoc',
        ReDocMiddleware(mockSpec, {
          redocOptions: { disableSearch: true },
        }),
      );

      const response = await request(app).get('/redoc/').expect(200);

      expect(response.text).toContain('"disableSearch":true');
    });

    it('should pass theme options', async () => {
      app.use(
        '/redoc',
        ReDocMiddleware(mockSpec, {
          redocOptions: {
            theme: {
              colors: {
                primary: { main: '#32329f' },
              },
            },
          },
        }),
      );

      const response = await request(app).get('/redoc/').expect(200);

      expect(response.text).toContain('"theme"');
      expect(response.text).toContain('#32329f');
    });

    it('should pass sortTagsAlphabetically option', async () => {
      app.use(
        '/redoc',
        ReDocMiddleware(mockSpec, {
          redocOptions: { sortTagsAlphabetically: true },
        }),
      );

      const response = await request(app).get('/redoc/').expect(200);

      expect(response.text).toContain('"sortTagsAlphabetically":true');
    });
  });
});

describe('createReDocHandler', () => {
  let app: Express;
  let mockSpec: OpenAPISpec;

  beforeEach(() => {
    app = express();
    mockSpec = createMockSpec();
  });

  it('should create a request handler that serves ReDoc', async () => {
    app.get('/redoc', createReDocHandler(mockSpec));

    const response = await request(app)
      .get('/redoc')
      .expect(200)
      .expect('Content-Type', /html/);

    expect(response.text).toContain('redoc-container');
  });

  it('should accept customization options', async () => {
    app.get('/redoc', createReDocHandler(mockSpec, { title: 'Handler Title' }));

    const response = await request(app).get('/redoc').expect(200);

    expect(response.text).toContain('<title>Handler Title</title>');
  });

  it('should accept a spec provider function', async () => {
    app.get(
      '/redoc',
      createReDocHandler(() => mockSpec),
    );

    const response = await request(app).get('/redoc').expect(200);

    expect(response.text).toContain('Test API');
  });

  it('should handle errors from spec provider', async () => {
    app.get(
      '/redoc',
      createReDocHandler(() => {
        throw new Error('Provider error');
      }),
    );

    const response = await request(app).get('/redoc').expect(500);

    expect(response.body.error.code).toBe('REDOC_ERROR');
    expect(response.body.error.message).toBe('Provider error');
  });
});

describe('generateReDocHtml', () => {
  let mockSpec: OpenAPISpec;

  beforeEach(() => {
    mockSpec = createMockSpec();
  });

  it('should generate valid HTML document', () => {
    const html = generateReDocHtml(mockSpec);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('</html>');
  });

  it('should include ReDoc CDN resources', () => {
    const html = generateReDocHtml(mockSpec);

    expect(html).toContain('cdn.redoc.ly');
    expect(html).toContain('redoc.standalone.js');
  });

  it('should include the spec in Redoc.init call', () => {
    const html = generateReDocHtml(mockSpec);

    expect(html).toContain('Redoc.init');
    expect(html).toContain('redoc-container');
  });

  it('should escape HTML special characters in title', () => {
    const specWithHtmlTitle = createMockSpec({
      info: {
        title: '<script>alert("xss")</script>',
        version: '1.0.0',
        description: 'Test',
      },
    });

    const html = generateReDocHtml(specWithHtmlTitle);

    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('should apply all customization options', () => {
    const options: ReDocOptions = {
      title: 'Custom Title',
      favicon: 'https://example.com/favicon.ico',
      customCss: '.test { color: blue; }',
      customCssUrl: 'https://example.com/style.css',
      redocOptions: {
        hideDownloadButton: true,
        expandResponses: '200',
        theme: {
          colors: {
            primary: { main: '#ff0000' },
          },
        },
      },
    };

    const html = generateReDocHtml(mockSpec, options);

    expect(html).toContain('<title>Custom Title</title>');
    expect(html).toContain('https://example.com/favicon.ico');
    expect(html).toContain('.test { color: blue; }');
    expect(html).toContain('https://example.com/style.css');
    expect(html).toContain('"hideDownloadButton":true');
    expect(html).toContain('"expandResponses":"200"');
    expect(html).toContain('#ff0000');
  });

  it('should include default body styles', () => {
    const html = generateReDocHtml(mockSpec);

    expect(html).toContain('body {');
    expect(html).toContain('margin: 0');
    expect(html).toContain('padding: 0');
  });
});
