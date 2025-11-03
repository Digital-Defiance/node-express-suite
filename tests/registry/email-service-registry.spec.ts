import { emailServiceRegistry } from '../../src/registry/email-service-registry';
import { IEmailService } from '../../src/interfaces/email-service';

describe('EmailServiceRegistry', () => {
  const mockEmailService: IEmailService = {
    sendEmail: jest.fn(),
  };

  beforeEach(() => {
    emailServiceRegistry.setService(mockEmailService);
  });

  describe('setService', () => {
    it('should set email service', () => {
      const service = emailServiceRegistry.getService();
      expect(service).toBe(mockEmailService);
    });
  });

  describe('getService', () => {
    it('should return registered service', () => {
      const service = emailServiceRegistry.getService();
      expect(service).toBeDefined();
      expect(service.sendEmail).toBeDefined();
    });

    it('should throw when no service registered', () => {
      const newRegistry = new (emailServiceRegistry.constructor as any)();
      expect(() => newRegistry.getService()).toThrow();
    });
  });
});
