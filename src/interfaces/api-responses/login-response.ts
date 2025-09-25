import { IRequestUserDTO } from '@digitaldefiance/suite-core-lib';
import { IApiMessageResponse } from '../api-message-response';

export interface IApiLoginResponse extends IApiMessageResponse {
  user: IRequestUserDTO;
  token: string;
  serverPublicKey: string;
}
