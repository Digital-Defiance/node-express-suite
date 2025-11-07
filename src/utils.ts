/// <reference path="./types.d.ts" />
import { I18nEngine } from '@digitaldefiance/i18n-lib';
import { NextFunction, Request, Response } from 'express';
import { Result, ValidationError } from 'express-validator';
import { existsSync, readdirSync } from 'fs';
import { ClientSession, Connection, Types } from 'mongoose';
import { resolve } from 'path';
import { z, ZodType } from 'zod';
import { ExpressValidationError } from './errors/express-validation';
import { MongooseValidationError } from './errors/mongoose-validation';
import { IApiErrorResponse, IApplication } from './interfaces';
import { IApiExpressValidationErrorResponse } from './interfaces/api-express-validation-error-response';
import { IApiMongoValidationErrorResponse } from './interfaces/api-mongo-validation-error-response';
import { IMongoErrors } from './interfaces/mongo-errors';
import { RequiredStringKeys } from './interfaces/required-string-keys';
import { ApiResponse, SendFunction, TransactionCallback } from './types';

export type DEBUG_TYPE = 'error' | 'warn' | 'log';

/**
 * Optionally prints certain debug messages
 * @param debug Whether to print debug messages
 * @param type What type of message to print
 * @param args Any args to print
 */
export function debugLog(
  debug: boolean,
  type: DEBUG_TYPE = 'log',
  ...args: any[]
): void {
  if (debug && type === 'error') {
    console.error(...args);
  } else if (debug && type === 'warn') {
    console.warn(...args);
  } else if (debug && type === 'log') {
    console.log(...args);
  }
}

// Helper: get value at a dotted path from an object
export function getValueAtPath(obj: unknown, path: (string | number)[]) {
  return path.reduce<any>((acc, key) => {
    if (acc == null) return undefined;
    try {
      return (acc as any)[key as any];
    } catch {
      return undefined;
    }
  }, obj);
}

// Helper: map Zod issues to express-validator ValidationError[]
export function mapZodIssuesToValidationErrors(
  issues: z.ZodError<unknown>['issues'],
  source: unknown,
  location: 'body' | 'cookies' | 'headers' | 'params' | 'query' = 'body',
): ValidationError[] {
  return issues.map((issue) => ({
    type: 'field',
    location,
    path: issue.path
      .filter((p) => typeof p === 'string' || typeof p === 'number')
      .join('.'),
    value: getValueAtPath(source, issue.path as (string | number)[]),
    msg: issue.message,
  }));
}

/**
 * Verifies the required fields were validated by express-validator and sends an error response if not or calls the callback if they are
 * @param req The request object
 * @param fields The fields to check
 * @param callback The callback to call if the fields are valid
 * @returns The result of the callback
 */
export async function requireValidatedFieldsAsync<
  T extends ZodType<any, any, any>,
  TResult = void,
>(
  req: Request,
  schema: T,
  callback: (data: z.output<T>) => Promise<TResult>,
): Promise<TResult> {
  if (req.validatedBody === undefined) {
    throw new MissingValidatedDataError();
  }

  try {
    const validatedData = schema.parse(req.validatedBody) as z.output<T>;
    return await callback(validatedData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ExpressValidationError(
        mapZodIssuesToValidationErrors(
          error.issues,
          req.validatedBody ?? {},
          'body',
        ),
      );
    }
    throw error;
  }
}

/**
 * Verifies at least one of the required fields were validated by express-validator and sends an error response if not or calls the callback if they are
 * @param req The request object
 * @param fields The fields to check
 * @param callback The callback to call if the fields are valid
 * @returns The result of the callback
 */
export async function requireOneOfValidatedFieldsAsync<T = void>(
  req: Request,
  fields: string[],
  callback: () => Promise<T>,
): Promise<T> {
  if (req.validatedBody === undefined) {
    throw new MissingValidatedDataError();
  }
  const validatedBody = req.validatedBody;
  if (!fields.some((field) => validatedBody?.[field] !== undefined)) {
    throw new MissingValidatedDataError(fields);
  }
  return await callback();
}

