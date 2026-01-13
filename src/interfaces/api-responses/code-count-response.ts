/**
 * @fileoverview Code count API response interface.
 * Defines structure for backup code count responses.
 * @module interfaces/api-responses/code-count-response
 */

import { IApiMessageResponse } from '../api-message-response';

/** API response containing backup code count. */
export interface IApiCodeCountResponse extends IApiMessageResponse {
  codeCount: number;
}
