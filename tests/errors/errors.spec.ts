import { Result, ValidationError } from 'express-validator';
import { SymmetricErrorType } from '../../src/enumerations/symmetric-error-type';
import { ExpressValidationError } from '../../src/errors/express-validation';
import { InvalidBackupCodeVersionError } from '../../src/errors/invalid-backup-code-version';
import { InvalidJwtTokenError } from '../../src/errors/invalid-jwt-token';
import { InvalidModelError } from '../../src/errors/invalid-model';
import { InvalidNewPasswordError } from '../../src/errors/invalid-new-password';
import { InvalidPasswordError } from '../../src/errors/invalid-password';
import { MissingValidatedDataError } from '../../src/errors/missing-validated-data';
import { MnemonicOrPasswordRequiredError } from '../../src/errors/mnemonic-or-password-required';
import { ModelNotRegisteredError } from '../../src/errors/model-not-registered';
import { MongooseValidationError } from '../../src/errors/mongoose-validation';
import { SymmetricError } from '../../src/errors/symmetric';
import { TokenExpiredError } from '../../src/errors/token-expired';

describe('Error Classes', () => {
  describe('ExpressValidationError', () => {
    it('should create error with array of validation errors', () => {
      const errors: ValidationError[] = [
        { type: 'field', msg: 'Invalid', path: 'email', location: 'body' },
      ];
      const error = new ExpressValidationError(errors);
      expect(error.name).toBe('ExpressValidationError');
      expect(error.statusCode).toBe(422);
      expect(error.errors).toBe(errors);
    });

    it('should create error with Result object', () => {
      const result = {
        array: () => [
          { type: 'field', msg: 'Invalid', path: 'email', location: 'body' },
        ],
      } as Result<ValidationError>;
      const error = new ExpressValidationError(result);
      expect(error.errors).toBe(result);
    });
  });

  describe('InvalidBackupCodeVersionError', () => {
    it('should create error with version', () => {
      const error = new InvalidBackupCodeVersionError('v2');
      expect(error.version).toBe('v2');
    });
  });

  describe('InvalidJwtTokenError', () => {
    it('should create error', () => {
      const error = new InvalidJwtTokenError();
      expect(error).toBeDefined();
    });
  });

  describe('InvalidModelError', () => {
    it('should create error with model key', () => {
      const error = new InvalidModelError('User');
      expect(error.modelKey).toBe('User');
      expect(error.name).toBe('InvalidModelError');
    });
    it('should create error with model name', () => {
      const error = new ModelNotRegisteredError('User');
      expect(error.modelName).toBe('User');
      expect(error.name).toBe('ModelNotRegisteredError');
    });
  });

  describe('InvalidNewPasswordError', () => {
    it('should create error with default status 422', () => {
      const error = new InvalidNewPasswordError();
      expect(error.name).toBe('InvalidNewPasswordError');
      expect(error.statusCode).toBe(422);
    });

    it('should create error with custom status', () => {
      const error = new InvalidNewPasswordError('en', 400);
      expect(error.statusCode).toBe(400);
    });
  });

  describe('InvalidPasswordError', () => {
    it('should create error with default status 403', () => {
      const error = new InvalidPasswordError();
      expect(error.name).toBe('InvalidPasswordError');
      expect(error.statusCode).toBe(403);
    });

    it('should create error with custom status', () => {
      const error = new InvalidPasswordError('en', 401);
      expect(error.statusCode).toBe(401);
    });
  });

  describe('MissingValidatedDataError', () => {
    it('should create error without field', () => {
      const error = new MissingValidatedDataError();
      expect(error.name).toBe('MissingValidatedDataError');
      expect(error.statusCode).toBe(422);
      expect(error.field).toBe('');
    });

    it('should create error with single field', () => {
      const error = new MissingValidatedDataError('email');
      expect(error.field).toBe('email');
    });

    it('should create error with multiple fields', () => {
      const error = new MissingValidatedDataError(['email', 'password']);
      expect(error.field).toBe('email, password');
      expect(error.fields).toEqual(['email', 'password']);
    });
  });

  describe('MnemonicOrPasswordRequiredError', () => {
    it('should create error', () => {
      const error = new MnemonicOrPasswordRequiredError();
      expect(error).toBeDefined();
    });
  });

  describe('ModelNotRegisteredError', () => {
    it('should create error with model name', () => {
      const error = new ModelNotRegisteredError('User');
      expect(error.name).toBe('ModelNotRegisteredError');
    });
  });

  describe('MongooseValidationError', () => {
    it('should create error with validation errors', () => {
      const validationErrors = {
        email: {
          name: 'ValidatorError',
          message: 'Invalid email',
          path: 'email',
        } as any,
      };
      const error = new MongooseValidationError(validationErrors);
      expect(error.name).toBe('MongooseValidationError');
      expect(error.statusCode).toBe(422);
      expect(error.errors).toBe(validationErrors);
    });
  });

  describe('SymmetricError', () => {
    it('should create error for null data', () => {
      const error = new SymmetricError(SymmetricErrorType.DataNullOrUndefined);
      expect(error.name).toBe('SymmetricError');
    });

    it('should create error for invalid key length', () => {
      const error = new SymmetricError(SymmetricErrorType.InvalidKeyLength);
      expect(error.name).toBe('SymmetricError');
    });
  });

  describe('TokenExpiredError', () => {
    it('should create error', () => {
      const error = new TokenExpiredError();
      expect(error).toBeDefined();
    });
  });
});
