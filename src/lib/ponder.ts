// Ponder GraphQL client for historical/indexed data

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

export async function getIndexedBlocks(limit = 20, offset = 0) {
  const result = await query<{ blockss: { items: IndexedBlock[] } }>(`
    query GetBlocks($limit: Int!, $offset: Int!) {
      blockss(limit: $limit, offset: $offset, orderBy: "number", orderDirection: "desc") {
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
  `, { limit, offset });

  return result?.blockss?.items ?? [];
}

export async function getIndexedBlock(number: string) {
  const result = await query<{ block: IndexedBlock | null }>(`
    query GetBlock($number: BigInt!) {
      block(number: $number) {
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
  `, { number });

  return result?.block ?? null;
}

// ============ Transaction Queries ============

export async function getAccountTransactions(address: string, limit = 20, offset = 0) {
  const result = await query<{ transactionss: { items: IndexedTransaction[] } }>(`
    query GetAccountTransactions($address: String!, $limit: Int!, $offset: Int!) {
      transactionss(
        where: { OR: [{ from: $address }, { to: $address }] }
        limit: $limit
        offset: $offset
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
  `, { address: address.toLowerCase(), limit, offset });

  return result?.transactionss?.items ?? [];
}

export async function getAccountTransactionCount(address: string): Promise<number> {
  const result = await query<{ account: { transactionCount: number } | null }>(`
    query GetAccountTxCount($address: String!) {
      account(address: $address) {
        transactionCount
      }
    }
  `, { address: address.toLowerCase() });

  return result?.account?.transactionCount ?? 0;
}

export async function getBlockTransactions(blockNumber: string, limit = 50) {
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

// ============ Account Queries ============

export async function getIndexedAccount(address: string) {
  const result = await query<{ account: IndexedAccount | null }>(`
    query GetAccount($address: String!) {
      account(address: $address) {
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

  return result?.account ?? null;
}

// ============ Token Queries ============

export async function getAccountTokenBalances(address: string): Promise<IndexedTokenBalance[]> {
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

export async function getTokenMetadata(addresses: string[]): Promise<IndexedToken[]> {
  if (addresses.length === 0) return [];

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

export async function getAllTokens(limit = 100, offset = 0): Promise<IndexedToken[]> {
  const result = await query<{ tokenss: { items: IndexedToken[] } }>(`
    query GetAllTokens($limit: Int!, $offset: Int!) {
      tokenss(
        limit: $limit
        offset: $offset
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
  `, { limit, offset });

  return result?.tokenss?.items ?? [];
}

export async function getTokenTransfers(
  tokenAddress: string,
  limit = 25,
  offset = 0
): Promise<IndexedTokenTransfer[]> {
  const result = await query<{ tokenTransferss: { items: IndexedTokenTransfer[] } }>(`
    query GetTokenTransfers($tokenAddress: String!, $limit: Int!, $offset: Int!) {
      tokenTransferss(
        where: { tokenAddress: $tokenAddress }
        limit: $limit
        offset: $offset
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
  `, { tokenAddress: tokenAddress.toLowerCase(), limit, offset });

  return result?.tokenTransferss?.items ?? [];
}

export async function getAccountTokenTransfers(
  address: string,
  limit = 25
): Promise<IndexedTokenTransfer[]> {
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

export async function getRecentContracts(limit = 20, offset = 0): Promise<IndexedContract[]> {
  const result = await query<{ contractss: { items: IndexedContract[] } }>(`
    query GetRecentContracts($limit: Int!, $offset: Int!) {
      contractss(
        limit: $limit
        offset: $offset
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
  `, { limit, offset });

  return result?.contractss?.items ?? [];
}

export async function getContract(address: string): Promise<IndexedContract | null> {
  const result = await query<{ contract: IndexedContract | null }>(`
    query GetContract($address: String!) {
      contract(address: $address) {
        address
        deployerAddress
        deploymentTxHash
        blockNumber
        timestamp
        bytecodeSize
      }
    }
  `, { address: address.toLowerCase() });

  return result?.contract ?? null;
}

export async function getContractsByDeployer(
  deployerAddress: string,
  limit = 20
): Promise<IndexedContract[]> {
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

export async function getDailyStats(days = 30): Promise<DailyStats[]> {
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

export async function getHourlyStats(hours = 24): Promise<HourlyStats[]> {
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

export async function isPonderAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${PONDER_URL}/ready`, {
      next: { revalidate: 10 },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getPonderSyncStatus(): Promise<{
  synced: boolean;
  latestBlock: string | null;
}> {
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
