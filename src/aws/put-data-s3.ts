
import {PutObjectCommand, type PutObjectCommandOutput} from '@aws-sdk/client-s3';
import {getS3Client} from './s3-client';
import type {Upload, S3Location} from './types';

export async function putDataS3(
	fileData: Record<string, unknown>,
	{Bucket, Key}: S3Location,
): Promise<PutObjectCommandOutput> {
	try {
		const parameters = {
			Bucket,
			Key,
			Body: JSON.stringify(fileData, null, 2),
		};

		const data = await getS3Client().send(new PutObjectCommand(parameters));
		console.log(`Data uploaded to ${Bucket}/${Key}`);
		return data;
	} catch (error) {
		throw new Error(`Upload to ${Bucket}/${Key} failed, error: ${String(error)}`);
	}
}

/**
 * Upload a stream, string or blob to as an S3 object.
 *
 *
 * @param params
 * @param log
 *
 * @example
 *    await uploadObjectToS3({
 *       Bucket: s3AssetsBucket,
 *       Key: remotePath,
 *       Body: data,
 *       ACL: 'bucket-owner-full-control',
 *     });
 */
export async function uploadObjectToS3(
	parameters: Upload,
	log: {
		info: (message: string) => void;
		error: (message: string | Error) => void;
	},
): Promise<PutObjectCommandOutput> {
	try {
		log.info(`Starting upload to s3://${parameters.Bucket}/${parameters.Key}`);
		console.log(`I am parameters: ${JSON.stringify(parameters)}`)
		return await getS3Client().send(new PutObjectCommand(parameters));
	} catch (error) {
		if (error instanceof Error) {
			const newMessage = `Upload to ${parameters.Bucket}/${parameters.Key} failed, error: ${error.message}`;
			log.error(newMessage);

			throw error;
		} else {
			throw error;
		}
	}
}
