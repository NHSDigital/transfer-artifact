/* eslint-disable unicorn/prefer-type-error */
import {Buffer} from 'node:buffer';
import fs from 'node:fs';
import {promisify} from 'node:util';
import {pipeline, type Readable} from 'node:stream';
import {GetObjectCommand, ListObjectsV2Command, S3LocationFilterSensitiveLog} from '@aws-sdk/client-s3';
import {getS3Client} from './s3-client';
import {StreamCounter} from './stream-counter';
import type {S3Location} from './types';
import {getInputs} from '../input-helper';
import { startGroup } from '@actions/core';

const pipelineP = promisify(pipeline);

function isReadable(
	body: Readable | ReadableStream | Blob | undefined,
): body is Readable {
	return body !== undefined && body && (body as Readable).read !== undefined;
}

export async function streamToString(Body: Readable) {
	return new Promise<string>((resolve, reject) => {
		const chunks: Buffer[] = [];
		Body.on('data', (chunk: ArrayBuffer | SharedArrayBuffer) =>
			chunks.push(Buffer.from(chunk)),
		);
		Body.on('error', error => {
			reject(error);
		});
		Body.on('end', () => {
			resolve(Buffer.concat(chunks).toString('utf8'));
		});
	});
}

/**
 * Stream to file, and return number of bytes saved to the file
 */
async function writeToFile(
	inputStream: Readable,
	filePath: string,
): Promise<number> {
	const counter = new StreamCounter();
	await pipelineP(inputStream, counter, fs.createWriteStream(filePath));
	return counter.totalBytesTransfered();
}

export async function getS3ObjectStream({
	Bucket,
	Key,
}: S3Location): Promise<Readable> {
	const parameters = {
		Bucket,
		Key,
	};
	try {
		const {Body} = await getS3Client().send(new GetObjectCommand(parameters));

		// https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards
		if (isReadable(Body)) {
			return Body;
		}
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(
				`Could not retrieve from bucket 's3://${Bucket}/${Key}' from S3: ${error.message}`,
			);
		} else {
			throw error;
		}
	}

	throw new Error(`Could not read file from bucket. 's3://${Bucket}/${Key}'`);
}

export async function getS3Object(
	location: S3Location,
	defaultValue?: string,
): Promise<string> {
	try {
		return await streamToString(await getS3ObjectStream(location));
	} catch (error) {
		if (defaultValue) {
			return defaultValue;
		}

		const message = error instanceof Error ? error.message : String(error);
		throw new Error(
			`Could not retrieve from bucket 's3://${location.Bucket}/${location.Key}' from S3: ${message}`,
		);
	}
}

export async function writeS3ObjectToFile(
	location: S3Location,
	filename: string,
): Promise<number> {
	try {
		return await writeToFile(await getS3ObjectStream(location), filename);
		
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(
				`Could not retrieve from bucket 's3://${location.Bucket}/${location.Key}'. Error was: ${error.message}`,
			);
		} else {
			throw error;
		}
	}
}

export async function listS3Objects({
	Bucket,
	Key,
}: S3Location): Promise<string[]> {
	try {
		const parameters = {
			Bucket,
			Key,
		};
		const data = await getS3Client().send(new ListObjectsV2Command(parameters));
		return data.Contents?.map(element => element.Key ?? '') ?? [];
	} catch (error_) {
		const error = error_ instanceof Error ? new Error(`Could not list files in S3: ${error_.name} ${error_.message}`) : error_;
		throw error;
	}
}

// the inbuilt ListObjectsV2Command only returns the most recent 1000 objects
// this command includes a loop to return all objects in the S3 bucket
export async function listAllS3Objects({
	Bucket,
	Key
}: S3Location,
	StartAfter:string): Promise<string[]> {
	try {

		const parameters = {
			Bucket,
			Key,
			StartAfter
		};
		
		let allMyData:string[]=[]
		let startPosition:string=''
		
		while(true){
			if(startPosition){
				parameters.StartAfter=startPosition
				console.log(`I am StartAfter: ${StartAfter}`)
			}
			const data = await getS3Client().send(new ListObjectsV2Command(parameters));
			const dataAsArray = data.Contents?.map(element => element.Key ?? '') ?? [];
			console.log(`I am dataAsArray.length: ${dataAsArray.length}`)
			console.log(`I am dataAsArray[dataAsArray.length-1]: ${dataAsArray[dataAsArray.length-1]}`)
			if(dataAsArray){
				allMyData.push(...dataAsArray)
			}
			console.log(`I am allMyData.length: ${allMyData.length}`)
			const lastItem=dataAsArray[dataAsArray.length-1]
			console.log(`I am lastItem: ${lastItem}`)
			startPosition=lastItem
			if(dataAsArray.length===0 ){
				console.log(`No further items found.  Scanned ${allMyData.length} objects in total.`)
				break
			}
		}
		return allMyData
	} catch (error_) {
		const error = error_ instanceof Error ? new Error(`Could not list files in S3: ${error_.name} ${error_.message}`) : error_;
		throw error;
	}
}
