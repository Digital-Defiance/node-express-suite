import { SecureString } from '@digitaldefiance/ecies-lib';
import { Member as BackendMember } from '@digitaldefiance/node-ecies-lib';

declare global {
  var __MEMBER_CACHE__:
    | Map<
        string,
        {
          member: BackendMember;
          mnemonic: SecureString;
        }
      >
    | undefined;
}

export {};
