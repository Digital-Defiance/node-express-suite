import express from 'express';
import {
  corsOptionsDelegate,
  initMiddleware,
  isHelmetOptions,
} from '../src/middleware-utils';

describe('middleware-utils', () => {
  describe('corsOptionsDelegate', () => {
    it('should allow whitelisted origins', (done) => {
      const delegate = corsOptionsDelegate(['http://localhost:3000']);
      const req = { headers: { origin: 'http://localhost:3000' } } as any;
      delegate(req, (err, options) => {
        expect(err).toBeNull();
        expect(options?.origin).toBe(true);
        done();
      });
    });

    it('should block non-whitelisted origins', (done) => {
      const delegate = corsOptionsDelegate(['http://localhost:3000']);
      const req = { headers: { origin: 'http://evil.com' } } as any;
      delegate(req, (err, options) => {
        expect(err).toBeNull();
        expect(options?.origin).toBe(false);
        done();
      });
    });

    it('should support regex patterns', (done) => {
      const delegate = corsOptionsDelegate([/^http:\/\/localhost:\d+$/]);
      const req = { headers: { origin: 'http://localhost:4000' } } as any;
      delegate(req, (err, options) => {
        expect(err).toBeNull();
        expect(options?.origin).toBe(true);
        done();
      });
    });

    it('should block when no origin header', (done) => {
      const delegate = corsOptionsDelegate(['http://localhost:3000']);
      const req = { headers: {} } as any;
      delegate(req, (err, options) => {
        expect(err).toBeNull();
        expect(options?.origin).toBe(false);
        done();
      });
    });
  });

  describe('isHelmetOptions', () => {
    it('should return true for helmet options', () => {
      expect(isHelmetOptions({ contentSecurityPolicy: {} })).toBe(true);
      expect(isHelmetOptions({ referrerPolicy: {} })).toBe(true);
    });

    it('should return false for non-helmet objects', () => {
      expect(isHelmetOptions({})).toBe(false);
      expect(isHelmetOptions(null)).toBeFalsy();
      expect(isHelmetOptions('string')).toBe(false);
    });
  });

  describe('initMiddleware', () => {
    it('should initialize middleware with simple CSP', () => {
      const app = express();
      const csp = {
        defaultSrc: [],
        imgSrc: [],
        connectSrc: [],
        scriptSrc: [],
        styleSrc: [],
        fontSrc: [],
        frameSrc: [],
      };
      expect(() => initMiddleware(app, [], csp)).not.toThrow();
    });

    it('should initialize middleware with helmet options', () => {
      const app = express();
      const helmetOpts = { contentSecurityPolicy: false };
      expect(() => initMiddleware(app, [], helmetOpts)).not.toThrow();
    });

    it('should throw for invalid CSP', () => {
      const app = express();
      expect(() => initMiddleware(app, [], {} as any)).toThrow();
    });
  });
});
