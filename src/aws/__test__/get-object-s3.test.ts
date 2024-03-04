import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {Readable} from 'node:stream'
import {getS3Object, listS3Objects, writeS3ObjectToFile} from '../get-object-s3'
import pMap from 'p-map';
import { runDownload } from '../downloader'

jest.mock('p-map');

const mockSend = jest.fn()
jest.mock('../s3-client', () => ({
  getS3Client: jest.fn(() => ({send: mockSend}))
}))

describe('getS3Object', () => {
  afterEach(jest.clearAllMocks)

  it('Should return all files for known bucket when using prefix', async () => {
    mockSend.mockImplementationOnce(() => ({
      Contents: [{Prefix: 'path/to/file', Key: 'KEY'}]
    }))

    const result = await listS3Objects({
      Bucket: 'bucket-name',
      Prefix: 'path/to/file'
    })

    expect(result).toMatchInlineSnapshot(`
			[
			  "KEY",
			]
		`)
  })

  it('Should throw an error if invalid key', async () => {
    mockSend.mockImplementationOnce(() => {
      throw new Error('No file found')
    })

    await expect(
      getS3Object({
        Bucket: 'bucket-name',
        Key: 'config.test.json'
      })
    ).rejects.toThrowError(
      "Could not retrieve from bucket 's3://bucket-name/config.test.json' from S3: Could not retrieve from bucket 's3://bucket-name/config.test.json' from S3: No file found"
    )
  })

  it('Should return config', async () => {
    const result = JSON.stringify({
      featureFlags: {
        testFlag: true
      }
    })

    mockSend.mockReturnValueOnce({Body: Readable.from([result])})

    const data = await getS3Object({
      Bucket: 'bucket-name',
      Key: 'config.test.json'
    })

    expect(data).toEqual(result)
  })

  it('Should return default when object does not exist', async () => {
    const defaultValue = 'the default value'

    mockSend.mockImplementationOnce(() => {
      throw new Error('not found')
    })

    const data = await getS3Object(
      {
        Bucket: 'bucket-name',
        Key: 'config.test.json'
      },
      defaultValue
    )

    expect(data).toEqual(defaultValue)
  })
})

describe('listS3Objects', () => {
  it('Should throw an error if invalid key', async () => {
    mockSend.mockImplementationOnce(() => {
      throw new Error('No file found')
    })

    await expect(
      listS3Objects({
        Bucket: 'bucket-name',
        Key: 'config.test.json'
      })
    ).rejects.toThrowError('Could not list files in S3: Error No file found')
  })

  it('Should return key', async () => {
    mockSend.mockImplementationOnce(() => ({Contents: [{Key: 'KEY'}]}))

    const result = await listS3Objects({
      Bucket: 'bucket-name',
      Key: 'config.test.json'
    })

    expect(result).toMatchInlineSnapshot(`
			[
			  "KEY",
			]
		`)
  })
})

describe('writeS3ObjectToFile', () => {

  
  // it.only('Should work OK with p-map',async() => {

  //   mockSend.mockImplementationOnce(() => ({
  //     Contents: myInfo
  //   }))

  //   const path = 'path/to/file'

  //   const myInfo = [
  //     {
  //       Body: 'moreData',
  //       Bucket: 'bucket-name-1',
  //       Key: 'config-1.test.json',
  //       path: 'path/to/file1',
  //       name: 'pipeline_files/1.json'
  //     },
  //     {
  //       Body: 'moreData',
  //       Bucket: 'bucket-name-2',
  //       Key: 'config-2.test.json',
  //       path: 'path/to/file2',
  //       name: 'pipeline_files/2.json'
  //     },
  //     {
  //       Body: 'moreData',
  //       Bucket: 'bucket-name-3',
  //       Key: 'config-3.test.json',
  //       path: 'path/to/file3',
  //       name: 'pipeline_files/3.json'
  //     },
  //   ];
  //   console.log(`I am myInfo: ${JSON.stringify(myInfo)}`)

  //   const result = await runDownload()

  //   console.log(`I am result: ${JSON.stringify(result)}`)
  // })
  it('should write data to a file', async () => {
    const temporaryDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'writeS3ObjectToFile-test')
    )

    const filename = path.join(temporaryDir, 'test1.txt')

    const result = 'The cat sat on the mat'

    mockSend.mockReturnValueOnce({Body: Readable.from([result])})

    const count = await writeS3ObjectToFile(
      {
        Bucket: 'bucket-name',
        Key: 'config.test.json'
      },
      filename
    )

    expect(count).toEqual(result.length)

    // Read file back in
    const data = await fs.readFile(filename, {encoding: 'utf8'})

    expect(data).toEqual(result)
  })
})
