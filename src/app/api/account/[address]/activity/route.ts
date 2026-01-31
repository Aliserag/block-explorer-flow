import { NextResponse } from "next/server";
import { isValidNetwork, type NetworkId } from "@/lib/chains";
import { isPonderAvailable } from "@/lib/ponder";
import {
  enrichTransaction,
  filterByTypes,
  parseTypeFilter,
  type WalletTxMetadata,
  type NftTransferInfo,
  type NftCollectionInfo,
} from "@/lib/wallet";
import type {
  IndexedTransaction,
  IndexedTokenTransfer,
  IndexedToken,
  IndexedAccount,
} from "@/lib/ponder";

export const dynamic = "force-dynamic";

const PONDER_URL = process.env.NEXT_PUBLIC_PONDER_URL || "http://localhost:42069";

// ============ GraphQL Queries ============

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
      next: { revalidate: 5 },
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

// Query to get transactions for an address with cursor-based pagination
async function getAddressTransactions(
  address: string,
  limit: number,
  afterTimestamp?: string
): Promise<IndexedTransaction[]> {
  // Build where clause based on cursor
  const whereClause = afterTimestamp
    ? `where: {
        OR: [{ from: $address }, { to: $address }],
        timestamp_lt: $afterTimestamp
      }`
    : `where: { OR: [{ from: $address }, { to: $address }] }`;

  const variables: Record<string, unknown> = {
    address: address.toLowerCase(),
    limit,
  };

  if (afterTimestamp) {
    variables.afterTimestamp = afterTimestamp;
  }

  const result = await query<{ transactionss: { items: IndexedTransaction[] } }>(`
    query GetAddressTransactions($address: String!, $limit: Int!${afterTimestamp ? ", $afterTimestamp: BigInt!" : ""}) {
      transactionss(
        ${whereClause}
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
          txCategory
          methodName
          errorMessage
        }
      }
    }
  `, variables);

  return result?.transactionss?.items ?? [];
}

// Query to get token transfers for multiple transactions
async function getTokenTransfersForTxs(txHashes: string[]): Promise<IndexedTokenTransfer[]> {
  if (txHashes.length === 0) return [];

  const result = await query<{ tokenTransferss: { items: IndexedTokenTransfer[] } }>(`
    query GetTokenTransfers($txHashes: [String!]!) {
      tokenTransferss(
        where: { transactionHash_in: $txHashes }
        orderBy: "logIndex"
        orderDirection: "asc"
        limit: 500
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
  `, { txHashes: txHashes.map((h) => h.toLowerCase()) });

  return result?.tokenTransferss?.items ?? [];
}

// Query to get NFT transfers for multiple transactions
async function getNftTransfersForTxs(txHashes: string[]): Promise<NftTransferInfo[]> {
  if (txHashes.length === 0) return [];

  const result = await query<{ nftTransferss: { items: NftTransferInfo[] } }>(`
    query GetNftTransfers($txHashes: [String!]!) {
      nftTransferss(
        where: { transactionHash_in: $txHashes }
        orderBy: "logIndex"
        orderDirection: "asc"
        limit: 500
      ) {
        items {
          id
          transactionHash
          blockNumber
          timestamp
          collectionAddress
          tokenId
          from
          to
          logIndex
        }
      }
    }
  `, { txHashes: txHashes.map((h) => h.toLowerCase()) });

  return result?.nftTransferss?.items ?? [];
}

