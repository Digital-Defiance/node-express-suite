import { IApiMessageResponse } from '../api-message-response';

export interface IApiUserSettingsResponse extends IApiMessageResponse {
  settings: {
    email: string;
    timezone: string;
    currency: string;
    siteLanguage: string;
    darkMode: boolean;
    directChallenge: boolean;
  }
}