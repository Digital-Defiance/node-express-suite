import { IRequestUserDTO } from '@digitaldefiance/suite-core-lib';
import { IApiMessageResponse } from '../api-message-response';

export interface IApiRequestUserResponse extends IApiMessageResponse {
  user: IRequestUserDTO;
}
