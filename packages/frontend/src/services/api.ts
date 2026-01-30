import axios from "axios";
import type { NetworkId } from "@/config/chains";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Types
export interface Block {
  number: string;
  hash: string;
  parentHash: string;
  timestamp: string;
  timestampDate: string | null;
  gasUsed: string;
  gasLimit: string;
  baseFeePerGas: string | null;
  transactionCount: number;
  miner: string;
  size: string | null;
  extraData: string | null;
}

export interface Transaction {
  hash: string;
  blockNumber: string | null;
  blockHash: string | null;
  transactionIndex: string | null;
  from: string;
  to: string | null;
  value: string;
  valueFormatted: string;
  gas: string;
  gasPrice: string | null;
  maxFeePerGas: string | null;
  maxPriorityFeePerGas: string | null;
  input: string;
  nonce: number;
  type: string;
  status: number | null;
  gasUsed: string | null;
  effectiveGasPrice: string | null;
  contractAddress: string | null;
}

export interface Account {
  address: string;
  balance: string;
  balanceFormatted: string;
  transactionCount: number;
  isContract: boolean;
  code?: string;
}

export interface SearchResult {
  type: "block" | "transaction" | "address" | "unknown";
  query: string;
  found: boolean;
  data?: {
    blockNumber?: string;
    transactionHash?: string;
    address?: string;
    isContract?: boolean;
  };
}

// API Functions
export async function getBlocks(
  limit = 10,
  network: NetworkId = "mainnet"
): Promise<{ blocks: Block[]; latestBlock: string }> {
  const { data } = await api.get("/blocks", {
    params: { limit, network },
  });
  return data;
}

export async function getBlock(
  blockId: string,
  network: NetworkId = "mainnet",
  includeTxs = false
): Promise<Block & { transactions?: (Transaction | string)[] }> {
  const { data } = await api.get(`/blocks/${blockId}`, {
    params: { network, includeTxs },
  });
  return data;
}

export async function getBlockTransactions(
  blockId: string,
  network: NetworkId = "mainnet"
): Promise<{ blockNumber: string; blockHash: string; transactionCount: number; transactions: Transaction[] }> {
  const { data } = await api.get(`/blocks/${blockId}/transactions`, {
    params: { network },
  });
  return data;
}

export async function getTransaction(
  hash: string,
  network: NetworkId = "mainnet"
): Promise<Transaction> {
  const { data } = await api.get(`/transactions/${hash}`, {
    params: { network },
  });
  return data;
}

export async function getAccount(
  address: string,
  network: NetworkId = "mainnet"
): Promise<Account> {
  const { data } = await api.get(`/accounts/${address}`, {
    params: { network },
  });
  return data;
}

export async function search(
  query: string,
  network: NetworkId = "mainnet"
): Promise<SearchResult> {
  const { data } = await api.get("/search", {
    params: { q: query, network },
  });
  return data;
}

export default api;
