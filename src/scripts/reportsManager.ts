/* eslint-disable no-console */
import path from 'path';
import AWS from 'aws-sdk';
import fs from 'fs-extra';
import config from '../config';
import { getReportsSubDir, repoLocalDir } from './configs';

// Configure AWS SDK
const s3 = new AWS.S3({
  region: (config.get('AWS_REGION') as string) || 'us-west-2',
});

const reportDirectory = path.join(repoLocalDir, getReportsSubDir());

// Upload a single file to S3
async function uploadFileToS3(
  bucketName: string,
  filePath: string,
  key: string,
) {
  try {
    const fileContent = await fs.readFile(filePath);

    const params = {
      Bucket: bucketName,
      Key: key, // S3 destination path
      Body: fileContent,
      ContentType: 'application/json',
    };

    const result = await s3.upload(params).promise();
    return result.Location; // Return file location after upload
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

// Upload all reports to S3 in batch
export async function uploadReportsToS3(bucketName: string) {
  try {
    // Read all project folders in the output directory
    const projectFolders = await fs.readdir(reportDirectory);
    const uploadPromises: Promise<any>[] = [];

    for (const projectFolder of projectFolders) {
      const projectFolderPath = path.join(reportDirectory, projectFolder);

      // Ensure the folder is a directory
      const isDirectory = (await fs.stat(projectFolderPath)).isDirectory();
      if (!isDirectory) continue;

      // Read all files in the project folder
      const reportFiles = await fs.readdir(projectFolderPath);

      for (const reportFile of reportFiles) {
        const filePath = path.join(projectFolderPath, reportFile);
        const fileKey = `reports/${projectFolder}/${reportFile}`; // S3 key

        // Push each upload promise to the array
        uploadPromises.push(uploadFileToS3(bucketName, filePath, fileKey));
      }
    }

    // Execute all uploads concurrently
    const uploadResults = await Promise.all(uploadPromises);
    console.log('All reports uploaded to S3 successfully:', uploadResults);
  } catch (error) {
    console.error('Error uploading reports:', error);
  }
}

// Retrieve all JSON reports for a project from S3
export async function retrieveProjectReportsFromS3(
  bucketName: string,
  projectFolder: string,
) {
  try {
    // List objects in the project folder on S3
    const params = {
      Bucket: bucketName,
      Prefix: `reports/${projectFolder}/`, // S3 folder prefix
    };

    const listedObjects = await s3.listObjectsV2(params).promise();

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
      console.log(`No reports found for project ${projectFolder}`);
      return [];
    }

    const retrievePromises = listedObjects.Contents.map(async object => {
      const fileParams = {
        Bucket: bucketName,
        Key: object.Key as string,
      };

      // Get the file content from S3
      const fileData = await s3.getObject(fileParams).promise();
      const reportContent = fileData.Body?.toString('utf-8'); // Convert buffer to string
      return {
        fileName: path.basename(object?.Key as string),
        content: reportContent,
      };
    });

    // Retrieve all files concurrently
    const reports = await Promise.all(retrievePromises);
    console.log(`Retrieved reports for project ${projectFolder}`, reports);
    return reports;
  } catch (error) {
    console.error('Error retrieving project reports from S3:', error);
    throw error;
  }
}
