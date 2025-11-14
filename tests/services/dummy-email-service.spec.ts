import { DummyEmailService } from '../../src/services/dummy-email-service';

describe('DummyEmailService', () => {
  it('should create an instance with an application', () => {
    const mockApp = {} as any;
    const service = new DummyEmailService(mockApp);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(DummyEmailService);
  });

  it('should implement IEmailService interface', () => {
    const mockApp = {} as any;
    const service = new DummyEmailService(mockApp);
    expect(service.sendEmail).toBeDefined();
    expect(typeof service.sendEmail).toBe('function');
  });

  describe('sendEmail', () => {
    it('should return a resolved promise without doing anything', async () => {
      const mockApp = {} as any;
      const service = new DummyEmailService(mockApp);
      
      const result = await service.sendEmail(
        'test@example.com',
        'Test Subject',
        'Plain text content',
        '<p>HTML content</p>'
      );
      
      expect(result).toBeUndefined();
    });

    it('should accept any valid email parameters', async () => {
      const mockApp = {} as any;
      const service = new DummyEmailService(mockApp);
      
      await expect(
        service.sendEmail(
          'another@test.com',
          'Different Subject',
          'Different text',
          '<div>Different HTML</div>'
        )
      ).resolves.toBeUndefined();
    });

    it('should handle empty strings', async () => {
      const mockApp = {} as any;
      const service = new DummyEmailService(mockApp);
      
      await expect(
        service.sendEmail('', '', '', '')
      ).resolves.toBeUndefined();
    });
  });
});
