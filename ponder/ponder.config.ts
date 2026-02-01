import { createConfig } from "@ponder/core";
import { http } from "viem";

// ============================================================================
// FAST MODE CONFIG
// ============================================================================
// Ponder-recommended architecture: block handler only, no wildcard event indexing.
// This provides 5-10x faster indexing by avoiding chain-wide event filtering.
// ============================================================================

// Start block: 0 for full history, or set PONDER_START_BLOCK for faster dev sync
const startBlock = process.env.PONDER_START_BLOCK
  ? Number(process.env.PONDER_START_BLOCK)
  : 0;

export default createConfig({
  // Database: Uses DATABASE_URL for PostgreSQL in production, PGlite locally
  database: process.env.DATABASE_URL
    ? { kind: "postgres", connectionString: process.env.DATABASE_URL }
    : undefined,

  networks: {
    flowEvm: {
      chainId: 747,
      transport: http(process.env.FLOW_EVM_RPC_URL ?? "https://mainnet.evm.nodes.onflow.org", {
        batch: {
          batchSize: 100,    // Batch up to 100 RPC calls together
          wait: 50,          // Wait 50ms to collect calls for batching
        },
        retryCount: 10,      // Increased for better resilience
        retryDelay: 2000,    // Increased for exponential backoff
        timeout: 60000,      // 60 second timeout
      }),
      pollingInterval: 2000,  // Increase from 1000ms to 2000ms for stability
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
  // Uncomment to enable full token/NFT tracking at ~37 blocks/sec.
  // Also uncomment the corresponding tables in ponder.schema.ts and
  // handlers in src/index.ts.
  // ============================================================================
  /*
  contracts: {
    // Wildcard ERC-20 indexing - catches ALL Transfer and Approval events
    ERC20: {
      network: "flowEvm",
      abi: erc20Abi,
      startBlock,
    },
    // Wildcard ERC-721 indexing - catches ALL NFT Transfer events
    ERC721: {
      network: "flowEvm",
      abi: erc721TransferAbi,
      startBlock,
    },
    // Wildcard ERC-1155 indexing - catches ALL multi-token transfers
    ERC1155: {
      network: "flowEvm",
      abi: erc1155Abi,
      startBlock,
    },
  },
  */
});

// ============================================================================
// ABI DEFINITIONS (kept for reference when re-enabling full mode)
// ============================================================================

/*
// ERC-20 ABI - Transfer and Approval events
const erc20Abi = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "Approval",
    inputs: [
      { indexed: true, name: "owner", type: "address" },
      { indexed: true, name: "spender", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
    ],
  },
] as const;

// ERC-721 ABI - Transfer event with tokenId
const erc721TransferAbi = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: true, name: "tokenId", type: "uint256" },
    ],
  },
] as const;

// ERC-1155 ABI - TransferSingle and TransferBatch events
const erc1155Abi = [
  {
    type: "event",
    name: "TransferSingle",
    inputs: [
      { indexed: true, name: "operator", type: "address" },
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "id", type: "uint256" },
      { indexed: false, name: "value", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "TransferBatch",
    inputs: [
      { indexed: true, name: "operator", type: "address" },
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "ids", type: "uint256[]" },
      { indexed: false, name: "values", type: "uint256[]" },
    ],
  },
] as const;
*/
