import { Router } from 'express';
import { IApplication } from '../interfaces/application';

export abstract class BaseRouter<
  TApplication extends IApplication = IApplication,
> {
  public readonly router: Router;
  public readonly application: TApplication;
  protected constructor(application: TApplication) {
    this.application = application;
    this.router = Router();
  }
}
