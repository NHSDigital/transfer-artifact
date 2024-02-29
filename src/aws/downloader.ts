import * as core from '@actions/core'
import fs from 'node:fs/promises'
import path from 'node:path'
import {getInputs} from '../input-helper'
import {listS3Objects, writeS3ObjectToFile} from './get-object-s3'

// used for getting the name of the item, which is the last part of the file path
function getItemName(str) {
  const splitString = str.split('/')
  return splitString[splitString.length - 1]
}

export async function runDownload(): Promise<void> {
  try {
    const inputs = getInputs()
    const bucket = inputs.artifactBucket
    const name = inputs.artifactName
    const pipeline_id = inputs.ci_pipeline_iid

    const objectList = await listS3Objects({
      Bucket: 'caas-pl-490772702699-eu-west-2-pl-mdev-acct-cicd-temp-artifacts',
      Prefix: path.join('ci-pipeline-upload-artifacts',name)
    })

    let countOfObjects = 0

    for (const item of objectList) {
      if (item.match(/pipeline_files\/(.*)\.json/)) {
        console.log(`I match the first regex: ${item}`)
      }
      if (item.match(/.NHSD.(.*).zip/)) {
        console.log(`I match the second regex: ${item}`)
      }

      if (item.match(/target.dist.NHSD.(.*).zip/)) {
        console.log(`I match the third regex: ${item}`)
      }

      const regexSearch= new RegExp(`/target.dist.NHSD.(.*).${pipeline_id}.zip/`)
      if (item.match(regexSearch)) {
        console.log(`I match the fourth regex: ${item}`)
      }

      // objectList brings back everything, this if statement finds only relevant files
      if (item.includes(pipeline_id) || item.includes(`/pipeline_files/`)) {
        const newFilename = getItemName(item)
        fs.writeFile(newFilename, '')

        await writeS3ObjectToFile(
          {
            Bucket: bucket,
            Key: `${item}`
          },
          newFilename
        )
        console.log(`${item} has been downloaded to ${newFilename}`)
        countOfObjects++
      }
      console.log(`Total objects downloaded: ${countOfObjects}`)
    }
  } catch (error) {
    core.setFailed((error as Error).message)
  }
}
