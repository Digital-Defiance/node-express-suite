import { interfaceSerializer } from '@digitaldefiance/branded-interface';
import {
  BrandedApiMessageResponse,
  BrandedApiErrorResponse,
  BrandedApiTokenResponse,
  BrandedApiLoginResponse,
  BrandedApiRegistrationResponse,
  BrandedApiChallengeResponse,
  BrandedApiMnemonicResponse,
  BrandedApiBackupCodesResponse,
  BrandedApiCodeCountResponse,
  BrandedApiRequestUserResponse,
  BrandedApiUserSettingsResponse,
  BrandedApiExpressValidationErrorResponse,
  BrandedApiMongoValidationErrorResponse,
  BrandedStatusCodeResponse,
  BrandedFailableResult,
} from './branded-api-responses';

// =============================================================================
// Base Response Serializers
// =============================================================================

export const apiMessageResponseSerializer = interfaceSerializer(
  BrandedApiMessageResponse,
);
export const apiErrorResponseSerializer = interfaceSerializer(
  BrandedApiErrorResponse,
);
export const apiTokenResponseSerializer = interfaceSerializer(
  BrandedApiTokenResponse,
);

// =============================================================================
// Domain Response Serializers
// =============================================================================

export const apiLoginResponseSerializer = interfaceSerializer(
  BrandedApiLoginResponse,
);
export const apiRegistrationResponseSerializer = interfaceSerializer(
  BrandedApiRegistrationResponse,
);
export const apiChallengeResponseSerializer = interfaceSerializer(
  BrandedApiChallengeResponse,
);
export const apiMnemonicResponseSerializer = interfaceSerializer(
  BrandedApiMnemonicResponse,
);
export const apiBackupCodesResponseSerializer = interfaceSerializer(
  BrandedApiBackupCodesResponse,
);
export const apiCodeCountResponseSerializer = interfaceSerializer(
  BrandedApiCodeCountResponse,
);
export const apiRequestUserResponseSerializer = interfaceSerializer(
  BrandedApiRequestUserResponse,
);
export const apiUserSettingsResponseSerializer = interfaceSerializer(
  BrandedApiUserSettingsResponse,
);

// =============================================================================
// Error Response Serializers
// =============================================================================

export const apiExpressValidationErrorResponseSerializer = interfaceSerializer(
  BrandedApiExpressValidationErrorResponse,
);
export const apiMongoValidationErrorResponseSerializer = interfaceSerializer(
  BrandedApiMongoValidationErrorResponse,
);

// =============================================================================
// Wrapper Serializers
// =============================================================================

export const statusCodeResponseSerializer = interfaceSerializer(
  BrandedStatusCodeResponse,
);
export const failableResultSerializer = interfaceSerializer(
  BrandedFailableResult,
);