/**
 * Verifies the required fields were validated by express-validator and throws an error if not or calls the callback if they are
 * @param req The request object
 * @param fields The fields to check
 * @param callback The callback to call if the fields are valid
 * @returns The result of the callback
 */
export function requireValidatedFieldsOrThrow<T = void>(
  req: Request,
  fields: string[],
  callback: () => T,
): T {
  if (req.validatedBody === undefined) {
    throw new MissingValidatedDataError();
  }
  const validatedBody = req.validatedBody;
  fields.forEach((field) => {
    if (validatedBody[field] === undefined) {
      throw new MissingValidatedDataError(field);
    }
  });
  return callback();
}

/**
 * Checks if the given id is a valid string id
 * @param id The id to check
 * @returns True if the id is a valid string id
 */
export function isValidStringId(id: unknown): boolean {
  return typeof id === 'string' && Types.ObjectId.isValid(id);
}

/**
 * The default number of retry attempts for transactions
 * Use fewer retries in test environment for faster feedback
 */
export const DEFAULT_RETRY_ATTEMPTS =
  process.env['NODE_ENV'] === 'test' ? 2 : 3;
/**
 * The default transaction timeout in milliseconds
 * Use shorter timeout in test environment for faster failure detection
 */
export const DEFAULT_TRANSACTION_TIMEOUT =
  process.env['NODE_ENV'] === 'test' ? 15000 : 60000;

/**
 * The default transaction lock request timeout in milliseconds
 */
export const DEFAULT_TRANSACTION_LOCK_REQUEST_TIMEOUT =
  process.env['NODE_ENV'] === 'test' ? 10000 : 30000;

export interface TransactionOptions {
  application?: IApplication;
  timeoutMs?: number;
  retryAttempts?: number;
  baseDelay?: number;
  debugLogEnabled?: boolean;
}

/**
 * Gets the default base delay for transaction retries from environment variables
 * @returns The base delay in milliseconds
 */
