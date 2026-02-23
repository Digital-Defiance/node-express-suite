import { createBrandedInterface } from '@digitaldefiance/branded-interface';
import type {
  IApiMessageResponse,
  IFailableResult,
} from '@digitaldefiance/suite-core-lib';
import type {
  IApiErrorResponse,
  IApiTokenResponse,
  IApiLoginResponse,
  IApiRegistrationResponse,
  IApiChallengeResponse,
  IApiMnemonicResponse,
  IApiBackupCodesResponse,
  IApiCodeCountResponse,
  IApiRequestUserResponse,
  IApiUserSettingsResponse,
  IApiExpressValidationErrorResponse,
  IApiMongoValidationErrorResponse,
  IStatusCodeResponse,
} from '../interfaces';
import {
  isNonEmptyString,
  isNonEmptyArray,
  isStringArray,
  isNonNegativeInt,
  isPositiveInt,
  isNonNullObject,
  isBoolean,
} from './validators';

/**
 * Utility type that adds an index signature to an interface,
 * making it compatible with Record<string, unknown> constraints.
 * This is needed because TypeScript interfaces without explicit
 * index signatures don't satisfy Record<string, unknown>.
 */
export type Indexable<T> = { [K in keyof T]: T[K] } & Record<string, unknown>;

// =============================================================================
// Base Response Definitions
// =============================================================================

export const BrandedApiMessageResponse = createBrandedInterface<
  Indexable<IApiMessageResponse>
>('ApiMessageResponse', {
  message: { type: 'string', validate: isNonEmptyString },
});

export const BrandedApiErrorResponse = createBrandedInterface<
  Indexable<IApiErrorResponse>
>('ApiErrorResponse', {
  message: { type: 'string', validate: isNonEmptyString },
  error: { type: 'object' },
});

export const BrandedApiTokenResponse = createBrandedInterface<
  Indexable<IApiTokenResponse>
>('ApiTokenResponse', {
  message: { type: 'string', validate: isNonEmptyString },
  token: { type: 'string', validate: isNonEmptyString },
});

// =============================================================================
// Domain Response Definitions
// =============================================================================

export const BrandedApiLoginResponse = createBrandedInterface<
  Indexable<IApiLoginResponse>
>('ApiLoginResponse', {
  message: { type: 'string', validate: isNonEmptyString },
  token: { type: 'string', validate: isNonEmptyString },
  serverPublicKey: { type: 'string' },
  user: { type: 'object', validate: isNonNullObject },
});

export const BrandedApiRegistrationResponse = createBrandedInterface<
  Indexable<IApiRegistrationResponse>
>('ApiRegistrationResponse', {
  message: { type: 'string', validate: isNonEmptyString },
  mnemonic: { type: 'string', validate: isNonEmptyString },
  backupCodes: {
    type: 'array',
    validate: (v) => isNonEmptyArray(v) && isStringArray(v),
  },
});

export const BrandedApiChallengeResponse = createBrandedInterface<
  Indexable<IApiChallengeResponse>
>('ApiChallengeResponse', {
  message: { type: 'string', validate: isNonEmptyString },
  challenge: { type: 'string', validate: isNonEmptyString },
  serverPublicKey: { type: 'string', validate: isNonEmptyString },
});

export const BrandedApiMnemonicResponse = createBrandedInterface<
  Indexable<IApiMnemonicResponse>
>('ApiMnemonicResponse', {
  message: { type: 'string', validate: isNonEmptyString },
  mnemonic: { type: 'string', validate: isNonEmptyString },
});

export const BrandedApiBackupCodesResponse = createBrandedInterface<
  Indexable<IApiBackupCodesResponse>
>('ApiBackupCodesResponse', {
  message: { type: 'string', validate: isNonEmptyString },
  backupCodes: {
    type: 'array',
    validate: (v) => isNonEmptyArray(v) && isStringArray(v),
  },
});

export const BrandedApiCodeCountResponse = createBrandedInterface<
  Indexable<IApiCodeCountResponse>
>('ApiCodeCountResponse', {
  message: { type: 'string', validate: isNonEmptyString },
  codeCount: { type: 'number', validate: isNonNegativeInt },
});

export const BrandedApiRequestUserResponse = createBrandedInterface<
  Indexable<IApiRequestUserResponse>
>('ApiRequestUserResponse', {
  message: { type: 'string', validate: isNonEmptyString },
  user: { type: 'object', validate: isNonNullObject },
});

export const BrandedApiUserSettingsResponse = createBrandedInterface<
  Indexable<IApiUserSettingsResponse>
>('ApiUserSettingsResponse', {
  message: { type: 'string', validate: isNonEmptyString },
  settings: {
    type: 'object',
    validate: (v) => {
      if (!isNonNullObject(v)) return false;
      const s = v as Record<string, unknown>;
      return (
        isNonEmptyString(s['email']) &&
        isNonEmptyString(s['timezone']) &&
        isNonEmptyString(s['currency']) &&
        isNonEmptyString(s['siteLanguage']) &&
        isBoolean(s['darkMode']) &&
        isBoolean(s['directChallenge'])
      );
    },
  },
});

// =============================================================================
// Error Response Definitions
// =============================================================================

export const BrandedApiExpressValidationErrorResponse = createBrandedInterface<
  Indexable<
    Omit<IApiExpressValidationErrorResponse, 'errors'> & { errors: unknown[] }
  >
>('ApiExpressValidationErrorResponse', {
  message: { type: 'string', validate: isNonEmptyString },
  errors: { type: 'array', validate: isNonEmptyArray },
  errorType: { type: 'string', optional: true },
});

export const BrandedApiMongoValidationErrorResponse = createBrandedInterface<
  Indexable<IApiMongoValidationErrorResponse>
>('ApiMongoValidationErrorResponse', {
  message: { type: 'string', validate: isNonEmptyString },
  errors: { type: 'object', validate: isNonNullObject },
});

// =============================================================================
// Wrapper Definitions
// =============================================================================

export const BrandedStatusCodeResponse = createBrandedInterface<
  Indexable<IStatusCodeResponse<IApiMessageResponse>>
>('StatusCodeResponse', {
  statusCode: { type: 'number', validate: isPositiveInt },
  response: { type: 'object', validate: isNonNullObject },
  headers: { type: 'object', optional: true, validate: isNonNullObject },
});

export const BrandedFailableResult = createBrandedInterface<
  Indexable<IFailableResult<unknown>>
>('FailableResult', {
  success: { type: 'boolean' },
  data: { type: 'object', optional: true },
  message: { type: 'string', optional: true },
  error: { type: 'object', optional: true },
});
