import { RequestHandler } from 'express';

export interface RouterConfig {
  staticPaths?: Array<{ prefix: string; directory: string }>;
  viewEngine?: { name: string; viewsPath: string };
  middleware?: RequestHandler[];
  cors?: {
    origin?: string | string[];
    credentials?: boolean;
  };
}

export const DefaultRouterConfig: RouterConfig = {
  staticPaths: [],
  middleware: [],
};
