import { Router } from 'express';
import { Types } from 'mongoose';
import { IBaseDocument } from '../documents';
import { Environment } from '../environment';
import { IConstants } from '../interfaces';
import { IApplication } from '../interfaces/application';

export abstract class BaseRouter<
  TApplication extends IApplication<
    any,
    Types.ObjectId,
    IBaseDocument<any, Types.ObjectId>,
    Environment,
    IConstants
  > = IApplication<
    any,
    Types.ObjectId,
    IBaseDocument<any, Types.ObjectId>,
    Environment,
    IConstants
  >,
> {
  public readonly router: Router;
  public readonly application: TApplication;
  protected constructor(application: TApplication) {
    this.application = application;
    this.router = Router();
  }
}
