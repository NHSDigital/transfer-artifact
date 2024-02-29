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
      Bucket: 'caas-pl-680509669821-eu-west-2-pl-mgmt-acct-cicd-temp-artifacts',
      Prefix: path.join('ci-pipeline-upload-artifacts', name)
    })

    let countOfObjects = 0

    const regexForCIArtifacts = new RegExp(
      '/pipeline_files/(.*).json')
    const regexForCDArtifacts = new RegExp(
      '/target/dist/NHSD.(.*).'+pipeline_id+'.zip')

    for (const item of objectList) {
      // objectList brings back everything, this if statement finds only relevant files
      if (item.match(regexForCIArtifacts) || item.match(regexForCDArtifacts)) {
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
    }
    console.log(`Total objects downloaded: ${countOfObjects}`)
  } catch (error) {
    core.setFailed((error as Error).message)
  }
}
