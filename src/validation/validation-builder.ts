import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import {
  getSuiteCoreTranslation,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { body, ValidationChain } from 'express-validator';
import { IConstants } from '../interfaces';

export class FieldValidator<
  TLanguage extends string,
  TConstants extends IConstants = IConstants,
> {
  private chain: ValidationChain;
  private language?: TLanguage;
  private constants?: TConstants;

  constructor(field: string, language?: TLanguage, constants?: TConstants) {
    this.chain = body(field);
    this.language = language;
    this.constants = constants;
  }

  matches(regex: RegExp | ((constants: TConstants) => RegExp)): this {
    const actualRegex =
      typeof regex === 'function' && this.constants
        ? regex(this.constants)
        : (regex as RegExp);
    this.chain = this.chain.matches(actualRegex);
    return this;
  }

  isEmail(): this {
    this.chain = this.chain.isEmail();
    return this;
  }

  isString(): this {
    this.chain = this.chain.isString();
    return this;
  }

  notEmpty(): this {
    this.chain = this.chain.notEmpty();
    return this;
  }

  optional(): this {
    this.chain = this.chain.optional();
    return this;
  }

  custom(validator: (value: unknown) => boolean): this {
    this.chain = this.chain.custom(validator);
    return this;
  }

  isLength(options: { min?: number; max?: number }): this {
    this.chain = this.chain.isLength(options);
    return this;
  }

  isIn(values: unknown[]): this {
    this.chain = this.chain.isIn(values);
    return this;
  }

  withMessage(key: SuiteCoreStringKey, params?: Record<string, string>): this {
    const message = getSuiteCoreTranslation(
      key,
      params,
      this.language as CoreLanguageCode,
    );
    this.chain = this.chain.withMessage(message);
    return this;
  }

  build(): ValidationChain {
    return this.chain;
  }
}

export class ValidationBuilder<
  TLanguage extends string,
  TConstants extends IConstants = IConstants,
> {
  private validators: FieldValidator<TLanguage, TConstants>[] = [];
  private language?: TLanguage;
  private constants?: TConstants;

  static create<T extends string, C extends IConstants = IConstants>(
    language?: T,
    constants?: C,
  ): ValidationBuilder<T, C> {
    return new ValidationBuilder<T, C>(language, constants);
  }

  constructor(language?: TLanguage, constants?: TConstants) {
    this.language = language;
    this.constants = constants;
  }

  for(field: string): FieldValidator<TLanguage, TConstants> {
    const validator = new FieldValidator<TLanguage, TConstants>(
      field,
      this.language,
      this.constants,
    );
    this.validators.push(validator);
    return validator;
  }

  build(): ValidationChain[] {
    return this.validators.map((v) => v.build());
  }
}