export function getDefaultBaseDelay(): number {
  const envValue = process.env['MONGO_TRANSACTION_RETRY_BASE_DELAY'];
  if (envValue) {
    const parsed = parseInt(envValue);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  // Fallback to hardcoded values if environment variable is not set or invalid
  return process.env['NODE_ENV'] === 'test' ? 25 : 100;
}

/**
 * Wraps a callback in a transaction if necessary
 * @param connection The mongoose connection
 * @param useTransaction Whether to use a transaction
 * @param session The session to use
 * @param callback The callback to wrap
 * @param options Transaction options including timeout and retry attempts
 * @param args The arguments to pass to the callback
 * @returns The result of the callback
 */
export async function withTransaction<T>(
  connection: Connection,
  useTransaction: boolean,
  session: ClientSession | undefined,
  callback: TransactionCallback<T>,
  options: TransactionOptions = {},
  ...args: any
): Promise<T> {
  const engine = getSuiteCoreI18nEngine(options.application ? { constants: options.application.constants } : undefined);
  const isTestEnvironment = process.env['NODE_ENV'] === 'test';
  const {
    timeoutMs = DEFAULT_TRANSACTION_TIMEOUT,
    retryAttempts = DEFAULT_RETRY_ATTEMPTS, // Use consistent retry attempts
    baseDelay = getDefaultBaseDelay(),
    debugLogEnabled,
  } = options;
  if (!useTransaction) {
    return await callback(session, undefined, ...args);
  }
  const needSession = useTransaction && session === undefined;
  const client = connection.getClient();
  if (!client) {
    // If no client is available, fall back to non-transactional execution
    debugLog(
      debugLogEnabled === true,
      'warn',
      engine.translate(
        SuiteCoreComponentId,
        SuiteCoreStringKey.Admin_NoMongoDbClientFoundFallingBack,
      ),
    );
    return await callback(session, undefined, ...args);
  }

  let attempt = 0;
  while (attempt < retryAttempts) {
    const s = needSession ? await client.startSession() : session;
    try {
      if (needSession && s !== undefined) {
        await s.startTransaction({
          maxCommitTimeMS: timeoutMs,
        });
      }

      // Race the callback against the timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(
              engine.translate(
                SuiteCoreComponentId,
                SuiteCoreStringKey.Admin_TransactionTimeoutTemplate,
                { timeMs: timeoutMs },
              ),
            ),
          );
        }, timeoutMs);
      });

      const result = await Promise.race([callback(s, ...args), timeoutPromise]);

      if (needSession && s !== undefined) await s.commitTransaction();
      return result;
    } catch (error: any) {
      if (needSession && s !== undefined && s.inTransaction())
        await s.abortTransaction();

      // Check if this is a transient transaction error that can be retried
      const isTransientError =
        error?.errorLabelSet?.has('TransientTransactionError') ||
        error?.errorLabelSet?.has('UnknownTransactionCommitResult') ||
        error?.code === 251 || // NoSuchTransaction
        error?.code === 112 || // WriteConflict
        error?.code === 11000 || // DuplicateKey - very common in concurrent initialization
        error?.code === 16500 || // TransactionAborted
        error?.code === 244 || // TransactionTooOld
        error?.code === 246 || // ExceededTimeLimit
        error?.code === 13436 || // TransactionTooLargeForCache
        error?.code === 50 || // MaxTimeMSExpired
        error?.message?.includes('Transaction') ||
        error?.message?.includes('aborted') ||
        error?.message?.includes('WriteConflict') ||
        error?.message?.includes('NoSuchTransaction') ||
        error?.message?.includes('TransactionTooOld') ||
        error?.message?.includes('ExceededTimeLimit') ||
        error?.message?.includes('duplicate key error') ||
        error?.message?.includes('E11000') ||
        (error?.code === 11000 && error?.message?.includes('duplicate')); // More specific duplicate key handling

      if (isTransientError && attempt < retryAttempts - 1) {
        attempt++;
        const jitter = Math.random() * 0.3; // Reduced jitter
        const actualBaseDelay = isTestEnvironment
          ? Math.floor(baseDelay * 0.5)
          : baseDelay; // Shorter base delay in tests
        const delay = Math.floor(
          actualBaseDelay * (1 + attempt * 0.5) * (1 + jitter),
        ); // Linear backoff instead of exponential
        debugLog(
          debugLogEnabled === true,
          'warn',
          engine.translate(
            SuiteCoreComponentId,
            SuiteCoreStringKey.Admin_TransactionFailedTransientTemplate,
            {
              delayMs: delay,
              attempt,
              attempts: retryAttempts,
            },
            undefined,
          ),
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    } finally {
      if (needSession && s !== undefined) await s.endSession();
    }
  }

  const jitter = Math.random() * 0.3; // Reduced jitter
  const actualBaseDelay = isTestEnvironment
    ? Math.floor(baseDelay * 0.5)
    : baseDelay; // Shorter base delay in tests
  const delay = Math.floor(
    actualBaseDelay * (1 + attempt * 0.5) * (1 + jitter),
  ); // Linear backoff instead of exponential

  throw new TranslatableSuiteError(
    SuiteCoreStringKey.Admin_TransactionFailedTransientTemplate,
    {
      delayMs: delay,
      attempt,
      attempts: retryAttempts,
    },
  );
}

/**
 * Sends an API response with the given status and response object.
 * @param status
 * @param response
 * @param res
 */
export function sendApiMessageResponse<T extends ApiResponse>(
  status: number,
  response: T,
  res: Response<T>,
): void {
  res.status(status).json(response);
}

/**
 * Sends an API response with the given status, message, and error.
 * @param status
 * @param message
 * @param error
 * @param res
 */
export function sendApiErrorResponse(
  status: number,
  message: string,
  error: unknown,
  res: Response,
): void {
  sendApiMessageResponse<IApiErrorResponse>(status, { message, error }, res);
}

/**
 * Sends an API response with the given status and validation errors.
 * @param status
 * @param errors
 * @param res
 */
