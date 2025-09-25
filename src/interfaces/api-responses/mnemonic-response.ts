import { IApiMessageResponse } from '../api-message-response';

export interface IApiMnemonicResponse extends IApiMessageResponse {
  mnemonic: string;
}
