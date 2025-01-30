import { S3Client } from '@aws-sdk/client-s3';
import * as AWSMock from 'mock-aws-s3';

// Mock the AWS SDK S3 Client
const mockS3Client = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
}));

// Mock mock-aws-s3
const mockAwsS3Instance = {
  putObject: jest.fn(),
  getObject: jest.fn(),
  listObjects: jest.fn(),
  headBucket: jest.fn(),
};

const mockAwsS3Constructor = jest.fn().mockReturnValue(mockAwsS3Instance);

jest.mock('mock-aws-s3', () => ({
  S3: mockAwsS3Constructor,
}));

// Mock the locations module
const mockRegion = jest.fn();
jest.mock('../locations', () => ({
  region: mockRegion,
}));

describe('getS3Client', () => {
  let getS3Client: typeof import('../s3-client').getS3Client;
  let resetS3Client: typeof import('../s3-client').resetS3Client;
  let oldEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    oldEnv = process.env;
    process.env = { ...oldEnv };

    jest.clearAllMocks();
    jest.resetModules();

    process.env.MOCK_AWS_S3 = 'true';
    process.env.AWS_REGION = 'us-east-1';
    process.env.NODE_ENV = 'test';

    const s3ClientModule = require('../s3-client');
    getS3Client = s3ClientModule.getS3Client;
    resetS3Client = s3ClientModule.resetS3Client;

    resetS3Client();
  });

  afterEach(() => {
    process.env = oldEnv;
  });

  it('should create new mock S3 instance with correct configuration on first call', () => {
    mockRegion.mockReturnValue('eu-west-1');

    const client = getS3Client();

    expect(mockRegion).toHaveBeenCalled();
    expect(mockAwsS3Constructor).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          Bucket: 'mock-bucket',
        }),
      })
    );
    expect(client).toBeDefined();
  });

  it('should reuse existing client on subsequent calls', () => {
    mockRegion.mockReturnValue('eu-west-1');

    const client1 = getS3Client();
    const client2 = getS3Client();

    expect(mockAwsS3Constructor).toHaveBeenCalledTimes(1);
    expect(client1).toBe(client2);
  });

  it('should maintain singleton instance across calls with same region', () => {
    mockRegion.mockReturnValue('eu-west-1');

    const client1 = getS3Client();
    const client2 = getS3Client();
    const client3 = getS3Client();

    expect(mockAwsS3Constructor).toHaveBeenCalledTimes(1);
    expect(client1).toBe(client2);
    expect(client2).toBe(client3);
  });

  it('should handle undefined region gracefully', () => {
    mockRegion.mockReturnValue(undefined);

    const client = getS3Client();

    expect(mockRegion).toHaveBeenCalled();
    expect(mockAwsS3Constructor).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          Bucket: 'mock-bucket',
        }),
      })
    );
    expect(client).toBeDefined();
  });

  it('should handle error in region function', () => {
    const errorMessage = 'Region configuration error';
    mockRegion.mockImplementation(() => {
      throw new Error(errorMessage);
    });

    expect(() => getS3Client()).toThrow(errorMessage);
    expect(mockAwsS3Constructor).not.toHaveBeenCalled();
  });
});
