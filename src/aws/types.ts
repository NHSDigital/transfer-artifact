import type {Buffer} from 'node:buffer';
import type {Readable} from 'node:stream';
import {ObjectCannedACL} from "@aws-sdk/client-s3/dist-types/models/models_0";

export type S3Location = {
	Bucket: string;
	Key?: string;
	Prefix?: string;
};

export type Upload = {
	Body: Readable | Blob | string | Uint8Array | Buffer;
	Bucket: string;
	Key: string;
	ACL?: ObjectCannedACL;
	ChecksumSHA256?: string;
};
