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

    // Find all log messages
    const logMessages = consoleLogSpy.mock.calls.map((call) => call[0]);

    // Find the download statistics log message
    const downloadStatMessage = logMessages.find(
      (message) => message.includes('Downloaded') && message.includes('bytes')
    );

    // Assert on the download statistics message
    expect(downloadStatMessage).toBeDefined();
    expect(downloadStatMessage).toContain('300 bytes'); // 3 files * 100 bytes
    expect(downloadStatMessage).toContain('3 files');
  });
});
