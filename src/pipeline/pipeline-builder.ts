import { RequestHandler } from 'express';

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
