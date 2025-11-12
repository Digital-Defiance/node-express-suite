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

  /**
   * Check if any email service is registered
   */
  hasService(): boolean {
    return this.service !== undefined;
  }

  /**
   * Check if the registered service is an instance of a specific class
   * @param serviceClass The class/constructor to check against
   * @returns true if the registered service is an instance of the given class
   * @example
   * emailServiceRegistry.isServiceType(EmailService) // true if EmailService is registered
   * emailServiceRegistry.isServiceType(DummyEmailService) // true if DummyEmailService is registered
   */
  isServiceType<T extends IEmailService>(
    serviceClass: new (...args: any[]) => T,
  ): boolean {
    return this.service !== undefined && this.service instanceof serviceClass;
  }

  /**
   * Get the constructor name of the registered service
   * @returns The name of the service class, or undefined if no service is registered
   */
  getServiceTypeName(): string | undefined {
    return this.service?.constructor.name;
  }
}

export const emailServiceRegistry = new EmailServiceRegistry();
