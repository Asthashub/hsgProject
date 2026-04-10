const { getShardForCustomer } = require('../db/index');
const logger = require('../utils/logger');

async function insertBatch(batch) {
  // Group rows by their target shard
  const shardMap = {};
  for (const row of batch) {
    const { pool, shardIndex } = getShardForCustomer(row.customer_id);
    if (!shardMap[shardIndex]) shardMap[shardIndex] = { pool, rows: [] };
    shardMap[shardIndex].rows.push(row);
  }

  // Insert each shard group in a single transaction
  const insertPromises = Object.entries(shardMap).map(
    async ([shardIndex, { pool, rows }]) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Build one big INSERT for all rows in this shard
        const values = [];
        const placeholders = rows.map((row, i) => {
          const base = i * 5;
          values.push(
            row.order_id, row.customer_id,
            row.order_date, row.order_amount, row.status
          );
          return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5})`;
        });

        await client.query(
          `INSERT INTO orders (order_id, customer_id, order_date, order_amount, status)
           VALUES ${placeholders.join(',')}
           ON CONFLICT (order_id) DO NOTHING`,
          values
        );

        await client.query('COMMIT');
        logger.info(`Shard ${shardIndex}: inserted ${rows.length} rows`);
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error(`Shard ${shardIndex} insert failed: ${err.message}`);
        throw err;
      } finally {
        client.release();
      }
    }
  );

  await Promise.all(insertPromises);
}

module.exports = { insertBatch };