/**
 * @fileoverview Validation builder for fluent validation chain construction.
 * Provides builder pattern for express-validator chains.
 * @module validation/validation-builder
 */

import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import {
  getSuiteCoreTranslation,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { body, ValidationChain } from 'express-validator';
import { IConstants } from '../interfaces';

/**
 * Field validator for building validation chains.
 * @template TLanguage - Language code type
 * @template TConstants - Constants type (defaults to IConstants)
 */
export class FieldValidator<
  TLanguage extends string,
  TConstants extends IConstants = IConstants,
> {
  private chain: ValidationChain;
  private language?: TLanguage;
  private constants?: TConstants;

  /**
   * Creates a new field validator.
   * @param {string} field - Field name to validate
   * @param {TLanguage} [language] - Language for error messages
   * @param {TConstants} [constants] - Constants for validation
   */
  constructor(field: string, language?: TLanguage, constants?: TConstants) {
    this.chain = body(field);
    this.language = language;
    this.constants = constants;
  }

  /**
   * Adds regex matching validation.
   * @param {RegExp | Function} regex - Regex or function returning regex
   * @returns {this} This validator for chaining
   */
  matches(regex: RegExp | ((constants: TConstants) => RegExp)): this {
    const actualRegex =
      typeof regex === 'function' && this.constants
        ? regex(this.constants)
        : (regex as RegExp);
    this.chain = this.chain.matches(actualRegex);
    return this;
  }

  /** Validates email format. @returns {this} This validator for chaining */
  isEmail(): this {
    this.chain = this.chain.isEmail();
    return this;
  }

  /** Validates string type. @returns {this} This validator for chaining */
  isString(): this {
    this.chain = this.chain.isString();
    return this;
  }

  /** Validates non-empty value. @returns {this} This validator for chaining */
  notEmpty(): this {
    this.chain = this.chain.notEmpty();
    return this;
  }

  /** Makes field optional. @returns {this} This validator for chaining */
  optional(): this {
    this.chain = this.chain.optional();
    return this;
  }

  /** Adds custom validator. @param {Function} validator - Custom validation function @returns {this} This validator for chaining */
  custom(validator: (value: unknown) => boolean): this {
    this.chain = this.chain.custom(validator);
    return this;
  }

  /** Validates string length. @param {object} options - Length options @returns {this} This validator for chaining */
  isLength(options: { min?: number; max?: number }): this {
    this.chain = this.chain.isLength(options);
    return this;
  }

  /** Validates value is in array. @param {unknown[]} values - Allowed values @returns {this} This validator for chaining */
  isIn(values: unknown[]): this {
    this.chain = this.chain.isIn(values);
    return this;
  }

  /** Sets error message. @param {SuiteCoreStringKey} key - Translation key @param {Record<string, string>} [params] - Message parameters @returns {this} This validator for chaining */
  withMessage(key: SuiteCoreStringKey, params?: Record<string, string>): this {
    const message = getSuiteCoreTranslation(
      key,
      params,
      this.language as CoreLanguageCode,
    );
    this.chain = this.chain.withMessage(message);
    return this;
  }

  /** Builds the validation chain. @returns {ValidationChain} Complete validation chain */
  build(): ValidationChain {
    return this.chain;
  }
}

/**
 * Validation builder for constructing multiple field validators.
 * @template TLanguage - Language code type
 * @template TConstants - Constants type (defaults to IConstants)
 */
export class ValidationBuilder<
  TLanguage extends string,
  TConstants extends IConstants = IConstants,
> {
  private validators: FieldValidator<TLanguage, TConstants>[] = [];
  private language?: TLanguage;
  private constants?: TConstants;

  /** Creates a new validation builder. @param {TLanguage} [language] - Language for messages @param {TConstants} [constants] - Constants @returns {ValidationBuilder} New builder instance */
  static create<T extends string, C extends IConstants = IConstants>(
    language?: T,
    constants?: C,
  ): ValidationBuilder<T, C> {
    return new ValidationBuilder<T, C>(language, constants);
  }

  /** Creates a new validation builder. @param {TLanguage} [language] - Language for messages @param {TConstants} [constants] - Constants */
  constructor(language?: TLanguage, constants?: TConstants) {
    this.language = language;
    this.constants = constants;
  }

  /** Creates a field validator. @param {string} field - Field name @returns {FieldValidator} Field validator instance */
  for(field: string): FieldValidator<TLanguage, TConstants> {
    const validator = new FieldValidator<TLanguage, TConstants>(
      field,
      this.language,
      this.constants,
    );
    this.validators.push(validator);
    return validator;
  }

  /** Builds all validation chains. @returns {ValidationChain[]} Array of validation chains */
  build(): ValidationChain[] {
    return this.validators.map((v) => v.build());
  }
}
