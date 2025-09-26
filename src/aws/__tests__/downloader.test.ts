import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

type Inputs = {
  artifactBucket: string;
  artifactName: string;
  concurrency: number;
  searchPath: string;
  folderName: string;
};

const mockGetInputs = jest.fn<() => Inputs>();
const mockListS3Objects = jest.fn<() => Promise<string[]>>();
const mockWriteS3ObjectToFile = jest.fn<() => Promise<number>>();
const mockSetFailed = jest.fn<(message: string) => void>();
const mockMkdir =
  jest.fn<(path: string, options?: { recursive?: boolean }) => Promise<void>>();
const mockPMap = jest.fn(
  async <T, U>(input: T[], mapper: (item: T) => Promise<U>): Promise<U[]> =>
    await Promise.all(input.map((item) => mapper(item)))
);

jest.unstable_mockModule('@actions/core', () => ({
  setFailed: mockSetFailed,
}));

jest.unstable_mockModule('../../input-helper.ts', () => ({
  getInputs: mockGetInputs,
}));

jest.unstable_mockModule('../get-object-s3.ts', () => ({
  listS3Objects: mockListS3Objects,
  writeS3ObjectToFile: mockWriteS3ObjectToFile,
}));

jest.unstable_mockModule('node:fs/promises', () => ({
  default: {
    mkdir: mockMkdir,
  },
  mkdir: mockMkdir,
}));

jest.unstable_mockModule('p-map', () => ({
  default: mockPMap,
}));

describe('runDownload', () => {
  let runDownload: () => Promise<number[]>;

  const mockInputs: Inputs = {
    artifactBucket: 'test-bucket',
    artifactName: 'test-artifact',
    concurrency: 5,
    searchPath: '/test/path',
    folderName: 'test-folder',
  };

  beforeAll(async () => {
    ({ runDownload } = await import('../downloader.ts'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    mockGetInputs.mockReturnValue(mockInputs);
    mockMkdir.mockResolvedValue(undefined);
  });

  it('should correctly calculate and log download statistics', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log');
    const mockS3Objects = [
      'ci-pipeline-upload-artifacts/test-folder/test-artifact/file1.txt',
      'ci-pipeline-upload-artifacts/test-folder/test-artifact/file2.txt',
      'ci-pipeline-upload-artifacts/test-folder/test-artifact/file3.txt',
    ];

    mockListS3Objects.mockResolvedValue(mockS3Objects);
    mockWriteS3ObjectToFile.mockResolvedValue(100);

    await runDownload();

    const logMessages = consoleLogSpy.mock.calls.map((call) => call[0]);
    const downloadStatMessage = logMessages.find(
      (message) => message.includes('Downloaded') && message.includes('bytes')
    );

    expect(downloadStatMessage).toBeDefined();
    expect(downloadStatMessage).toContain('300 bytes');
    expect(downloadStatMessage).toContain('3 files');
  });
});
