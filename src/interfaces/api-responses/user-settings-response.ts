/**
 * @fileoverview User settings API response interface.
 * Defines structure for user settings responses.
 * @module interfaces/api-responses/user-settings-response
 */

import { IApiMessageResponse } from '../api-message-response';

/** API response containing user settings. */
export interface IApiUserSettingsResponse extends IApiMessageResponse {
  settings: {
    email: string;
    timezone: string;
    currency: string;
    siteLanguage: string;
    darkMode: boolean;
    directChallenge: boolean;
    displayName?: string;
    totpEnabled: boolean;
  };
}
