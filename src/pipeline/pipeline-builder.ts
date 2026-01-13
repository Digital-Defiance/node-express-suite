/**
 * @fileoverview Pipeline builder for Express middleware chains.
 * Provides fluent API for building middleware pipelines.
 * @module pipeline/pipeline-builder
 */

import { RequestHandler } from 'express';

/**
 * Builder for creating Express middleware pipelines.
 */
export class Pipeline {
  private middleware: RequestHandler[] = [];

  static create(): Pipeline {
    return new Pipeline();
  }

  use(handler: RequestHandler): this {
    this.middleware.push(handler);
    return this;
  }

  build(): RequestHandler[] {
    return this.middleware;
  }
}
