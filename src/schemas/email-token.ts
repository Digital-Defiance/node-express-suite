import {
  EmailTokenType,
  getSuiteCoreTranslation,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { Schema } from 'mongoose';
import validator from 'validator';
import { IEmailTokenDocument } from '../documents/email-token';
import { BaseModelName } from '../enumerations';
import { IConstants } from '../interfaces';

/**
 * Configuration options for creating an email token schema
 */
export interface EmailTokenSchemaOptions<
  TTokenType extends string = EmailTokenType,
  TModelName extends string = BaseModelName,
  TConstants extends IConstants = IConstants,
> {
  /** Token type enum values to use */
  tokenTypeEnum?: TTokenType[];
  /** Model name for user reference */
  userModelName?: TModelName;
  /** Token expiration time (default: '1d') */
  expiresIn?: string;
  /** Custom email validator function */
  emailValidator?: (v: string) => boolean;
  /** Custom validation error message function */
  validationMessage?: (props: { value: string }) => string;
  constants?: TConstants;
}

/**
 * Factory function to create an extensible email token schema
 */
export function createEmailTokenSchema<
  TTokenType extends string = EmailTokenType,
  TModelName extends string = BaseModelName,
  TConstants extends IConstants = IConstants,
>(
  options: EmailTokenSchemaOptions<TTokenType, TModelName> = {},
  constants?: TConstants,
): Schema<IEmailTokenDocument> {
  const {
    tokenTypeEnum = Object.values(EmailTokenType) as TTokenType[],
    userModelName = BaseModelName.User as TModelName,
    expiresIn = '1d',
    validationMessage = (props: { value: string }) =>
      getSuiteCoreTranslation(SuiteCoreStringKey.Error_InvalidEmailTemplate, {
        email: props.value,
      }),
  } = options;

  const schema = new Schema<IEmailTokenDocument>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: userModelName,
        immutable: true,
      },
      type: {
        type: String,
        enum: tokenTypeEnum,
        required: true,
        immutable: true,
      },
      token: { type: String, required: true, immutable: true, unique: true },
      email: {
        type: String,
        required: true,
        immutable: true,
        validate: {
          validator: (v: string) => validator.isEmail(v),
          message: validationMessage,
        },
      },
      lastSent: { type: Date, required: false },
      expiresAt: {
        type: Date,
        default: Date.now,
        index: { expires: expiresIn },
      },
    },
    { timestamps: true },
  );

  schema.index({ userId: 1, email: 1, type: 1 }, { unique: true });

  return schema;
}

/**
 * Default email token schema with base configuration
 */
export const EmailTokenSchema = createEmailTokenSchema();
