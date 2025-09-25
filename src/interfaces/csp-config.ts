import { IncomingMessage, ServerResponse } from 'http';

export interface ICSPConfig {
  corsWhitelist: string[];
  csp: {
    defaultSrc: (
      | string
      | ((req: IncomingMessage, res: ServerResponse) => string)
    )[];
    imgSrc: (
      | string
      | ((req: IncomingMessage, res: ServerResponse) => string)
    )[];
    connectSrc: (
      | string
      | ((req: IncomingMessage, res: ServerResponse) => string)
    )[];
    scriptSrc: (
      | string
      | ((req: IncomingMessage, res: ServerResponse) => string)
    )[];
    styleSrc: (
      | string
      | ((req: IncomingMessage, res: ServerResponse) => string)
    )[];
    fontSrc: (
      | string
      | ((req: IncomingMessage, res: ServerResponse) => string)
    )[];
    frameSrc: (
      | string
      | ((req: IncomingMessage, res: ServerResponse) => string)
    )[];
  };
}
