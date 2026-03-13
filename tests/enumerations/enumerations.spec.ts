import { LengthEncodingType } from '../../src/enumerations/length-encoding-type';
import { SymmetricErrorType } from '../../src/enumerations/symmetric-error-type';

describe('Enumerations', () => {
  describe('LengthEncodingType', () => {
    it('should have correct numeric values', () => {
      expect(LengthEncodingType.UInt8).toBe(0);
      expect(LengthEncodingType.UInt16).toBe(1);
      expect(LengthEncodingType.UInt32).toBe(2);
      expect(LengthEncodingType.UInt64).toBe(3);
    });
  });

  describe('SymmetricErrorType', () => {
    it('should have error types', () => {
      expect(SymmetricErrorType.DataNullOrUndefined).toBe(
        'DataNullOrUndefined',
      );
      expect(SymmetricErrorType.InvalidKeyLength).toBe('InvalidKeyLength');
    });
  });
});
