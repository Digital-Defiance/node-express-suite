/**
 * @fileoverview TOTP setup API response interface.
 * Defines structure for TOTP setup initiation responses.
 * @module interfaces/api-responses/totp-setup-response
 */

import { IApiMessageResponse } from '../api-message-response';

/**
 * API response for TOTP setup initiation.
 * Returns the provisioning URI and raw base32 secret for authenticator app configuration.
 * @extends IApiMessageResponse
 */
export interface IApiTotpSetupResponse extends IApiMessageResponse {
  provisioningUri: string;
  secret: string;
}
