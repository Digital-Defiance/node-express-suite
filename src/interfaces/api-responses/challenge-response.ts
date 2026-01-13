/**
 * @fileoverview API response interface for cryptographic challenge requests.
 * @module interfaces/api-responses/challenge-response
 */

import { IApiMessageResponse } from '../api-message-response';

/**
 * API response for cryptographic challenge requests.
 * Contains a challenge string and server's public key for secure authentication.
 */
export interface IApiChallengeResponse extends IApiMessageResponse {
  /** Challenge string to be signed by the client */
  challenge: string;
  /** Server's public key for encrypting the response */
  serverPublicKey: string;
}
