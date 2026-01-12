import { Types } from '@digitaldefiance/mongoose-types';
import {
  getEnhancedNodeIdProvider,
  registerNodeRuntimeConfiguration,
} from '@digitaldefiance/node-ecies-lib';

const { ObjectId } = Types;

describe('Cross-Platform ID Compatibility', () => {
  beforeAll(() => {
    registerNodeRuntimeConfiguration();
  });

  it('should convert ObjectId to bytes and back', () => {
    const provider = getEnhancedNodeIdProvider<Types.ObjectId>();

    const originalId = new ObjectId();
    const bytes = provider.toBytes(originalId);
    const backToObjectId = provider.fromBytes(bytes) as Types.ObjectId;

    expect(backToObjectId.toString()).toBe(originalId.toString());
    expect(bytes.length).toBe(12);
  });

  it('should serialize and deserialize consistently', () => {
    const provider = getEnhancedNodeIdProvider<Types.ObjectId>();

    const objectId = new ObjectId();
    const serialized = provider.idToString(objectId);
    const deserialized = provider.idFromString(serialized);

    expect(deserialized.toString()).toBe(objectId.toString());
  });

  it('should maintain ID equality across conversions', () => {
    const provider = getEnhancedNodeIdProvider<Types.ObjectId>();
    const id1 = provider.generateTyped();

    // Convert to string and back
    const str = provider.idToString(id1);
    const id2 = provider.idFromString(str);

    // Convert to bytes and back
    const bytes = provider.toBytes(id1);
    const id3 = provider.fromBytes(bytes) as Types.ObjectId;

    expect(id2.toString()).toBe(id1.toString());
    expect(id3.toString()).toBe(id1.toString());
  });

  it('should validate IDs correctly', () => {
    const provider = getEnhancedNodeIdProvider<Types.ObjectId>();
    const validId = provider.generateTyped();
    const validBytes = provider.toBytes(validId);

    expect(provider.validate(validBytes)).toBe(true);
    expect(ObjectId.isValid(validId)).toBe(true);

    // Invalid bytes
    const invalidBytes = new Uint8Array(5); // Wrong length
    expect(provider.validate(invalidBytes)).toBe(false);
  });

  it('should work with Buffer representation of ObjectId bytes', () => {
    const provider = getEnhancedNodeIdProvider<Types.ObjectId>();
    const id = provider.generateTyped();
    const bytes = provider.toBytes(id);

    // Convert to Buffer
    const buffer = Buffer.from(bytes);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBe(12);

    // Convert back from Buffer
    const backToId = provider.fromBytes(buffer) as Types.ObjectId;
    expect(backToId.toString()).toBe(id.toString());
  });
});
