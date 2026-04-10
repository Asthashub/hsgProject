require('dotenv').config();
const { getAllShards } = require('./index');
const logger = require('../utils/logger');

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS orders (
    order_id     UUID PRIMARY KEY,
    customer_id  VARCHAR(255) NOT NULL,
    order_date   TIMESTAMP NOT NULL,
    order_amount DECIMAL(12, 2) NOT NULL,
    status       VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at   TIMESTAMP DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
  CREATE INDEX IF NOT EXISTS idx_orders_order_date  ON orders(order_date);
  CREATE INDEX IF NOT EXISTS idx_orders_status      ON orders(status);
`;

async function runMigrations() {
  const shards = getAllShards();
  for (let i = 0; i < shards.length; i++) {
    try {
      await shards[i].query(CREATE_TABLE);
      logger.info(`Migration complete on shard ${i}`);
    } catch (err) {
      logger.error(`Migration failed on shard ${i}: ${err.message}`);
    }
  }
  process.exit(0);
}

runMigrations();