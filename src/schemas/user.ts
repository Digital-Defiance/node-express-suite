import { isValidTimezone, LanguageCodes } from '@digitaldefiance/i18n-lib';
import {
  AccountStatus,
  getSuiteCoreTranslation,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { codes } from 'currency-codes';
import { Schema } from 'mongoose';
import validator from 'validator';
import { LocalhostConstants as AppConstants } from '../constants';
import { IUserDocument } from '../documents/user';
import { BaseModelName } from '../enumerations';
import { IConstants } from '../interfaces/constants';

/**
 * Create a user schema with custom or default constants
 */
export function createUserSchema<T extends IConstants = IConstants>(
  usernameValidationMessage?: () => string,
  emailValidationMessage?: () => string,
  timezoneValidationMessage?: () => string,
  currencyValidationMessage?: () => string,
  supportedLanguages?: readonly string[],
  constants: T = AppConstants as T,
): Schema<IUserDocument> {
  /**
   * Schema for users
   */
  return new Schema<IUserDocument>(
    {
      /**
       * The unique identifier for the user
       */
      username: {
        type: String,
        required: true,
        unique: true,
        validate: {
          validator: (v: string) => constants.UsernameRegex.test(v),
          message:
            usernameValidationMessage ||
            (() =>
              getSuiteCoreTranslation(
                SuiteCoreStringKey.Validation_UsernameRegexErrorTemplate,
              )),
        },
      },
      /**
       * The email address for the user
       */
      email: {
        type: String,
        required: true,
        unique: true,
        validate: {
          validator: (v: string) => validator.isEmail(v),
          message:
            emailValidationMessage ||
            ((props: { value: string }) =>
              getSuiteCoreTranslation(
                SuiteCoreStringKey.Error_InvalidEmailTemplate,
                { email: props.value },
              )),
        },
      },
      /**
       * The user's public key, stored in hex format.
       */
      publicKey: {
        type: String,
        required: true,
        unique: true,
      },
      /**
       * The timezone for the user
       */
      timezone: {
        type: String,
        required: true,
        default: 'UTC',
        validate: {
          validator: function (v: string) {
            return isValidTimezone(v);
          },
          message:
            timezoneValidationMessage ||
            ((props: { value: string }) =>
              getSuiteCoreTranslation(
                SuiteCoreStringKey.Common_NotValidTimeZoneTemplate,
                { timezone: props.value },
              )),
        },
      },
      currency: {
        type: String,
        required: true,
        default: 'USD',
        validate: {
          validator: function (v: string) {
            return codes().includes(v);
          },
          message: currencyValidationMessage || ((props: { value: string }) =>
            getSuiteCoreTranslation(
              SuiteCoreStringKey.Common_NotValidCurrencyTemplate,
              { currency: props.value },
            )),
        }
      },
      /**
       * The language of the site for the user
       */
      siteLanguage: {
        type: String,
        enum: supportedLanguages || Object.values(LanguageCodes),
        default: LanguageCodes.EN_US,
        required: true,
      },
      /**
       * Whether the user prefers dark mode
       */
      darkMode: {
        type: Boolean,
        default: false,
        required: true,
      },
      /**
       * Whether to enable direct challenge login for the user
       */
      directChallenge: {
        type: Boolean,
        default: true,
        required: true,
      },
      /**
       * The date the user last logged in
       */
      lastLogin: { type: Date, required: false },
      /**
       * Whether the user has verified their email address
       */
      emailVerified: { type: Boolean, default: false },
      /**
       * The status of the user's account
       */
      accountStatus: {
        type: String,
        enum: Object.values(AccountStatus),
        default: AccountStatus.PendingEmailVerification,
      },
      /**
       * The user who created the user.
       */
      createdBy: {
        type: Schema.Types.ObjectId,
        ref: BaseModelName.User,
        required: true,
        immutable: true,
      },
      /**
       * The user who last updated the user.
       */
      updatedBy: {
        type: Schema.Types.ObjectId,
        ref: BaseModelName.User,
        optional: true,
      },
      /**
       * The date/time the user was deleted.
       */
      deletedAt: { type: Date, optional: true },
      /**
       * The user who deleted the user.
       */
      deletedBy: {
        type: Schema.Types.ObjectId,
        ref: BaseModelName.User,
        optional: true,
      },
      /**
       * Reference to the mnemonic document
       */
      mnemonicId: {
        type: Schema.Types.ObjectId,
        ref: BaseModelName.Mnemonic,
        required: false,
      },
      /**
       * Copy of the mnemonic encrypted with the user's public key
       */
      mnemonicRecovery: {
        type: String,
        required: false,
      },
      /**
       * Password-wrapped ECIES private key (Option B)
       */
      passwordWrappedPrivateKey: {
        type: {
          salt: { type: String, required: true },
          iv: { type: String, required: true },
          authTag: { type: String, required: true },
          ciphertext: { type: String, required: true },
          iterations: { type: Number, required: true },
        },
        required: false,
      },
      /**
       * Array of backup codes to recover mnemonic/private key
       */
      backupCodes: {
        type: [
          {
            version: { type: String, required: true },
            checksumSalt: { type: String, required: true },
            checksum: { type: String, required: true },
            encrypted: { type: String, required: true },
          },
        ],
        default: [],
      },
    },
    { timestamps: true },
  );
}

/**
 * Default user schema with base configuration
 */
export const UserSchema = createUserSchema();
