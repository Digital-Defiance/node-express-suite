import { randomBytes } from 'crypto';
import { XorService } from '../../src/services/xor';

describe('XorService', () => {
  describe('xor', () => {
    it('should encrypt and decrypt data', () => {
      const data = randomBytes(16);
      const key = randomBytes(16);
      const encrypted = XorService.xor(data, key);
      const decrypted = XorService.xor(encrypted, key);
      expect(encrypted).not.toEqual(data);
      expect(decrypted).toEqual(data);
    });

    it('should throw when key shorter than data', () => {
      const data = Buffer.from('long secret data');
      const key = Buffer.from('key');
      expect(() => {
        const encrypted = XorService.xor(data, key);
      }).toThrow('Arrays must be of equal length');
    });
  });

  describe('generateKey', () => {
    it('should generate key of specified length', () => {
      const key = XorService.generateKey(32);
      expect(key.length).toBe(32);
    });

    it('should generate different keys', () => {
      const key1 = XorService.generateKey(16);
      const key2 = XorService.generateKey(16);
      expect(key1).not.toEqual(key2);
    });
  });
});
