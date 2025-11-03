import { BaseModelName } from '../../src/enumerations/base-model-name';
import { LengthEncodingType } from '../../src/enumerations/length-encoding-type';
import { SchemaCollection } from '../../src/enumerations/schema-collection';
import { SymmetricErrorType } from '../../src/enumerations/symmetric-error-type';

describe('Enumerations', () => {
  describe('BaseModelName', () => {
    it('should have all required model names', () => {
      expect(BaseModelName.EmailToken).toBe('EmailToken');
      expect(BaseModelName.Role).toBe('Role');
      expect(BaseModelName.User).toBe('User');
      expect(BaseModelName.Mnemonic).toBe('Mnemonic');
      expect(BaseModelName.UserRole).toBe('UserRole');
      expect(BaseModelName.UsedDirectLoginToken).toBe('UsedDirectLoginToken');
    });
  });

  describe('LengthEncodingType', () => {
    it('should have correct numeric values', () => {
      expect(LengthEncodingType.UInt8).toBe(0);
      expect(LengthEncodingType.UInt16).toBe(1);
      expect(LengthEncodingType.UInt32).toBe(2);
      expect(LengthEncodingType.UInt64).toBe(3);
    });
  });

  describe('SchemaCollection', () => {
    it('should have all collection names', () => {
      expect(SchemaCollection.EmailToken).toBe('email-tokens');
      expect(SchemaCollection.Role).toBe('roles');
      expect(SchemaCollection.UserToken).toBe('user-tokens');
      expect(SchemaCollection.User).toBe('users');
      expect(SchemaCollection.Mnemonic).toBe('mnemonics');
      expect(SchemaCollection.UserRole).toBe('user-roles');
      expect(SchemaCollection.UsedDirectLoginToken).toBe('used-direct-login-tokens');
    });
  });

  describe('SymmetricErrorType', () => {
    it('should have error types', () => {
      expect(SymmetricErrorType.DataNullOrUndefined).toBe('DataNullOrUndefined');
      expect(SymmetricErrorType.InvalidKeyLength).toBe('InvalidKeyLength');
    });
  });
});