export function sendApiExpressValidationErrorResponse(
  status: number,
  errors: ValidationError[],
  res: Response,
  application?: IApplication,
): void {
  const engine = getSuiteCoreI18nEngine(application ? { constants: application.constants } : undefined);
  sendApiMessageResponse<IApiExpressValidationErrorResponse>(
    status,
    {
      message: engine.translate(
        SuiteCoreComponentId,
        SuiteCoreStringKey.ValidationError,
      ),
      errors,
    },
    res,
  );
}

/**
 * Sends an API response with the given status, message, and MongoDB validation errors.
 * @param status
 * @param message
 * @param errors
 * @param res
 */
export function sendApiMongoValidationErrorResponse(
  status: number,
  message: string,
  errors: IMongoErrors,
  res: Response,
): void {
  sendApiMessageResponse<IApiMongoValidationErrorResponse>(
    status,
    { message, errors },
    res,
  );
}

/**
 * Sends a raw JSON response with the given status and response object.
 * @param status The status code
 * @param response The response data
 * @param res The response object
 */
export function sendRawJsonResponse<T>(
  status: number,
  response: T,
  res: Response<T>,
) {
  res.status(status).json(response);
}

function isRecursiveError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    '_handlingInProgress' in error &&
    !!(error as any)._handlingInProgress
  );
}

function markErrorAsHandling(error: unknown): void {
  if (error && typeof error === 'object') {
    (error as { _handlingInProgress?: boolean })._handlingInProgress = true;
  }
}

function getSafeErrorMessage(message?: string, application?: IApplication): string {
  if (message && typeof message === 'string' && message.trim() !== '') {
    return message;
  }
  const engine = getSuiteCoreI18nEngine(application ? { constants: application.constants } : undefined);
  try {
    const translated = engine.translate(
      SuiteCoreComponentId,
      SuiteCoreStringKey.Common_UnexpectedError,
    );
    return translated &&
      typeof translated === 'string' &&
      translated.trim() !== ''
      ? translated
      : 'An unexpected error occurred';
  } catch {
    return 'An unexpected error occurred';
  }
}

function convertToHandleableError(error: unknown): {
  handleableError: HandleableError;
  alreadyHandled: boolean;
  errorType: string;
} {
  if (error instanceof HandleableError) {
    return {
      handleableError: error,
      alreadyHandled: error.handled,
      errorType: error.name,
    };
  }
  if (error instanceof Error) {
    return {
      handleableError: new HandleableError(error),
      alreadyHandled: false,
      errorType: error.name,
    };
  }
  const unknownMessage = getSafeErrorMessage(
    typeof error === 'object' &&
      error !== null &&
      'message' in (error as object)
      ? ((error as Record<string, unknown>)['message'] as string | undefined)
      : undefined,
  );
  const unknownError = new Error(unknownMessage);
  return {
    handleableError: new HandleableError(unknownError, { sourceData: error }),
    alreadyHandled: false,
    errorType: 'UnexpectedError',
  };
}

function sendErrorResponse<TStringKey extends keyof RequiredStringKeys>(
  error: unknown,
  handleableError: HandleableError,
  errorType: string,
  send: SendFunction<
    | IApiErrorResponse
    | IApiExpressValidationErrorResponse
    | IApiMongoValidationErrorResponse
  >,
  res: Response,
): void {
  const engine = I18nEngine.getInstance();
  if (error instanceof ExpressValidationError) {
    // amazonq-ignore-next-line false positive
    send(
      handleableError.statusCode,
      {
        message: engine.translate('core', 'ValidationError' as TStringKey),
        errors:
          error.errors instanceof Result ? error.errors.array() : error.errors,
        errorType: 'ExpressValidationError',
      },
      res,
    );
  } else if (error instanceof MongooseValidationError) {
    // amazonq-ignore-next-line false positive
    send(
      handleableError.statusCode,
      {
        message: engine.translate('core', 'ValidationError' as TStringKey),
        errors: error.errors,
        errorType: 'MongooseValidationError',
      },
      res,
    );
  } else {
    // amazonq-ignore-next-line false positive
    send(
      handleableError.statusCode,
      {
        message: handleableError.message,
        error: handleableError,
        errorType: errorType,
      },
      res,
    );
  }
}

