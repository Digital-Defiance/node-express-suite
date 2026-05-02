/**
 * @fileoverview Login API response interface.
 * Defines structure for successful login responses.
 * @module interfaces/api-responses/login-response
 */

import { IRequestUserDTO } from '@digitaldefiance/suite-core-lib';
import { IApiMessageResponse } from '../api-message-response';

/**
 * API response for successful login.
 * When TOTP is enabled, `user`, `token`, and `serverPublicKey` are absent
 * and `pendingTotpToken` is returned instead.
 * @extends IApiMessageResponse
 */
export interface IApiLoginResponse extends IApiMessageResponse {
  user?: IRequestUserDTO;
  token?: string;
  serverPublicKey?: string;
  pendingTotpToken?: string;
}
