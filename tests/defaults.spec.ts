import {
  createExpressRuntimeConfiguration,
  getExpressRuntimeConfiguration,
  registerExpressRuntimeConfiguration,
} from '../src/defaults';

describe('Express Runtime Configuration Registry', () => {
  it('should return the default configuration', () => {
    const config = getExpressRuntimeConfiguration();
    expect(config).toBeDefined();
    expect(config.BcryptRounds).toBe(10);
    expect(config.CHECKSUM).toBeDefined();
    expect(config.CHECKSUM.SHA3_DEFAULT_HASH_BITS).toBe(512);
  });

  it('should allow registering and retrieving a custom configuration', () => {
    const customKey = Symbol('custom-express-config');
    registerExpressRuntimeConfiguration(customKey, { BcryptRounds: 14 });
    const customConfig = getExpressRuntimeConfiguration(customKey);
    expect(customConfig.BcryptRounds).toBe(14);
  });

  it('should deeply freeze the configuration objects', () => {
    const config = getExpressRuntimeConfiguration();
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.CHECKSUM)).toBe(true);
  });

  it('should apply overrides correctly', () => {
    const overrides = { BcryptRounds: 20 };
    const config = createExpressRuntimeConfiguration(overrides);
    expect(config.BcryptRounds).toBe(20);
  });
});
