import { z } from 'zod';
import {
  debugLog,
  directLog,
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
import * as fs from 'fs';

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

  describe('directLog', () => {
    it('should handle debug logging for error type', () => {
      // Just test the function doesn't throw
      expect(() => directLog(true, 'error', 'test error')).not.toThrow();
      expect(() => directLog(false, 'error', 'test error')).not.toThrow();
    });

    it('should handle debug logging for warn type', () => {
      expect(() => directLog(true, 'warn', 'test warning')).not.toThrow();
      expect(() => directLog(false, 'warn', 'test warning')).not.toThrow();
    });

    it('should handle debug logging for log type', () => {
      expect(() => directLog(true, 'log', 'test log')).not.toThrow();
      expect(() => directLog(false, 'log', 'test log')).not.toThrow();
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

  describe('requireValidatedFieldsAsync', () => {
    const { requireValidatedFieldsAsync } = require('../../src/utils');

    it('should throw MissingValidatedDataError when validatedBody is undefined', async () => {
      const req = {} as any;
      const schema = z.object({ name: z.string() });
      const callback = jest.fn();

      await expect(
        requireValidatedFieldsAsync(req, schema, callback)
      ).rejects.toThrow();
      expect(callback).not.toHaveBeenCalled();
    });

    it('should call callback with validated data when valid', async () => {
      const req = {
        validatedBody: { name: 'test', age: 25 }
      } as any;
      const schema = z.object({ name: z.string(), age: z.number() });
      const callback = jest.fn().mockResolvedValue('success');

      const result = await requireValidatedFieldsAsync(req, schema, callback);

      expect(callback).toHaveBeenCalledWith({ name: 'test', age: 25 });
      expect(result).toBe('success');
    });

    it('should throw ExpressValidationError for invalid data', async () => {
      const req = {
        validatedBody: { name: 123 }
      } as any;
      const schema = z.object({ name: z.string() });
      const callback = jest.fn();

      await expect(
        requireValidatedFieldsAsync(req, schema, callback)
      ).rejects.toThrow();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('requireOneOfValidatedFieldsAsync', () => {
    const { requireOneOfValidatedFieldsAsync } = require('../../src/utils');

    it('should throw when validatedBody is undefined', async () => {
      const req = {} as any;
      const callback = jest.fn();

      await expect(
        requireOneOfValidatedFieldsAsync(req, ['field1', 'field2'], callback)
      ).rejects.toThrow();
    });

    it('should call callback when at least one field exists', async () => {
      const req = {
        validatedBody: { field1: 'value' }
      } as any;
      const callback = jest.fn().mockResolvedValue('success');

      const result = await requireOneOfValidatedFieldsAsync(
        req,
        ['field1', 'field2'],
        callback
      );

      expect(callback).toHaveBeenCalled();
      expect(result).toBe('success');
    });

    it('should throw when no fields exist', async () => {
      const req = {
        validatedBody: { field3: 'value' }
      } as any;
      const callback = jest.fn();

      await expect(
        requireOneOfValidatedFieldsAsync(req, ['field1', 'field2'], callback)
      ).rejects.toThrow();
    });
  });

  describe('requireValidatedFieldsOrThrow', () => {
    const { requireValidatedFieldsOrThrow } = require('../../src/utils');

    it('should throw when validatedBody is undefined', () => {
      const req = {} as any;
      const callback = jest.fn();

      expect(() =>
        requireValidatedFieldsOrThrow(req, ['field1'], callback)
      ).toThrow();
    });

    it('should call callback when all fields exist', () => {
      const req = {
        validatedBody: { field1: 'value1', field2: 'value2' }
      } as any;
      const callback = jest.fn().mockReturnValue('success');

      const result = requireValidatedFieldsOrThrow(
        req,
        ['field1', 'field2'],
        callback
      );

      expect(callback).toHaveBeenCalled();
      expect(result).toBe('success');
    });

    it('should throw when a required field is missing', () => {
      const req = {
        validatedBody: { field1: 'value1' }
      } as any;
      const callback = jest.fn();

      expect(() =>
        requireValidatedFieldsOrThrow(req, ['field1', 'field2'], callback)
      ).toThrow();
    });
  });

  describe('getDefaultBaseDelay', () => {
    const { getDefaultBaseDelay } = require('../../src/utils');
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return value from environment variable when set', () => {
      process.env.MONGO_TRANSACTION_RETRY_BASE_DELAY = '500';
      expect(getDefaultBaseDelay()).toBe(500);
    });

    it('should return test default when in test environment and no env var', () => {
      delete process.env.MONGO_TRANSACTION_RETRY_BASE_DELAY;
      process.env.NODE_ENV = 'test';
      expect(getDefaultBaseDelay()).toBe(25);
    });

    it('should return production default when not in test environment', () => {
      delete process.env.MONGO_TRANSACTION_RETRY_BASE_DELAY;
      process.env.NODE_ENV = 'production';
      expect(getDefaultBaseDelay()).toBe(100);
    });

    it('should ignore invalid environment variable values', () => {
      process.env.MONGO_TRANSACTION_RETRY_BASE_DELAY = 'invalid';
      process.env.NODE_ENV = 'test';
      expect(getDefaultBaseDelay()).toBe(25);
    });
  });

  describe('sendApiMessageResponse', () => {
    const { sendApiMessageResponse } = require('../../src/utils');

    it('should send JSON response with status code', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      sendApiMessageResponse(200, { message: 'success' }, mockRes as any);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'success' });
    });

    it('should handle error responses', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      sendApiMessageResponse(500, { message: 'error', error: new Error('test') }, mockRes as any);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('sendRawJsonResponse', () => {
    const { sendRawJsonResponse } = require('../../src/utils');

    it('should send raw JSON response', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      sendRawJsonResponse(200, { data: 'test' }, mockRes as any);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ data: 'test' });
    });
  });

  describe('handleError', () => {
    it('should be defined', () => {
      const { handleError } = require('../../src/utils');
      expect(handleError).toBeDefined();
      expect(typeof handleError).toBe('function');
    });
  });

  describe('locatePEMRoot', () => {
    const { locatePEMRoot } = require('../../src/utils');
    const fs = require('fs');

    it('should reject paths with ..', () => {
      const result = locatePEMRoot('../etc/passwd');
      expect(result).toBeUndefined();
    });

    it('should reject paths outside current directory', () => {
      const result = locatePEMRoot('/etc');
      expect(result).toBeUndefined();
    });

    it('should return undefined if no PEM files found', () => {
      const mockReaddirSync = jest.spyOn(fs, 'readdirSync').mockReturnValue([]);
      
      const result = locatePEMRoot('./test');
      
      expect(result).toBeUndefined();
      mockReaddirSync.mockRestore();
    });

    it('should return undefined if less than 2 PEM files', () => {
      const mockReaddirSync = jest.spyOn(fs, 'readdirSync').mockReturnValue(['localhost+1.pem']);
      
      const result = locatePEMRoot('./test');
      
      expect(result).toBeUndefined();
      mockReaddirSync.mockRestore();
    });

    it('should find valid PEM root', () => {
      const mockReaddirSync = jest.spyOn(fs, 'readdirSync').mockReturnValue([
        'localhost+1.pem',
        'localhost+1-key.pem'
      ]);
      const mockExistsSync = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      
      const result = locatePEMRoot('./test');
      
      expect(result).toBeDefined();
      mockReaddirSync.mockRestore();
      mockExistsSync.mockRestore();
    });

    it('should reject files with path separators', () => {
      const mockReaddirSync = jest.spyOn(fs, 'readdirSync').mockReturnValue([
        '../localhost+1.pem',
        'localhost+1-key.pem'
      ]);
      
      const result = locatePEMRoot('./test');
      
      expect(result).toBeUndefined();
      mockReaddirSync.mockRestore();
    });

    it('should handle readdir errors', () => {
      const mockReaddirSync = jest.spyOn(fs, 'readdirSync').mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      const result = locatePEMRoot('./test');
      
      expect(result).toBeUndefined();
      mockReaddirSync.mockRestore();
    });
  });

  describe('omit', () => {
    const { omit } = require('../../src/utils');

    it('should omit single key', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = omit(obj, ['b']);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should omit multiple keys', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      const result = omit(obj, ['b', 'd']);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should handle empty omit array', () => {
      const obj = { a: 1, b: 2 };
      const result = omit(obj, []);
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should handle non-existent keys', () => {
      const obj = { a: 1, b: 2 };
      const result = omit(obj, ['c' as any]);
      expect(result).toEqual({ a: 1, b: 2 });
    });
  });

  describe('withTransaction', () => {
    const { withTransaction } = require('../../src/utils');

    it('should execute callback without transaction when useTransaction is false', async () => {
      const mockConnection = {} as any;
      const mockCallback = jest.fn().mockResolvedValue('result');

      const result = await withTransaction(
        mockConnection,
        false,
        undefined,
        mockCallback,
        {}
      );

      expect(result).toBe('result');
      expect(mockCallback).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should create and use session when useTransaction is true', async () => {
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        abortTransaction: jest.fn().mockResolvedValue(undefined),
        endSession: jest.fn().mockResolvedValue(undefined),
      };
      const mockClient = {
        startSession: jest.fn().mockReturnValue(mockSession),
      };
      const mockConnection = {
        getClient: jest.fn().mockReturnValue(mockClient),
      } as any;
      const mockCallback = jest.fn().mockResolvedValue('result');

      const result = await withTransaction(
        mockConnection,
        true,
        undefined,
        mockCallback,
        {}
      );

      expect(mockClient.startSession).toHaveBeenCalled();
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('should abort transaction on error', async () => {
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn().mockResolvedValue(undefined),
        inTransaction: jest.fn().mockReturnValue(true),
        endSession: jest.fn().mockResolvedValue(undefined),
      };
      const mockClient = {
        startSession: jest.fn().mockResolvedValue(mockSession),
      };
      const mockConnection = {
        getClient: jest.fn().mockReturnValue(mockClient),
      } as any;
      const mockCallback = jest.fn().mockRejectedValue(new Error('Test error'));

      await expect(
        withTransaction(mockConnection, true, undefined, mockCallback, {})
      ).rejects.toThrow('Test error');

      // Verify abort was called
      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });

    it('should use existing session when provided', async () => {
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        abortTransaction: jest.fn(),
        endSession: jest.fn().mockResolvedValue(undefined),
      };
      const mockClient = {};
      const mockConnection = {
        getClient: jest.fn().mockReturnValue(mockClient),
      } as any;
      const mockCallback = jest.fn().mockResolvedValue('result');

      const result = await withTransaction(
        mockConnection,
        false,
        mockSession as any,
        mockCallback,
        {}
      );

      expect(mockSession.startTransaction).not.toHaveBeenCalled();
      expect(mockSession.commitTransaction).not.toHaveBeenCalled();
      expect(mockSession.endSession).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(mockSession, undefined);
      expect(result).toBe('result');
    });

    it('should fall back to non-transactional if no client available', async () => {
      const mockConnection = {
        getClient: jest.fn().mockReturnValue(null),
      } as any;
      const mockCallback = jest.fn().mockResolvedValue('result');
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await withTransaction(
        mockConnection,
        true,
        undefined,
        mockCallback,
        { debugLogEnabled: true }
      );

      expect(result).toBe('result');
      
      consoleWarnSpy.mockRestore();
    });
  });
});
