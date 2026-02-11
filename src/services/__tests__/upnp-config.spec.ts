import { UPNP_CONFIG_DEFAULTS } from '../../interfaces/network/upnpTypes';
import { describe, expect, it } from '@jest/globals';
import { UpnpConfig, UpnpConfigValidationError } from '../upnp-config';

describe('UpnpConfig', () => {
  describe('fromEnvironment – defaults', () => {
    it('returns all defaults when no env vars are set', () => {
      const config = UpnpConfig.fromEnvironment({});
      expect(config.enabled).toBe(UPNP_CONFIG_DEFAULTS.enabled);
      expect(config.httpPort).toBe(UPNP_CONFIG_DEFAULTS.httpPort);
      expect(config.websocketPort).toBe(UPNP_CONFIG_DEFAULTS.websocketPort);
      expect(config.ttl).toBe(UPNP_CONFIG_DEFAULTS.ttl);
      expect(config.refreshInterval).toBe(UPNP_CONFIG_DEFAULTS.refreshInterval);
      expect(config.protocol).toBe(UPNP_CONFIG_DEFAULTS.protocol);
      expect(config.retryAttempts).toBe(UPNP_CONFIG_DEFAULTS.retryAttempts);
      expect(config.retryDelay).toBe(UPNP_CONFIG_DEFAULTS.retryDelay);
    });
  });

  describe('fromEnvironment – env var parsing', () => {
    it('parses UPNP_ENABLED=true', () => {
      const config = UpnpConfig.fromEnvironment({ UPNP_ENABLED: 'true' });
      expect(config.enabled).toBe(true);
    });

    it('parses UPNP_ENABLED=false', () => {
      const config = UpnpConfig.fromEnvironment({ UPNP_ENABLED: 'false' });
      expect(config.enabled).toBe(false);
    });

    it('parses UPNP_ENABLED case-insensitively', () => {
      const config = UpnpConfig.fromEnvironment({ UPNP_ENABLED: 'TRUE' });
      expect(config.enabled).toBe(true);
    });

    it('parses numeric env vars', () => {
      const config = UpnpConfig.fromEnvironment({
        UPNP_HTTP_PORT: '8080',
        UPNP_WEBSOCKET_PORT: '8081',
        UPNP_TTL: '7200',
        UPNP_REFRESH_INTERVAL: '3600000',
        UPNP_RETRY_ATTEMPTS: '5',
        UPNP_RETRY_DELAY: '10000',
      });
      expect(config.httpPort).toBe(8080);
      expect(config.websocketPort).toBe(8081);
      expect(config.ttl).toBe(7200);
      expect(config.refreshInterval).toBe(3600000);
      expect(config.retryAttempts).toBe(5);
      expect(config.retryDelay).toBe(10000);
    });

    it('parses UPNP_PROTOCOL', () => {
      const config = UpnpConfig.fromEnvironment({ UPNP_PROTOCOL: 'natpmp' });
      expect(config.protocol).toBe('natpmp');
    });

    it('parses UPNP_PROTOCOL case-insensitively', () => {
      const config = UpnpConfig.fromEnvironment({ UPNP_PROTOCOL: 'UPNP' });
      expect(config.protocol).toBe('upnp');
    });

    it('throws on non-integer env var', () => {
      expect(() =>
        UpnpConfig.fromEnvironment({ UPNP_HTTP_PORT: 'abc' }),
      ).toThrow(UpnpConfigValidationError);
    });

    it('throws on invalid protocol string', () => {
      expect(() =>
        UpnpConfig.fromEnvironment({ UPNP_PROTOCOL: 'invalid' }),
      ).toThrow(UpnpConfigValidationError);
    });
  });

  describe('validate – port numbers', () => {
    it('rejects httpPort < 1', () => {
      expect(() => UpnpConfig.fromEnvironment({ UPNP_HTTP_PORT: '0' })).toThrow(
        /httpPort/,
      );
    });

    it('rejects httpPort > 65535', () => {
      expect(() =>
        UpnpConfig.fromEnvironment({ UPNP_HTTP_PORT: '70000' }),
      ).toThrow(/httpPort/);
    });

    it('rejects websocketPort < 1', () => {
      expect(() =>
        UpnpConfig.fromEnvironment({ UPNP_WEBSOCKET_PORT: '0' }),
      ).toThrow(/websocketPort/);
    });

    it('rejects websocketPort > 65535', () => {
      expect(() =>
        UpnpConfig.fromEnvironment({ UPNP_WEBSOCKET_PORT: '70000' }),
      ).toThrow(/websocketPort/);
    });
  });

  describe('validate – TTL', () => {
    it('rejects ttl < 60', () => {
      expect(() => UpnpConfig.fromEnvironment({ UPNP_TTL: '30' })).toThrow(
        /ttl/,
      );
    });

    it('rejects ttl > 86400 (24 hours)', () => {
      expect(() => UpnpConfig.fromEnvironment({ UPNP_TTL: '86401' })).toThrow(
        /ttl/,
      );
    });

    it('accepts ttl = 60', () => {
      const config = UpnpConfig.fromEnvironment({
        UPNP_TTL: '60',
        UPNP_REFRESH_INTERVAL: '30000',
      });
      expect(config.ttl).toBe(60);
    });

    it('accepts ttl = 86400 (24 hours)', () => {
      const config = UpnpConfig.fromEnvironment({
        UPNP_TTL: '86400',
        UPNP_REFRESH_INTERVAL: '86399999',
      });
      expect(config.ttl).toBe(86400);
    });
  });

  describe('validate – refreshInterval', () => {
    it('rejects refreshInterval >= ttl * 1000', () => {
      // default ttl = 3600, so ttl*1000 = 3600000
      expect(() =>
        UpnpConfig.fromEnvironment({ UPNP_REFRESH_INTERVAL: '3600000' }),
      ).toThrow(/refreshInterval/);
    });

    it('accepts refreshInterval just under ttl * 1000', () => {
      const config = UpnpConfig.fromEnvironment({
        UPNP_REFRESH_INTERVAL: '3599999',
      });
      expect(config.refreshInterval).toBe(3599999);
    });
  });

  describe('validate – retryAttempts', () => {
    it('rejects retryAttempts < 1', () => {
      expect(() =>
        UpnpConfig.fromEnvironment({ UPNP_RETRY_ATTEMPTS: '0' }),
      ).toThrow(/retryAttempts/);
    });

    it('rejects retryAttempts > 10', () => {
      expect(() =>
        UpnpConfig.fromEnvironment({ UPNP_RETRY_ATTEMPTS: '11' }),
      ).toThrow(/retryAttempts/);
    });
  });

  describe('validate – retryDelay', () => {
    it('rejects retryDelay < 1000', () => {
      expect(() =>
        UpnpConfig.fromEnvironment({ UPNP_RETRY_DELAY: '500' }),
      ).toThrow(/retryDelay/);
    });

    it('rejects retryDelay > 60000', () => {
      expect(() =>
        UpnpConfig.fromEnvironment({ UPNP_RETRY_DELAY: '70000' }),
      ).toThrow(/retryDelay/);
    });

    it('accepts retryDelay at boundaries', () => {
      const low = UpnpConfig.fromEnvironment({ UPNP_RETRY_DELAY: '1000' });
      expect(low.retryDelay).toBe(1000);

      const high = UpnpConfig.fromEnvironment({ UPNP_RETRY_DELAY: '60000' });
      expect(high.retryDelay).toBe(60000);
    });
  });
});
