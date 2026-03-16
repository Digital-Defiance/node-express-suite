import { TranslatableSuiteError } from '@digitaldefiance/suite-core-lib';
import { IEmailService } from '../../src/interfaces/email-service';
import { ServiceContainer } from '../../src/container/service-container';
import { ServiceKeys } from '../../src/container/service-definitions';

describe('Email service via ServiceContainer', () => {
  const mockEmailService: IEmailService = {
    sendEmail: jest.fn(),
  };

  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  it('should register and retrieve an email service', () => {
    container.register(ServiceKeys.EMAIL, () => mockEmailService);
    const service = container.get(ServiceKeys.EMAIL);
    expect(service).toBe(mockEmailService);
    expect(service.sendEmail).toBeDefined();
  });

  it('should throw when no email service is registered', () => {
    expect(() => container.get(ServiceKeys.EMAIL)).toThrow(
      TranslatableSuiteError,
    );
  });

  it('should report has correctly', () => {
    expect(container.has(ServiceKeys.EMAIL)).toBe(false);
    container.register(ServiceKeys.EMAIL, () => mockEmailService);
    expect(container.has(ServiceKeys.EMAIL)).toBe(true);
  });
});
