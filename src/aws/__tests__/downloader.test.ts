import { runDownload } from '../downloader';
import * as core from '@actions/core';
import * as inputHelper from '../../input-helper';
import { listS3Objects, writeS3ObjectToFile } from '../get-object-s3';
import fs from 'node:fs/promises';

// Mock all external dependencies
jest.mock('@actions/core');
jest.mock('../../input-helper');
jest.mock('../get-object-s3');
jest.mock('node:fs/promises');

describe('runDownload', () => {
  // Define common test inputs that will be used across multiple tests
  const mockInputs = {
    artifactBucket: 'test-bucket',
    artifactName: 'test-artifact',
    concurrency: 5,
    searchPath: '/test/path',
    folderName: 'test-folder',
  };

  beforeEach(() => {
    // Reset all mocks before each test to ensure clean state
    jest.clearAllMocks();
    // Mock console.log to prevent test output pollution
    jest.spyOn(console, 'log').mockImplementation(() => {});
    // Setup default mock returns
    (inputHelper.getInputs as jest.Mock).mockReturnValue(mockInputs);
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
  });

  it('should successfully download objects', async () => {
    // Setup test data
    const mockS3Objects = [
      'ci-pipeline-upload-artifacts/test-folder/test-artifact/file1.txt',
      'ci-pipeline-upload-artifacts/test-folder/test-artifact/file2.txt',
      'some-other-file.txt', // This one should be filtered out
    ];

    // Mock S3 operations
    (listS3Objects as jest.Mock).mockResolvedValue(mockS3Objects);
    (writeS3ObjectToFile as jest.Mock).mockResolvedValue(100); // Each file is 100 bytes

    // Execute the download
    const result = await runDownload();

    // Verify S3 list operation was called with correct parameters
    expect(listS3Objects).toHaveBeenCalledWith({
      Bucket: 'test-bucket',
      Prefix: 'ci-pipeline-upload-artifacts/test-folder/test-artifact',
    });

    // Verify only matching files were downloaded
    expect(writeS3ObjectToFile).toHaveBeenCalledTimes(2);
    expect(fs.mkdir).toHaveBeenCalledTimes(2);
    expect(result).toEqual([100, 100]);
  });

  it('should handle empty object list', async () => {
    // Mock empty S3 bucket
    (listS3Objects as jest.Mock).mockResolvedValue([]);

    const result = await runDownload();

    // Verify no downloads were attempted
    expect(writeS3ObjectToFile).not.toHaveBeenCalled();
    expect(fs.mkdir).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('should handle download errors', async () => {
    // Mock S3 list operation failure
    const error = new Error('Download failed');
    (listS3Objects as jest.Mock).mockRejectedValue(error);

    await runDownload();

    // Verify error was properly handled
    expect(core.setFailed).toHaveBeenCalledWith(error.message);
  });

  it('should handle file system errors', async () => {
    const mockS3Objects = [
      'ci-pipeline-upload-artifacts/test-folder/test-artifact/file1.txt',
    ];
    const error = new Error('Failed to create directory');

    // Mock successful S3 list but failed mkdir
    (listS3Objects as jest.Mock).mockResolvedValue(mockS3Objects);
    (fs.mkdir as jest.Mock).mockRejectedValue(error);

    await runDownload();

    // Verify file system error was properly handled
    expect(core.setFailed).toHaveBeenCalledWith(error.message);
  });

  it('should log download information', async () => {
    const mockS3Objects = [
      'ci-pipeline-upload-artifacts/test-folder/test-artifact/file1.txt',
    ];
    const consoleLogSpy = jest.spyOn(console, 'log');

    // Mock successful download of a 1KB file
    (listS3Objects as jest.Mock).mockResolvedValue(mockS3Objects);
    (writeS3ObjectToFile as jest.Mock).mockResolvedValue(1000);

    await runDownload();

    // Verify correct logging of download statistics
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Downloaded')
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('1000 bytes')
    );
    expect(consoleLogSpy).toHaveBeenCalledWith('Total objects downloaded: 1');
  });

  it('should process files with proper concurrency', async () => {
    // Create array of 10 mock files
    const mockS3Objects = Array(10)
      .fill(0)
      .map(
        (_, i) =>
          `ci-pipeline-upload-artifacts/test-folder/test-artifact/file${i}.txt`
      );

    // Mock S3 operations
    (listS3Objects as jest.Mock).mockResolvedValue(mockS3Objects);
    (writeS3ObjectToFile as jest.Mock).mockResolvedValue(100);

    await runDownload();

    // Verify all files were processed
    expect(writeS3ObjectToFile).toHaveBeenCalledTimes(10);
  });
});

describe('logDownloadInformation', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should correctly calculate and log download statistics', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log');

    // Mock S3 objects and their download
    const mockS3Objects = [
      'ci-pipeline-upload-artifacts/test-folder/test-artifact/file1.txt',
      'ci-pipeline-upload-artifacts/test-folder/test-artifact/file2.txt',
      'ci-pipeline-upload-artifacts/test-folder/test-artifact/file3.txt',
    ];

    // Setup the test with 3 files of 100 bytes each
    (listS3Objects as jest.Mock).mockResolvedValue(mockS3Objects);
    (writeS3ObjectToFile as jest.Mock).mockResolvedValue(100);

    await runDownload();

    // Extract the download statistics log message
    const logMessage = consoleLogSpy.mock.calls.find((call) =>
      call[0].includes('Downloaded')
    )?.[0];

    // Verify the log message contains expected information
    expect(logMessage).toBeDefined();
    if (logMessage) {
      expect(logMessage).toContain('300 bytes'); // 3 files * 100 bytes
      expect(logMessage).toContain('3 files');
    }
  });
});
