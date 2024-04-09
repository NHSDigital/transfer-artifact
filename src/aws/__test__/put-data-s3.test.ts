import { putDataS3, uploadObjectToS3 } from '../put-data-s3';

const mockSend = jest.fn();
jest.mock('../s3-client', () => ({
  getS3Client: jest.fn(() => ({ send: mockSend })),
}));

const data = { some: 'JSON', data: 'here' };

const moreData = 'Hello world';
const mockLog = { info: jest.fn(), error: jest.fn() };

describe('putDataS3', () => {
  afterEach(jest.clearAllMocks);

  it('Should throw an error if invalid key', async () => {
    mockSend.mockImplementationOnce(() => {
      throw new Error('No file found');
    });

    await expect(
      putDataS3(data, {
        Bucket: 'bucket-name',
        Key: 'config.test.json',
      })
    ).rejects.toThrowError(
      'Upload to bucket-name/config.test.json failed, error: Error: No file found'
    );
  });

  it('Should return data', async () => {
    mockSend.mockReturnValueOnce(data);

    const result = await putDataS3(data, {
      Bucket: 'bucket-name',
      Key: 'config.test.json',
    });

    expect(result).toEqual(data);
  });
});

describe('uploadObjectToS3', () => {
  afterEach(jest.clearAllMocks);

  it('Should throw an error if invalid key', async () => {
    mockSend.mockImplementationOnce(() => {
      throw new Error('No file found');
    });

    await expect(
      uploadObjectToS3(
        {
          Body: moreData,
          Bucket: 'bucket-name',
          Key: 'config.test.json',
        },
        mockLog
      )
    ).rejects.toThrowError(
      'Upload to bucket-name/config.test.json failed, error: No file found'
    );
  });

  it('Should return data', async () => {
    mockSend.mockReturnValueOnce(data);

    const result = await uploadObjectToS3(
      {
        Body: moreData,
        Bucket: 'bucket-name',
        Key: 'config.test.json',
      },
      mockLog
    );

    expect(result).toEqual(data);
  });
});
