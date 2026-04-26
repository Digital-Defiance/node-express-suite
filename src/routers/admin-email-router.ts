/**
 * @fileoverview Admin router for inspecting captured emails from FakeEmailService.
 * Only intended for use in development/test environments where
 * FakeEmailService is active. Mount behind an admin authentication middleware.
 * @module routers/admin-email-router
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { Request, RequestHandler, Response } from 'express';
import { IApplication } from '../interfaces/application';
import { FakeEmailService } from '../services/fake-email-service';
import { BaseRouter } from './base';

/**
 * Router that exposes FakeEmailService captured emails via HTTP endpoints.
 * All routes require admin authentication supplied as an injectable middleware.
 *
 * Mount example (relative to a parent router at e.g. /api/admin/emails):
 *   app.use('/api/admin/emails', new AdminEmailRouter(app, requireAdmin).router);
 *
 * Routes:
 *   GET /            - list all recipients and message counts
 *   GET /:address    - list captured emails for a specific recipient
 *   DELETE /         - clear all captured emails
 *
 * @template TID - Platform ID type (defaults to Buffer)
 * @template TApplication - Application type (defaults to IApplication<TID>)
 */
export class AdminEmailRouter<
  TID extends PlatformID = Buffer,
  TApplication extends IApplication<TID> = IApplication<TID>,
> extends BaseRouter<TID, TApplication> {
  constructor(application: TApplication, requireAdmin: RequestHandler) {
    super(application);

    /**
     * GET / — list all recipients and email counts.
     * Response: { recipients: Array<{ address: string; count: number }> }
     */
    this.router.get('/', requireAdmin, (_req: Request, res: Response): void => {
      const svc = FakeEmailService.getInstance<TID, TApplication>(application);
      const recipients = svc.getAllRecipients().map((address) => ({
        address,
        count: svc.getEmails(address).length,
      }));
      res.json({ recipients });
    });

    /**
     * GET /:address — retrieve all captured emails for a specific recipient.
     * Response: CapturedEmail[]
     */
    this.router.get(
      '/:address',
      requireAdmin,
      (req: Request, res: Response): void => {
        const address = req.params['address'];
        if (typeof address !== 'string' || !address) {
          res.status(400).json({ error: 'Invalid address parameter' });
          return;
        }
        const svc = FakeEmailService.getInstance<TID, TApplication>(
          application,
        );
        res.json(svc.getEmails(address));
      },
    );

    /**
     * DELETE / — clear all captured emails.
     * Response: { success: true }
     */
    this.router.delete(
      '/',
      requireAdmin,
      (_req: Request, res: Response): void => {
        FakeEmailService.getInstance<TID, TApplication>(application).clear();
        res.json({ success: true });
      },
    );
  }
}
