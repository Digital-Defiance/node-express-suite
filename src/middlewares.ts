import cors from 'cors';
import { randomBytes } from 'crypto';
import {
  Application,
  json,
  NextFunction,
  Request,
  Response,
  urlencoded,
} from 'express';
import helmet from 'helmet';
import { IncomingMessage, ServerResponse } from 'http';

const corsOptionsDelegate = (corsWhitelist: string[]) => {
  return (
    req: cors.CorsRequest,
    callback: (
      error: Error | null,
      options: cors.CorsOptions | undefined,
    ) => void,
  ) => {
    let corsOptions: cors.CorsOptions;
    const origin = req.headers.origin;
    if (
      origin &&
      corsWhitelist.find((w: string | RegExp) => {
        if (w instanceof RegExp) {
          return w.test(origin);
        } else {
          return w === origin;
        }
      })
    ) {
      corsOptions = { origin: true };
    } else {
      corsOptions = { origin: false };
    }
    callback(null, corsOptions);
  };
};

export class Middlewares {
  /**
   * Initialize the middleware
   * @param app - Express application
   */
  public static init(
    app: Application,
    corsWhitelist: string[],
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
    },
  ): void {
    // Helmet helps you secure your Express apps by setting various HTTP headers
    // CSP nonce
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.locals['cspNonce'] = randomBytes(32).toString('hex');
      next();
    });
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'", ...csp.defaultSrc],
            imgSrc: ["'self'", 'data:', 'blob:', ...csp.imgSrc],
            connectSrc: ["'self'", ...csp.connectSrc],
            scriptSrc: [
              "'self'",
              //"'unsafe-inline'",
              "'strict-dynamic'",
              (req: IncomingMessage, res: ServerResponse) =>
                `'nonce-${(res as Response).locals['cspNonce']}'`,
              ...csp.scriptSrc,
            ],
            styleSrc: [
              "'self'",
              // "'unsafe-inline'",
              ...csp.styleSrc,
            ],
            fontSrc: ["'self'", ...csp.fontSrc],
            frameSrc: ["'self'", ...csp.frameSrc],
          },
        },
      }),
    );
    // Enable CORS
    app.use(cors(corsOptionsDelegate(corsWhitelist)));
    // Parse incoming requests with JSON payloads
    app.use(json());
    // Parse incoming requests with urlencoded payloads
    app.use(urlencoded({ extended: true }));
  }
}
