import type { SecureString } from '@digitaldefiance/ecies-lib';
import type {
  Member as BackendMember,
  PlatformID,
} from '@digitaldefiance/node-ecies-lib';

declare global {
  var __MEMBER_CACHE__:
    | Map<
        string,
        {
          member: BackendMember<PlatformID>;
          mnemonic: SecureString;
        }
      >
    | undefined;
}

export {};
