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

// Types from Ponder schema
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
  input: string;
  nonce: number;
  status: number | null;
  timestamp: string;
}

export interface IndexedAccount {
  address: string;
  transactionCount: number;
  firstSeenBlock: string;
  lastSeenBlock: string;
}

// Query functions
export async function getIndexedBlocks(limit = 20, offset = 0) {
  const result = await query<{ blocks: { items: IndexedBlock[] } }>(`
    query GetBlocks($limit: Int!, $offset: Int!) {
      blocks(limit: $limit, offset: $offset, orderBy: "number", orderDirection: "desc") {
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

  return result?.blocks?.items ?? [];
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

export async function getAccountTransactions(address: string, limit = 20, offset = 0) {
  const result = await query<{ transactions: { items: IndexedTransaction[] } }>(`
    query GetAccountTransactions($address: String!, $limit: Int!, $offset: Int!) {
      transactions(
        where: { or: [{ from: $address }, { to: $address }] }
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
          input
          nonce
          status
          timestamp
        }
      }
    }
  `, { address: address.toLowerCase(), limit, offset });

  return result?.transactions?.items ?? [];
}

export async function getIndexedAccount(address: string) {
  const result = await query<{ account: IndexedAccount | null }>(`
    query GetAccount($address: String!) {
      account(address: $address) {
        address
        transactionCount
        firstSeenBlock
        lastSeenBlock
      }
    }
  `, { address: address.toLowerCase() });

  return result?.account ?? null;
}

// Check if Ponder is available
export async function isPonderAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${PONDER_URL}/health`, {
      next: { revalidate: 30 }
    });
    return response.ok;
  } catch {
    return false;
  }
}
