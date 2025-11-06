import { IFlexibleCSP, isFlexibleCSP } from '../../src/interfaces/flexible-csp';

describe('FlexibleCSP', () => {
  describe('isFlexibleCSP', () => {
    it('should return true for simple CSP def', () => {
      const config: IFlexibleCSP = {
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
      expect(isFlexibleCSP(config)).toBe(true);
    });

    it('should return true for helmet options', () => {
      const config: IFlexibleCSP = {
        corsWhitelist: [],
        csp: { contentSecurityPolicy: false },
      };
      expect(isFlexibleCSP(config)).toBe(true);
    });

    it('should return false for missing corsWhitelist', () => {
      const config = {
        csp: { contentSecurityPolicy: false },
      };
      expect(isFlexibleCSP(config)).toBeFalsy();
    });

    it('should return false for missing csp', () => {
      const config = {
        corsWhitelist: [],
      };
      expect(isFlexibleCSP(config)).toBeFalsy();
    });

    it('should return false for null', () => {
      expect(isFlexibleCSP(null)).toBeFalsy();
    });
  });
});
