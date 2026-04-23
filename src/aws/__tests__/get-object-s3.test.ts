import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import type { S3Location } from '../types.ts';

const mockSend: any = jest.fn();

jest.unstable_mockModule('../s3-client.ts', () => ({
  getS3Client: () => ({ send: mockSend }),
}));

let writeS3ObjectToFile: (
  location: S3Location,
  filename: string
) => Promise<number>;
let getS3ObjectStream: ({ Bucket, Key }: S3Location) => Promise<Readable>;

beforeAll(async () => {
  ({ writeS3ObjectToFile, getS3ObjectStream } =
    await import('../get-object-s3.ts'));
});

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
    expect(bytesWritten).toStrictEqual(testContent.length);

    // Verify file contents match expected data
    const data = await fs.readFile(filename, { encoding: 'utf8' });
    expect(data).toStrictEqual(testContent);
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
    expect(bytesWritten).toStrictEqual(0);

    // Verify file exists but is empty
    const data = await fs.readFile(filename, { encoding: 'utf8' });
    expect(data).toStrictEqual('');
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
    expect(bytesWritten).toStrictEqual(1024 * 1024);

    // Verify file size matches expected size
    const stats = await fs.stat(filename);
    expect(stats.size).toStrictEqual(1024 * 1024);
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
    expect(content).toStrictEqual(testContent);
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
