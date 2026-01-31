import { NextResponse } from "next/server";
import { isValidNetwork, type NetworkId } from "@/lib/chains";
import { isPonderAvailable } from "@/lib/ponder";
import {
  enrichTransaction,
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

// Query to get transaction by hash
async function getTransactionByHash(hash: string): Promise<IndexedTransaction | null> {
  const result = await query<{ transactions: IndexedTransaction | null }>(`
    query GetTransaction($hash: String!) {
      transactions(hash: $hash) {
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
  `, { hash: hash.toLowerCase() });

  return result?.transactions ?? null;
}

// Query to get token transfers for a transaction
async function getTokenTransfersForTx(txHash: string): Promise<IndexedTokenTransfer[]> {
  const result = await query<{ tokenTransferss: { items: IndexedTokenTransfer[] } }>(`
    query GetTokenTransfers($txHash: String!) {
      tokenTransferss(
        where: { transactionHash: $txHash }
        orderBy: "logIndex"
        orderDirection: "asc"
        limit: 50
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
  `, { txHash: txHash.toLowerCase() });

  return result?.tokenTransferss?.items ?? [];
}

// Query to get NFT transfers for a transaction
async function getNftTransfersForTx(txHash: string): Promise<NftTransferInfo[]> {
  const result = await query<{ nftTransferss: { items: NftTransferInfo[] } }>(`
    query GetNftTransfers($txHash: String!) {
      nftTransferss(
        where: { transactionHash: $txHash }
        orderBy: "logIndex"
        orderDirection: "asc"
        limit: 50
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
  `, { txHash: txHash.toLowerCase() });

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
        limit: 100
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

interface TxMetadataResponse {
  success: boolean;
  data?: WalletTxMetadata;
  error?: string;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ hash: string }> }
) {
  const { searchParams } = new URL(request.url);
  const { hash } = await context.params;

  // Wallet address for direction calculation (required)
  const walletAddress = searchParams.get("address");

  // Network param (defaults to mainnet)
  const networkParam = searchParams.get("network") || "mainnet";
  const network: NetworkId = isValidNetwork(networkParam) ? networkParam : "mainnet";

  // Validate hash format
  if (!hash || !/^0x[a-fA-F0-9]{64}$/.test(hash)) {
    return NextResponse.json<TxMetadataResponse>(
      { success: false, error: "Invalid transaction hash format" },
      { status: 400 }
    );
  }

  // Validate wallet address
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
    return NextResponse.json<TxMetadataResponse>(
      { success: false, error: "Valid address parameter required for direction calculation" },
      { status: 400 }
    );
  }

  // For testnet, indexed data is not available
  if (network === "testnet") {
    return NextResponse.json<TxMetadataResponse>({
      success: false,
      error: "Testnet indexing not available",
    });
  }

  // Check Ponder availability
  const ponderAvailable = await isPonderAvailable();
  if (!ponderAvailable) {
    return NextResponse.json<TxMetadataResponse>({
      success: false,
      error: "Indexer unavailable",
    });
  }

  try {
    // Fetch transaction
    const tx = await getTransactionByHash(hash);

    if (!tx) {
      return NextResponse.json<TxMetadataResponse>(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Fetch associated data in parallel
    const [tokenTransfers, nftTransfers] = await Promise.all([
      getTokenTransfersForTx(hash),
      getNftTransfersForTx(hash),
    ]);

    // Collect unique addresses for metadata lookup
    const tokenAddresses = [...new Set(tokenTransfers.map((t) => t.tokenAddress))];
    const nftAddresses = [...new Set(nftTransfers.map((t) => t.collectionAddress))];
    const participantAddresses = [tx.from, tx.to].filter(Boolean) as string[];

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

    // Enrich transaction
    const enrichedTx = enrichTransaction(
      tx,
      tokenTransfers,
      nftTransfers,
      tokenMetadataMap,
      nftCollectionsMap,
      accountInfoMap,
      walletAddress
    );

    return NextResponse.json<TxMetadataResponse>({
      success: true,
      data: enrichedTx,
    });
  } catch (error) {
    console.error("Transaction metadata error:", error);
    return NextResponse.json<TxMetadataResponse>(
      { success: false, error: "Failed to fetch transaction metadata" },
      { status: 500 }
    );
  }
}
