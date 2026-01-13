/**
 * @fileoverview Service for calculating and validating SHA3-512 checksums.
 * Provides checksum operations for buffers, strings, files, and streams.
 * @module services/checksum
 */

import {
  ChecksumBuffer,
  ChecksumString,
} from '@digitaldefiance/node-ecies-lib';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { CHECKSUM } from '../constants';
import { IChecksumConfig } from '../interfaces/checksum-config';
import { IChecksumConsts } from '../interfaces/checksum-consts';

/**
 * Service for calculating and validating SHA3-512 checksums.
 * Supports multiple input types including buffers, strings, files, and streams.
 */
export class ChecksumService {
  /** Checksum configuration (algorithm and encoding) */
  private readonly config: IChecksumConfig;
  /** Checksum constants (buffer lengths and defaults) */
  protected readonly constants: IChecksumConsts;

  /**
   * Creates a new checksum service instance.
   * @param config Optional configuration overrides
   * @param constants Checksum constants (defaults to CHECKSUM)
   */
  constructor(
    config?: Partial<IChecksumConfig>,
    constants: IChecksumConsts = CHECKSUM,
  ) {
    this.config = {
      algorithm: constants.ALGORITHM,
      encoding: constants.ENCODING,
      ...config,
    };
    this.constants = constants;
  }

  /**
   * Calculates a checksum for a buffer.
   * @param data Buffer to calculate checksum for
   * @returns Checksum as a Buffer
   */
  public calculateChecksum(data: Buffer): ChecksumBuffer {
    const hash = createHash(this.config.algorithm);
    hash.update(new Uint8Array(data));
    const digest = hash.digest();
    return Buffer.from(digest) as ChecksumBuffer;
  }

  /**
   * Calculates a checksum for multiple buffers.
   * @param buffers Array of buffers to calculate checksum for
   * @returns Checksum as a Buffer
   */
  public calculateChecksumForBuffers(buffers: Buffer[]): ChecksumBuffer {
    const hash = createHash(this.config.algorithm);
    for (const buffer of buffers) {
      hash.update(new Uint8Array(buffer));
    }
    const digest = hash.digest();
    return Buffer.from(digest) as ChecksumBuffer;
  }

  /**
   * Calculates a checksum for a UTF-8 string.
   * @param str String to calculate checksum for
   * @returns Checksum as a Buffer
   */
  public calculateChecksumForString(str: string): ChecksumBuffer {
    return this.calculateChecksum(Buffer.from(str, 'utf8'));
  }

  /**
   * Compares two checksums for equality.
   * @param checksum1 First checksum
   * @param checksum2 Second checksum
   * @returns True if checksums are equal, false otherwise
   */
  public compareChecksums(
    checksum1: ChecksumBuffer,
    checksum2: ChecksumBuffer,
  ): boolean {
    if (
      checksum1.length !== this.constants.SHA3_BUFFER_LENGTH ||
      checksum2.length !== this.constants.SHA3_BUFFER_LENGTH
    ) {
      return false;
    }
    return checksum1.equals(new Uint8Array(checksum2));
  }

  /**
   * Converts a checksum buffer to a hex string.
   * @param checksum Checksum buffer
   * @returns Checksum as a hex string
   */
  public checksumToHexString(checksum: ChecksumBuffer): ChecksumString {
    return checksum.toString(this.constants.ENCODING) as ChecksumString;
  }

  /**
   * Converts a hex string to a checksum buffer.
   * @param hexString Hex string to convert
   * @returns Checksum as a Buffer
   * @throws {Error} If hex string length is invalid
   */
  public hexStringToChecksum(hexString: string): ChecksumBuffer {
    if (hexString.length !== this.constants.SHA3_BUFFER_LENGTH * 2) {
      throw new Error('Invalid checksum hex string length');
    }
    return Buffer.from(hexString, this.constants.ENCODING) as ChecksumBuffer;
  }

  /**
   * Validates a checksum buffer length.
   * @param checksum Checksum buffer to validate
   * @returns True if checksum length is valid, false otherwise
   */
  public validateChecksum(checksum: ChecksumBuffer): boolean {
    return checksum.length === this.constants.SHA3_BUFFER_LENGTH;
  }

  /**
   * Calculates a checksum for a file.
   * @param filePath Path to the file
   * @returns Promise resolving to checksum as a Buffer
   * @throws {Error} If file cannot be read
   */
  public async calculateChecksumForFile(
    filePath: string,
  ): Promise<ChecksumBuffer> {
    // Removed dynamic import by using the data service to read file data
    // This is a temporary solution that can be replaced with a proper file service
    // The implementation now delegates file reading to the caller
    const buffer = Buffer.from(await this.readFile(filePath));
    return this.calculateChecksum(buffer);
  }

  /**
   * Internal file reading method using fs.promises.
   * @param filePath Path to the file
   * @returns Promise resolving to file contents as Buffer
   * @throws {Error} If file cannot be read
   * @private
   */
  private async readFile(filePath: string): Promise<Buffer> {
    // Import fs using a static import that's available at module load time
    // This solves the dynamic import/require issues
    try {
      return await fs.readFile(filePath);
    } catch {
      throw new Error(`Failed to read file at path: ${filePath}`);
    }
  }

  /**
   * Calculates a checksum for a readable stream.
   * @param stream Readable stream to calculate checksum for
   * @returns Promise resolving to checksum as a Buffer
   */
  public calculateChecksumForStream(
    stream: NodeJS.ReadableStream,
  ): Promise<ChecksumBuffer> {
    return new Promise((resolve, reject) => {
      const hash = createHash(this.config.algorithm);
      stream.on('data', (chunk) => {
        // Ensure chunk is a Buffer before updating hash
        if (Buffer.isBuffer(chunk)) {
          hash.update(new Uint8Array(chunk));
        } else if (typeof chunk === 'number') {
          hash.update(new Uint8Array(Buffer.from([chunk])));
        } else {
          hash.update(new Uint8Array(Buffer.from(chunk)));
        }
      });
      stream.on('end', () => {
        const digest = hash.digest();
        resolve(Buffer.from(digest) as ChecksumBuffer);
      });
      stream.on('error', reject);
    });
  }
}
