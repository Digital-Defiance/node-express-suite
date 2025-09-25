import { IApiMessageResponse } from './api-message-response';

export interface IApiTokenResponse extends IApiMessageResponse {
  token: string;
}
