const { Pool } = require('pg');

// Each shard is a separate DB connection pool
// In production: these would be separate DB servers
// For local dev: separate databases on same Postgres instance
const SHARD_COUNT = 3;

const shards = [
  new Pool({ connectionString: process.env.DB_SHARD_0 }),
  new Pool({ connectionString: process.env.DB_SHARD_1 }),
  new Pool({ connectionString: process.env.DB_SHARD_2 }),
];

/**
 * SHARDING STRATEGY: Hash-based on customer_id
 * - We hash customer_id to get a consistent shard index
 * - Same customer always goes to same shard (good for queries by customer)
 * - Data is distributed evenly across shards
 */
function getShardIndex(customerId) {
  const hash = customerId.split('').reduce(
    (acc, char) => acc + char.charCodeAt(0), 0
  );
  return hash % SHARD_COUNT;
}

function getShardForCustomer(customerId) {
  const index = getShardIndex(customerId);
  return { pool: shards[index], shardIndex: index };
}

// Get all shards (for cross-shard queries)
function getAllShards() {
  return shards;
}

module.exports = { getShardForCustomer, getAllShards, SHARD_COUNT };