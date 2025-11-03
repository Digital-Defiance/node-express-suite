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
import helmet, { HelmetOptions } from 'helmet';
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

type CSPDef = {
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

const isCSPDef = (obj: CSPDef | HelmetOptions): obj is CSPDef => {
  return (
    obj &&
    'defaultSrc' in obj &&
    'imgSrc' in obj &&
    'connectSrc' in obj &&
    'scriptSrc' in obj &&
    'styleSrc' in obj &&
    'fontSrc' in obj &&
    'frameSrc' in obj &&
    Array.isArray(obj.defaultSrc) &&
    Array.isArray(obj.imgSrc) &&
    Array.isArray(obj.connectSrc) &&
    Array.isArray(obj.scriptSrc) &&
    Array.isArray(obj.styleSrc) &&
    Array.isArray(obj.fontSrc) &&
    Array.isArray(obj.frameSrc)
  );
}

const isHelmetOptions = (obj: any): boolean => {
  // A very basic check; in real scenarios, you might want to be more thorough
  return obj && typeof obj === 'object' && (
    ('contentSecurityPolicy' in obj) ||
    ('crossOriginEmbedderPolicy' in obj) ||
    ('crossOriginOpenerPolicy' in obj) ||
    ('crossOriginResourcePolicy' in obj) ||
    ('originAgentCluster' in obj) ||
    ('referrerPolicy' in obj));
}

export const initMiddleware = (
    app: Application,
    corsWhitelist: string[],
    csp: CSPDef | HelmetOptions,
  ): void => {
    // Helmet helps you secure your Express apps by setting various HTTP headers
    // CSP nonce
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.locals['cspNonce'] = randomBytes(32).toString('hex');
      next();
    });
    if (isCSPDef(csp)) {
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
    } else if (isHelmetOptions(csp)) {
      app.use(helmet(csp));
    } else {
      throw new Error('Invalid CSP or Helmet options provided.');
    }
    // Enable CORS
    app.use(cors(corsOptionsDelegate(corsWhitelist)));
    // Parse incoming requests with JSON payloads
    app.use(json());
    // Parse incoming requests with urlencoded payloads
    app.use(urlencoded({ extended: true }));
  };