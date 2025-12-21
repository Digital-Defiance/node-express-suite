import { withConsoleMocks } from '@digitaldefiance/express-suite-test-utils';
import { FecService } from '../../src/services/fec';
import { FecUsageExample } from '../../src/services/fec-usage-example';

jest.mock('../../src/services/fec');

describe('FecUsageExample', () => {
  let example: FecUsageExample;
  let mockFecService: jest.Mocked<FecService>;

  beforeEach(() => {
    jest.clearAllMocks();
    example = new FecUsageExample();
    mockFecService = (example as any).fecService as jest.Mocked<FecService>;
  });

  describe('createFileWithParity', () => {
    it('should create parity data with default count', async () => {
      const fileData = Buffer.from('test data');
      const mockParityData = [
        { data: Buffer.from('parity1'), index: 0 },
        { data: Buffer.from('parity2'), index: 1 },
      ];

      mockFecService.createParityData = jest
        .fn()
        .mockResolvedValue(mockParityData);

      const result = await example.createFileWithParity(fileData);

      expect(mockFecService.createParityData).toHaveBeenCalledWith(fileData, 2);
      expect(result).toEqual({
        originalData: fileData,
        parityData: mockParityData,
        originalSize: fileData.length,
      });
    });

    it('should create parity data with custom count', async () => {
      const fileData = Buffer.from('test data');
      const parityCount = 5;
      const mockParityData = Array.from({ length: parityCount }, (_, i) => ({
        data: Buffer.from(`parity${i}`),
        index: i,
      }));

      mockFecService.createParityData = jest
        .fn()
        .mockResolvedValue(mockParityData);

      const result = await example.createFileWithParity(fileData, parityCount);

      expect(mockFecService.createParityData).toHaveBeenCalledWith(
        fileData,
        parityCount,
      );
      expect(result.parityData).toBe(mockParityData);
      expect(result.originalSize).toBe(fileData.length);
    });
  });

  describe('recoverCorruptedFile', () => {
    it('should recover file when recovery succeeds', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const parityData = [
          { data: Buffer.from('parity1'), index: 0 },
          { data: Buffer.from('parity2'), index: 1 },
        ];
        const originalSize = 100;
        const recoveredData = Buffer.from('recovered data');

        mockFecService.recoverFileData = jest.fn().mockResolvedValue({
          recovered: true,
          data: recoveredData,
        });

        const result = await example.recoverCorruptedFile(
          parityData,
          originalSize,
        );

        expect(mockFecService.recoverFileData).toHaveBeenCalledWith(
          null,
          parityData,
          originalSize,
        );
        expect(result).toBe(recoveredData);
      });
    });

    it('should throw error when recovery fails', async () => {
      const parityData = [{ data: Buffer.from('parity1'), index: 0 }];
      const originalSize = 100;

      mockFecService.recoverFileData = jest.fn().mockResolvedValue({
        recovered: false,
        data: null,
      });

      await expect(
        example.recoverCorruptedFile(parityData, originalSize),
      ).rejects.toThrow('File recovery failed');
    });
  });

  describe('verifyFile', () => {
    it('should verify file integrity successfully', async () => {
      const fileData = Buffer.from('test file');
      const parityData = [
        { data: Buffer.from('parity1'), index: 0 },
        { data: Buffer.from('parity2'), index: 1 },
      ];

      mockFecService.verifyFileIntegrity = jest.fn().mockResolvedValue(true);

      const result = await example.verifyFile(fileData, parityData);

      expect(mockFecService.verifyFileIntegrity).toHaveBeenCalledWith(
        fileData,
        parityData,
      );
      expect(result).toBe(true);
    });

    it('should return false when file integrity check fails', async () => {
      const fileData = Buffer.from('corrupted file');
      const parityData = [{ data: Buffer.from('parity1'), index: 0 }];

      mockFecService.verifyFileIntegrity = jest.fn().mockResolvedValue(false);

      const result = await example.verifyFile(fileData, parityData);

      expect(result).toBe(false);
    });
  });

  describe('demonstrateWorkflow', () => {
    it('should complete full workflow with successful recovery', async () => {
      await withConsoleMocks({ mute: true }, async (spies) => {
        const originalFile = Buffer.from(
          'This is important file data that needs protection!',
        );
        const mockParityData = [
          { data: Buffer.from('parity1'), index: 0 },
          { data: Buffer.from('parity2'), index: 1 },
        ];

        // Mock createParityData
        mockFecService.createParityData = jest
          .fn()
          .mockResolvedValue(mockParityData);

        // Mock verifyFileIntegrity
        mockFecService.verifyFileIntegrity = jest.fn().mockResolvedValue(true);

        // Mock recoverFileData
        mockFecService.recoverFileData = jest.fn().mockResolvedValue({
          recovered: true,
          data: originalFile,
        });

        const result = await example.demonstrateWorkflow();

        expect(mockFecService.createParityData).toHaveBeenCalledWith(
          originalFile,
          2,
        );
        expect(mockFecService.verifyFileIntegrity).toHaveBeenCalledWith(
          originalFile,
          mockParityData,
        );
        expect(mockFecService.recoverFileData).toHaveBeenCalledWith(
          null,
          mockParityData,
          originalFile.length,
        );

        expect(result.originalFile).toEqual(originalFile);
        expect(result.recoveredFile).toEqual(originalFile);
        expect(result.parityData).toBe(mockParityData);
        expect(result.recoverySuccessful).toBe(true);

        expect(spies.log).toHaveBeenCalledWith('Creating parity data...');
        expect(spies.log).toHaveBeenCalledWith('Verifying file integrity...');
        expect(spies.log).toHaveBeenCalledWith(
          'File integrity check:',
          'PASSED',
        );
        expect(spies.log).toHaveBeenCalledWith(
          'Simulating file corruption and recovery...',
        );
        expect(spies.log).toHaveBeenCalledWith('Recovery successful:', 'YES');
      });
    });

    it('should complete workflow with failed verification', async () => {
      await withConsoleMocks({ mute: true }, async (spies) => {
        const originalFile = Buffer.from(
          'This is important file data that needs protection!',
        );
        const mockParityData = [{ data: Buffer.from('parity1'), index: 0 }];

        mockFecService.createParityData = jest
          .fn()
          .mockResolvedValue(mockParityData);
        mockFecService.verifyFileIntegrity = jest.fn().mockResolvedValue(false);
        mockFecService.recoverFileData = jest.fn().mockResolvedValue({
          recovered: true,
          data: originalFile,
        });

        const result = await example.demonstrateWorkflow();

        expect(spies.log).toHaveBeenCalledWith(
          'File integrity check:',
          'FAILED',
        );
      });
    });

    it('should complete workflow with unsuccessful recovery', async () => {
      await withConsoleMocks({ mute: true }, async (spies) => {
        const originalFile = Buffer.from(
          'This is important file data that needs protection!',
        );
        const differentFile = Buffer.from('Different data');
        const mockParityData = [{ data: Buffer.from('parity1'), index: 0 }];

        mockFecService.createParityData = jest
          .fn()
          .mockResolvedValue(mockParityData);
        mockFecService.verifyFileIntegrity = jest.fn().mockResolvedValue(true);
        mockFecService.recoverFileData = jest.fn().mockResolvedValue({
          recovered: true,
          data: differentFile,
        });

        const result = await example.demonstrateWorkflow();

        expect(result.recoverySuccessful).toBe(false);
        expect(spies.log).toHaveBeenCalledWith('Recovery successful:', 'NO');
      });
    });
  });
});
