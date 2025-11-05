import { ValidationBuilder, FieldValidator } from '../../src/validation/validation-builder';
import { SuiteCoreStringKey, initSuiteCoreI18nEngine } from '@digitaldefiance/suite-core-lib';
import { LanguageCodes, LanguageRegistry } from '@digitaldefiance/i18n-lib';
import { IConstants } from '../../src/interfaces';

describe('ValidationBuilder', () => {
  beforeAll(() => {
    // Initialize i18n system
    LanguageRegistry['languages'].clear();
    LanguageRegistry.registerLanguage({ id: 'en', code: 'en', name: 'English', isDefault: true });
    LanguageRegistry.setDefaultLanguage('en');
    initSuiteCoreI18nEngine();
  });
  describe('FieldValidator', () => {
    it('should create validator for field', () => {
      const validator = new FieldValidator('username');
      const chain = validator.build();
      expect(chain).toBeDefined();
    });

    it('should chain matches validation', () => {
      const validator = new FieldValidator('username');
      const result = validator.matches(/^[a-z]+$/);
      expect(result).toBe(validator);
    });

    it('should chain isEmail validation', () => {
      const validator = new FieldValidator('email');
      const result = validator.isEmail();
      expect(result).toBe(validator);
    });

    it('should chain isString validation', () => {
      const validator = new FieldValidator('name');
      const result = validator.isString();
      expect(result).toBe(validator);
    });

    it('should chain notEmpty validation', () => {
      const validator = new FieldValidator('field');
      const result = validator.notEmpty();
      expect(result).toBe(validator);
    });

    it('should chain optional validation', () => {
      const validator = new FieldValidator('field');
      const result = validator.optional();
      expect(result).toBe(validator);
    });

    it('should chain custom validation', () => {
      const validator = new FieldValidator('field');
      const result = validator.custom((value) => value === 'test');
      expect(result).toBe(validator);
    });

    it('should chain isLength validation', () => {
      const validator = new FieldValidator('field');
      const result = validator.isLength({ min: 3, max: 10 });
      expect(result).toBe(validator);
    });

    it('should chain isIn validation', () => {
      const validator = new FieldValidator('field');
      const result = validator.isIn(['a', 'b', 'c']);
      expect(result).toBe(validator);
    });

    it('should add message with translation key', () => {
      const validator = new FieldValidator('username', LanguageCodes.EN_US);
      validator.isString(); // Initialize chain first
      const result = validator.withMessage(SuiteCoreStringKey.Validation_InvalidUsername);
      expect(result).toBe(validator);
    });

    it('should add message with params', () => {
      const validator = new FieldValidator('field', LanguageCodes.EN_US);
      validator.isString(); // Initialize chain first
      const result = validator.withMessage(
        SuiteCoreStringKey.Error_ServiceIsNotRegisteredTemplate,
        { key: 'test' }
      );
      expect(result).toBe(validator);
    });

    it('should support regex from constants', () => {
      const constants: IConstants = {
        usernameRegex: /^[a-z0-9]+$/,
        passwordRegex: /^.{8,}$/,
        emailRegex: /^.+@.+$/,
      };
      
      const validator = new FieldValidator('username', undefined, constants);
      const result = validator.matches((c) => c.usernameRegex);
      expect(result).toBe(validator);
    });

    it('should chain multiple validations', () => {
      const validator = new FieldValidator('email', LanguageCodes.EN_US);
      const result = validator
        .isString()
        .notEmpty()
        .isEmail()
        .withMessage(SuiteCoreStringKey.Validation_InvalidUsername);
      
      expect(result).toBe(validator);
    });
  });

  describe('ValidationBuilder', () => {
    it('should create builder with static method', () => {
      const builder = ValidationBuilder.create();
      expect(builder).toBeInstanceOf(ValidationBuilder);
    });

    it('should create builder with language', () => {
      const builder = ValidationBuilder.create(LanguageCodes.EN_US);
      expect(builder).toBeInstanceOf(ValidationBuilder);
    });

    it('should create builder with constants', () => {
      const constants: IConstants = {
        usernameRegex: /^[a-z]+$/,
        passwordRegex: /^.{8,}$/,
        emailRegex: /^.+@.+$/,
      };
      const builder = ValidationBuilder.create(LanguageCodes.EN_US, constants);
      expect(builder).toBeInstanceOf(ValidationBuilder);
    });

    it('should create field validator', () => {
      const builder = ValidationBuilder.create();
      const validator = builder.for('username');
      expect(validator).toBeInstanceOf(FieldValidator);
    });

    it('should build validation chains', () => {
      const builder = ValidationBuilder.create();
      builder.for('username').isString().notEmpty();
      builder.for('email').isEmail();
      
      const chains = builder.build();
      expect(chains).toHaveLength(2);
    });

    it('should support fluent API', () => {
      const builder = ValidationBuilder.create(LanguageCodes.EN_US);
      
      builder
        .for('username')
        .isString()
        .notEmpty()
        .matches(/^[a-z]+$/)
        .withMessage(SuiteCoreStringKey.Validation_InvalidUsername);
      
      builder
        .for('email')
        .isEmail()
        .withMessage(SuiteCoreStringKey.Validation_InvalidUsername);
      
      const chains = builder.build();
      expect(chains).toHaveLength(2);
    });

    it('should pass language to field validators', () => {
      const builder = ValidationBuilder.create(LanguageCodes.EN_US);
      const validator = builder.for('field');
      expect(validator).toBeInstanceOf(FieldValidator);
    });

    it('should pass constants to field validators', () => {
      const constants: IConstants = {
        usernameRegex: /^[a-z]+$/,
        passwordRegex: /^.{8,}$/,
        emailRegex: /^.+@.+$/,
      };
      const builder = ValidationBuilder.create(LanguageCodes.EN_US, constants);
      const validator = builder.for('field');
      expect(validator).toBeInstanceOf(FieldValidator);
    });

    it('should handle empty builder', () => {
      const builder = ValidationBuilder.create();
      const chains = builder.build();
      expect(chains).toHaveLength(0);
    });

    it('should support complex validation scenarios', () => {
      const constants: IConstants = {
        usernameRegex: /^[a-z0-9_]{3,20}$/,
        passwordRegex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
        emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      };
      
      const builder = ValidationBuilder.create(LanguageCodes.EN_US, constants);
      
      builder
        .for('username')
        .isString()
        .notEmpty()
        .matches((c) => c.usernameRegex)
        .withMessage(SuiteCoreStringKey.Validation_InvalidUsername);
      
      builder
        .for('email')
        .isString()
        .notEmpty()
        .isEmail()
        .withMessage(SuiteCoreStringKey.Validation_InvalidUsername);
      
      builder
        .for('password')
        .isString()
        .notEmpty()
        .matches((c) => c.passwordRegex)
        .withMessage(SuiteCoreStringKey.Validation_PasswordTooWeak);
      
      builder
        .for('confirmPassword')
        .isString()
        .notEmpty()
        .custom((value) => value === 'password')
        .withMessage(SuiteCoreStringKey.Validation_InvalidUsername);
      
      const chains = builder.build();
      expect(chains).toHaveLength(4);
    });
  });
});
