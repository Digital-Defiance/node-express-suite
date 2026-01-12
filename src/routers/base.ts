import { Router } from 'express';
import { IApplication } from '../interfaces/application';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

export abstract class BaseRouter<
  TID extends PlatformID = Buffer,
  TApplication extends IApplication<TID> = IApplication<TID>,
> {
  public readonly router: Router;
  public readonly application: TApplication;
  protected constructor(application: TApplication) {
    this.application = application;
    this.router = Router();
  }
}
