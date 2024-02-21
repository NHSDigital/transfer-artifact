import * as core from '@actions/core';
import fs from 'node:fs/promises';
import {getInputs} from '../input-helper';
import {listAllS3Objects } from "../aws";
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
        const startAfter = '';
       
        console.log(`I am bucket: ${bucket}`)
        console.log(`I am name: ${name}`)
        console.log(`I am pipeline_id: ${pipeline_id}`)
        console.log(`I am key: ${path.join(bucket,'ci-pipeline-upload-artifacts',name)}`)

        const myList2 = await listAllS3Objects(
          {
            Bucket: bucket,
            Key: path.join(bucket,'ci-pipeline-upload-artifacts',name),
          },
          startAfter
        )

        // const getObjects = await getSpecificS3Object(
        //   bucket,
        //   path.join(bucket,'ci-pipeline-upload-artifacts',name),
        //   path.join(bucket,'ci-pipeline-upload-artifacts',name)
        // )

        // console.log(`I am getObjects: ${getObjects}`)

        // listAllS3Objects brings back ALL objects
        // but we only want the ones for THIS Github pipeline

        for(const item of myList2){

          if(item.includes(pipeline_id)){
            console.log(`I am item: ${item}`)
            // create and activate the new file before writing to it
            const newFilename = getItemName(item)
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
        console.log(`Items successfully downloaded: ${await fs.readdir(`./`)}`)
    } catch (error) {
        core.setFailed((error as Error).message)
      }
    }