// Query to get token metadata
async function getTokenMetadata(addresses: string[]): Promise<IndexedToken[]> {
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
          iconUrl
          isVerified
          firstSeenBlock
          firstSeenTimestamp
        }
      }
    }
  `, { addresses: addresses.map((a) => a.toLowerCase()) });

  return result?.tokenss?.items ?? [];
}

// Query to get NFT collection metadata
async function getNftCollections(addresses: string[]): Promise<NftCollectionInfo[]> {
  if (addresses.length === 0) return [];

  const result = await query<{ nftCollectionss: { items: NftCollectionInfo[] } }>(`
    query GetNftCollections($addresses: [String!]!) {
      nftCollectionss(
        where: { address_in: $addresses }
        limit: 100
      ) {
        items {
          address
          name
          symbol
          standard
          iconUrl
          isVerified
        }
      }
    }
  `, { addresses: addresses.map((a) => a.toLowerCase()) });

  return result?.nftCollectionss?.items ?? [];
}

// Query to get account info
async function getAccountInfo(addresses: string[]): Promise<IndexedAccount[]> {
  if (addresses.length === 0) return [];

  const result = await query<{ accountss: { items: IndexedAccount[] } }>(`
    query GetAccounts($addresses: [String!]!) {
      accountss(
        where: { address_in: $addresses }
        limit: 200
      ) {
        items {
          address
          transactionCount
          isContract
          firstSeenBlock
          lastSeenBlock
          accountType
          label
        }
      }
    }
  `, { addresses: addresses.map((a) => a.toLowerCase()) });

  return result?.accountss?.items ?? [];
}

// ============ API Route Handler ============

interface ActivityResponse {
  success: boolean;
  address: string;
  transactions: WalletTxMetadata[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
  error?: string;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ address: string }> }
) {
  const { searchParams } = new URL(request.url);
  const { address } = await context.params;

  // Pagination params
  const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "25")), 100);
  const cursor = searchParams.get("cursor"); // Transaction hash to paginate from

  // Filter by transaction types
  const typesParam = searchParams.get("types");
  const typeFilter = parseTypeFilter(typesParam);

  // Network param (defaults to mainnet)
  const networkParam = searchParams.get("network") || "mainnet";
  const network: NetworkId = isValidNetwork(networkParam) ? networkParam : "mainnet";

  // Validate address format
  if (!address || !/^0x[a-fA-F0-9]{40}$/i.test(address)) {
    return NextResponse.json<ActivityResponse>(
      {
        success: false,
        address: address || "",
        transactions: [],
        pagination: { limit, hasMore: false, nextCursor: null },
        error: "Invalid address format",
      },
      { status: 400 }
    );
  }

  // For testnet, indexed data is not available
  if (network === "testnet") {
    return NextResponse.json<ActivityResponse>({
      success: false,
      address,
      transactions: [],
      pagination: { limit, hasMore: false, nextCursor: null },
      error: "Testnet indexing not available",
    });
  }

  // Check Ponder availability
  const ponderAvailable = await isPonderAvailable();
  if (!ponderAvailable) {
    return NextResponse.json<ActivityResponse>({
      success: false,
      address,
      transactions: [],
      pagination: { limit, hasMore: false, nextCursor: null },
      error: "Indexer unavailable",
    });
  }

  try {
    // If we have a cursor, we need to get the timestamp of that transaction
    let afterTimestamp: string | undefined;
    if (cursor && /^0x[a-fA-F0-9]{64}$/.test(cursor)) {
      const cursorTx = await getCursorTransaction(cursor);
      if (cursorTx) {
        afterTimestamp = cursorTx.timestamp;
      }
    }

    // Fetch one more than limit to determine if there are more results
    const transactions = await getAddressTransactions(address, limit + 1, afterTimestamp);
    const hasMore = transactions.length > limit;
    const txsToProcess = transactions.slice(0, limit);

    if (txsToProcess.length === 0) {
      return NextResponse.json<ActivityResponse>({
        success: true,
        address,
        transactions: [],
        pagination: { limit, hasMore: false, nextCursor: null },
      });
    }

    // Get all transaction hashes
    const txHashes = txsToProcess.map((tx) => tx.hash);

    // Fetch associated data in parallel
    const [allTokenTransfers, allNftTransfers] = await Promise.all([
      getTokenTransfersForTxs(txHashes),
      getNftTransfersForTxs(txHashes),
    ]);

    // Group transfers by transaction hash
    const tokenTransfersByTx = new Map<string, IndexedTokenTransfer[]>();
    for (const transfer of allTokenTransfers) {
      const txHash = transfer.transactionHash.toLowerCase();
      const existing = tokenTransfersByTx.get(txHash) || [];
      existing.push(transfer);
      tokenTransfersByTx.set(txHash, existing);
    }

    const nftTransfersByTx = new Map<string, NftTransferInfo[]>();
    for (const transfer of allNftTransfers) {
      const txHash = transfer.transactionHash.toLowerCase();
      const existing = nftTransfersByTx.get(txHash) || [];
      existing.push(transfer);
      nftTransfersByTx.set(txHash, existing);
    }

    // Collect unique addresses for metadata lookup
    const tokenAddresses = [...new Set(allTokenTransfers.map((t) => t.tokenAddress))];
    const nftAddresses = [...new Set(allNftTransfers.map((t) => t.collectionAddress))];
    const participantAddresses = [
      ...new Set(
        txsToProcess.flatMap((tx) => [tx.from, tx.to].filter(Boolean) as string[])
      ),
    ];

    // Fetch metadata in parallel
    const [tokenMetadataList, nftCollectionsList, accountInfoList] = await Promise.all([
      getTokenMetadata(tokenAddresses),
      getNftCollections(nftAddresses),
      getAccountInfo(participantAddresses),
    ]);

    // Build lookup maps
    const tokenMetadataMap = new Map(
      tokenMetadataList.map((t) => [t.address.toLowerCase(), t])
    );
    const nftCollectionsMap = new Map(
      nftCollectionsList.map((c) => [c.address.toLowerCase(), c])
    );
    const accountInfoMap = new Map(
      accountInfoList.map((a) => [a.address.toLowerCase(), a])
    );

    // Enrich all transactions
    let enrichedTransactions: WalletTxMetadata[] = txsToProcess.map((tx) => {
      const txTokenTransfers = tokenTransfersByTx.get(tx.hash.toLowerCase()) || [];
      const txNftTransfers = nftTransfersByTx.get(tx.hash.toLowerCase()) || [];

      return enrichTransaction(
        tx,
        txTokenTransfers,
        txNftTransfers,
        tokenMetadataMap,
        nftCollectionsMap,
        accountInfoMap,
        address
      );
    });

    // Apply type filter if specified
    if (typeFilter.length > 0) {
      enrichedTransactions = filterByTypes(enrichedTransactions, typeFilter);
    }

    // Determine next cursor
    const nextCursor = hasMore ? txsToProcess[txsToProcess.length - 1].hash : null;

    return NextResponse.json<ActivityResponse>({
      success: true,
      address,
      transactions: enrichedTransactions,
      pagination: {
        limit,
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    console.error("Wallet activity error:", error);
    return NextResponse.json<ActivityResponse>(
      {
        success: false,
        address,
        transactions: [],
        pagination: { limit, hasMore: false, nextCursor: null },
        error: "Failed to fetch wallet activity",
      },
      { status: 500 }
    );
  }
}

// Helper to get cursor transaction timestamp
async function getCursorTransaction(hash: string): Promise<{ timestamp: string } | null> {
  const result = await query<{ transactions: { timestamp: string } | null }>(`
    query GetCursorTx($hash: String!) {
      transactions(hash: $hash) {
        timestamp
      }
    }
  `, { hash: hash.toLowerCase() });

  return result?.transactions ?? null;
}
