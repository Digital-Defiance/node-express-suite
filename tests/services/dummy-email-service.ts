import { IApplication, IEmailService } from '../../src/interfaces';

export class DummyEmailService<TApplication extends IApplication = IApplication>
  implements IEmailService
{
  constructor(application: TApplication) {}
  public async sendEmail(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<void> {
    // Do nothing
    return;
  }
}
