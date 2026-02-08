/**
 * @fileoverview Markdown documentation generator from OpenAPI specification.
 * Generates comprehensive markdown documentation including table of contents,
 * endpoints grouped by tag, parameters, and responses.
 * @module openapi/markdown-generator
 */

import { OpenAPISpec, OpenAPITagDefinition, OpenAPIParameter } from './builder';

/**
 * Options for markdown documentation generation.
 */
export interface MarkdownGeneratorOptions {
  /** Include table of contents (default: true) */
  includeToc?: boolean;
  /** Include API info section (default: true) */
  includeInfo?: boolean;
  /** Include server information (default: true) */
  includeServers?: boolean;
  /** Include authentication section (default: true) */
  includeAuthentication?: boolean;
  /** Include schema definitions (default: true) */
  includeSchemas?: boolean;
  /** Custom title override (uses spec title if not provided) */
  title?: string;
  /** Add anchor links to headings (default: true) */
  anchorLinks?: boolean;
}

/**
 * Internal representation of an endpoint for documentation.
 */
interface EndpointInfo {
  method: string;
  path: string;
  summary?: string;
  description?: string;
  operationId?: string;
  deprecated?: boolean;
  tags: string[];
  parameters: OpenAPIParameter[];
  requestBody?: RequestBodyInfo;
  responses: ResponseInfo[];
  security: SecurityRequirement[];
}

/**
 * Request body information.
 */
interface RequestBodyInfo {
  required: boolean;
  description?: string;
  contentType: string;
  schema?: Record<string, unknown>;
  example?: unknown;
}

/**
 * Response information.
 */
interface ResponseInfo {
  statusCode: string;
  description: string;
  schema?: Record<string, unknown>;
  example?: unknown;
}

/**
 * Security requirement.
 */
interface SecurityRequirement {
  name: string;
  scopes: string[];
}

const DEFAULT_OPTIONS: Required<MarkdownGeneratorOptions> = {
  includeToc: true,
  includeInfo: true,
  includeServers: true,
  includeAuthentication: true,
  includeSchemas: true,
  title: '',
  anchorLinks: true,
};

/**
 * Generate markdown documentation from an OpenAPI specification.
 *
 * @param spec - The OpenAPI specification object
 * @param options - Generation options
 * @returns Generated markdown string
 *
 * @example
 * ```typescript
 * const spec = builder.build();
 * const markdown = generateMarkdownDocs(spec);
 * fs.writeFileSync('API.md', markdown);
 * ```
 *
 * @example
 * ```typescript
 * // With custom options
 * const markdown = generateMarkdownDocs(spec, {
 *   title: 'My Custom API Documentation',
 *   includeToc: true,
 *   includeSchemas: false,
 * });
 * ```
 */
export function generateMarkdownDocs(
  spec: OpenAPISpec,
  options: MarkdownGeneratorOptions = {},
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const sections: string[] = [];

  // Title
  const title = opts.title || spec.info.title;
  sections.push(`# ${escapeMarkdown(title)}\n`);

  // API Info
  if (opts.includeInfo) {
    sections.push(generateInfoSection(spec));
  }

  // Table of Contents
  if (opts.includeToc) {
    sections.push(generateTableOfContents(spec, opts));
  }

  // Servers
  if (opts.includeServers && spec.servers.length > 0) {
    sections.push(generateServersSection(spec));
  }

  // Authentication
  if (opts.includeAuthentication && hasSecuritySchemes(spec)) {
    sections.push(generateAuthenticationSection(spec));
  }

  // Endpoints by Tag
  sections.push(generateEndpointsSection(spec, opts));

  // Schemas
  if (opts.includeSchemas && hasSchemas(spec)) {
    sections.push(generateSchemasSection(spec));
  }

  return sections.filter(Boolean).join('\n');
}

/**
 * Generate the API info section.
 */
