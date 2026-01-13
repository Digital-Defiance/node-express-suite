/**
 * @fileoverview Backup codes API response interface.
 * Defines structure for backup code generation responses.
 * @module interfaces/api-responses/backup-codes-response
 */

import { IApiMessageResponse } from '../api-message-response';

/**
 * API response containing backup codes.
 * @extends IApiMessageResponse
 */
export interface IApiBackupCodesResponse extends IApiMessageResponse {
  backupCodes: Array<string>;
}
