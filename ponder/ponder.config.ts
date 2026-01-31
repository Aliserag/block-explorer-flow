import { createConfig } from "@ponder/core";
import { http } from "viem";

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
      transport: http(process.env.FLOW_EVM_RPC_URL ?? "https://mainnet.evm.nodes.onflow.org"),
      // Increase polling for faster sync
      pollingInterval: 1000,
    },
  },
  blocks: {
    FlowBlocks: {
      network: "flowEvm",
      startBlock,
      interval: 1,
    },
  },
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
});
