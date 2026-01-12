import { Types } from '@digitaldefiance/mongoose-types';
import {
  getEnhancedNodeIdProvider,
  registerNodeRuntimeConfiguration,
} from '@digitaldefiance/node-ecies-lib';

const { ObjectId } = Types;

describe('Enhanced ID Provider Integration', () => {
  beforeAll(() => {
    registerNodeRuntimeConfiguration();
  });

  describe('getEnhancedNodeIdProvider', () => {
    it('should provide strongly-typed ObjectId generation by default', () => {
      // Default provider is ObjectIdProvider which returns ObjectId
      const provider = getEnhancedNodeIdProvider<Types.ObjectId>();
      const id = provider.generateTyped();

      expect(ObjectId.isValid(id)).toBe(true);
      expect(id.toString()).toMatch(/^[0-9a-f]{24}$/);
    });

    it('should convert string to ObjectId', () => {
      const provider = getEnhancedNodeIdProvider<Types.ObjectId>();
      const originalId = new ObjectId();
      const idString = originalId.toString();

      const convertedId = provider.idFromString(idString);

      expect(convertedId.toString()).toBe(idString);
      expect(ObjectId.isValid(convertedId)).toBe(true);
    });

    it('should convert ObjectId to string', () => {
      const provider = getEnhancedNodeIdProvider<Types.ObjectId>();
      const id = new ObjectId();

      const idString = provider.idToString(id);

      expect(typeof idString).toBe('string');
      expect(idString).toBe(id.toString());
    });

    it('should work with raw bytes', () => {
      const provider = getEnhancedNodeIdProvider();
      const bytes = provider.generate();

      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(12); // ObjectId byte length

      // Can convert bytes to ObjectId
      const id = provider.fromBytes(bytes);
      expect(ObjectId.isValid(id)).toBe(true);
    });

    it('should serialize and deserialize consistently', () => {
      const provider = getEnhancedNodeIdProvider<Types.ObjectId>();
      const originalId = provider.generateTyped();

      const serialized = provider.idToString(originalId);
      const deserialized = provider.idFromString(serialized);

      expect(deserialized.toString()).toBe(originalId.toString());
    });
  });
});