export function handleError(
  error: unknown,
  res: Response,
  send: SendFunction<
    | IApiErrorResponse
    | IApiExpressValidationErrorResponse
    | IApiMongoValidationErrorResponse
  >,
  next: NextFunction,
): void {
  if (isRecursiveError(error)) {
    const fallbackError = new HandleableError(
      new Error('Recursive error handling detected'),
    );
    // amazonq-ignore-next-line false positive
    send(
      fallbackError.statusCode,
      {
        message: fallbackError.message,
        error: fallbackError,
        errorType: 'RecursiveError',
      },
      res,
    );
    return;
  }

  markErrorAsHandling(error);
  const { handleableError, alreadyHandled, errorType } =
    convertToHandleableError(error);

  if (!(error instanceof ExpressValidationError)) {
    console.error(
      '[handleError]',
      'type=' + errorType.replace(/[\r\n]/g, ''),
      'status=' + String(handleableError.statusCode).replace(/[\r\n]/g, ''),
      'message=' + (handleableError.message || '').replace(/[\r\n]/g, ''),
    );
  }

  if (!res.headersSent) {
    sendErrorResponse(error, handleableError, errorType, send, res);
    handleableError.handled = true;
  }

  if (!alreadyHandled) {
    handleableError.handled = true;
    next(handleableError);
  }
}

export function locatePEMRoot(devRootDir: string): string | undefined {
  try {
    const normalizedDir = resolve(devRootDir);
    if (
      normalizedDir.includes('..') ||
      !normalizedDir.startsWith(resolve('.'))
    ) {
      return undefined;
    }
    const files = readdirSync(normalizedDir);
    const pemFiles = files.filter(
      (file: string) =>
        // Prevent path traversal by rejecting files with path separators
        !file.includes('/') &&
        !file.includes('\\') &&
        !file.includes('..') &&
        (file.match(/localhost\+\d+-key\.pem$/) ||
          file.match(/localhost\+\d+\.pem$/)),
    );
    if (pemFiles.length < 2) {
      return undefined;
    }
    const roots = pemFiles.map((file: string) => {
      const resolved = resolve(normalizedDir, file);
      if (!resolved.startsWith(normalizedDir)) {
        return undefined;
      }
      const result = /(.*)\/(localhost\+\d+)(.*)\.pem/.exec(resolved);
      return result ? `${result[1]}/${result[2]}` : undefined;
    });
    if (roots.some((root) => root !== roots[0])) {
      return undefined;
    }
    if (!existsSync(roots[0] + '.pem') || !existsSync(roots[0] + '-key.pem')) {
      return undefined;
    }
    return roots[0]!;
  } catch {
    return undefined;
  }
}

/**
 * Encodes the length of the data in the buffer
 * @param buffer The buffer to encode
 * @returns The encoded buffer
 */
export function lengthEncodeData(buffer: Buffer): Buffer {
  const lengthType: LengthEncodingType = getLengthEncodingTypeForLength(
    buffer.length,
  );
  const lengthTypeSize: number = getLengthForLengthType(lengthType);
  const result: Buffer = Buffer.alloc(1 + lengthTypeSize + buffer.length);
  result.writeUInt8(lengthType, 0);
  switch (lengthType) {
    case LengthEncodingType.UInt8:
      result.writeUInt8(buffer.length, 1);
      break;
    case LengthEncodingType.UInt16:
      result.writeUInt16BE(buffer.length, 1);
      break;
    case LengthEncodingType.UInt32:
      result.writeUInt32BE(buffer.length, 1);
      break;
    case LengthEncodingType.UInt64:
      result.writeBigUInt64BE(BigInt(buffer.length), 1);
      break;
  }
  buffer.copy(result, 1 + lengthTypeSize);
  return result;
}

