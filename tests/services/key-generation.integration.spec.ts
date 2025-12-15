import { ECIES } from '@digitaldefiance/ecies-lib';
import { ECIESService } from '@digitaldefiance/node-ecies-lib';

describe('Key Generation Integration Tests', () => {
  let eciesService: ECIESService;

  beforeEach(() => {
    eciesService = new ECIESService();
  });

  describe('walletAndSeedFromMnemonic', () => {
    it('should generate compressed public keys (33 bytes)', () => {
      const mnemonic = eciesService.generateNewMnemonic();
      const { wallet } = eciesService.walletAndSeedFromMnemonic(mnemonic);

      const privateKey = wallet.getPrivateKey();
      const publicKey = eciesService.getPublicKey(Buffer.from(privateKey));

      // Compressed keys should be 33 bytes
      expect(publicKey.length).toBe(33);
      // Should start with 0x02 or 0x03
      expect([0x02, 0x03]).toContain(publicKey[0]);
    });

    it('should NOT use wallet.getPublicKey() directly as it returns uncompressed keys', () => {
      const mnemonic = eciesService.generateNewMnemonic();
      const { wallet } = eciesService.walletAndSeedFromMnemonic(mnemonic);

      // wallet.getPublicKey() returns 64 bytes (uncompressed without prefix)
      const uncompressedKey = wallet.getPublicKey();
      expect(uncompressedKey.length).toBe(64);

      // This is WRONG - adding 0x02 prefix to 64-byte key gives 65 bytes
      const wrongKey = Buffer.concat([
        Buffer.from([ECIES.PUBLIC_KEY_MAGIC]),
        uncompressedKey,
      ]);
      expect(wrongKey.length).toBe(65);

      // This is CORRECT - use eciesService.getPublicKey()
      const privateKey = wallet.getPrivateKey();
      const correctKey = eciesService.getPublicKey(Buffer.from(privateKey));
      expect(correctKey.length).toBe(33);
    });

    it('should generate keys that can encrypt/decrypt', async () => {
      const mnemonic = eciesService.generateNewMnemonic();
      const { wallet } = eciesService.walletAndSeedFromMnemonic(mnemonic);

      const privateKey = Buffer.from(wallet.getPrivateKey());
      const publicKey = eciesService.getPublicKey(privateKey);

      const message = Buffer.from('test message');
      const encrypted = eciesService.encryptSimpleOrSingle(
        true, // Simple encryption
        publicKey,
        message,
      );

      const decrypted = eciesService.decryptSimpleOrSingleWithHeader(
        true,
        privateKey,
        encrypted,
      );
      expect(decrypted).toEqual(message);
    });
  });

  describe('database-initialization pattern', () => {
    it('should create public keys correctly for BackendMember', () => {
      const mnemonic = eciesService.generateNewMnemonic();
      const { wallet } = eciesService.walletAndSeedFromMnemonic(mnemonic);

      // Get private key from wallet
      const privateKey = wallet.getPrivateKey();

      // CORRECT: Get compressed public key (already includes prefix)
      const publicKeyWithPrefix = eciesService.getPublicKey(
        Buffer.from(privateKey),
      );

      expect(publicKeyWithPrefix.length).toBe(33);
      expect([0x02, 0x03]).toContain(publicKeyWithPrefix[0]);
    });
  });

  describe('user service pattern', () => {
    it('should create public keys correctly for user registration', () => {
      const mnemonic = eciesService.generateNewMnemonic();
      const { wallet } = eciesService.walletAndSeedFromMnemonic(mnemonic);

      const privateKey = wallet.getPrivateKey();

      // CORRECT: Get compressed public key (already includes prefix)
      const publicKeyWithPrefix = eciesService.getPublicKey(
        Buffer.from(privateKey),
      );

      expect(publicKeyWithPrefix.length).toBe(33);
      expect([0x02, 0x03]).toContain(publicKeyWithPrefix[0]);
    });

    it('should verify public keys correctly for password change', async () => {
      const mnemonic = eciesService.generateNewMnemonic();
      const { wallet } = eciesService.walletAndSeedFromMnemonic(mnemonic);

      const privateKey = wallet.getPrivateKey();

      // CORRECT: Get compressed public key (already includes prefix)
      const pub = eciesService.getPublicKey(Buffer.from(privateKey));

      expect(pub.length).toBe(33);
      expect([0x02, 0x03]).toContain(pub[0]);

      // Should be able to use this key for encryption
      const testData = Buffer.from('test');
      const encrypted = eciesService.encryptSimpleOrSingle(true, pub, testData);
      expect(encrypted).toBeDefined();
    });
  });
});
