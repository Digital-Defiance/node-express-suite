import { IApiMessageResponse } from '../api-message-response';

export interface IApiChallengeResponse extends IApiMessageResponse {
  challenge: string;
  serverPublicKey: string;
}
