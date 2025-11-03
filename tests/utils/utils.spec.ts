import { z } from 'zod';
import {
  debugLog,
  getValueAtPath,
  mapZodIssuesToValidationErrors,
  isValidStringId,
  omit,
  validateEnumCollection,
  uint8ArrayToBase64,
  base64ToUint8Array,
  uint8ArrayToHex,
  hexToUint8Array,
  crc16,
  arraysEqual,
  concatUint8Arrays,
  getLengthEncodingTypeForLength,
  getLengthForLengthType,
  lengthEncodeData,
  decodeLengthEncodedData,
} from '../../src/utils';
import { LengthEncodingType } from '../../src/enumerations/length-encoding-type';
import { Types } from 'mongoose';

describe('utils', () => {
  describe('debugLog', () => {
    let consoleErrorSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should log error when debug is true and type is error', () => {
      debugLog(true, 'error', 'test error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('test error');
    });

    it('should log warning when debug is true and type is warn', () => {
      debugLog(true, 'warn', 'test warning');
      expect(consoleWarnSpy).toHaveBeenCalledWith('test warning');
    });

    it('should log message when debug is true and type is log', () => {
      debugLog(true, 'log', 'test log');
      expect(consoleLogSpy).toHaveBeenCalledWith('test log');
    });

    it('should not log when debug is false', () => {
      debugLog(false, 'error', 'test');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('getValueAtPath', () => {
    it('should get nested value', () => {
      const obj = { a: { b: { c: 'value' } } };
      expect(getValueAtPath(obj, ['a', 'b', 'c'])).toBe('value');
    });

    it('should return undefined for missing path', () => {
      const obj = { a: { b: 'value' } };
      expect(getValueAtPath(obj, ['a', 'c'])).toBeUndefined();
    });

    it('should handle array indices', () => {
      const obj = { a: [1, 2, 3] };
      expect(getValueAtPath(obj, ['a', 1])).toBe(2);
    });
  });

  describe('mapZodIssuesToValidationErrors', () => {
    it('should map Zod issues to validation errors', () => {
      const schema = z.object({ email: z.string().email() });
      try {
        schema.parse({ email: 'invalid' });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const result = mapZodIssuesToValidationErrors(error.issues, { email: 'invalid' });
          expect(result).toHaveLength(1);
          expect(result[0].path).toBe('email');
          expect(result[0].location).toBe('body');
        }
      }
    });
  });

  describe('isValidStringId', () => {
    it('should return true for valid ObjectId string', () => {
      const id = new Types.ObjectId().toString();
      expect(isValidStringId(id)).toBe(true);
    });

    it('should return false for invalid string', () => {
      expect(isValidStringId('invalid')).toBe(false);
    });

    it('should return false for non-string', () => {
      expect(isValidStringId(123)).toBe(false);
    });
  });

  describe('omit', () => {
    it('should omit specified keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = omit(obj, ['b']);
      expect(result).toEqual({ a: 1, c: 3 });
    });
  });

  describe('validateEnumCollection', () => {
    enum TestEnum {
      A = 'A',
      B = 'B',
    }

    it('should validate matching collection', () => {
      const collection = { A: 'value1', B: 'value2' };
      expect(() => validateEnumCollection(collection, TestEnum)).not.toThrow();
    });

    it('should throw for missing keys', () => {
      const collection = { A: 'value1' };
      expect(() => validateEnumCollection(collection, TestEnum)).toThrow();
    });

    it('should throw for extra keys', () => {
      const collection = { A: 'value1', B: 'value2', C: 'value3' };
      expect(() => validateEnumCollection(collection, TestEnum)).toThrow();
    });
  });

  describe('uint8Array conversions', () => {
    it('should convert uint8Array to base64 and back', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5]);
      const base64 = uint8ArrayToBase64(original);
      const result = base64ToUint8Array(base64);
      expect(result).toEqual(original);
    });

    it('should convert uint8Array to hex and back', () => {
      const original = new Uint8Array([255, 0, 128]);
      const hex = uint8ArrayToHex(original);
      expect(hex).toBe('ff0080');
      const result = hexToUint8Array(hex);
      expect(result).toEqual(original);
    });
  });

  describe('crc16', () => {
    it('should calculate CRC16', () => {
      const data = new Uint8Array([1, 2, 3, 4]);
      const result = crc16(data);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(2);
    });
  });

  describe('arraysEqual', () => {
    it('should return true for equal arrays', () => {
      const a = new Uint8Array([1, 2, 3]);
      const b = new Uint8Array([1, 2, 3]);
      expect(arraysEqual(a, b)).toBe(true);
    });

    it('should return false for different arrays', () => {
      const a = new Uint8Array([1, 2, 3]);
      const b = new Uint8Array([1, 2, 4]);
      expect(arraysEqual(a, b)).toBe(false);
    });
  });

  describe('concatUint8Arrays', () => {
    it('should concatenate arrays', () => {
      const a = new Uint8Array([1, 2]);
      const b = new Uint8Array([3, 4]);
      const result = concatUint8Arrays(a, b);
      expect(result).toEqual(new Uint8Array([1, 2, 3, 4]));
    });
  });

  describe('getLengthEncodingTypeForLength', () => {
    it('should return UInt8 for small lengths', () => {
      expect(getLengthEncodingTypeForLength(100)).toBe(LengthEncodingType.UInt8);
    });

    it('should return UInt16 for medium lengths', () => {
      expect(getLengthEncodingTypeForLength(1000)).toBe(LengthEncodingType.UInt16);
    });

    it('should return UInt32 for large lengths', () => {
      expect(getLengthEncodingTypeForLength(100000)).toBe(LengthEncodingType.UInt32);
    });
  });

  describe('getLengthForLengthType', () => {
    it('should return correct byte lengths', () => {
      expect(getLengthForLengthType(LengthEncodingType.UInt8)).toBe(1);
      expect(getLengthForLengthType(LengthEncodingType.UInt16)).toBe(2);
      expect(getLengthForLengthType(LengthEncodingType.UInt32)).toBe(4);
      expect(getLengthForLengthType(LengthEncodingType.UInt64)).toBe(8);
    });
  });

  describe('lengthEncodeData and decodeLengthEncodedData', () => {
    it('should encode and decode small data', () => {
      const data = Buffer.from('test');
      const encoded = lengthEncodeData(data);
      const decoded = decodeLengthEncodedData(encoded);
      expect(decoded.data).toEqual(data);
    });

    it('should encode and decode large data', () => {
      const data = Buffer.alloc(1000, 'x');
      const encoded = lengthEncodeData(data);
      const decoded = decodeLengthEncodedData(encoded);
      expect(decoded.data).toEqual(data);
    });
  });
});
