import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import { pipeline, type Readable } from 'node:stream';
import { promisify } from 'node:util';

import { GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

import { getS3Client } from './s3-client';
import { StreamCounter } from './stream-counter';
import type { S3Location } from './types';

const pipelineP = promisify(pipeline);

function isReadable(
  body: Readable | ReadableStream | Blob | undefined
): body is Readable {
  return body !== undefined && body && (body as Readable).read !== undefined;
}

export async function streamToString(Body: Readable): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    Body.on('data', (chunk: ArrayBuffer | SharedArrayBuffer) =>
      chunks.push(Buffer.from(chunk))
    );
    Body.on('error', (error) => {
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
  filePath: string
): Promise<number> {
  const writeStream = fs.createWriteStream(filePath);
  try {
    const counter = new StreamCounter();
    await pipelineP(inputStream, counter, writeStream);
    return counter.totalBytesTransfered();
  } finally {
    writeStream.close();
  }
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
    const { Body } = await getS3Client().send(new GetObjectCommand(parameters));

    // https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards
    if (isReadable(Body)) {
      return Body;
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Could not retrieve from bucket 's3://${Bucket}/${Key}' from S3: ${error.message}`
      );
    } else {
      throw error;
    }
  }

  throw new Error(`Could not read file from bucket. 's3://${Bucket}/${Key}'`);
}

export async function getS3Object(
  location: S3Location,
  defaultValue?: string
): Promise<string> {
  try {
    return await streamToString(await getS3ObjectStream(location));
  } catch (error) {
    if (defaultValue) {
      return defaultValue;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not retrieve from bucket 's3://${location.Bucket}/${location.Key}' from S3: ${message}`
    );
  }
}

export async function writeS3ObjectToFile(
  location: S3Location,
  filename: string
): Promise<number> {
  try {
    return await writeToFile(await getS3ObjectStream(location), filename);
  } catch (error) {
    // Extract the original error message without the S3 prefix
    const originalMessage =
      error instanceof Error
        ? error.message.replace(
            /^Could not retrieve from bucket '[^']*' from S3: /,
            ''
          )
        : String(error);

    throw new Error(
      `Could not retrieve from bucket 's3://${location.Bucket}/${location.Key}'. Error was: ${originalMessage}`
    );
  }
}

export async function listS3Objects({
  Bucket,
  Prefix,
}: S3Location): Promise<string[]> {
  try {
    const parameters = {
      Bucket,
      Prefix,
    };

    const data = await getS3Client().send(new ListObjectsV2Command(parameters));

    return data.Contents?.map((element) => element.Key ?? '') ?? [];
  } catch (error_) {
    const error =
      error_ instanceof Error
        ? new Error(
            `Could not list files in S3: ${error_.name} ${error_.message}`
          )
        : error_;
    throw error;
  }
}
