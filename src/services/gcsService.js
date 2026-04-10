const fs = require('fs/promises');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const logger = require('../utils/logger');

const STORAGE_MODE = (process.env.STORAGE_MODE || 'local').toLowerCase();

async function uploadToGCS(localFilePath, destinationFileName) {
  if (STORAGE_MODE !== 'gcs') {
    const localStorageDir = path.join(process.cwd(), 'local-storage');
    const destinationPath = path.join(localStorageDir, destinationFileName);

    await fs.mkdir(localStorageDir, { recursive: true });
    await fs.copyFile(localFilePath, destinationPath);

    logger.info(`Local storage copy complete: ${destinationFileName}`);
    return `local://${destinationFileName}`;
  }

  // ADC: No credentials needed here.
  // Automatically uses: gcloud auth application-default login
  const storage = new Storage({ projectId: process.env.GCP_PROJECT_ID });
  const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

  logger.info(`GCS upload started: ${destinationFileName}`);
  await bucket.upload(localFilePath, {
    destination: destinationFileName,
    metadata: { contentType: 'text/csv' }
  });
  logger.info(`GCS upload complete: ${destinationFileName}`);
  return `gs://${process.env.GCS_BUCKET_NAME}/${destinationFileName}`;
}

module.exports = { uploadToGCS };