export function decodeLengthEncodedData(buffer: Buffer): {
  data: Buffer;
  totalLength: number;
} {
  if (buffer.length < 1) {
    throw new RangeError('Buffer is too short to read length type.');
  }
  const lengthType: LengthEncodingType = getLengthEncodingTypeFromValue(
    buffer.readUint8(0),
  );
  const lengthTypeSize: number = getLengthForLengthType(lengthType);

  if (buffer.length < 1 + lengthTypeSize) {
    throw new RangeError('Buffer is too short to read the full length value.');
  }

  let length: number | BigInt;
  switch (lengthType) {
    case LengthEncodingType.UInt8:
      length = buffer.readUint8(1);
      break;
    case LengthEncodingType.UInt16:
      length = buffer.readUint16BE(1);
      break;
    case LengthEncodingType.UInt32:
      length = buffer.readUint32BE(1);
      break;
    case LengthEncodingType.UInt64:
      length = buffer.readBigUInt64BE(1);
      if (Number(length) > Number.MAX_SAFE_INTEGER) {
        throw new RangeError('Length exceeds maximum safe integer value');
      }
      break;
    default:
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_LengthIsInvalidType,
      );
  }

  const totalLength = 1 + lengthTypeSize + Number(length);
  if (totalLength > buffer.length) {
    throw new RangeError('Buffer is too short for declared data length');
  }
  return {
    data: buffer.subarray(1 + lengthTypeSize, totalLength),
    totalLength,
  };
}

import { HandleableError } from '@digitaldefiance/i18n-lib';
import {
  getSuiteCoreI18nEngine,
  SuiteCoreComponentId,
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';
import moment from 'moment-timezone';
import { BackupCode } from './backup-code';
import { LengthEncodingType } from './enumerations/length-encoding-type';
import { MissingValidatedDataError } from './errors';

export function isValidTimezone(timezone: string): boolean {
  return moment.tz.zone(timezone) !== null;
}

/**
 * Omits keys from an object
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const keysToOmit = new Set(keys);
  return Object.keys(obj).reduce((result, key) => {
    if (!keysToOmit.has(key as K)) {
      result[key as keyof T] = obj[key as keyof T];
    }
    return result;
  }, {} as T) as Omit<T, K>;
}

/**
 * Validates that a collection contains exactly the keys from an enum
 * @param collection The collection to validate
 * @param enumObject The enum object to validate against
 * @param collectionName Optional name for the collection (for better error messages)
 * @param enumName Optional name for the enum (for better error messages)
 * @throws Error if collection has missing, extra, or invalid keys
 */
export function validateEnumCollection<T extends Record<string, any>>(
  collection: Record<string, unknown>,
  enumObject: T,
  collectionName?: string,
  enumName?: string,
): void {
  // For numeric enums, filter out reverse mappings (number -> string)
  const enumKeys = Object.keys(enumObject).filter((key) => isNaN(Number(key)));
  const allEnumValues = enumKeys.map((key) => enumObject[key]);
  const collectionKeys = Object.keys(collection);

  const collectionLabel = collectionName || 'Collection';
  const enumLabel = enumName || `enum with keys [${enumKeys.join(', ')}]`;

  if (collectionKeys.length !== allEnumValues.length) {
    throw new Error(
      `${collectionLabel} must contain exactly ${
        allEnumValues.length
      } keys to match ${enumLabel}. Found ${
        collectionKeys.length
      } keys: [${collectionKeys.join(', ')}]`,
    );
  }

  const invalidKeys = collectionKeys.filter(
    (key) => !allEnumValues.includes(key),
  );
  if (invalidKeys.length > 0) {
    throw new Error(
      `${collectionLabel} contains invalid keys for ${enumLabel}: [${invalidKeys.join(
        ', ',
      )}]. Valid keys are: [${allEnumValues.join(', ')}]`,
    );
  }

  const missingKeys = allEnumValues.filter((value) => !(value in collection));
  if (missingKeys.length > 0) {
    throw new Error(
      `${collectionLabel} is missing required keys for ${enumLabel}: [${missingKeys.join(
        ', ',
      )}]`,
    );
  }
}

export function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binaryString = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binaryString += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binaryString);
}

