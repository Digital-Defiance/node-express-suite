/**
 * @fileoverview API response interface for user registration requests.
 * @module interfaces/api-responses/registration-response
 */

import { IApiMessageResponse } from '../api-message-response';

/**
 * API response for user registration requests.
 * Contains mnemonic phrase and backup codes for account recovery.
 */
export interface IApiRegistrationResponse extends IApiMessageResponse {
  /** BIP39 mnemonic phrase for key derivation. Only present when server-generated (user didn't provide their own). */
  mnemonic?: string;
  /** Array of backup codes for account recovery */
  backupCodes: Array<string>;
}
