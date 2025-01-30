import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Readable } from 'node:stream';
import {
  getS3Object,
  listS3Objects,
  writeS3ObjectToFile,
  getS3ObjectStream,
} from '../get-object-s3';
import { getPathToItem } from '../downloader';

// Mock the S3 client
const mockSend = jest.fn();
jest.mock('../s3-client', () => ({
  getS3Client: jest.fn(() => ({ send: mockSend })),
}));

describe('writeS3ObjectToFile', () => {
  let temporaryDir: string;

  beforeEach(async () => {
    // Create temporary directory for file operations
    temporaryDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'writeS3ObjectToFile-test')
    );
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up temporary directory after tests
    await fs.rm(temporaryDir, { recursive: true, force: true });
  });

  it('should successfully write data to file and return correct byte count', async () => {
    // Prepare test data and file location
    const filename = path.join(temporaryDir, 'test1.txt');
    const testContent = 'TESTING TEXT 123';

    // Mock successful S3 response with readable stream
    mockSend.mockResolvedValueOnce({ Body: Readable.from([testContent]) });

    // Execute write operation
    const bytesWritten = await writeS3ObjectToFile(
      {
        Bucket: 'bucket-name',
        Key: 'config.test.json',
      },
      filename
    );

    // Verify correct number of bytes were written
    expect(bytesWritten).toEqual(testContent.length);

    // Verify file contents match expected data
    const data = await fs.readFile(filename, { encoding: 'utf8' });
    expect(data).toEqual(testContent);
  });

  it('should throw error with detailed message when S3 request fails', async () => {
    // Prepare test file location
    const filename = path.join(temporaryDir, 'test2.txt');

    // Mock failed S3 response
    mockSend.mockRejectedValueOnce(new Error('S3 error'));

    // Verify error is thrown with proper format
    await expect(
      writeS3ObjectToFile(
        {
          Bucket: 'bucket-name',
          Key: 'config.test.json',
        },
        filename
      )
    ).rejects.toThrow(
      "Could not retrieve from bucket 's3://bucket-name/config.test.json'. Error was: S3 error"
    );
  });

  it('should handle empty response from S3', async () => {
    // Prepare test file location
    const filename = path.join(temporaryDir, 'test3.txt');

    // Mock S3 response with empty content
    mockSend.mockResolvedValueOnce({ Body: Readable.from(['']) });

    // Write empty content to file
    const bytesWritten = await writeS3ObjectToFile(
      {
        Bucket: 'bucket-name',
        Key: 'config.test.json',
      },
      filename
    );

    // Verify zero bytes were written
    expect(bytesWritten).toEqual(0);

    // Verify file exists but is empty
    const data = await fs.readFile(filename, { encoding: 'utf8' });
    expect(data).toEqual('');
  });

  it('should handle large file downloads', async () => {
    // Prepare test file location
    const filename = path.join(temporaryDir, 'test4.txt');

    // Create large test content (1MB)
    const largeContent = 'x'.repeat(1024 * 1024);

    // Mock successful S3 response with large content
    mockSend.mockResolvedValueOnce({ Body: Readable.from([largeContent]) });

    // Execute write operation
    const bytesWritten = await writeS3ObjectToFile(
      {
        Bucket: 'bucket-name',
        Key: 'large-file.txt',
      },
      filename
    );

    // Verify correct number of bytes were written
    expect(bytesWritten).toEqual(1024 * 1024);

    // Verify file size matches expected size
    const stats = await fs.stat(filename);
    expect(stats.size).toEqual(1024 * 1024);
  });
});

describe('getS3ObjectStream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a readable stream for valid S3 object', async () => {
    // Prepare test content
    const testContent = 'Stream content';
    const readable = Readable.from([testContent]);

    // Mock successful S3 response
    mockSend.mockResolvedValueOnce({ Body: readable });

    // Get stream from S3 object
    const stream = await getS3ObjectStream({
      Bucket: 'bucket-name',
      Key: 'test.txt',
    });

    // Verify stream is returned
    expect(stream).toBeDefined();
    expect(stream.readable).toBe(true);

    // Verify stream contains expected content
    let content = '';
    for await (const chunk of stream) {
      content += chunk;
    }
    expect(content).toEqual(testContent);
  });

  it('should throw error when S3 response body is not readable', async () => {
    // Mock S3 response with invalid body
    mockSend.mockResolvedValueOnce({ Body: undefined });

    // Verify error is thrown for invalid stream
    await expect(
      getS3ObjectStream({
        Bucket: 'bucket-name',
        Key: 'test.txt',
      })
    ).rejects.toThrow(
      "Could not read file from bucket. 's3://bucket-name/test.txt'"
    );
  });

  it('should propagate S3 errors with detailed message', async () => {
    // Mock failed S3 response
    mockSend.mockRejectedValueOnce(new Error('Access denied'));

    // Verify error is thrown with proper format
    await expect(
      getS3ObjectStream({
        Bucket: 'bucket-name',
        Key: 'test.txt',
      })
    ).rejects.toThrow(
      "Could not retrieve from bucket 's3://bucket-name/test.txt' from S3: Access denied"
    );
  });
});
