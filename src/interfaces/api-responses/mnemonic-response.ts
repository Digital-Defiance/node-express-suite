/**
 * @fileoverview API response interface for mnemonic phrase requests.
 * @module interfaces/api-responses/mnemonic-response
 */

import { IApiMessageResponse } from '../api-message-response';

/**
 * API response for mnemonic phrase requests.
 * Contains a BIP39 mnemonic phrase for key derivation.
 */
export interface IApiMnemonicResponse extends IApiMessageResponse {
  /** BIP39 mnemonic phrase (12-24 words) */
  mnemonic: string;
}
