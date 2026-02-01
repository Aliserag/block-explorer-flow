import { createConfig } from "ponder";

// ERC-20 ABI - only Transfer event needed
const erc20TransferAbi = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
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

// Start block: 0 for full history, or set PONDER_START_BLOCK for faster dev sync
const startBlock = process.env.PONDER_START_BLOCK
  ? Number(process.env.PONDER_START_BLOCK)
  : 0;

export default createConfig({
  // Database: Uses DATABASE_URL for PostgreSQL in production
  database: {
    kind: "postgres",
    connectionString: process.env.DATABASE_URL!,
  },

  // Ponder 0.16+ uses "chains" instead of "networks"
  chains: {
    flowEvm: {
      id: 747,
      rpc: process.env.FLOW_EVM_RPC_URL ?? "https://mainnet.evm.nodes.onflow.org",
    },
  },

  // Block handler - uses "chain" instead of "network"
  blocks: {
    FlowBlocks: {
      chain: "flowEvm",
      startBlock,
      interval: 1,
    },
  },

  // Contract handlers - use "chain" instead of "network"
  contracts: {
    // Wildcard ERC-20 indexing - catches ALL Transfer events
    ERC20: {
      chain: "flowEvm",
      abi: erc20TransferAbi,
      startBlock,
    },
    // Wildcard ERC-721 indexing - catches ALL NFT Transfer events
    ERC721: {
      chain: "flowEvm",
      abi: erc721TransferAbi,
      startBlock,
    },
    // Wildcard ERC-1155 indexing - catches ALL multi-token transfers
    ERC1155: {
      chain: "flowEvm",
      abi: erc1155Abi,
      startBlock,
    },
  },
});
