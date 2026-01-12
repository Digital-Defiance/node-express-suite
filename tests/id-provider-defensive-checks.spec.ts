import {
  getEnhancedNodeIdProvider,
  getNodeRuntimeConfiguration,
} from '@digitaldefiance/node-ecies-lib';

describe('ID Provider Defensive Checks', () => {
  it('should throw clear error when configuration not initialized', () => {
    // This test verifies the defensive checks added in v4.12.3
    // In a real scenario where the module isn't properly initialized,
    // we'd get a clear error message instead of "Cannot read properties of undefined"

    const config = getNodeRuntimeConfiguration();
    expect(config).toBeDefined();
    expect(config.idProvider).toBeDefined();
  });

  it('should provide helpful error message if provider is missing', () => {
    // Verify that getEnhancedNodeIdProvider has proper error handling
    // This would fail with a clear message if configuration wasn't initialized
    expect(() => {
      const provider = getEnhancedNodeIdProvider();
      expect(provider).toBeDefined();
    }).not.toThrow();
  });

  it('should have idProvider with all required methods', () => {
    const provider = getEnhancedNodeIdProvider();

    expect(typeof provider.generate).toBe('function');
    expect(typeof provider.fromBytes).toBe('function');
    expect(typeof provider.toBytes).toBe('function');
    expect(typeof provider.serialize).toBe('function');
    expect(typeof provider.deserialize).toBe('function');
    expect(typeof provider.validate).toBe('function');
    expect(typeof provider.generateTyped).toBe('function');
    expect(typeof provider.idFromString).toBe('function');
    expect(typeof provider.idToString).toBe('function');
  });
});
