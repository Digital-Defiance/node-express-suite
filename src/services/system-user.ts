/**
 * @fileoverview System user singleton service.
 * Manages the system-level cryptographic member for server operations.
 * @module services/system-user
 */

import {
  EmailString,
  MemberType,
  SecureBuffer,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import {
  Member as BackendMember,
  ECIESService,
  PlatformID,
} from '@digitaldefiance/node-ecies-lib';
import {
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';
import { Environment } from '../environment';
import { IConstants } from '../interfaces/constants';

/**
 * Service for managing the system user singleton.
 * Provides access to system-level cryptographic operations and key management.
 */
export class SystemUserService {
  private static systemUser: BackendMember<PlatformID> | null = null;

  /**
   * Initializes and returns the system member's Member instance.
   * The mnemonic should be stored securely in environment variables.
   */
  public static getSystemUser<TID extends PlatformID = Buffer>(
    environment: Environment<TID>,
    constants: IConstants,
  ): BackendMember<TID> {
    if (!SystemUserService.systemUser) {
      if (!environment.systemMnemonic) {
        throw new TranslatableSuiteError(
          SuiteCoreStringKey.Admin_EnvNotSetTemplate,
          {
            NAME: 'SYSTEM_MNEMONIC',
          },
        );
      }
      const mnemonic: SecureString = environment.systemMnemonic;
      const eciesService = new ECIESService<TID>(undefined, constants.ECIES);
      const { wallet } = eciesService.walletAndSeedFromMnemonic(mnemonic);
      const keyPair = eciesService.walletToSimpleKeyPairBuffer(wallet);

      SystemUserService.systemUser = new BackendMember<TID>(
        eciesService,
        MemberType.System,
        constants.SystemUser,
        new EmailString(`system@${environment.emailDomain}`),
        keyPair.publicKey,
        new SecureBuffer(keyPair.privateKey),
        wallet,
      );
      const derivedHex = SystemUserService.systemUser.publicKey.toString('hex');
      if (!environment.systemPublicKeyHex) {
        // SYSTEM_PUBLIC_KEY was not set in .env — populate it from the derived key
        // so that endpoints returning serverPublicKey have the correct value.
        environment.systemPublicKeyHex = derivedHex;
      } else if (derivedHex !== environment.systemPublicKeyHex) {
        console.warn('System public key does not match environment variable', {
          derived: derivedHex,
          expected: environment.systemPublicKeyHex,
        });
      }
    }
    return SystemUserService.systemUser as BackendMember<TID>;
  }

  public static setSystemUser<TID extends PlatformID = Buffer>(
    user: BackendMember<TID>,
    constants: IConstants,
  ): void {
    if (user.type !== MemberType.System || user.name !== constants.SystemUser) {
      throw new Error(
        'setSystemUser can only be called with a MemberType.System user',
      );
    }
    SystemUserService.systemUser = user as BackendMember<TID>;
  }
}
