import { IApiMessageResponse } from '../api-message-response';

export interface IApiCodeCountResponse extends IApiMessageResponse {
  codeCount: number;
}
