import * as core from '@actions/core';
import {getInputs} from '../input-helper';
import {listS3Objects} from "../aws";
import { getS3Object, writeS3ObjectToFile } from './get-object-s3';
import path from 'node:path';

export async function runDownload(): Promise<void> {
    try {
        console.log('I am running a download...')
        const inputs = getInputs();
        const myBucket = inputs.artifactBucket;
        const myName = inputs.artifactName;
        // const myLocation = { Bucket: myBucket, Key: myName }
        const myFilename = path.join(myBucket,'ci-pipeline-upload-artifacts/aaa',myName)
        const myLocation = { Bucket: myBucket, Key: myFilename }
        console.log('I am doing listS3Objects:')
        listS3Objects({
          Bucket: myBucket,
          // Key: myName
          Key: myFilename
        })
        console.log('I am doing getS3Object:')
        console.log(`I am location for getS3Object in downloader.ts: ${JSON.stringify(myLocation)}`)
        await getS3Object(myLocation)
        console.log('I am doing writeS3ObjectToFile:')
        console.log(`I am location for writeS3ObjectToFile in downloader.ts: ${JSON.stringify(myLocation)}`)
        console.log(`I am filename for writeS3ObjectToFile in downloader.ts: ${JSON.stringify(myFilename)}`)
        await writeS3ObjectToFile(
          myLocation,
          // 2009 - suspect this is wrong but let's give it a go
          // myName
          myFilename
        )

    } catch (error) {
        core.setFailed((error as Error).message)
      }
    }
