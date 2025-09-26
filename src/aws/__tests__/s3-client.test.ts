import type { S3Client as S3ClientConstructor } from '@aws-sdk/client-s3/dist-types/S3Client.d.ts';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

const mockS3Client: jest.Mock = jest.fn(() => ({
  send: jest.fn(),
}));
const mockRegion = jest.fn<() => string | undefined>();

jest.unstable_mockModule('@aws-sdk/client-s3', () => ({
  S3Client: mockS3Client,
}));

jest.unstable_mockModule('../locations.ts', () => ({
  region: mockRegion,
}));

describe('getS3Client', () => {
  let getS3Client: () => S3ClientConstructor;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    ({ getS3Client } = await import('../s3-client.ts'));
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('should create new S3Client instance with correct region on first call', () => {
    mockRegion.mockReturnValue('eu-west-1');

    const client = getS3Client();

    expect(mockRegion).toHaveBeenCalled();
    expect(mockS3Client).toHaveBeenCalledTimes(1);
    expect(mockS3Client).toHaveBeenCalledWith({
      region: 'eu-west-1',
    });
    expect(client).toBeDefined();
  });

  it('should reuse existing client on subsequent calls', () => {
    mockRegion.mockReturnValue('eu-west-1');

    const client1 = getS3Client();
    const client2 = getS3Client();

    expect(mockS3Client).toHaveBeenCalledTimes(1);
    expect(client1).toBe(client2);
  });

  it('should maintain singleton instance across calls with same region', () => {
    mockRegion.mockReturnValue('eu-west-1');

    const client1 = getS3Client();
    const client2 = getS3Client();
    const client3 = getS3Client();

    expect(mockS3Client).toHaveBeenCalledTimes(1);
    expect(client1).toBe(client2);
    expect(client2).toBe(client3);
  });

  it('should handle undefined region gracefully', () => {
    mockRegion.mockReturnValue(undefined);

    const client = getS3Client();

    expect(mockRegion).toHaveBeenCalled();
    expect(mockS3Client).toHaveBeenCalledWith({
      region: undefined,
    });
    expect(client).toBeDefined();
  });

  it('should handle error in region function', () => {
    const errorMessage = 'Region configuration error';
    mockRegion.mockImplementation(() => {
      throw new Error(errorMessage);
    });

    expect(() => getS3Client()).toThrow(errorMessage);
    expect(mockS3Client).not.toHaveBeenCalled();
  });
});
