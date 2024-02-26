import * as core from '@actions/core';
import fs from 'node:fs/promises';
import {getInputs} from '../input-helper';
import {listAllS3Objects } from "../aws";
import { listS3Objects, writeS3ObjectToFile } from './get-object-s3';
import path from 'node:path';

// used for getting the name of the item, which is the last part of the file path
function getItemName(str){
  const splitString = str.split('/');
  const splitStringLast = splitString[splitString.length-1]
  return splitStringLast
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

        console.log('Calling myList3:')
        const myList3 = await listS3Objects(
          {
            Bucket: 'caas-pl-490772702699-eu-west-2-pl-mdev-acct-cicd-temp-artifacts',
            Prefix: name
          }
        )

        for(const item of myList3){
          // without the if statement, it brings back everything
          // see example here: https://github.com/NHSDigital/caas/actions/runs/8046725250/job/21974594476
          if(item.includes(pipeline_id) || item.includes(`/pipeline_files/`)){
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

        
        // console.log('Calling myList2:')
        // const myList2 = await listAllS3Objects(
        //   {
        //     Bucket: bucket,
        //     Key: path.join(bucket,'ci-pipeline-upload-artifacts',name),
        //   },
        //   startAfter
        // )

        // listAllS3Objects brings back ALL objects
        // but we only want the ones for THIS Github pipeline

        // for(const item of myList2){

        //   if(item.includes(pipeline_id)){
        //     console.log(`I am item: ${item}`)
        //     // create and activate the new file before writing to it
        //     const newFilename = getItemName(item)
        //     fs.writeFile(newFilename,'')

        //     await writeS3ObjectToFile(
        //           {
        //             Bucket: bucket,
        //             Key: `${item}`
        //           },
        //           newFilename
        //     )
        //     console.log(`${item} has been downloaded to ${newFilename}`)
        //   }

        //   if(item.includes(`/pipeline_files/`)){
        //     console.log(`I am json file: ${item}`)
        //     // create and activate the new file before writing to it
        //     const newFilename = path.join(getItemName(item))
        //     fs.writeFile(newFilename,'')

        //     await writeS3ObjectToFile(
        //           {
        //             Bucket: bucket,
        //             Key: item
        //           },
        //           newFilename
        //     )
        //     console.log(`JSON file ${item} has been downloaded to ${newFilename}`)
          // }

        // }
        console.log(`Items successfully downloaded: ${await fs.readdir(`./`)}`)
    } catch (error) {
        core.setFailed((error as Error).message)
      }
    }
