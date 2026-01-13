/**
 * @fileoverview Request user API response interface.
 * Defines structure for user data responses.
 * @module interfaces/api-responses/request-user-response
 */

import { IRequestUserDTO } from '@digitaldefiance/suite-core-lib';
import { IApiMessageResponse } from '../api-message-response';

/**
 * API response containing user data.
 * @extends IApiMessageResponse
 */
export interface IApiRequestUserResponse extends IApiMessageResponse {
  user: IRequestUserDTO;
}
