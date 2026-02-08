/**
 * @fileoverview Unit tests for markdown documentation generator
 */

import {
  generateMarkdownDocs,
  MarkdownGeneratorOptions,
} from '../../src/openapi/markdown-generator';
import { OpenAPISpec } from '../../src/openapi/builder';

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

describe('generateMarkdownDocs', () => {
  describe('basic functionality', () => {
    it('should generate markdown with title from spec', () => {
      const spec = createMockSpec();
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('# Test API');
    });

    it('should use custom title when provided', () => {
      const spec = createMockSpec();
      const markdown = generateMarkdownDocs(spec, { title: 'Custom Title' });

      expect(markdown).toContain('# Custom Title');
      expect(markdown).not.toContain('# Test API\n');
    });

    it('should include API version', () => {
      const spec = createMockSpec();
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('**Version:** 1.0.0');
    });

    it('should include OpenAPI version', () => {
      const spec = createMockSpec();
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('**OpenAPI:** 3.0.3');
    });

    it('should include description', () => {
      const spec = createMockSpec();
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('Test API description');
    });
  });

  describe('info section', () => {
    it('should include contact information', () => {
      const spec = createMockSpec({
        info: {
          title: 'Test API',
          version: '1.0.0',
          description: 'Test',
          contact: {
            name: 'John Doe',
            email: 'john@example.com',
            url: 'https://example.com',
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('**Contact:**');
      expect(markdown).toContain('John Doe');
      expect(markdown).toContain('<john@example.com>');
      expect(markdown).toContain('[Website](https://example.com)');
    });

    it('should include license information', () => {
      const spec = createMockSpec({
        info: {
          title: 'Test API',
          version: '1.0.0',
          description: 'Test',
          license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT',
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain(
        '**License:** [MIT](https://opensource.org/licenses/MIT)',
      );
    });

    it('should include license without URL', () => {
      const spec = createMockSpec({
        info: {
          title: 'Test API',
          version: '1.0.0',
          description: 'Test',
          license: {
            name: 'Proprietary',
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('**License:** Proprietary');
    });

    it('should include terms of service', () => {
      const spec = createMockSpec({
        info: {
          title: 'Test API',
          version: '1.0.0',
          description: 'Test',
          termsOfService: 'https://example.com/tos',
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain(
        '**Terms of Service:** [Link](https://example.com/tos)',
      );
    });

    it('should include external docs', () => {
      const spec = createMockSpec({
        externalDocs: {
          description: 'Full Documentation',
          url: 'https://docs.example.com',
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain(
        '**Documentation:** [Full Documentation](https://docs.example.com)',
      );
    });

    it('should skip info section when disabled', () => {
      const spec = createMockSpec();
      const markdown = generateMarkdownDocs(spec, { includeInfo: false });

      expect(markdown).not.toContain('**Version:**');
      expect(markdown).not.toContain('**OpenAPI:**');
    });
  });

  describe('table of contents', () => {
    it('should include table of contents by default', () => {
      const spec = createMockSpec();
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('## Table of Contents');
    });

    it('should skip table of contents when disabled', () => {
      const spec = createMockSpec();
      const markdown = generateMarkdownDocs(spec, { includeToc: false });

      expect(markdown).not.toContain('## Table of Contents');
    });

    it('should include servers link in TOC when servers exist', () => {
      const spec = createMockSpec();
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('- [Servers](#servers)');
    });

    it('should include authentication link in TOC when security schemes exist', () => {
      const spec = createMockSpec({
        components: {
          schemas: {},
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('- [Authentication](#authentication)');
    });

    it('should include endpoints link in TOC', () => {
      const spec = createMockSpec();
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('- [Endpoints](#endpoints)');
    });

    it('should include tag links in TOC', () => {
      const spec = createMockSpec({
        paths: {
          '/users': {
            get: {
              tags: ['Users'],
              summary: 'Get users',
              responses: { '200': { description: 'Success' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('- [Users](#users)');
    });

    it('should include schemas link in TOC when schemas exist', () => {
      const spec = createMockSpec({
        components: {
          schemas: {
            User: { type: 'object', properties: {} },
          },
          securitySchemes: {},
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('- [Schemas](#schemas)');
    });
  });

  describe('servers section', () => {
    it('should include servers section', () => {
      const spec = createMockSpec({
        servers: [
          { url: 'https://api.example.com', description: 'Production' },
          { url: 'https://staging.example.com', description: 'Staging' },
        ],
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('## Servers');
      expect(markdown).toContain('**https://api.example.com**');
      expect(markdown).toContain('Production');
      expect(markdown).toContain('**https://staging.example.com**');
      expect(markdown).toContain('Staging');
    });

    it('should skip servers section when disabled', () => {
      const spec = createMockSpec();
      const markdown = generateMarkdownDocs(spec, { includeServers: false });

      expect(markdown).not.toContain('## Servers');
    });
  });

  describe('authentication section', () => {
    it('should include HTTP bearer auth', () => {
      const spec = createMockSpec({
        components: {
          schemas: {},
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
              description: 'JWT authentication',
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('## Authentication');
      expect(markdown).toContain('### bearerAuth');
      expect(markdown).toContain('**Type:** HTTP bearer');
      expect(markdown).toContain('**Bearer Format:** JWT');
      expect(markdown).toContain('**Description:** JWT authentication');
    });

    it('should include API key auth', () => {
      const spec = createMockSpec({
        components: {
          schemas: {},
          securitySchemes: {
            apiKey: {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key',
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('**Type:** API Key');
      expect(markdown).toContain('**In:** header');
      expect(markdown).toContain('**Name:** X-API-Key');
    });

    it('should include OAuth2 auth', () => {
      const spec = createMockSpec({
        components: {
          schemas: {},
          securitySchemes: {
            oauth2: {
              type: 'oauth2',
              flows: {
                authorizationCode: {},
                clientCredentials: {},
              },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('**Type:** OAuth 2.0');
      expect(markdown).toContain(
        '**Flows:** authorizationCode, clientCredentials',
      );
    });

    it('should include OpenID Connect auth', () => {
      const spec = createMockSpec({
        components: {
          schemas: {},
          securitySchemes: {
            openId: {
              type: 'openIdConnect',
              openIdConnectUrl:
                'https://example.com/.well-known/openid-configuration',
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('**Type:** OpenID Connect');
      expect(markdown).toContain(
        '**URL:** https://example.com/.well-known/openid-configuration',
      );
    });

    it('should skip authentication section when disabled', () => {
      const spec = createMockSpec({
        components: {
          schemas: {},
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer' },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec, {
        includeAuthentication: false,
      });

      expect(markdown).not.toContain('## Authentication');
    });

    it('should skip authentication section when no security schemes', () => {
      const spec = createMockSpec();
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).not.toContain('## Authentication');
    });
  });

  describe('endpoints section', () => {
    it('should include endpoints section', () => {
      const spec = createMockSpec({
        paths: {
          '/users': {
            get: {
              tags: ['Users'],
              summary: 'Get all users',
              responses: { '200': { description: 'Success' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('## Endpoints');
    });

    it('should group endpoints by tag', () => {
      const spec = createMockSpec({
        paths: {
          '/users': {
            get: {
              tags: ['Users'],
              summary: 'Get users',
              responses: { '200': { description: 'Success' } },
            },
          },
          '/posts': {
            get: {
              tags: ['Posts'],
              summary: 'Get posts',
              responses: { '200': { description: 'Success' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('### Users');
      expect(markdown).toContain('### Posts');
    });

    it('should include tag descriptions', () => {
      const spec = createMockSpec({
        tags: [{ name: 'Users', description: 'User management endpoints' }],
        paths: {
          '/users': {
            get: {
              tags: ['Users'],
              summary: 'Get users',
              responses: { '200': { description: 'Success' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('User management endpoints');
    });

    it('should include tag external docs', () => {
      const spec = createMockSpec({
        tags: [
          {
            name: 'Users',
            externalDocs: {
              description: 'Learn more',
              url: 'https://docs.example.com/users',
            },
          },
        ],
        paths: {
          '/users': {
            get: {
              tags: ['Users'],
              summary: 'Get users',
              responses: { '200': { description: 'Success' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain(
        '[Learn more](https://docs.example.com/users)',
      );
    });

    it('should include HTTP method and path', () => {
      const spec = createMockSpec({
        paths: {
          '/users/{id}': {
            get: {
              tags: ['Users'],
              summary: 'Get user by ID',
              responses: { '200': { description: 'Success' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('`GET`');
      expect(markdown).toContain('/users/{id}');
    });

    it('should include endpoint summary', () => {
      const spec = createMockSpec({
        paths: {
          '/users': {
            get: {
              tags: ['Users'],
              summary: 'Get all users',
              responses: { '200': { description: 'Success' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('**Get all users**');
    });

    it('should include endpoint description', () => {
      const spec = createMockSpec({
        paths: {
          '/users': {
            get: {
              tags: ['Users'],
              summary: 'Get users',
              description: 'Returns a list of all users in the system',
              responses: { '200': { description: 'Success' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('Returns a list of all users in the system');
    });

    it('should include operation ID', () => {
      const spec = createMockSpec({
        paths: {
          '/users': {
            get: {
              tags: ['Users'],
              operationId: 'getUsers',
              responses: { '200': { description: 'Success' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('**Operation ID:** `getUsers`');
    });

    it('should mark deprecated endpoints', () => {
      const spec = createMockSpec({
        paths: {
          '/users': {
            get: {
              tags: ['Users'],
              deprecated: true,
              responses: { '200': { description: 'Success' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('DEPRECATED');
    });

    it('should include security requirements', () => {
      const spec = createMockSpec({
        paths: {
          '/users': {
            get: {
              tags: ['Users'],
              security: [{ bearerAuth: [] }],
              responses: { '200': { description: 'Success' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('**Authentication:** bearerAuth');
    });

    it('should use Untagged for endpoints without tags', () => {
      const spec = createMockSpec({
        paths: {
          '/health': {
            get: {
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('### Untagged');
    });
  });

  describe('parameters', () => {
    it('should generate parameters table', () => {
      const spec = createMockSpec({
        paths: {
          '/users/{id}': {
            get: {
              tags: ['Users'],
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  description: 'User ID',
                  schema: { type: 'string' },
                },
              ],
              responses: { '200': { description: 'Success' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('**Parameters:**');
      expect(markdown).toContain(
        '| Name | In | Type | Required | Description |',
      );
      expect(markdown).toContain('`id`');
      expect(markdown).toContain('path');
      expect(markdown).toContain('string');
      expect(markdown).toContain('Yes');
      expect(markdown).toContain('User ID');
    });

    it('should handle query parameters', () => {
      const spec = createMockSpec({
        paths: {
          '/users': {
            get: {
              tags: ['Users'],
              parameters: [
                {
                  name: 'page',
                  in: 'query',
                  required: false,
                  schema: { type: 'integer' },
                },
              ],
              responses: { '200': { description: 'Success' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('`page`');
      expect(markdown).toContain('query');
      expect(markdown).toContain('integer');
      expect(markdown).toContain('No');
    });

    it('should handle header parameters', () => {
      const spec = createMockSpec({
        paths: {
          '/users': {
            get: {
              tags: ['Users'],
              parameters: [
                {
                  name: 'X-Request-ID',
                  in: 'header',
                  schema: { type: 'string', format: 'uuid' },
                },
              ],
              responses: { '200': { description: 'Success' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('`X-Request-ID`');
      expect(markdown).toContain('header');
      expect(markdown).toContain('string (uuid)');
    });

    it('should handle schema references', () => {
      const spec = createMockSpec({
        paths: {
          '/users': {
            get: {
              tags: ['Users'],
              parameters: [
                {
                  name: 'filter',
                  in: 'query',
                  schema: { $ref: '#/components/schemas/UserFilter' },
                },
              ],
              responses: { '200': { description: 'Success' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('`UserFilter`');
    });

    it('should handle array types', () => {
      const spec = createMockSpec({
        paths: {
          '/users': {
            get: {
              tags: ['Users'],
              parameters: [
                {
                  name: 'ids',
                  in: 'query',
                  schema: { type: 'array', items: { type: 'string' } },
                },
              ],
              responses: { '200': { description: 'Success' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('string[]');
    });
  });

  describe('request body', () => {
    it('should include request body section', () => {
      const spec = createMockSpec({
        paths: {
          '/users': {
            post: {
              tags: ['Users'],
              requestBody: {
                required: true,
                description: 'User data',
                content: {
                  'application/json': {
                    schema: { type: 'object' },
                  },
                },
              },
              responses: { '201': { description: 'Created' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('**Request Body:**');
      expect(markdown).toContain('**Content-Type:** `application/json`');
      expect(markdown).toContain('**Required:** Yes');
      expect(markdown).toContain('**Description:** User data');
    });

    it('should include request body schema', () => {
      const spec = createMockSpec({
        paths: {
          '/users': {
            post: {
              tags: ['Users'],
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                      },
                    },
                  },
                },
              },
              responses: { '201': { description: 'Created' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('**Schema:**');
      expect(markdown).toContain('"type": "object"');
    });

    it('should include request body example', () => {
      const spec = createMockSpec({
        paths: {
          '/users': {
            post: {
              tags: ['Users'],
              requestBody: {
                content: {
                  'application/json': {
                    schema: { type: 'object' },
                    example: { name: 'John Doe' },
                  },
                },
              },
              responses: { '201': { description: 'Created' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('**Example:**');
      expect(markdown).toContain('"name": "John Doe"');
    });
  });

  describe('responses', () => {
    it('should include responses section', () => {
      const spec = createMockSpec({
        paths: {
          '/users': {
            get: {
              tags: ['Users'],
              responses: {
                '200': { description: 'Success' },
                '404': { description: 'Not found' },
              },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('**Responses:**');
      expect(markdown).toContain('200 - Success');
      expect(markdown).toContain('404 - Not found');
    });

    it('should include success emoji for 2xx responses', () => {
      const spec = createMockSpec({
        paths: {
          '/users': {
            get: {
              tags: ['Users'],
              responses: { '200': { description: 'Success' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('✅ 200');
    });

    it('should include warning emoji for 4xx responses', () => {
      const spec = createMockSpec({
        paths: {
          '/users': {
            get: {
              tags: ['Users'],
              responses: { '400': { description: 'Bad request' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('⚠️ 400');
    });

    it('should include error emoji for 5xx responses', () => {
      const spec = createMockSpec({
        paths: {
          '/users': {
            get: {
              tags: ['Users'],
              responses: { '500': { description: 'Server error' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('❌ 500');
    });

    it('should include response schema', () => {
      const spec = createMockSpec({
        paths: {
          '/users': {
            get: {
              tags: ['Users'],
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('**Schema:**');
      expect(markdown).toContain('#/components/schemas/User');
    });

    it('should include response example', () => {
      const spec = createMockSpec({
        paths: {
          '/users': {
            get: {
              tags: ['Users'],
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: { type: 'object' },
                      example: { id: '123', name: 'John' },
                    },
                  },
                },
              },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('**Example:**');
      expect(markdown).toContain('"id": "123"');
    });

    it('should sort responses by status code', () => {
      const spec = createMockSpec({
        paths: {
          '/users': {
            get: {
              tags: ['Users'],
              responses: {
                '500': { description: 'Error' },
                '200': { description: 'Success' },
                '404': { description: 'Not found' },
              },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      const idx200 = markdown.indexOf('200 - Success');
      const idx404 = markdown.indexOf('404 - Not found');
      const idx500 = markdown.indexOf('500 - Error');

      expect(idx200).toBeLessThan(idx404);
      expect(idx404).toBeLessThan(idx500);
    });
  });

  describe('schemas section', () => {
    it('should include schemas section', () => {
      const spec = createMockSpec({
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
          },
          securitySchemes: {},
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('## Schemas');
      expect(markdown).toContain('### User');
    });

    it('should include schema description', () => {
      const spec = createMockSpec({
        components: {
          schemas: {
            User: {
              type: 'object',
              description: 'A user in the system',
              properties: {},
            },
          },
          securitySchemes: {},
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('A user in the system');
    });

    it('should generate properties table for object schemas', () => {
      const spec = createMockSpec({
        components: {
          schemas: {
            User: {
              type: 'object',
              required: ['id', 'name'],
              properties: {
                id: { type: 'string', description: 'Unique identifier' },
                name: { type: 'string', description: 'User name' },
                email: { type: 'string', description: 'Email address' },
              },
            },
          },
          securitySchemes: {},
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('**Properties:**');
      expect(markdown).toContain(
        '| Property | Type | Required | Description |',
      );
      expect(markdown).toContain('`id`');
      expect(markdown).toContain('Unique identifier');
      expect(markdown).toContain('`name`');
    });

    it('should include full schema definition', () => {
      const spec = createMockSpec({
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {
                id: { type: 'string' },
              },
            },
          },
          securitySchemes: {},
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('**Schema Definition:**');
      expect(markdown).toContain('```json');
    });

    it('should skip schemas section when disabled', () => {
      const spec = createMockSpec({
        components: {
          schemas: {
            User: { type: 'object' },
          },
          securitySchemes: {},
        },
      });
      const markdown = generateMarkdownDocs(spec, { includeSchemas: false });

      expect(markdown).not.toContain('## Schemas');
    });

    it('should skip schemas section when no schemas', () => {
      const spec = createMockSpec();
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).not.toContain('## Schemas');
    });

    it('should sort schemas alphabetically', () => {
      const spec = createMockSpec({
        components: {
          schemas: {
            Zebra: { type: 'object' },
            Apple: { type: 'object' },
            Mango: { type: 'object' },
          },
          securitySchemes: {},
        },
      });
      const markdown = generateMarkdownDocs(spec);

      const idxApple = markdown.indexOf('### Apple');
      const idxMango = markdown.indexOf('### Mango');
      const idxZebra = markdown.indexOf('### Zebra');

      expect(idxApple).toBeLessThan(idxMango);
      expect(idxMango).toBeLessThan(idxZebra);
    });
  });

  describe('markdown escaping', () => {
    it('should escape pipe characters in text', () => {
      const spec = createMockSpec({
        info: {
          title: 'Test | API',
          version: '1.0.0',
          description: 'Test',
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('Test \\| API');
    });

    it('should escape HTML tags', () => {
      const spec = createMockSpec({
        info: {
          title: '<script>alert("xss")</script>',
          version: '1.0.0',
          description: 'Test',
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).not.toContain('<script>');
      expect(markdown).toContain('&lt;script&gt;');
    });
  });

  describe('anchor links', () => {
    it('should generate anchor links by default', () => {
      const spec = createMockSpec({
        paths: {
          '/users': {
            get: {
              tags: ['User Management'],
              responses: { '200': { description: 'Success' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      expect(markdown).toContain('{#user-management}');
    });

    it('should skip anchor links when disabled', () => {
      const spec = createMockSpec({
        paths: {
          '/users': {
            get: {
              tags: ['User Management'],
              responses: { '200': { description: 'Success' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec, { anchorLinks: false });

      expect(markdown).not.toContain('{#user-management}');
    });

    it('should generate valid anchors from special characters', () => {
      const spec = createMockSpec({
        paths: {
          '/users': {
            get: {
              tags: ['User & Account Management!'],
              responses: { '200': { description: 'Success' } },
            },
          },
        },
      });
      const markdown = generateMarkdownDocs(spec);

      // Should remove special chars and convert spaces to dashes
      expect(markdown).toContain('#user-account-management');
    });
  });
});