function generateInfoSection(spec: OpenAPISpec): string {
  const lines: string[] = [];

  if (spec.info.description) {
    lines.push(escapeMarkdown(spec.info.description));
    lines.push('');
  }

  lines.push(`**Version:** ${escapeMarkdown(spec.info.version)}`);
  lines.push(`**OpenAPI:** ${escapeMarkdown(spec.openapi)}`);

  if (spec.info.contact) {
    const contact = spec.info.contact;
    const contactParts: string[] = [];
    if (contact.name) contactParts.push(contact.name);
    if (contact.email) contactParts.push(`<${contact.email}>`);
    if (contact.url) contactParts.push(`[Website](${contact.url})`);
    if (contactParts.length > 0) {
      lines.push(`**Contact:** ${contactParts.join(' - ')}`);
    }
  }

  if (spec.info.license) {
    const license = spec.info.license;
    if (license.url) {
      lines.push(
        `**License:** [${escapeMarkdown(license.name)}](${license.url})`,
      );
    } else {
      lines.push(`**License:** ${escapeMarkdown(license.name)}`);
    }
  }

  if (spec.info.termsOfService) {
    lines.push(`**Terms of Service:** [Link](${spec.info.termsOfService})`);
  }

  if (spec.externalDocs) {
    const desc = spec.externalDocs.description || 'External Documentation';
    lines.push(
      `**Documentation:** [${escapeMarkdown(desc)}](${spec.externalDocs.url})`,
    );
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Generate the table of contents.
 */
function generateTableOfContents(
  spec: OpenAPISpec,
  opts: Required<MarkdownGeneratorOptions>,
): string {
  const lines: string[] = ['## Table of Contents\n'];

  if (opts.includeServers && spec.servers.length > 0) {
    lines.push('- [Servers](#servers)');
  }

  if (opts.includeAuthentication && hasSecuritySchemes(spec)) {
    lines.push('- [Authentication](#authentication)');
  }

  // Group endpoints by tag
  const taggedEndpoints = groupEndpointsByTag(spec);
  const tagNames = Array.from(taggedEndpoints.keys()).sort();

  lines.push('- [Endpoints](#endpoints)');
  for (const tagName of tagNames) {
    const anchor = generateAnchor(tagName);
    lines.push(`  - [${escapeMarkdown(tagName)}](#${anchor})`);
  }

  if (opts.includeSchemas && hasSchemas(spec)) {
    lines.push('- [Schemas](#schemas)');
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Generate the servers section.
 */
function generateServersSection(spec: OpenAPISpec): string {
  const lines: string[] = ['## Servers\n'];

  for (const server of spec.servers) {
    lines.push(`- **${escapeMarkdown(server.url)}**`);
    if (server.description) {
      lines.push(`  - ${escapeMarkdown(server.description)}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Generate the authentication section.
 */
function generateAuthenticationSection(spec: OpenAPISpec): string {
  const lines: string[] = ['## Authentication\n'];

  const securitySchemes = spec.components.securitySchemes as Record<
    string,
    SecurityScheme
  >;

  for (const [name, scheme] of Object.entries(securitySchemes)) {
    lines.push(`### ${escapeMarkdown(name)}\n`);

    if (scheme.type === 'http') {
      lines.push(`- **Type:** HTTP ${scheme.scheme || ''}`);
      if (scheme.bearerFormat) {
        lines.push(
          `- **Bearer Format:** ${escapeMarkdown(scheme.bearerFormat)}`,
        );
      }
    } else if (scheme.type === 'apiKey') {
      lines.push(`- **Type:** API Key`);
      lines.push(`- **In:** ${scheme.in || 'header'}`);
      lines.push(`- **Name:** ${escapeMarkdown(scheme.name || '')}`);
    } else if (scheme.type === 'oauth2') {
      lines.push(`- **Type:** OAuth 2.0`);
      if (scheme.flows) {
        lines.push(`- **Flows:** ${Object.keys(scheme.flows).join(', ')}`);
      }
    } else if (scheme.type === 'openIdConnect') {
      lines.push(`- **Type:** OpenID Connect`);
      if (scheme.openIdConnectUrl) {
        lines.push(`- **URL:** ${scheme.openIdConnectUrl}`);
      }
    }

    if (scheme.description) {
      lines.push(`- **Description:** ${escapeMarkdown(scheme.description)}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Security scheme type for internal use.
 */
interface SecurityScheme {
  type: string;
  description?: string;
  name?: string;
  in?: string;
  scheme?: string;
  bearerFormat?: string;
  flows?: Record<string, unknown>;
  openIdConnectUrl?: string;
}

/**
 * Generate the endpoints section grouped by tag.
 */
function generateEndpointsSection(
  spec: OpenAPISpec,
  opts: Required<MarkdownGeneratorOptions>,
): string {
  const lines: string[] = ['## Endpoints\n'];

  const taggedEndpoints = groupEndpointsByTag(spec);
  const tagNames = Array.from(taggedEndpoints.keys()).sort();

  // Get tag descriptions from spec
  const tagDescriptions = new Map<string, OpenAPITagDefinition>();
  if (spec.tags) {
    for (const tag of spec.tags) {
      tagDescriptions.set(tag.name, tag);
    }
  }

  for (const tagName of tagNames) {
    const endpoints = taggedEndpoints.get(tagName) || [];
    const tagDef = tagDescriptions.get(tagName);

    // Tag heading
    if (opts.anchorLinks) {
      const anchor = generateAnchor(tagName);
      lines.push(`### ${escapeMarkdown(tagName)} {#${anchor}}\n`);
    } else {
      lines.push(`### ${escapeMarkdown(tagName)}\n`);
    }

    // Tag description
    if (tagDef?.description) {
      lines.push(escapeMarkdown(tagDef.description));
      lines.push('');
    }

    // External docs for tag
    if (tagDef?.externalDocs) {
      const desc = tagDef.externalDocs.description || 'More information';
      lines.push(`[${escapeMarkdown(desc)}](${tagDef.externalDocs.url})\n`);
    }

    // Endpoints
    for (const endpoint of endpoints) {
      lines.push(generateEndpointDocumentation(endpoint));
    }
  }

  return lines.join('\n');
}

/**
 * Generate documentation for a single endpoint.
 */
function generateEndpointDocumentation(endpoint: EndpointInfo): string {
  const lines: string[] = [];

  // Method and path heading
  const methodBadge = endpoint.method.toUpperCase();
  const deprecatedBadge = endpoint.deprecated ? ' ⚠️ DEPRECATED' : '';
  lines.push(
    `#### \`${methodBadge}\` ${escapeMarkdown(endpoint.path)}${deprecatedBadge}\n`,
  );

  // Summary
  if (endpoint.summary) {
    lines.push(`**${escapeMarkdown(endpoint.summary)}**\n`);
  }

  // Description
  if (endpoint.description) {
    lines.push(escapeMarkdown(endpoint.description));
    lines.push('');
  }

  // Operation ID
  if (endpoint.operationId) {
    lines.push(
      `**Operation ID:** \`${escapeMarkdown(endpoint.operationId)}\`\n`,
    );
  }

  // Security
  if (endpoint.security.length > 0) {
    const securityNames = endpoint.security.map((s) => s.name).join(', ');
    lines.push(`**Authentication:** ${escapeMarkdown(securityNames)}\n`);
  }

  // Parameters
  if (endpoint.parameters.length > 0) {
    lines.push(generateParametersTable(endpoint.parameters));
  }

  // Request Body
  if (endpoint.requestBody) {
    lines.push(generateRequestBodySection(endpoint.requestBody));
  }

  // Responses
  if (endpoint.responses.length > 0) {
    lines.push(generateResponsesSection(endpoint.responses));
  }

  lines.push('---\n');
  return lines.join('\n');
}

/**
 * Generate a markdown table for parameters.
 */
function generateParametersTable(parameters: OpenAPIParameter[]): string {
  const lines: string[] = ['**Parameters:**\n'];
  lines.push('| Name | In | Type | Required | Description |');
  lines.push('|------|-----|------|----------|-------------|');

  for (const param of parameters) {
    const name = escapeMarkdown(param.name);
    const location = param.in;
    const type = getSchemaType(param.schema);
    const required = param.required ? 'Yes' : 'No';
    const description = param.description
      ? escapeMarkdown(param.description)
      : '-';

    lines.push(
      `| \`${name}\` | ${location} | ${type} | ${required} | ${description} |`,
    );
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Generate the request body section.
 */
function generateRequestBodySection(requestBody: RequestBodyInfo): string {
  const lines: string[] = ['**Request Body:**\n'];

  lines.push(`- **Content-Type:** \`${requestBody.contentType}\``);
  lines.push(`- **Required:** ${requestBody.required ? 'Yes' : 'No'}`);

  if (requestBody.description) {
    lines.push(`- **Description:** ${escapeMarkdown(requestBody.description)}`);
  }

  if (requestBody.schema) {
    lines.push('\n**Schema:**\n');
    lines.push('```json');
    lines.push(JSON.stringify(requestBody.schema, null, 2));
    lines.push('```');
  }

  if (requestBody.example !== undefined) {
    lines.push('\n**Example:**\n');
    lines.push('```json');
    lines.push(JSON.stringify(requestBody.example, null, 2));
    lines.push('```');
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Generate the responses section.
 */
function generateResponsesSection(responses: ResponseInfo[]): string {
  const lines: string[] = ['**Responses:**\n'];

  for (const response of responses) {
    const statusEmoji = getStatusEmoji(response.statusCode);
    lines.push(
      `##### ${statusEmoji} ${response.statusCode} - ${escapeMarkdown(response.description)}\n`,
    );

    if (response.schema) {
      lines.push('**Schema:**\n');
      lines.push('```json');
      lines.push(JSON.stringify(response.schema, null, 2));
      lines.push('```');
    }

    if (response.example !== undefined) {
      lines.push('\n**Example:**\n');
      lines.push('```json');
      lines.push(JSON.stringify(response.example, null, 2));
      lines.push('```');
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate the schemas section.
 */
function generateSchemasSection(spec: OpenAPISpec): string {
  const lines: string[] = ['## Schemas\n'];

  const schemas = spec.components.schemas as Record<
    string,
    Record<string, unknown>
  >;
  const schemaNames = Object.keys(schemas).sort();

  for (const name of schemaNames) {
    const schema = schemas[name];
    lines.push(`### ${escapeMarkdown(name)}\n`);

    if (schema.description) {
      lines.push(escapeMarkdown(schema.description as string));
      lines.push('');
    }

    // Generate properties table if it's an object schema
    if (schema.type === 'object' && schema.properties) {
      lines.push(generateSchemaPropertiesTable(schema));
    }

    // Show full schema
    lines.push('**Schema Definition:**\n');
    lines.push('```json');
    lines.push(JSON.stringify(schema, null, 2));
    lines.push('```\n');
  }

  return lines.join('\n');
}

/**
 * Generate a properties table for an object schema.
 */
function generateSchemaPropertiesTable(
  schema: Record<string, unknown>,
): string {
  const lines: string[] = ['**Properties:**\n'];
  lines.push('| Property | Type | Required | Description |');
  lines.push('|----------|------|----------|-------------|');

  const properties = schema.properties as Record<
    string,
    Record<string, unknown>
  >;
  const required = (schema.required as string[]) || [];

  for (const [propName, propSchema] of Object.entries(properties)) {
    const name = escapeMarkdown(propName);
    const type = getSchemaType(propSchema);
    const isRequired = required.includes(propName) ? 'Yes' : 'No';
    const description = propSchema.description
      ? escapeMarkdown(propSchema.description as string)
      : '-';

    lines.push(`| \`${name}\` | ${type} | ${isRequired} | ${description} |`);
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Group endpoints by their tags.
 */
function groupEndpointsByTag(spec: OpenAPISpec): Map<string, EndpointInfo[]> {
  const taggedEndpoints = new Map<string, EndpointInfo[]>();

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      const op = operation as Record<string, unknown>;
      const endpoint = parseEndpoint(path, method, op);

      for (const tag of endpoint.tags) {
        if (!taggedEndpoints.has(tag)) {
          taggedEndpoints.set(tag, []);
        }
        taggedEndpoints.get(tag)!.push(endpoint);
      }
    }
  }

  return taggedEndpoints;
}

/**
 * Parse an operation into an EndpointInfo object.
 */
function parseEndpoint(
  path: string,
  method: string,
  operation: Record<string, unknown>,
): EndpointInfo {
  const tags = (operation.tags as string[]) || ['Untagged'];
  const parameters = (operation.parameters as OpenAPIParameter[]) || [];
  const security = parseSecurityRequirements(
    operation.security as Array<Record<string, string[]>> | undefined,
  );
  const responses = parseResponses(
    operation.responses as Record<string, Record<string, unknown>> | undefined,
  );
  const requestBody = parseRequestBody(
    operation.requestBody as Record<string, unknown> | undefined,
  );

  return {
    method,
    path,
    summary: operation.summary as string | undefined,
    description: operation.description as string | undefined,
    operationId: operation.operationId as string | undefined,
    deprecated: operation.deprecated as boolean | undefined,
    tags,
    parameters,
    requestBody,
    responses,
    security,
  };
}

/**
 * Parse security requirements.
 */
function parseSecurityRequirements(
  security: Array<Record<string, string[]>> | undefined,
): SecurityRequirement[] {
  if (!security) return [];

  const requirements: SecurityRequirement[] = [];
  for (const req of security) {
    for (const [name, scopes] of Object.entries(req)) {
      requirements.push({ name, scopes });
    }
  }
  return requirements;
}

/**
 * Parse responses into ResponseInfo array.
 */
function parseResponses(
  responses: Record<string, Record<string, unknown>> | undefined,
): ResponseInfo[] {
  if (!responses) return [];

  const result: ResponseInfo[] = [];
  for (const [statusCode, response] of Object.entries(responses)) {
    const description = (response.description as string) || 'Response';
    let schema: Record<string, unknown> | undefined;
    let example: unknown;

    const content = response.content as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (content) {
      const jsonContent = content['application/json'];
      if (jsonContent) {
        schema = jsonContent.schema as Record<string, unknown> | undefined;
        example = jsonContent.example;
      }
    }

    result.push({ statusCode, description, schema, example });
  }

  // Sort by status code
  result.sort((a, b) => a.statusCode.localeCompare(b.statusCode));
  return result;
}

/**
 * Parse request body into RequestBodyInfo.
 */
function parseRequestBody(
  requestBody: Record<string, unknown> | undefined,
): RequestBodyInfo | undefined {
  if (!requestBody) return undefined;

  const content = requestBody.content as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (!content) return undefined;

  // Prefer application/json
  const contentType =
    Object.keys(content).find((ct) => ct.includes('application/json')) ||
    Object.keys(content)[0];

  if (!contentType) return undefined;

  const mediaType = content[contentType];
  return {
    required: (requestBody.required as boolean) ?? true,
    description: requestBody.description as string | undefined,
    contentType,
    schema: mediaType.schema as Record<string, unknown> | undefined,
    example: mediaType.example,
  };
}

/**
 * Schema-like object for type extraction.
 */
interface SchemaLike {
  $ref?: string;
  type?: string;
  format?: string;
  items?: SchemaLike;
}

/**
 * Get the type string from a schema.
 */
function getSchemaType(
  schema: SchemaLike | Record<string, unknown> | undefined,
): string {
  if (!schema) return 'any';

  const s = schema as SchemaLike;

  if (s.$ref) {
    const parts = s.$ref.split('/');
    return `\`${parts[parts.length - 1]}\``;
  }

  const type = s.type;
  const format = s.format;

  if (type === 'array') {
    const itemType = getSchemaType(s.items);
    return `${itemType}[]`;
  }

  if (format) {
    return `${type} (${format})`;
  }

  return type || 'any';
}

/**
 * Get an emoji for a status code.
 */
function getStatusEmoji(statusCode: string): string {
  const code = parseInt(statusCode, 10);
  if (isNaN(code)) return '📋';
  if (code >= 200 && code < 300) return '✅';
  if (code >= 300 && code < 400) return '↪️';
  if (code >= 400 && code < 500) return '⚠️';
  if (code >= 500) return '❌';
  return '📋';
}

/**
 * Generate a URL-safe anchor from a string.
 */
function generateAnchor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Escape special markdown characters.
 */
function escapeMarkdown(text: string): string {
  // Only escape characters that would break markdown structure
  // Don't escape backticks as they're used for code
  return text.replace(/\|/g, '\\|').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Check if the spec has security schemes.
 */
function hasSecuritySchemes(spec: OpenAPISpec): boolean {
  return (
    spec.components.securitySchemes !== undefined &&
    Object.keys(spec.components.securitySchemes).length > 0
  );
}

/**
 * Check if the spec has schemas.
 */
function hasSchemas(spec: OpenAPISpec): boolean {
  return (
    spec.components.schemas !== undefined &&
    Object.keys(spec.components.schemas).length > 0
  );
}
