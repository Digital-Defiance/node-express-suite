/**
 * @fileoverview Base router class providing common router functionality.
 * All routers extend this class to access application context and Express router.
 * @module routers/base
 */

import { Router } from 'express';
import { IApplication } from '../interfaces/application';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Abstract base class for all routers in the application.
 * Provides access to the Express router and application instance.
 * @template TID Platform-specific ID type (Buffer, ObjectId, etc.)
 * @template TApplication Application instance type
 */
export abstract class BaseRouter<
  TID extends PlatformID = Buffer,
  TApplication extends IApplication<TID> = IApplication<TID>,
> {
  /** Express router instance for registering routes */
  public readonly router: Router;
  /** Application instance providing access to services and configuration */
  public readonly application: TApplication;

  /**
   * Creates a new base router instance.
   * @param application Application instance
   */
  protected constructor(application: TApplication) {
    this.application = application;
    this.router = Router();
  }
}