export function base64ToUint8Array(base64String: string): Uint8Array {
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function uint8ArrayToHex(uint8Array: Uint8Array): string {
  return Array.from(uint8Array)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToUint8Array(hexString: string): Uint8Array {
  const len = hexString.length;
  const bytes = new Uint8Array(len / 2);
  for (let i = 0; i < len; i += 2) {
    bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Utility functions for browser ECIES implementation
 */

/**
 * CRC16-CCITT implementation for data integrity checking
 * Uses the same algorithm as the server-side implementation (CRC16-CCITT-FALSE)
 */
export function crc16(data: Uint8Array): Uint8Array {
  let crc = 0xffff; // Initial value for CRC16-CCITT-FALSE
  const polynomial = 0x1021; // CRC16-CCITT polynomial

  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc = crc << 1;
      }
      crc &= 0xffff; // Keep it 16-bit
    }
  }

  const result = new Uint8Array(2);
  result[0] = (crc >>> 8) & 0xff; // Big-endian
  result[1] = crc & 0xff;
  return result;
}

/**
 * Convert string to Uint8Array (UTF-8 encoding)
 */
export function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Convert Uint8Array to string (UTF-8 decoding)
 */
export function uint8ArrayToString(array: Uint8Array): string {
  return new TextDecoder().decode(array);
}

/**
 * Secure random bytes generation
 */
export function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Compare two Uint8Arrays for equality
 */
export function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Concatenate multiple Uint8Arrays
 */
export function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }
  return result;
}

/**
 * Get the length encoding type for a given length
 * @param length The length to evaluate
 * @returns The corresponding LengthEncodingType
 */
export function getLengthEncodingTypeForLength(
  length: number | BigInt,
): LengthEncodingType {
  if (typeof length === 'number') {
    if (length < 256) {
      return LengthEncodingType.UInt8;
    } else if (length < 65536) {
      return LengthEncodingType.UInt16;
    } else if (length < 4294967296) {
      return LengthEncodingType.UInt32;
    } else if (length < Number.MAX_SAFE_INTEGER) {
      return LengthEncodingType.UInt64;
    } else {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_LengthExceedsMaximum,
      );
    }
  } else if (typeof length === 'bigint') {
    if (length < 256n) {
      return LengthEncodingType.UInt8;
    } else if (length < 65536n) {
      return LengthEncodingType.UInt16;
    } else if (length < 4294967296n) {
      return LengthEncodingType.UInt32;
    } else if (length < 18446744073709551616n) {
      return LengthEncodingType.UInt64;
    } else {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_LengthExceedsMaximum,
      );
    }
  } else {
    throw new TranslatableSuiteError(
      SuiteCoreStringKey.Error_LengthIsInvalidType,
    );
  }
}

/**
 * Get the length encoding type for a given value
 * @param value The value to evaluate
 * @returns The corresponding LengthEncodingType
 */
export function getLengthEncodingTypeFromValue(
  value: number,
): LengthEncodingType {
  for (const length of Object.values(LengthEncodingType)) {
    if (length === value) {
      return length;
    }
  }
  throw new TranslatableSuiteError(
    SuiteCoreStringKey.Error_LengthIsInvalidType,
  );
}

/**
 * Get the length in bytes for a given LengthEncodingType
 * @param type The LengthEncodingType to evaluate
 * @returns The length in bytes
 */
export function getLengthForLengthType(type: LengthEncodingType): number {
  switch (type) {
    case LengthEncodingType.UInt8:
      return 1;
    case LengthEncodingType.UInt16:
      return 2;
    case LengthEncodingType.UInt32:
      return 4;
    case LengthEncodingType.UInt64:
      return 8;
    default:
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Error_LengthIsInvalidType,
      );
  }
}

export function parseBackupCodes(
  user: 'admin' | 'member' | 'system',
  environment: object,
): BackupCode[] {
  const envVarMap: Record<'admin' | 'member' | 'system', string> = {
    admin: 'ADMIN_BACKUP_CODES',
    member: 'MEMBER_BACKUP_CODES',
    system: 'SYSTEM_BACKUP_CODES',
  };
  const envVar = envVarMap[user];
  const backupCodes =
    (environment as any)[envVar]
      ?.split(',')
      .map((code: string) => new BackupCode(code.trim())) || [];
  return backupCodes;
}
