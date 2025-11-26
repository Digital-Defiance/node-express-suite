import { Schema, Types } from '@digitaldefiance/mongoose-types';
import { AccountStatus, IUserBase } from '@digitaldefiance/suite-core-lib';
import { IUserDocument } from '../documents/user';
import { IConstants } from '../interfaces/constants';

export function createUserSchema<
  T extends IConstants = IConstants,
  I extends string | Types.ObjectId = Types.ObjectId
>(
  usernameValidationMessage?: () => string,
  emailValidationMessage?: () => string,
  timezoneValidationMessage?: () => string,
  currencyValidationMessage?: () => string,
  supportedLanguages?: readonly string[],
  idType?: any,
  constants?: T,
): Schema<IUserBase<I, Date, string, AccountStatus>, IUserDocument<string, I>>;

export const UserSchema: Schema<IUserBase<Types.ObjectId, Date, string, AccountStatus>, IUserDocument<string, Types.ObjectId>>;
