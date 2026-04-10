const fs = require('fs');
const csv = require('csv-parser');
const { v4: uuidv4, validate: isUUID } = require('uuid');
const logger = require('../utils/logger');

function validateRow(row) {
  if (!row.customer_id) return false;
  if (!row.order_date || isNaN(Date.parse(row.order_date))) return false;
  if (!row.order_amount || isNaN(parseFloat(row.order_amount))) return false;
  if (!row.status) return false;
  return true;
}

function parseRow(row) {
  return {
    order_id:     row.order_id && isUUID(row.order_id) ? row.order_id : uuidv4(),
    customer_id:  row.customer_id.trim(),
    order_date:   new Date(row.order_date),
    order_amount: parseFloat(row.order_amount),
    status:       row.status.trim().toLowerCase()
  };
}

/**
 * Streams CSV file, yields batches of valid rows.
 * Never loads the whole file into memory.
 */
function streamCSVInBatches(filePath, batchSize = 500) {
  return new Promise((resolve, reject) => {
    const batches = [];
    let currentBatch = [];
    let failedRows = 0;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        if (!validateRow(row)) {
          failedRows++;
          logger.warn(`Skipped invalid row: ${JSON.stringify(row)}`);
          return;
        }
        currentBatch.push(parseRow(row));
        if (currentBatch.length >= batchSize) {
          batches.push([...currentBatch]);
          currentBatch = [];
        }
      })
      .on('end', () => {
        if (currentBatch.length > 0) batches.push(currentBatch);
        logger.info(`Parsed CSV: ${batches.flat().length} valid, ${failedRows} skipped`);
        resolve({ batches, failedRows });
      })
      .on('error', reject);
  });
}

module.exports = { streamCSVInBatches };