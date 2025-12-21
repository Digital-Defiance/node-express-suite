import {
  DefaultRouterConfig,
  RouterConfig,
} from '../../src/routers/router-config';

describe('RouterConfig', () => {
  describe('DefaultRouterConfig', () => {
    it('should have empty staticPaths array', () => {
      expect(DefaultRouterConfig.staticPaths).toEqual([]);
    });

    it('should have empty middleware array', () => {
      expect(DefaultRouterConfig.middleware).toEqual([]);
    });

    it('should not have viewEngine defined', () => {
      expect(DefaultRouterConfig.viewEngine).toBeUndefined();
    });

    it('should not have cors defined', () => {
      expect(DefaultRouterConfig.cors).toBeUndefined();
    });
  });

  describe('RouterConfig interface', () => {
    it('should accept valid config with all properties', () => {
      const config: RouterConfig = {
        staticPaths: [{ prefix: '/static', directory: '/public' }],
        viewEngine: { name: 'ejs', viewsPath: '/views' },
        middleware: [],
        cors: { origin: '*', credentials: true },
      };
      expect(config).toBeDefined();
    });

    it('should accept config with only staticPaths', () => {
      const config: RouterConfig = {
        staticPaths: [{ prefix: '/assets', directory: '/dist' }],
      };
      expect(config.staticPaths).toHaveLength(1);
    });

    it('should accept config with cors string origin', () => {
      const config: RouterConfig = {
        cors: { origin: 'https://example.com' },
      };
      expect(config.cors?.origin).toBe('https://example.com');
    });

    it('should accept config with cors array origin', () => {
      const config: RouterConfig = {
        cors: { origin: ['https://example.com', 'https://test.com'] },
      };
      expect(Array.isArray(config.cors?.origin)).toBe(true);
    });
  });
});
