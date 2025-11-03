import { routeConfig } from '../src/types';

describe('types', () => {
  describe('routeConfig', () => {
    it('should create route config', () => {
      const config = routeConfig('get', '/test', {
        handlerKey: 'testHandler',
        useAuthentication: true,
        useCryptoAuthentication: false,
      });

      expect(config.method).toBe('get');
      expect(config.path).toBe('/test');
      expect(config.handlerKey).toBe('testHandler');
      expect(config.useAuthentication).toBe(true);
      expect(config.useCryptoAuthentication).toBe(false);
    });

    it('should include validation when provided', () => {
      const validation = (lang: string) => [];
      const config = routeConfig('post', '/create', {
        handlerKey: 'createHandler',
        validation,
        useAuthentication: false,
        useCryptoAuthentication: false,
      });

      expect(config.validation).toBe(validation);
    });
  });
});
