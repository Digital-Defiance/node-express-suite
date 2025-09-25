import { IApiMessageResponse } from '../api-message-response';

export interface IApiBackupCodesResponse extends IApiMessageResponse {
  backupCodes: Array<string>;
}
