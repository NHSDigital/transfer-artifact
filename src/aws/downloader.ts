import * as core from '@actions/core';
import fs from 'node:fs/promises';
import {getInputs} from '../input-helper';
import {listS3Objects} from "../aws";
import { writeS3ObjectToFile } from './get-object-s3';
import path from 'node:path';

// used for getting the name of the item
function getItemName(str) {
  return str.split('/dist/')[1];
}

export async function runDownload(): Promise<void> {
    try {
        const inputs = getInputs();
        const bucket = inputs.artifactBucket;
        const name = inputs.artifactName;
        const pipeline_id = inputs.ci_pipeline_iid;
        const downloadLocation = inputs.searchPath;

        const myList = await listS3Objects({
          Bucket: bucket,
          Key: path.join(bucket,'ci-pipeline-upload-artifacts/aaa',name)
        })

        console.log(`I am myList: ${myList}`)

        // create a temporary directory to hold the artifacts
        await fs.mkdir(`./${downloadLocation}`)

        // listS3Objects brings back ALL objects
        // but we only want the ones for THIS Github pipeline

        for(const item of myList){

          if(item.includes(pipeline_id)){
            console.log(`I am item: ${item}`)
            // create and activate the new file before writing to it
            // needs to be named ./artifacts/ because that is what our TF testing step is looking for
            const newFilename = path.join(`./${downloadLocation}`, getItemName(item))
            fs.writeFile(newFilename,'')

            await writeS3ObjectToFile(
                  {
                    Bucket: bucket,
                    Key: `${item}`
                  },
                  newFilename
            )
            console.log(`${item} has been downloaded to ${newFilename}`)
          }
        }
        console.log(`Items successfully downloaded to ./${downloadLocation} folder: ${await fs.readdir(`./${downloadLocation}`)}`)
    } catch (error) {
        core.setFailed((error as Error).message)
      }
    }
