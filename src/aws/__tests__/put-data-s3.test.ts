import { putDataS3, uploadObjectToS3 } from '../put-data-s3';

// Mock the S3 client
const mockSend = jest.fn();
jest.mock('../s3-client', () => ({
  getS3Client: jest.fn(() => ({ send: mockSend })),
}));

// Test data setup
const testData = { some: 'JSON', data: 'here' };
const testContent = 'Hello world';
const mockLogger = {
  info: jest.fn(),
  error: jest.fn()
};

describe('putDataS3', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    // Mock console.log to prevent test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should throw error with detailed message if upload fails', async () => {
    // Mock failed S3 upload
    const errorMessage = 'No file found';
    mockSend.mockRejectedValueOnce(new Error(errorMessage));

    // Test upload with sample data
    await expect(
      putDataS3(testData, {
        Bucket: 'bucket-name',
        Key: 'config.test.json',
      })
    ).rejects.toThrow(
      'Upload to bucket-name/config.test.json failed, error: Error: No file found'
    );
  });

  it('should successfully upload data and return response', async () => {
    // Mock successful S3 upload
    const expectedResponse = { TEST: '123456' };
    mockSend.mockResolvedValueOnce(expectedResponse);

    // Upload test data
    const result = await putDataS3(testData, {
      Bucket: 'bucket-name',
      Key: 'config.test.json',
    });

    // Verify response matches expected
    expect(result).toEqual(expectedResponse);

    // Verify S3 client was called with correct params
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Bucket: 'bucket-name',
          Key: 'config.test.json',
          Body: JSON.stringify(testData, null, 2), // Verify proper JSON formatting
        }
      })
    );

    // Verify console log was called with success message
    expect(console.log).toHaveBeenCalledWith(
      'Data uploaded to bucket-name/config.test.json'
    );
  });

  it('should handle empty object upload', async () => {
    // Mock successful S3 upload
    const expectedResponse = { TEST: '123456' };
    mockSend.mockResolvedValueOnce(expectedResponse);

    // Upload empty object
    const result = await putDataS3({}, { // empty here
      Bucket: 'bucket-name',
      Key: 'empty.json',
    });

    // Verify empty object was properly stringified
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Bucket: 'bucket-name',
          Key: 'empty.json',
          Body: '{}', // Verify empty object JSON
        }
      })
    );
  });
});

describe('uploadObjectToS3', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error and log failure if upload fails', async () => {
    // Mock failed S3 upload
    const errorMessage = 'No file found';
    mockSend.mockRejectedValueOnce(new Error(errorMessage));

    // Test upload with sample content
    await expect(
      uploadObjectToS3(
        {
          Body: testContent,
          Bucket: 'bucket-name',
          Key: 'config.test.json',
        },
        mockLogger
      )
    ).rejects.toThrow(errorMessage);

    // Verify proper logging
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Starting upload to s3://bucket-name/config.test.json'
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Upload to bucket-name/config.test.json failed, error: No file found'
    );
  });

  it('should successfully upload object and return response', async () => {
    // Mock successful S3 upload
    const expectedResponse = { TEST: '123456' };
    mockSend.mockResolvedValueOnce(expectedResponse);

    // Upload test content
    const result = await uploadObjectToS3(
      {
        Body: testContent,
        Bucket: 'bucket-name',
        Key: 'config.test.json',
      },
      mockLogger
    );

    // Verify response and logging
    expect(result).toEqual(expectedResponse);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Starting upload to s3://bucket-name/config.test.json'
    );

    // Verify S3 client call
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Body: testContent,
          Bucket: 'bucket-name',
          Key: 'config.test.json',
        }
      })
    );
  });

  it('should handle various content types', async () => {
    // Test cases for different content types
    const testCases = [
      { content: 'string content', type: 'string' },
      { content: Buffer.from('buffer content'), type: 'buffer' },
      { content: new Uint8Array([1, 2, 3]), type: 'uint8array' }
    ];

    for (const testCase of testCases) {
      // Reset mocks for each test case
      jest.clearAllMocks();
      mockSend.mockResolvedValueOnce({ TEST: '123456' });

      // Upload content
      await uploadObjectToS3(
        {
          Body: testCase.content,
          Bucket: 'bucket-name',
          Key: `test.${testCase.type}`,
        },
        mockLogger
      );

      // Verify S3 client was called with correct body
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            Body: testCase.content,
            Bucket: 'bucket-name',
            Key: `test.${testCase.type}`,
          }
        })
      );
    }
  });

  it('should re-throw non-Error objects as is', async () => {
    // Mock S3 failure with non-Error object
    const nonErrorObject = { code: 'SomeError' };
    mockSend.mockRejectedValueOnce(nonErrorObject);

    // Verify non-Error object is rethrown without modification
    await expect(
      uploadObjectToS3(
        {
          Body: testContent,
          Bucket: 'bucket-name',
          Key: 'config.test.json',
        },
        mockLogger
      )
    ).rejects.toEqual(nonErrorObject);
  });

  it('should handle zero-byte uploads', async () => {
    // Mock successful S3 upload
    mockSend.mockResolvedValueOnce({ TEST: '123456' });

    // Upload empty content
    await uploadObjectToS3(
      {
        Body: '',
        Bucket: 'bucket-name',
        Key: 'empty.txt',
      },
      mockLogger
    );

    // Verify S3 client was called with empty body
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Body: '',
          Bucket: 'bucket-name',
          Key: 'empty.txt',
        }
      })
    );
  });
});