import { createConfig } from "ponder";
import { http, fallback } from "viem";

// ============================================================================
// OPTIMIZED PONDER CONFIG FOR HIGH-THROUGHPUT INDEXING
// ============================================================================
// Based on Ponder best practices and Flow EVM infrastructure analysis.
//
// Key optimizations:
// 1. High-throughput RPC endpoint (5000 req/sec vs ~100 req/sec public)
// 2. Aggressive batching for historical sync
// 3. Ponder's built-in rate limiter (maxRequestsPerSecond)
// 4. Fallback transport for high availability
// ============================================================================

const startBlock = process.env.PONDER_START_BLOCK
  ? Number(process.env.PONDER_START_BLOCK)
  : 0;

// RPC Endpoints - use high-throughput private endpoint as primary
const PRIMARY_RPC = process.env.FLOW_EVM_RPC_URL_PRIMARY
  ?? process.env.FLOW_EVM_RPC_URL
  ?? "http://evm-001.mainnet0.nodes.onflow.org:8000/";
const FALLBACK_RPC = process.env.FLOW_EVM_RPC_URL_FALLBACK
  ?? "https://mainnet.evm.nodes.onflow.org";

// Transport options optimized for high-throughput endpoint (~5000 req/sec)
const highThroughputOptions = {
  batch: {
    batchSize: 500,     // Increased from 100 - group more calls per batch
    wait: 20,           // Decreased from 50ms - dispatch batches faster
  },
  retryCount: 5,        // Reduced from 10 - private endpoint is reliable
  retryDelay: 500,      // Reduced from 2000ms - faster error recovery
  timeout: 30000,       // Reduced from 60s - 30s is sufficient
};

// Conservative options for public fallback endpoint
const fallbackOptions = {
  batch: {
    batchSize: 100,     // Keep smaller for public endpoint
    wait: 50,           // Standard wait
  },
  retryCount: 10,       // More retries for less reliable endpoint
  retryDelay: 2000,     // Longer delays
  timeout: 60000,       // Longer timeout
};

export default createConfig({
  // Database: PostgreSQL in production with increased connection pool
  database: process.env.DATABASE_URL
    ? {
        kind: "postgres",
        connectionString: process.env.DATABASE_URL,
        poolConfig: { max: 50 }, // Increased from default 30
      }
    : undefined,

  networks: {
    flowEvm: {
      chainId: 747,
      // Fallback transport: tries primary first, falls back to public if needed
      transport: fallback([
        http(PRIMARY_RPC, highThroughputOptions),
        http(FALLBACK_RPC, fallbackOptions),
      ]),
      // Ponder's built-in rate limiter - use 80% of available capacity
      maxRequestsPerSecond: 4000,  // Leave headroom below 5000 limit
      pollingInterval: 1000,       // Reduced from 2000ms - faster realtime updates
    },
  },

  // Block handler only - Ponder-recommended for chain-wide indexing
  blocks: {
    FlowBlocks: {
      network: "flowEvm",
      startBlock,
      interval: 1,
    },
  },

  // ============================================================================
  // WILDCARD EVENT INDEXING (DISABLED for fast mode)
  // ============================================================================
  // NOT RECOMMENDED by Ponder for chain-wide indexing - these use eth_getLogs
  // across ALL contracts which is extremely slow.
  // Token detection is handled in the block handler via receipt logs instead.
  // ============================================================================
});
