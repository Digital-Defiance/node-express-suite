import { CHECKSUM, JWT, FEC, ECIES, createExpressConstants } from '../src/constants';

describe('constants', () => {
  describe('CHECKSUM', () => {
    it('should have correct values', () => {
      expect(CHECKSUM.SHA3_DEFAULT_HASH_BITS).toBe(512);
      expect(CHECKSUM.SHA3_BUFFER_LENGTH).toBe(64);
      expect(CHECKSUM.ALGORITHM).toBe('sha3-512');
      expect(CHECKSUM.ENCODING).toBe('hex');
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(CHECKSUM)).toBe(true);
    });
  });

  describe('JWT', () => {
    it('should have correct values', () => {
      expect(JWT.ALGORITHM).toBe('HS256');
      expect(JWT.EXPIRATION_SEC).toBe(86400);
    });
  });

  describe('FEC', () => {
    it('should have correct max shard size', () => {
      expect(FEC.MAX_SHARD_SIZE).toBe(1048576);
    });
  });

  describe('ECIES', () => {
    it('should be defined', () => {
      expect(ECIES).toBeDefined();
      expect(Object.isFrozen(ECIES)).toBe(true);
    });
  });

  describe('createExpressConstants', () => {
    it('should create constants with site domain', () => {
      const constants = createExpressConstants('example.com');
      expect(constants).toBeDefined();
      expect(constants.CHECKSUM).toEqual(CHECKSUM);
      expect(constants.JWT).toEqual(JWT);
      expect(constants.FEC).toEqual(FEC);
    });

    it('should merge overrides', () => {
      const constants = createExpressConstants('example.com', {
        JWT: { ...JWT, EXPIRATION_SEC: 3600 },
      });
      expect(constants.JWT.EXPIRATION_SEC).toBe(3600);
    });
  });
});
