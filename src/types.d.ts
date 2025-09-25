import { Member } from '@digitaldefiance/node-ecies-lib';
import { IRequestUserDTO } from '@digitaldefiance/suite-core-lib';
import { ValidationChain } from 'express-validator';
import { ValidatedBody } from './types';

declare module 'express-serve-static-core' {
  interface Request<
    TRequestUserDTO extends IRequestUserDTO = IRequestUserDTO,
    TMember extends Member = Member,
    TValidatedBody = ValidatedBody<string>,
  > {
    user?: TRequestUserDTO;
    eciesUser?: TMember;
    validatedBody?: TValidatedBody;
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
    interface Request<
      TRequestUserDTO extends IRequestUserDTO = IRequestUserDTO,
      TMember extends Member = Member,
      TValidatedBody extends ValidatedBody<string> = ValidatedBody<string>,
    > {
      user?: TRequestUserDTO;
      eciesUser?: TMember;
      validatedBody?: TValidatedBody;
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
