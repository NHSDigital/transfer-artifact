import * as core from '@actions/core';
import {getInputs} from '../input-helper';
import {listS3Objects} from "../aws";

export async function runDownload(): Promise<void> {
    try {
        console.log('I am running a download...')
        const inputs = getInputs();
        const myBucket = inputs.artifactBucket;
        const myName = inputs.artifactName;
        listS3Objects({
          Bucket: myBucket,
          Key: myName
        })
    } catch (error) {
        core.setFailed((error as Error).message)
      }
    }
