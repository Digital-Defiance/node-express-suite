import { IApplication, IEmailService } from '../interfaces';

/**
 * Dummy email service that does nothing.
 * Primarily for testing
 */
export class DummyEmailService<
  TApplication extends IApplication = IApplication,
> implements IEmailService {
  constructor(_application: TApplication) {}
  public async sendEmail(
    _to: string,
    _subject: string,
    _text: string,
    _html: string,
  ): Promise<void> {
    // Do nothing
    return;
  }
}
