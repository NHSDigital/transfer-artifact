import * as core from '@actions/core';
import {getInputs} from '../input-helper';
import {listS3Objects} from "../aws";
import { writeS3ObjectToFile } from './get-object-s3';

export async function runDownload(): Promise<void> {
    try {
        console.log('I am running a download...')
        const inputs = getInputs();
        const myBucket = inputs.artifactBucket;
        const myName = inputs.artifactName;
        const myLocation = { Bucket: myBucket, Key: myName }
        console.log('I am doing listS3Objects:')
        listS3Objects({
          Bucket: myBucket,
          Key: myName
        })
        console.log('I am doing writeS3ObjectToFile:')
        await writeS3ObjectToFile(
          myLocation,
          myName
        )

    } catch (error) {
        core.setFailed((error as Error).message)
      }
    }
