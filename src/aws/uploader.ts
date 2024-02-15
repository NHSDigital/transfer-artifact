import {type UploadOptions} from "@actions/artifact";
import {UploadResponse} from "@actions/artifact/lib/internal/upload-response";
import {uploadObjectToS3} from "./put-data-s3";
import fs from "node:fs";
import * as core from "@actions/core";
import {getUploadSpecification} from "../upload-specification";

export async function uploadArtifact(
    artifactName: string,
    filesToUpload: string[],
    rootDirectory: string,
    options: UploadOptions,
    bucket: string,
): Promise<UploadResponse> {
    const uploadResponse: UploadResponse = {
        artifactName: artifactName,
        artifactItems: [],
        size: -1,
        failedItems: [],
    }

	const uploadSpec = getUploadSpecification(artifactName, rootDirectory, filesToUpload);
    console.log(`I am artifactName: ${artifactName}`)
    console.log(`I am rootDirectory: ${rootDirectory}`)
    console.log(`I am filesToUpload: ${filesToUpload}`)
    console.log(`I am bucket: ${bucket}`)

    for (const fileSpec of uploadSpec) {
        try {
            await uploadObjectToS3({
                Body: fs.createReadStream(fileSpec.absoluteFilePath),
                // 2009 - CHANGE THIS BACK!!!!
                Bucket: bucket,
                // Bucket: `caas-pl-490772702699-eu-west-2-pl-mdev-acct-cicd-temp-artifacts`,
                Key: `ci-pipeline-upload-artifacts/${fileSpec.uploadFilePath}`,  // TODO: fix path
            }, core)
            console.log(`I am fileSpec: ${JSON.stringify(fileSpec)}`)
            console.log(`I am fileSpec.uploadFilePath: ${fileSpec.uploadFilePath}`)
        } catch (err) {
            uploadResponse.failedItems.push(fileSpec.absoluteFilePath)
        }
    }
    return uploadResponse;
}
