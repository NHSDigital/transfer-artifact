import * as core from '@actions/core';
import { getInputs } from '../src/input-helper';
import { Inputs } from '../src/constants';

// Mock the @actions/core package
jest.mock('@actions/core');

describe('getInputs', () => {
  const mockEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...mockEnv };
    delete process.env.ARTIFACTS_S3_BUCKET;
  });

  afterEach(() => {
    process.env = mockEnv;
  });

  it('should get required inputs with default values', () => {
    // First, mock core.getInput to return values for required inputs
    (core.getInput as jest.Mock).mockImplementation((name) => {
      switch (name) {
        case 'path':
          return '/test/path';
        case 'artifact-bucket':
          return 'test-bucket';
        case 'run-number':
          return '123';
        case 'name':
          return 'test-folder';
        default:
          return '';
      }
    });

    const result = getInputs();

    expect(result).toEqual({
      artifactName: '123-test-folder',
      artifactBucket: 'test-bucket',
      searchPath: '/test/path',
      direction: 'upload',
      folderName: 'test-folder',
      ifNoFilesFound: 'warn',
      concurrency: 8,
    });

    // Verify core.getInput was called for required path
    expect(core.getInput).toHaveBeenCalledWith('path');
  });

  it('should use environment variable for bucket if input not provided', () => {
    process.env.ARTIFACTS_S3_BUCKET = 'env-bucket';
    (core.getInput as jest.Mock).mockImplementation((name) => {
      if (name === 'path') return '/test/path';
      return '';
    });

    const result = getInputs();
    expect(result.artifactBucket).toBe('env-bucket');
  });

  it('should throw error if no bucket is provided', () => {
    (core.getInput as jest.Mock).mockImplementation((name) => {
      if (name === 'path') return '/test/path';
      return '';
    });

    expect(() => getInputs()).toThrow('no artifact-bucket supplied');
  });

  it('should handle retention days', () => {
    (core.getInput as jest.Mock).mockImplementation((name) => {
      switch (name) {
        case 'path':
          return '/test/path';
        case 'artifact-bucket':
          return 'test-bucket';
        case 'retention-days':
          return '90';
        default:
          return '';
      }
    });

    const result = getInputs();
    expect(result.retentionDays).toBe(90);
  });

  it('should handle invalid retention days', () => {
    (core.getInput as jest.Mock).mockImplementation((name) => {
      switch (name) {
        case 'path':
          return '/test/path';
        case 'artifact-bucket':
          return 'test-bucket';
        case 'retention-days':
          return 'invalid';
        default:
          return '';
      }
    });

    getInputs();
    expect(core.setFailed).toHaveBeenCalledWith('Invalid retention-days');
  });

  it('should throw error for invalid ifNoFilesFound', () => {
    (core.getInput as jest.Mock).mockImplementation((name) => {
      switch (name) {
        case 'path':
          return '/test/path';
        case 'artifact-bucket':
          return 'test-bucket';
        case 'if-no-files-found':
          return 'invalid';
        default:
          return '';
      }
    });

    expect(() => getInputs()).toThrow(
      'Unrecognized if-no-files-found input. Provided: invalid. Available options: warn, error, ignore.'
    );
  });
});
