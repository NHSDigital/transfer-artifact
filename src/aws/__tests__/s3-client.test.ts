// Create mock for S3Client
const mockS3Client = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
}));

// Mock the AWS SDK S3 Client
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: mockS3Client,
}));

// Mock the locations module with a mock function we can control
const mockRegion = jest.fn();
jest.mock('../locations', () => ({
  region: mockRegion,
}));

describe('getS3Client', () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let getS3Client: typeof import('../s3-client').getS3Client;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Reset modules to clear singleton state
    jest.resetModules();

    // Reset our mock functions
    mockS3Client.mockClear();
    mockRegion.mockReset();

    // Import fresh instance AFTER resetting mocks
    // eslint-disable-next-line @typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires
    getS3Client = require('../s3-client').getS3Client;
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('should create new S3Client instance with correct region on first call', () => {
    // Setup region mock
    mockRegion.mockReturnValue('eu-west-1');

    // Get the S3 client
    const client = getS3Client();

    // Verify region was called
    expect(mockRegion).toHaveBeenCalled();

    // Verify S3Client constructor was called correctly
    expect(mockS3Client).toHaveBeenCalledTimes(1);
    expect(mockS3Client).toHaveBeenCalledWith({
      region: 'eu-west-1',
    });

    // Verify we got back a client instance
    expect(client).toBeDefined();
  });

  it('should reuse existing client on subsequent calls', () => {
    // Setup region mock
    mockRegion.mockReturnValue('eu-west-1');

    // Get the S3 client twice
    const client1 = getS3Client();
    const client2 = getS3Client();

    // Verify S3Client constructor was only called once
    expect(mockS3Client).toHaveBeenCalledTimes(1);
    // Verify both calls returned the same instance
    expect(client1).toBe(client2);
  });

  it('should maintain singleton instance across calls with same region', () => {
    // Setup region mock
    mockRegion.mockReturnValue('eu-west-1');

    // Get the client multiple times
    const client1 = getS3Client();
    const client2 = getS3Client();
    const client3 = getS3Client();

    // Verify constructor was only called once
    expect(mockS3Client).toHaveBeenCalledTimes(1);
    // Verify all references are to the same instance
    expect(client1).toBe(client2);
    expect(client2).toBe(client3);
  });

  it('should handle undefined region gracefully', () => {
    // Setup region mock to return undefined
    mockRegion.mockReturnValue(undefined);

    // Get the S3 client
    const client = getS3Client();

    // Verify region was called
    expect(mockRegion).toHaveBeenCalled();

    // Verify S3Client was called with undefined region
    expect(mockS3Client).toHaveBeenCalledWith({
      region: undefined,
    });

    // Verify we still got a client instance
    expect(client).toBeDefined();
  });

  it('should handle error in region function', () => {
    // Setup region mock to throw error
    const errorMessage = 'Region configuration error';
    mockRegion.mockImplementation(() => {
      throw new Error(errorMessage);
    });

    // Verify getS3Client throws the error
    const getClient = () => getS3Client();
    expect(getClient).toThrow(errorMessage);

    // Verify S3Client was not instantiated
    expect(mockS3Client).not.toHaveBeenCalled();
  });
});
