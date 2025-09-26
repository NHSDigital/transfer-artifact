import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import { Inputs } from '../src/constants.ts';
import type { UploadInputs } from '../src/upload-inputs.ts';

const mockGetInput =
  jest.fn<(name: string, options?: { required?: boolean }) => string>();
const mockSetFailed = jest.fn<(message: string) => void>();

jest.unstable_mockModule('@actions/core', () => ({
  getInput: mockGetInput,
  setFailed: mockSetFailed,
}));

let getInputs: () => UploadInputs;

beforeAll(async () => {
  ({ getInputs } = await import('../src/input-helper.ts'));
});

describe('getInputs', () => {
  // Store original process.env to restore after tests
  const mockEnv = process.env;

  beforeEach(() => {
    // Reset all mocks and environment before each test
    jest.clearAllMocks();
    process.env = { ...mockEnv };
    // Ensure clean state by removing any potential artifact bucket env var
    delete process.env.ARTIFACTS_S3_BUCKET;
  });

  afterEach(() => {
    // Restore original process.env after tests
    process.env = mockEnv;
  });

  it('should get required inputs with default values', () => {
    // Setup mock input values that would typically come from GitHub Actions
    const mockInputs: Record<string, string> = {
      [Inputs.RunNumber]: '123',
      [Inputs.FolderName]: 'test-folder',
      [Inputs.Path]: '/test/path',
      [Inputs.ArtifactBucket]: 'test-bucket',
      [Inputs.Direction]: 'upload',
      [Inputs.IfNoFilesFound]: 'warn',
      [Inputs.RetentionDays]: '',
      [Inputs.Concurrency]: '',
    };

    // Mock the core.getInput function to return our test values
    mockGetInput.mockImplementation((name) => mockInputs[name] || '');

    // Execute the function
    const result = getInputs();

    // Verify the returned object has the expected structure and values
    expect(result).toStrictEqual({
      artifactName: '123-test-folder', // Combined from RunNumber and FolderName
      artifactBucket: 'test-bucket',
      searchPath: '/test/path',
      direction: 'upload',
      folderName: 'test-folder',
      ifNoFilesFound: 'warn',
    });

    // Verify that required inputs were checked
    expect(mockGetInput).toHaveBeenCalledWith(Inputs.Path, { required: true });
  });

  it('should use environment variable for bucket if input not provided', () => {
    // Set up environment variable for the bucket
    process.env.ARTIFACTS_S3_BUCKET = 'env-bucket';

    // Setup mock inputs without a bucket value
    const mockInputs: Record<string, string> = {
      [Inputs.RunNumber]: '123',
      [Inputs.FolderName]: 'test-folder',
      [Inputs.Path]: '/test/path',
      [Inputs.ArtifactBucket]: '', // Empty bucket input
      [Inputs.Direction]: 'upload',
      [Inputs.IfNoFilesFound]: 'warn',
    };

    mockGetInput.mockImplementation((name) => mockInputs[name] || '');

    const result = getInputs();

    // Verify environment variable was used as fallback
    expect(result.artifactBucket).toBe('env-bucket');
  });

  it('should throw error if no bucket is provided', () => {
    // Setup mock inputs with no bucket value and ensure env var is not set
    const mockInputs: Record<string, string> = {
      [Inputs.RunNumber]: '123',
      [Inputs.FolderName]: 'test-folder',
      [Inputs.Path]: '/test/path',
      [Inputs.ArtifactBucket]: '', // Empty bucket input
      [Inputs.Direction]: 'upload',
      [Inputs.IfNoFilesFound]: 'warn',
    };

    mockGetInput.mockImplementation((name) => mockInputs[name] || '');

    // Verify that the function throws with the expected error message
    expect(() => getInputs()).toThrow('no artifact-bucket supplied');
  });

  it('should handle retention days', () => {
    // Setup mock inputs including retention days
    const mockInputs: Record<string, string> = {
      [Inputs.RunNumber]: '123',
      [Inputs.FolderName]: 'test-folder',
      [Inputs.Path]: '/test/path',
      [Inputs.ArtifactBucket]: 'test-bucket',
      [Inputs.Direction]: 'upload',
      [Inputs.IfNoFilesFound]: 'warn',
      [Inputs.RetentionDays]: '90',
    };

    mockGetInput.mockImplementation((name) => mockInputs[name] || '');

    const result = getInputs();

    // Verify retention days were properly parsed to number
    expect(result.retentionDays).toBe(90);
  });

  it('should handle invalid retention days', () => {
    // Setup mock inputs with invalid retention days value
    const mockInputs: Record<string, string> = {
      [Inputs.RunNumber]: '123',
      [Inputs.FolderName]: 'test-folder',
      [Inputs.Path]: '/test/path',
      [Inputs.ArtifactBucket]: 'test-bucket',
      [Inputs.Direction]: 'upload',
      [Inputs.IfNoFilesFound]: 'warn',
      [Inputs.RetentionDays]: 'invalid', // Non-numeric value
    };

    mockGetInput.mockImplementation((name) => mockInputs[name] || '');

    // Execute function with invalid retention days
    getInputs();

    // Verify error was properly handled
    expect(mockSetFailed).toHaveBeenCalledWith('Invalid retention-days');
  });

  it('should set failed for invalid ifNoFilesFound', () => {
    // Setup mock inputs with invalid ifNoFilesFound value
    const mockInputs: Record<string, string> = {
      [Inputs.RunNumber]: '123',
      [Inputs.FolderName]: 'test-folder',
      [Inputs.Path]: '/test/path',
      [Inputs.ArtifactBucket]: 'test-bucket',
      [Inputs.Direction]: 'upload',
      [Inputs.IfNoFilesFound]: '', // Invalid empty value
    };

    mockGetInput.mockImplementation((name) => mockInputs[name] || '');

    // Execute function with invalid ifNoFilesFound
    getInputs();

    // Verify error was handled with proper message
    expect(mockSetFailed).toHaveBeenCalledWith(
      expect.stringContaining('Unrecognized if-no-files-found input')
    );
  });
});
