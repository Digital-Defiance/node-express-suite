/**
 * @fileoverview Mnemonic phrase management service.
 * Securely stores mnemonic HMACs for uniqueness checking without exposing phrases.
 * @module services/mnemonic
 */

import { SecureBuffer, SecureString } from '@digitaldefiance/ecies-lib';
import { ClientSession, Model } from '@digitaldefiance/mongoose-types';
import {
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';
import { createHmac } from 'crypto';
import { MnemonicDocument } from '../documents/mnemonic';
import { IConstants } from '../interfaces';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Service for secure mnemonic phrase storage and validation.
 * Uses HMAC for uniqueness checking without storing actual mnemonics.
 * @template TID - Platform ID type (defaults to Buffer)
 */
export class MnemonicService<TID extends PlatformID = Buffer> {
  private readonly hmacSecret: SecureBuffer;
  private readonly MnemonicModel: Model<MnemonicDocument<TID>>;
  private readonly constants: IConstants;

  constructor(
    mnemonicModel: Model<MnemonicDocument<TID>>,
    hmacSecret: SecureBuffer,
    constants: IConstants,
  ) {
    this.MnemonicModel = mnemonicModel;
    // Immediately wrap secrets in secure containers
    this.hmacSecret = hmacSecret;
    this.constants = constants;
  }

  /**
   * Disposes of the secure secrets held by this service.
   */
  public dispose(): void {
    this.hmacSecret.dispose();
  }

  /**
   * Creates a non-reversible HMAC of the mnemonic for fast, indexed lookups.
   * @param mnemonic The mnemonic to hash, wrapped in a SecureString.
   */
  public getMnemonicHmac(mnemonic: SecureString): string {
    // Use the raw secret buffer for the HMAC
    return createHmac('sha256', this.hmacSecret.value)
      .update(mnemonic.valueAsUint8Array) // Use the raw buffer for consistency
      .digest('hex');
  }

  /**
   * Checks if a mnemonic already exists in the database using its HMAC.
   * @param mnemonic The mnemonic to check, wrapped in a SecureString.
   * @param session Optional Mongoose session for transaction support.
   */
  public async mnemonicExists(
    mnemonic: SecureString,
    session?: ClientSession,
  ): Promise<boolean> {
    const hmac = this.getMnemonicHmac(mnemonic);
    const count = await this.MnemonicModel.countDocuments({ hmac }).session(
      session ?? null,
    );
    return count > 0;
  }

  /**
   * Adds a new, unique mnemonic to the database with password-based key wrapping.
   * @param mnemonic The mnemonic to add, wrapped in a SecureString.
   * @param password User's password for key wrapping.
   * @param session Optional Mongoose session for transaction support.
   */
  public async addMnemonicWithPassword(
    mnemonic: SecureString,
    _password: SecureString,
    session?: ClientSession,
  ): Promise<{
    document: MnemonicDocument<TID> | null;
  }> {
    if (!mnemonic.value || !this.constants.MnemonicRegex.test(mnemonic.value)) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Validation_MnemonicRegex,
      );
    }

    if (await this.mnemonicExists(mnemonic, session)) {
      return { document: null };
    }

    try {
      const hmac = this.getMnemonicHmac(mnemonic);
      const [newDoc] = await this.MnemonicModel.create(
        [
          {
            hmac: hmac,
          },
        ],
        { session },
      );
      return { document: newDoc };
    } finally {
      // nothing to dispose
    }
  }

  /**
   * Adds a new, unique mnemonic to the database.
   * @param mnemonic The mnemonic to add, wrapped in a SecureString.
   * @param session Optional Mongoose session for transaction support.
   */
  public async addMnemonic(
    mnemonic: SecureString,
    session?: ClientSession,
  ): Promise<MnemonicDocument<TID> | null> {
    if (!mnemonic.value || !this.constants.MnemonicRegex.test(mnemonic.value)) {
      throw new TranslatableSuiteError(
        SuiteCoreStringKey.Validation_MnemonicRegex,
      );
    }

    if (await this.mnemonicExists(mnemonic, session)) {
      return null;
    }
    const hmac = this.getMnemonicHmac(mnemonic);
    const [newDoc] = await this.MnemonicModel.create(
      [
        {
          hmac: hmac,
        },
      ],
      { session },
    );
    return newDoc;
  }

  /**
   * Retrieves a mnemonic document by ID.
   * @param mnemonicId The ID of the mnemonic document.
   * @param session Optional Mongoose session for transaction support.
   */
  public async getMnemonicDocument(
    mnemonicId: TID,
    session?: ClientSession,
  ): Promise<MnemonicDocument<TID> | null> {
    return await this.MnemonicModel.findById(mnemonicId).session(
      session ?? null,
    );
  }

  /**
   * Decrypts a mnemonic from a document using the service's master encryption key.
   * @param doc The mnemonic document.
   */

  /**
   * Deletes a mnemonic document by ID.
   * @param mnemonicId The ID of the mnemonic document.
   * @param session Optional Mongoose session for transaction support.
   */
  public async deleteMnemonicDocument(
    mnemonicId: TID,
    session?: ClientSession,
  ): Promise<void> {
    await this.MnemonicModel.findByIdAndDelete(mnemonicId).session(
      session ?? null,
    );
  }
}
