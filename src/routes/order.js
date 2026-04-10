const express = require('express');
const multer = require('multer');
const path = require('path');
const { uploadToGCS } = require('../services/gcsService');
const { streamCSVInBatches } = require('../services/csvService');
const { insertBatch } = require('../services/orderService');
const { getAllShards } = require('../db/index');
const logger = require('../utils/logger');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// POST /upload-orders
router.post('/upload-orders', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const filePath = req.file.path;
  const fileName = `orders-${Date.now()}.csv`;

  try {
    // 1. Upload to GCS
    const gcsUri = await uploadToGCS(filePath, fileName);

    // 2. Stream + parse CSV in batches
    const { batches, failedRows } = await streamCSVInBatches(filePath);

    // 3. Insert each batch into the correct shard
    let totalInserted = 0;
    for (const batch of batches) {
      await insertBatch(batch);
      totalInserted += batch.length;
    }

    logger.info(`Processing complete: ${totalInserted} inserted, ${failedRows} skipped`);
    res.json({
      success: true,
      gcsUri,
      totalInserted,
      failedRows
    });

  } catch (err) {
    logger.error(`Upload-orders failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// BONUS: GET /orders/:orderId  (queries all shards)
router.get('/orders/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const shards = getAllShards();
  for (const pool of shards) {
    const { rows } = await pool.query(
      'SELECT * FROM orders WHERE order_id = $1', [orderId]
    );
    if (rows.length > 0) return res.json(rows[0]);
  }
  res.status(404).json({ error: 'Order not found' });
});

// BONUS: GET /orders?customerId=
router.get('/orders', async (req, res) => {
  const { customerId } = req.query;
  if (!customerId) return res.status(400).json({ error: 'customerId required' });

  const { pool } = require('../db/index').getShardForCustomer(customerId);
  const { rows } = await pool.query(
    'SELECT * FROM orders WHERE customer_id = $1 ORDER BY order_date DESC',
    [customerId]
  );
  res.json(rows);
});

module.exports = router;