import {
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';
import { IEmailService } from '../interfaces/email-service';

class EmailServiceRegistry {
  private service?: IEmailService;

  setService(service: IEmailService): void {
    this.service = service;
  }

  getService(): IEmailService {
    if (!this.service) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_EmailService_NotConfigured,
      );
    }
    return this.service;
  }
}

export const emailServiceRegistry = new EmailServiceRegistry();
