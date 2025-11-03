import { XorService } from '../../src/services/xor';

describe('XorService', () => {
  describe('xor', () => {
    it('should encrypt and decrypt data', () => {
      const data = Buffer.from('secret data');
      const key = Buffer.from('key123');
      const encrypted = XorService.xor(data, key);
      const decrypted = XorService.xor(encrypted, key);
      expect(decrypted).toEqual(data);
    });

    it('should handle key shorter than data', () => {
      const data = Buffer.from('long secret data');
      const key = Buffer.from('key');
      const encrypted = XorService.xor(data, key);
      expect(encrypted).not.toEqual(data);
      const decrypted = XorService.xor(encrypted, key);
      expect(decrypted).toEqual(data);
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
