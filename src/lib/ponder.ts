// Ponder GraphQL client for historical/indexed data
// NOTE: Ponder is mainnet-only. Testnet requests return null/empty for graceful degradation.

import { type NetworkId } from "./chains";

const PONDER_URL = process.env.NEXT_PUBLIC_PONDER_URL || "http://localhost:42069";

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function query<T>(queryString: string, variables?: Record<string, unknown>): Promise<T | null> {
  try {
    const response = await fetch(`${PONDER_URL}/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: queryString,
        variables,
      }),
      next: { revalidate: 5 }, // Cache for 5 seconds
    });

    const json: GraphQLResponse<T> = await response.json();

    if (json.errors) {
      console.error("Ponder GraphQL errors:", json.errors);
      return null;
    }

    return json.data ?? null;
  } catch (error) {
    console.error("Ponder query failed:", error);
    return null;
  }
}

// ============ Types from Ponder schema ============

export interface IndexedBlock {
  number: string;
  hash: string;
  parentHash: string;
  timestamp: string;
  gasUsed: string;
  gasLimit: string;
  transactionCount: number;
  miner: string;
}

export interface IndexedTransaction {
  hash: string;
  blockNumber: string;
  from: string;
  to: string | null;
  value: string;
  gas: string;
  gasPrice: string | null;
  gasUsed: string | null;
  input: string;
  nonce: number;
  status: number | null;
  timestamp: string;
}

export interface IndexedAccount {
  address: string;
  transactionCount: number;
  isContract: boolean;
  firstSeenBlock: string;
  lastSeenBlock: string;
  firstSeenTimestamp: string | null;
  lastSeenTimestamp: string | null;
}

export interface IndexedToken {
  address: string;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  transferCount: number;
  holderCount: number;
  firstSeenBlock: string;
  firstSeenTimestamp: string;
}

export interface IndexedTokenBalance {
  id: string;
  accountAddress: string;
  tokenAddress: string;
  balance: string;
  lastUpdatedBlock: string;
  lastUpdatedTimestamp: string;
}

export interface IndexedTokenTransfer {
  id: string;
  transactionHash: string;
  blockNumber: string;
  timestamp: string;
  tokenAddress: string;
  from: string;
  to: string;
  value: string;
  logIndex: number;
}

export interface IndexedContract {
  address: string;
  deployerAddress: string;
  deploymentTxHash: string;
  blockNumber: string;
  timestamp: string;
  bytecodeSize: number | null;
}

export interface DailyStats {
  date: string;
  transactionCount: number;
  blockCount: number;
  contractsDeployed: number;
  totalGasUsed: string;
  avgGasPrice: string;
  uniqueFromAddresses: number;
  uniqueToAddresses: number;
  tokenTransferCount: number;
  totalValueTransferred: string;
}

export interface HourlyStats {
  hour: string;
  transactionCount: number;
  blockCount: number;
  contractsDeployed: number;
  totalGasUsed: string;
  avgGasPrice: string;
  tokenTransferCount: number;
}

// ============ Block Queries ============

export async function getIndexedBlocks(limit = 20, network: NetworkId = "mainnet") {
  // Testnet: no indexed data available
  if (network === "testnet") return [];

  const result = await query<{ blockss: { items: IndexedBlock[] } }>(`
    query GetBlocks($limit: Int!) {
      blockss(limit: $limit, orderBy: "number", orderDirection: "desc") {
        items {
          number
          hash
          parentHash
          timestamp
          gasUsed
          gasLimit
          transactionCount
          miner
        }
      }
    }
  `, { limit });

  return result?.blockss?.items ?? [];
}

export async function getIndexedBlock(number: string, network: NetworkId = "mainnet") {
  if (network === "testnet") return null;

  const result = await query<{ blockss: { items: IndexedBlock[] } }>(`
    query GetBlock($number: BigInt!) {
      blockss(where: { number: $number }, limit: 1) {
        items {
          number
          hash
          parentHash
          timestamp
          gasUsed
          gasLimit
          transactionCount
          miner
        }
      }
    }
  `, { number });

  return result?.blockss?.items?.[0] ?? null;
}

// ============ Transaction Queries ============

export async function getAccountTransactions(address: string, limit = 20, network: NetworkId = "mainnet") {
  if (network === "testnet") return [];

  const result = await query<{ transactionss: { items: IndexedTransaction[] } }>(`
    query GetAccountTransactions($address: String!, $limit: Int!) {
      transactionss(
        where: { OR: [{ from: $address }, { to: $address }] }
        limit: $limit
        orderBy: "timestamp"
        orderDirection: "desc"
      ) {
        items {
          hash
          blockNumber
          from
          to
          value
          gas
          gasPrice
          gasUsed
          input
          nonce
          status
          timestamp
        }
      }
    }
  `, { address: address.toLowerCase(), limit });

  return result?.transactionss?.items ?? [];
}

export async function getAccountTransactionCount(address: string, network: NetworkId = "mainnet"): Promise<number> {
  if (network === "testnet") return 0;

  const result = await query<{ accounts: { transactionCount: number } | null }>(`
    query GetAccountTxCount($address: String!) {
      accounts(address: $address) {
        transactionCount
      }
    }
  `, { address: address.toLowerCase() });

  return result?.accounts?.transactionCount ?? 0;
}

export async function getBlockTransactions(blockNumber: string, limit = 50, network: NetworkId = "mainnet") {
  if (network === "testnet") return [];

  const result = await query<{ transactionss: { items: IndexedTransaction[] } }>(`
    query GetBlockTransactions($blockNumber: BigInt!, $limit: Int!) {
      transactionss(
        where: { blockNumber: $blockNumber }
        limit: $limit
        orderBy: "transactionIndex"
        orderDirection: "asc"
      ) {
        items {
          hash
          blockNumber
          from
          to
          value
          gas
          gasPrice
          gasUsed
          input
          nonce
          status
          timestamp
        }
      }
    }
  `, { blockNumber, limit });

  return result?.transactionss?.items ?? [];
}

export async function getRecentTransactions(limit = 10, network: NetworkId = "mainnet"): Promise<IndexedTransaction[]> {
  if (network === "testnet") return [];

  const result = await query<{ transactionss: { items: IndexedTransaction[] } }>(`
    query GetRecentTransactions($limit: Int!) {
      transactionss(
        limit: $limit
        orderBy: "timestamp"
        orderDirection: "desc"
      ) {
        items {
          hash
          blockNumber
          from
          to
          value
          gas
          gasPrice
          gasUsed
          input
          nonce
          status
          timestamp
        }
      }
    }
  `, { limit });

  return result?.transactionss?.items ?? [];
}

// ============ Account Queries ============

export async function getIndexedAccount(address: string, network: NetworkId = "mainnet") {
  if (network === "testnet") return null;

  const result = await query<{ accounts: IndexedAccount | null }>(`
    query GetAccount($address: String!) {
      accounts(address: $address) {
        address
        transactionCount
        isContract
        firstSeenBlock
        lastSeenBlock
        firstSeenTimestamp
        lastSeenTimestamp
      }
    }
  `, { address: address.toLowerCase() });

  return result?.accounts ?? null;
}

// ============ Token Queries ============

export async function getAccountTokenBalances(address: string, network: NetworkId = "mainnet"): Promise<IndexedTokenBalance[]> {
  if (network === "testnet") return [];

  const result = await query<{ accountTokenBalancess: { items: IndexedTokenBalance[] } }>(`
    query GetAccountTokens($address: String!) {
      accountTokenBalancess(
        where: { accountAddress: $address }
        orderBy: "balance"
        orderDirection: "desc"
        limit: 100
      ) {
        items {
          id
          accountAddress
          tokenAddress
          balance
          lastUpdatedBlock
          lastUpdatedTimestamp
        }
      }
    }
  `, { address: address.toLowerCase() });

  // Filter out zero and negative balances
  const balances = result?.accountTokenBalancess?.items ?? [];
  return balances.filter((b) => BigInt(b.balance) > 0n);
}

export async function getTokenMetadata(addresses: string[], network: NetworkId = "mainnet"): Promise<IndexedToken[]> {
  if (network === "testnet" || addresses.length === 0) return [];

  const result = await query<{ tokenss: { items: IndexedToken[] } }>(`
    query GetTokenMetadata($addresses: [String!]!) {
      tokenss(
        where: { address_in: $addresses }
        limit: 100
      ) {
        items {
          address
          name
          symbol
          decimals
          transferCount
          holderCount
          firstSeenBlock
          firstSeenTimestamp
        }
      }
    }
  `, { addresses: addresses.map((a) => a.toLowerCase()) });

  return result?.tokenss?.items ?? [];
}

export async function getAllTokens(limit = 100, network: NetworkId = "mainnet"): Promise<IndexedToken[]> {
  if (network === "testnet") return [];

  const result = await query<{ tokenss: { items: IndexedToken[] } }>(`
    query GetAllTokens($limit: Int!) {
      tokenss(
        limit: $limit
        orderBy: "transferCount"
        orderDirection: "desc"
      ) {
        items {
          address
          name
          symbol
          decimals
          transferCount
          holderCount
          firstSeenBlock
          firstSeenTimestamp
        }
      }
    }
  `, { limit });

  return result?.tokenss?.items ?? [];
}

export async function getTokenTransfers(
  tokenAddress: string,
  limit = 25,
  network: NetworkId = "mainnet"
): Promise<IndexedTokenTransfer[]> {
  if (network === "testnet") return [];

  const result = await query<{ tokenTransferss: { items: IndexedTokenTransfer[] } }>(`
    query GetTokenTransfers($tokenAddress: String!, $limit: Int!) {
      tokenTransferss(
        where: { tokenAddress: $tokenAddress }
        limit: $limit
        orderBy: "blockNumber"
        orderDirection: "desc"
      ) {
        items {
          id
          transactionHash
          blockNumber
          timestamp
          tokenAddress
          from
          to
          value
          logIndex
        }
      }
    }
  `, { tokenAddress: tokenAddress.toLowerCase(), limit });

  return result?.tokenTransferss?.items ?? [];
}

export async function getAccountTokenTransfers(
  address: string,
  limit = 25,
  network: NetworkId = "mainnet"
): Promise<IndexedTokenTransfer[]> {
  if (network === "testnet") return [];

  const result = await query<{ tokenTransferss: { items: IndexedTokenTransfer[] } }>(`
    query GetAccountTokenTransfers($address: String!, $limit: Int!) {
      tokenTransferss(
        where: { OR: [{ from: $address }, { to: $address }] }
        limit: $limit
        orderBy: "blockNumber"
        orderDirection: "desc"
      ) {
        items {
          id
          transactionHash
          blockNumber
          timestamp
          tokenAddress
          from
          to
          value
          logIndex
        }
      }
    }
  `, { address: address.toLowerCase(), limit });

  return result?.tokenTransferss?.items ?? [];
}

// ============ Contract Queries ============

export async function getRecentContracts(limit = 20, network: NetworkId = "mainnet"): Promise<IndexedContract[]> {
  if (network === "testnet") return [];

  const result = await query<{ contractss: { items: IndexedContract[] } }>(`
    query GetRecentContracts($limit: Int!) {
      contractss(
        limit: $limit
        orderBy: "blockNumber"
        orderDirection: "desc"
      ) {
        items {
          address
          deployerAddress
          deploymentTxHash
          blockNumber
          timestamp
          bytecodeSize
        }
      }
    }
  `, { limit });

  return result?.contractss?.items ?? [];
}

export async function getContract(address: string, network: NetworkId = "mainnet"): Promise<IndexedContract | null> {
  if (network === "testnet") return null;

  const result = await query<{ contracts: IndexedContract | null }>(`
    query GetContract($address: String!) {
      contracts(address: $address) {
        address
        deployerAddress
        deploymentTxHash
        blockNumber
        timestamp
        bytecodeSize
      }
    }
  `, { address: address.toLowerCase() });

  return result?.contracts ?? null;
}

export async function getContractsByDeployer(
  deployerAddress: string,
  limit = 20,
  network: NetworkId = "mainnet"
): Promise<IndexedContract[]> {
  if (network === "testnet") return [];

  const result = await query<{ contractss: { items: IndexedContract[] } }>(`
    query GetContractsByDeployer($deployerAddress: String!, $limit: Int!) {
      contractss(
        where: { deployerAddress: $deployerAddress }
        limit: $limit
        orderBy: "blockNumber"
        orderDirection: "desc"
      ) {
        items {
          address
          deployerAddress
          deploymentTxHash
          blockNumber
          timestamp
          bytecodeSize
        }
      }
    }
  `, { deployerAddress: deployerAddress.toLowerCase(), limit });

  return result?.contractss?.items ?? [];
}

// ============ Analytics Queries ============

export async function getDailyStats(days = 30, network: NetworkId = "mainnet"): Promise<DailyStats[]> {
  if (network === "testnet") return [];

  const result = await query<{ dailyStatss: { items: DailyStats[] } }>(`
    query GetDailyStats($limit: Int!) {
      dailyStatss(
        limit: $limit
        orderBy: "date"
        orderDirection: "desc"
      ) {
        items {
          date
          transactionCount
          blockCount
          contractsDeployed
          totalGasUsed
          avgGasPrice
          uniqueFromAddresses
          uniqueToAddresses
          tokenTransferCount
          totalValueTransferred
        }
      }
    }
  `, { limit: days });

  return result?.dailyStatss?.items ?? [];
}

export async function getHourlyStats(hours = 24, network: NetworkId = "mainnet"): Promise<HourlyStats[]> {
  if (network === "testnet") return [];

  const result = await query<{ hourlyStatss: { items: HourlyStats[] } }>(`
    query GetHourlyStats($limit: Int!) {
      hourlyStatss(
        limit: $limit
        orderBy: "hour"
        orderDirection: "desc"
      ) {
        items {
          hour
          transactionCount
          blockCount
          contractsDeployed
          totalGasUsed
          avgGasPrice
          tokenTransferCount
        }
      }
    }
  `, { limit: hours });

  return result?.hourlyStatss?.items ?? [];
}

// ============ Utility Functions ============

export async function isPonderAvailable(network: NetworkId = "mainnet"): Promise<boolean> {
  // Ponder is not available for testnet
  if (network === "testnet") return false;

  try {
    const response = await fetch(`${PONDER_URL}/ready`, {
      next: { revalidate: 10 },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getPonderSyncStatus(network: NetworkId = "mainnet"): Promise<{
  synced: boolean;
  latestBlock: string | null;
}> {
  // Ponder is not available for testnet
  if (network === "testnet") {
    return { synced: false, latestBlock: null };
  }

  const result = await query<{ blockss: { items: Array<{ number: string }> } }>(`
    query GetLatestBlock {
      blockss(limit: 1, orderBy: "number", orderDirection: "desc") {
        items {
          number
        }
      }
    }
  `);

  const latestBlock = result?.blockss?.items?.[0]?.number ?? null;

  return {
    synced: latestBlock !== null,
    latestBlock,
  };
}

// Search helper - determines what type of search query this is
export function parseSearchQuery(query: string): {
  type: "block" | "transaction" | "address" | "unknown";
  value: string;
} {
  const trimmed = query.trim();

  // Block number
  if (/^\d+$/.test(trimmed)) {
    return { type: "block", value: trimmed };
  }

  // Transaction hash (66 characters)
  if (/^0x[a-fA-F0-9]{64}$/.test(trimmed)) {
    return { type: "transaction", value: trimmed.toLowerCase() };
  }

  // Address (42 characters)
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return { type: "address", value: trimmed.toLowerCase() };
  }

  return { type: "unknown", value: trimmed };
}
