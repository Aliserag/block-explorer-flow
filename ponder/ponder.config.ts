import { createConfig } from "ponder";

// ============================================================================
// OPTIMIZED PONDER CONFIG FOR HIGH-THROUGHPUT INDEXING (Ponder 0.16+)
// ============================================================================
// Based on Ponder best practices and Flow EVM infrastructure analysis.
//
// Key optimizations:
// 1. Ponder 0.16+ uses "chains" (not "networks"), "id" (not "chainId")
// 2. Simple RPC config with built-in retry handling
// 3. maxRpcRequestsPerSecond for rate limiting
// ============================================================================

const startBlock = process.env.PONDER_START_BLOCK
  ? Number(process.env.PONDER_START_BLOCK)
  : 0;

// RPC Endpoint
const RPC_URL = process.env.FLOW_EVM_RPC_URL_PRIMARY
  ?? process.env.FLOW_EVM_RPC_URL
  ?? "https://mainnet.evm.nodes.onflow.org";

export default createConfig({
  // Database: PostgreSQL in production with increased connection pool
  database: {
    kind: "postgres",
    connectionString: process.env.DATABASE_URL!,
    poolConfig: { max: 50 }, // Increased from default 30
  },

  // Ponder 0.16+ uses "chains" instead of "networks"
  chains: {
    flowEvm: {
      id: 747,
      rpc: RPC_URL,
      // Ponder's built-in rate limiter
      maxRpcRequestsPerSecond: 100,  // Conservative for public RPC
    },
  },

  // Block handler only - Ponder-recommended for chain-wide indexing
  blocks: {
    FlowBlocks: {
      chain: "flowEvm",  // "chain" instead of "network"
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
