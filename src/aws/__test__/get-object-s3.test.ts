import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {Readable} from 'node:stream';
import {
	getS3Object,
	listS3Objects,
	writeS3ObjectToFile,
} from '../get-object-s3';

const mockSend = jest.fn();
jest.mock('../s3-client', () => ({
	getS3Client: jest.fn(() => ({send: mockSend})),
}));

describe('getS3Object', () => {
	afterEach(jest.clearAllMocks);

	// 2009 - rewrite this!!!
	it.only('Should return all files for known bucket', async()=>{
		const result = listS3Objects({
			Bucket: 'caas-pl-490772702699-eu-west-2-pl-mdev-acct-cicd-temp-artifacts',
			// Bucket: 'caas-pl-680509669821-eu-west-2-pl-mgmt-acct-cicd-artifacts',
			// Bucket: 'caas-cea-983256714508-eu-west-2-de-albe4-api-cef-static',
			Prefix: '8038789117-artifacts-caas/'
		})

		expect(result).toMatchInlineSnapshot(`
			[
				"KEY",
			]
		`)
	})

	it('Should throw an error if invalid key', async () => {
		mockSend.mockImplementationOnce(() => {
			throw new Error('No file found');
		});

		await expect(
			getS3Object({
				Bucket: 'bucket-name',
				Key: 'config.test.json',
			}),
		).rejects.toThrowError(
			'Could not retrieve from bucket \'s3://bucket-name/config.test.json\' from S3: Could not retrieve from bucket \'s3://bucket-name/config.test.json\' from S3: No file found',
		);
	});

	it('Should return config', async () => {
		const result = JSON.stringify({
			featureFlags: {
				testFlag: true,
			},
		});

		mockSend.mockReturnValueOnce({Body: Readable.from([result])});

		const data = await getS3Object({
			Bucket: 'bucket-name',
			Key: 'config.test.json',
		});

		expect(data).toEqual(result);
	});

	it('Should return default when object does not exist', async () => {
		const defaultValue = 'the default value';

		mockSend.mockImplementationOnce(() => {
			throw new Error('not found');
		});

		const data = await getS3Object(
			{
				Bucket: 'bucket-name',
				Key: 'config.test.json',
			},
			defaultValue,
		);

		expect(data).toEqual(defaultValue);
	});
});

describe('listS3Objects', () => {
	it('Should throw an error if invalid key', async () => {
		mockSend.mockImplementationOnce(() => {
			throw new Error('No file found');
		});

		await expect(
			listS3Objects({
				Bucket: 'bucket-name',
				Key: 'config.test.json',
			}),
		).rejects.toThrowError('Could not list files in S3: Error No file found');
	});

	it('Should return key', async () => {
		mockSend.mockImplementationOnce(() => ({Contents: [{Key: 'KEY'}]}));

		const result = await listS3Objects({
			Bucket: 'bucket-name',
			Key: 'config.test.json',
		});

		expect(result).toMatchInlineSnapshot(`
			[
			  "KEY",
			]
		`);
	});
});

describe('writeS3ObjectToFile', () => {
	it('should write data to a file', async () => {
		const temporaryDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'writeS3ObjectToFile-test'),
		);

		const filename = path.join(temporaryDir, 'test1.txt');

		const result = 'The cat sat on the mat';

		mockSend.mockReturnValueOnce({Body: Readable.from([result])});

		const count = await writeS3ObjectToFile(
			{
				Bucket: 'bucket-name',
				Key: 'config.test.json',
			},
			filename,
		);

		expect(count).toEqual(result.length);

		// Read file back in
		const data = await fs.readFile(filename, {encoding: 'utf8'});

		expect(data).toEqual(result);
	});
});
