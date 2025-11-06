import { ICSPConfig, isCSPConfig } from '../../src/interfaces/csp-config';

describe('CSPConfig', () => {
  describe('isCSPConfig', () => {
    it('should return true for valid CSP config', () => {
      const config: ICSPConfig = {
        corsWhitelist: ['http://localhost:3000'],
        csp: {
          defaultSrc: [],
          imgSrc: [],
          connectSrc: [],
          scriptSrc: [],
          styleSrc: [],
          fontSrc: [],
          frameSrc: [],
        },
      };
      expect(isCSPConfig(config)).toBe(true);
    });

    it('should return false for missing corsWhitelist', () => {
      const config = {
        csp: {
          defaultSrc: [],
          imgSrc: [],
          connectSrc: [],
          scriptSrc: [],
          styleSrc: [],
          fontSrc: [],
          frameSrc: [],
        },
      };
      expect(isCSPConfig(config)).toBe(false);
    });

    it('should return false for invalid csp', () => {
      const config = {
        corsWhitelist: [],
        csp: {},
      };
      expect(isCSPConfig(config)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isCSPConfig(null)).toBeFalsy();
    });

    it('should return false for non-object', () => {
      expect(isCSPConfig('string')).toBe(false);
    });
  });
});
