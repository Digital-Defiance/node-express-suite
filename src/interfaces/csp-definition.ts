import { HelmetOptions } from 'helmet';
import { IncomingMessage, ServerResponse } from 'http';

export interface ISimpleCSPDef {
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

export const isSimpleCSPDef = (obj: ISimpleCSPDef | HelmetOptions): obj is ISimpleCSPDef => {
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