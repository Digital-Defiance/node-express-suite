import { FecError, FecErrorType } from '@digitaldefiance/suite-core-lib';
import { ReedSolomonErasure } from '@subspace/reed-solomon-erasure.wasm';
import { FEC } from '../constants';
import { IFECConsts } from '../interfaces';

/**
 * FecService provides Forward Error Correction (FEC) functionality for filesystem/S3 objects.
 * This service is used to:
 * 1. Create parity data for file recovery
 * 2. Recover corrupted files using parity data
 * 3. Ensure data integrity across distributed storage
 *
 * This implementation uses Reed-Solomon erasure coding to:
 * 1. Split file data into shards
 * 2. Create parity shards
 * 3. Recover lost shards using parity
 */

export interface ParityData {
  data: Buffer;
  index: number;
}

export interface RecoveryResult {
  data: Buffer;
  recovered: boolean;
}
export class FecService {
  /**
   * Given a data buffer, encode it using Reed-Solomon erasure coding.
   * This will produce a buffer of size (shardSize * (dataShards + parityShards)) or (shardSize * parityShards) if fecOnly is true.
   */
  public async encode(
    data: Buffer,
    shardSize: number,
    dataShards: number,
    parityShards: number,
    fecOnly: boolean,
    fecConstants: IFECConsts = FEC,
  ): Promise<Buffer> {
    // Validate parameters
    if (!data || data.length === 0) {
      throw new FecError(FecErrorType.DataRequired);
    }

    if (data.length !== shardSize * dataShards) {
      throw new FecError(FecErrorType.InvalidDataLength, undefined, {
        LENGTH: data.length.toString(),
        EXPECTED: (shardSize * dataShards).toString(),
      });
    }

    if (shardSize > fecConstants.MAX_SHARD_SIZE) {
      throw new FecError(FecErrorType.ShardSizeExceedsMaximum, undefined, {
        SIZE: shardSize.toString(),
        MAXIMUM: fecConstants.MAX_SHARD_SIZE.toString(),
      });
    }

    if (dataShards <= 0 || parityShards <= 0) {
      throw new FecError(FecErrorType.InvalidShardCounts);
    }

    try {
      const shards = new Uint8Array(shardSize * (dataShards + parityShards));
      shards.set(new Uint8Array(data));

      // Encoding
      const reedSolomonErasure =
        await ReedSolomonErasure.fromCurrentDirectory();
      reedSolomonErasure.encode(shards, dataShards, parityShards);

      return fecOnly
        ? Buffer.from(shards.subarray(shardSize * dataShards))
        : Buffer.from(shards);
    } catch (error) {
      throw new FecError(FecErrorType.FecEncodingFailed, undefined, {
        ERROR: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Given a data buffer, reconstruct/repair it using Reed-Solomon erasure coding.
   * This will produce a buffer of size (shardSize * dataShards).
   */
  public async decode(
    data: Buffer,
    shardSize: number,
    dataShards: number,
    parityShards: number,
    shardsAvailable: boolean[],
  ): Promise<Buffer> {
    // Validate parameters
    if (!data || data.length === 0) {
      throw new FecError(FecErrorType.DataRequired);
    }

    if (data.length !== shardSize * (dataShards + parityShards)) {
      throw new FecError(FecErrorType.InvalidDataLength, undefined, {
        LENGTH: data.length.toString(),
        EXPECTED: (shardSize * (dataShards + parityShards)).toString(),
      });
    }

    if (
      !shardsAvailable ||
      shardsAvailable.length !== dataShards + parityShards
    ) {
      throw new FecError(FecErrorType.InvalidShardsAvailableArray);
    }

    const availableCount = shardsAvailable.filter((x) => x).length;
    if (availableCount < dataShards) {
      throw new FecError(FecErrorType.NotEnoughShardsAvailable, undefined, {
        AVAILABLE: availableCount.toString(),
        REQUIRED: dataShards.toString(),
      });
    }

    try {
      const uint8Data = new Uint8Array(data);
      const reedSolomonErasure =
        await ReedSolomonErasure.fromCurrentDirectory();
      reedSolomonErasure.reconstruct(
        uint8Data,
        dataShards,
        parityShards,
        shardsAvailable,
      );
      return Buffer.from(uint8Data.subarray(0, shardSize * dataShards));
    } catch (error) {
      throw new FecError(FecErrorType.FecDecodingFailed, undefined, {
        ERROR: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Create parity data for a file buffer.
   */
  public async createParityData(
    fileData: Buffer,
    parityCount: number,
    fecConstants: IFECConsts = FEC,
  ): Promise<ParityData[]> {
    if (!fileData || fileData.length === 0) {
      throw new FecError(FecErrorType.DataRequired);
    }

    if (parityCount <= 0) {
      throw new FecError(FecErrorType.ParityDataCountMustBePositive);
    }

    const shardSize = Math.min(fileData.length, fecConstants.MAX_SHARD_SIZE);
    const requiredShards = Math.ceil(fileData.length / shardSize);

    try {
      const resultParityData: Buffer[] = Array(parityCount)
        .fill(null)
        .map(() => Buffer.alloc(0));

      // Process each chunk
      for (let i = 0; i < requiredShards; i++) {
        const start = i * shardSize;
        const end = Math.min(start + shardSize, fileData.length);
        const chunk = fileData.subarray(start, end);

        // Pad chunk if necessary
        const paddedChunk = Buffer.alloc(shardSize);
        paddedChunk.set(chunk.subarray(0, shardSize));

        const chunkParity = await this.encode(
          paddedChunk,
          shardSize,
          1,
          parityCount,
          true,
          fecConstants,
        );

        // Distribute parity data
        for (let j = 0; j < parityCount; j++) {
          const parityChunk = chunkParity.subarray(
            j * shardSize,
            (j + 1) * shardSize,
          );
          const combined = Buffer.alloc(
            resultParityData[j].length + parityChunk.length,
          );
          combined.set(resultParityData[j], 0);
          combined.set(parityChunk, resultParityData[j].length);
          resultParityData[j] = combined;
        }
      }

      return resultParityData.map((data, index) => ({
        data,
        index,
      }));
    } catch (error) {
      throw new FecError(FecErrorType.FecEncodingFailed, undefined, {
        ERROR: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Recover file data using parity data. Pass null for corrupted data.
   */
  public async recoverFileData(
    corruptedData: Buffer | null,
    parityData: ParityData[],
    originalSize: number,
    fecConstants: IFECConsts = FEC,
  ): Promise<RecoveryResult> {
    if (!parityData || parityData.length === 0) {
      throw new FecError(FecErrorType.ParityDataRequired);
    }

    if (originalSize <= 0) {
      throw new FecError(FecErrorType.InvalidDataLength);
    }

    try {
      const shardSize = Math.min(originalSize, fecConstants.MAX_SHARD_SIZE);
      const requiredShards = Math.ceil(originalSize / shardSize);
      let recoveredData = Buffer.alloc(0);
      let parityUsed = false;

      // Recover each shard
      for (let i = 0; i < requiredShards; i++) {
        const start = i * shardSize;
        const end = Math.min(start + shardSize, originalSize);
        const chunkSize = end - start;

        // Use corrupted data if available, otherwise create placeholder
        const corruptedShard = corruptedData
          ? corruptedData.subarray(start, Math.min(end, corruptedData.length))
          : Buffer.alloc(0);

        const parityChunks = parityData.map((parity) =>
          parity.data.subarray(i * shardSize, (i + 1) * shardSize),
        );

        const hasDataShard = corruptedShard.length > 0;
        const paddedCorruptedShard = Buffer.alloc(shardSize);
        if (hasDataShard) {
          paddedCorruptedShard.set(
            corruptedShard.subarray(
              0,
              Math.min(shardSize, corruptedShard.length),
            ),
          );
        }

        let shardIsHealthy = false;
        if (hasDataShard) {
          const regeneratedParity = await this.encode(
            paddedCorruptedShard,
            shardSize,
            1,
            parityData.length,
            true,
            fecConstants,
          );

          shardIsHealthy = parityChunks.every((parityChunk, index) =>
            parityChunk.equals(
              Uint8Array.from(
                regeneratedParity.subarray(
                  index * shardSize,
                  (index + 1) * shardSize,
                ),
              ),
            ),
          );
        }

        if (shardIsHealthy) {
          const actualShard = Buffer.from(
            paddedCorruptedShard.subarray(0, chunkSize),
          );
          const combinedRecovered = Buffer.alloc(
            recoveredData.length + actualShard.length,
          );
          combinedRecovered.set(recoveredData, 0);
          combinedRecovered.set(actualShard, recoveredData.length);
          recoveredData = combinedRecovered;
          continue;
        }

        // Mark data shard as missing and attempt recovery using parity
        parityUsed = true;
        const shardData = Buffer.alloc((1 + parityData.length) * shardSize);
        shardData.set(paddedCorruptedShard, 0);
        parityChunks.forEach((chunk, index) => {
          shardData.set(chunk, (index + 1) * shardSize);
        });

        const availableShards = [false, ...Array(parityData.length).fill(true)];

        const recoveredShard = await this.decode(
          shardData,
          shardSize,
          1,
          parityData.length,
          availableShards,
        );

        const actualShard = recoveredShard.subarray(0, chunkSize);
        const combinedRecovered = Buffer.alloc(
          recoveredData.length + actualShard.length,
        );
        combinedRecovered.set(recoveredData, 0);
        combinedRecovered.set(actualShard, recoveredData.length);
        recoveredData = combinedRecovered;
      }

      return {
        data: recoveredData,
        recovered: parityUsed || corruptedData === null,
      };
    } catch (error) {
      throw new FecError(FecErrorType.FecDecodingFailed, undefined, {
        ERROR: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Verify file integrity using parity data.
   */
  public async verifyFileIntegrity(
    fileData: Buffer,
    parityData: ParityData[],
  ): Promise<boolean> {
    try {
      const regeneratedParity = await this.createParityData(
        fileData,
        parityData.length,
      );

      return parityData.every(
        (original, index) =>
          Buffer.compare(
            new Uint8Array(original.data),
            new Uint8Array(regeneratedParity[index].data),
          ) === 0,
      );
    } catch {
      return false;
    }
  }
}
