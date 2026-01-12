import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  EmailTokenType,
  IEmailTokenBase,
} from '@digitaldefiance/suite-core-lib';

export type IEmailTokenBackendObject<I extends PlatformID = Buffer> =
  IEmailTokenBase<I, Date, EmailTokenType>;
