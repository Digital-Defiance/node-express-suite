import { IApiMessageResponse } from '../api-message-response';

export interface IApiRegistrationResponse extends IApiMessageResponse {
  mnemonic: string;
  backupCodes: Array<string>;
}
