/**
 * @fileoverview Email service registry singleton.
 * Manages email service registration and retrieval.
 * @module registry/email-service-registry
 */

import {
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';
import { IEmailService } from '../interfaces/email-service';

/**
 * Singleton registry for email service.
 */
class EmailServiceRegistry {
  private service?: IEmailService;

  /**
   * Registers an email service.
   * @param {IEmailService} service - Email service implementation
   */
  setService(service: IEmailService): void {
    this.service = service;
  }

  /**
   * Retrieves the registered email service.
   * @returns {IEmailService} Email service instance
   * @throws {TranslatableSuiteError} If no service is registered
   */
  getService(): IEmailService {
    if (!this.service) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_EmailService_NotConfigured,
      );
    }
    return this.service;
  }

  /**
   * Check if any email service is registered.
   * @returns {boolean} True if service is registered
   */
  hasService(): boolean {
    return this.service !== undefined;
  }

  /**
   * Check if the registered service is an instance of a specific class.
   * @template T - Email service type
   * @param {Function} serviceClass - The class/constructor to check against
   * @returns {boolean} True if the registered service is an instance of the given class
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
   * Get the constructor name of the registered service.
   * @returns {string | undefined} The name of the service class, or undefined if no service is registered
   */
  getServiceTypeName(): string | undefined {
    return this.service?.constructor.name;
  }
}

/**
 * Singleton instance of EmailServiceRegistry.
 */
export const emailServiceRegistry = new EmailServiceRegistry();
