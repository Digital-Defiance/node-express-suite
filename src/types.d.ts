import { Member } from '@digitaldefiance/node-ecies-lib';
import { IRequestUserDTO } from '@digitaldefiance/suite-core-lib';
import { ValidationChain } from 'express-validator';
import { ValidatedBody } from './types';

declare module 'express-serve-static-core' {
  interface Request {
    user?: IRequestUserDTO;
    eciesUser?: Member;
    validatedBody?: ValidatedBody<string>;
    validate?: {
      body: (field: string) => ValidationChain;
      param: (field: string) => ValidationChain;
      query: (field: string) => ValidationChain;
      header: (field: string) => ValidationChain;
      cookie: (field: string) => ValidationChain;
    };
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: IRequestUserDTO;
      eciesUser?: Member;
      validatedBody?: ValidatedBody<string>;
      validate?: {
        body: (field: string) => ValidationChain;
        param: (field: string) => ValidationChain;
        query: (field: string) => ValidationChain;
        header: (field: string) => ValidationChain;
        cookie: (field: string) => ValidationChain;
      };
    }
  }
}

// This export makes the file a module, ensuring the augmentations are applied
export {};
