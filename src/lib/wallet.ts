/**
 * Wallet API Utilities
 *
 * Helper functions for enriching transaction data for wallet teams.
 * Provides transaction classification, amount formatting, and metadata enrichment.
 */

import { formatUnits } from "viem";
import {
  type IndexedTransaction,
  type IndexedTokenTransfer,
  type IndexedToken,
  type IndexedAccount,
} from "./ponder";
import { getTokenLogoUrl, getKnownTokenLogo } from "./tokenLogo";
import tokenRegistry from "@/data/tokens.json";

// ============ Types ============

export type TransactionType =
  | "send"
  | "receive"
  | "swap"
  | "bridge"
  | "mint"
  | "approve"
  | "nft_send"
  | "nft_receive"
  | "deploy"
  | "contract_call";

export type TransactionDirection = "in" | "out" | "swap" | "none";

export interface AssetInfo {
  type: "native" | "token" | "nft";
  address?: string;
  symbol: string;
  name: string;
  decimals?: number;
  iconUrl: string | null;
  amount: string;
  formattedAmount: string;
  isVerified?: boolean;
  // NFT specific
  tokenId?: string;
  collectionName?: string;
}

export interface ParticipantInfo {
  address: string;
  label: string | null;
  isContract: boolean;
}

export interface GasInfo {
  used: string;
  price: string;
  fee: string;
  formattedFee: string;
}

export interface WalletTxMetadata {
  hash: string;
  blockNumber: string;
  timestamp: string;
  status: "success" | "failed" | "pending";

  type: TransactionType;
  typeLabel: string;
  category: string;
  direction: TransactionDirection;

  primaryAsset: AssetInfo | null;
  secondaryAssets?: AssetInfo[];

  participants: {
    from: ParticipantInfo;
    to: ParticipantInfo | null;
  };

  gas: GasInfo;
}

export interface NftTransferInfo {
  id: string;
  transactionHash: string;
  blockNumber: string;
  timestamp: string;
  collectionAddress: string;
  tokenId: string;
  from: string;
  to: string;
  logIndex: number;
}

export interface NftCollectionInfo {
  address: string;
  name: string | null;
  symbol: string | null;
  standard: string;
  iconUrl: string | null;
  isVerified?: boolean;
}

// ============ Token Registry Map ============

const tokenRegistryMap = new Map(
  tokenRegistry.map((t) => [t.address.toLowerCase(), t])
);

// ============ Helper Functions ============

/**
 * Format a raw amount with decimals into a human-readable string
 */
export function formatAmount(amount: string | bigint, decimals: number): string {
  try {
    const value = typeof amount === "string" ? BigInt(amount) : amount;
    const formatted = formatUnits(value, decimals);
    const num = parseFloat(formatted);

    if (num === 0) return "0";
    if (num < 0.000001) return "< 0.000001";

    if (num >= 1_000_000) {
      return num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    if (num >= 1) {
      return num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      });
    }

    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    });
  } catch {
    return "0";
  }
}

/**
 * Get token metadata from registry or Ponder data
 */
export function getTokenInfo(
  address: string,
  ponderToken?: IndexedToken | null
): {
  symbol: string;
  name: string;
  decimals: number;
  iconUrl: string | null;
  isVerified: boolean;
} {
  const registryToken = tokenRegistryMap.get(address.toLowerCase());

  const symbol = ponderToken?.symbol || registryToken?.symbol || "???";
  const name = ponderToken?.name || registryToken?.name || "Unknown Token";
  const decimals = ponderToken?.decimals ?? registryToken?.decimals ?? 18;

  // Check for known token logo first
  const knownLogo = getKnownTokenLogo(symbol);
  const iconUrl = knownLogo || getTokenLogoUrl(address, symbol, registryToken?.logoURI);

  return {
    symbol,
    name,
    decimals,
    iconUrl,
    isVerified: !!registryToken,
  };
}

/**
 * Classify transaction type based on txCategory, transfers, and context
 */
export function classifyTransactionType(
  tx: IndexedTransaction,
  tokenTransfers: IndexedTokenTransfer[],
  nftTransfers: NftTransferInfo[],
  walletAddress: string
): { type: TransactionType; direction: TransactionDirection } {
  const normalizedWallet = walletAddress.toLowerCase();
  const txFrom = tx.from.toLowerCase();
  const txTo = tx.to?.toLowerCase() || "";

  // Check if this is a contract deployment
  if (!tx.to) {
    return { type: "deploy", direction: "out" };
  }

  // Check txCategory from Ponder indexer if available
  const category = (tx as { txCategory?: string }).txCategory;

  if (category === "approve") {
    return { type: "approve", direction: "none" };
  }

  // Handle NFT transfers
  if (nftTransfers.length > 0) {
    const nftOut = nftTransfers.some((t) => t.from.toLowerCase() === normalizedWallet);
    const nftIn = nftTransfers.some((t) => t.to.toLowerCase() === normalizedWallet);

    if (nftOut && nftIn) {
      return { type: "swap", direction: "swap" };
    }
    if (nftOut) {
      return { type: "nft_send", direction: "out" };
    }
    if (nftIn) {
      return { type: "nft_receive", direction: "in" };
    }
  }

  // Handle token transfers
  if (tokenTransfers.length > 0) {
    const tokensOut = tokenTransfers.filter((t) => t.from.toLowerCase() === normalizedWallet);
    const tokensIn = tokenTransfers.filter((t) => t.to.toLowerCase() === normalizedWallet);

    // Multiple tokens in both directions = swap
    if (tokensOut.length > 0 && tokensIn.length > 0) {
      // Check if it's a bridge (same token, different addresses)
      const outAddresses = new Set(tokensOut.map((t) => t.tokenAddress.toLowerCase()));
      const inAddresses = new Set(tokensIn.map((t) => t.tokenAddress.toLowerCase()));
      const hasOverlap = [...outAddresses].some((a) => inAddresses.has(a));

      if (category === "swap" || !hasOverlap) {
        return { type: "swap", direction: "swap" };
      }
      return { type: "bridge", direction: "swap" };
    }

    // Mint: tokens in from zero address
    const mintTransfers = tokensIn.filter(
      (t) => t.from.toLowerCase() === "0x0000000000000000000000000000000000000000"
    );
    if (mintTransfers.length > 0 && tokensOut.length === 0) {
      return { type: "mint", direction: "in" };
    }

    // Simple send/receive
    if (tokensOut.length > 0) {
      return { type: "send", direction: "out" };
    }
    if (tokensIn.length > 0) {
      return { type: "receive", direction: "in" };
    }
  }

  // Handle native FLOW transfers
  const hasValue = BigInt(tx.value) > 0n;

  if (hasValue) {
    if (txFrom === normalizedWallet) {
      return { type: "send", direction: "out" };
    }
    if (txTo === normalizedWallet) {
      return { type: "receive", direction: "in" };
    }
  }

  // Check for contract calls
  const hasInput = tx.input && tx.input !== "0x" && tx.input.length > 2;
  if (hasInput) {
    return { type: "contract_call", direction: txFrom === normalizedWallet ? "out" : "none" };
  }

  // Default: simple transfer based on who initiated
  if (txFrom === normalizedWallet) {
    return { type: "send", direction: "out" };
  }
  if (txTo === normalizedWallet) {
    return { type: "receive", direction: "in" };
  }

  return { type: "contract_call", direction: "none" };
}

/**
 * Generate human-readable type label
 */
export function getTypeLabel(
  type: TransactionType,
  primaryAsset: AssetInfo | null,
  secondaryAsset: AssetInfo | null
): string {
  switch (type) {
    case "send":
      return primaryAsset ? `Sent ${primaryAsset.symbol}` : "Sent";
    case "receive":
      return primaryAsset ? `Received ${primaryAsset.symbol}` : "Received";
    case "swap":
      if (primaryAsset && secondaryAsset) {
        return `Swapped ${primaryAsset.symbol} for ${secondaryAsset.symbol}`;
      }
      return "Swap";
    case "bridge":
      return primaryAsset ? `Bridged ${primaryAsset.symbol}` : "Bridge";
    case "mint":
      return primaryAsset ? `Minted ${primaryAsset.symbol}` : "Mint";
    case "approve":
      return primaryAsset ? `Approved ${primaryAsset.symbol}` : "Approval";
    case "nft_send":
      return primaryAsset ? `Sent ${primaryAsset.name}` : "Sent NFT";
    case "nft_receive":
      return primaryAsset ? `Received ${primaryAsset.name}` : "Received NFT";
    case "deploy":
      return "Contract Deployed";
    case "contract_call":
      return "Contract Call";
    default:
      return "Transaction";
  }
}

/**
 * Build primary asset info from transfers or native value
 */
export function buildPrimaryAsset(
  tx: IndexedTransaction,
  tokenTransfers: IndexedTokenTransfer[],
  nftTransfers: NftTransferInfo[],
  tokenMetadata: Map<string, IndexedToken>,
  nftCollections: Map<string, NftCollectionInfo>,
  walletAddress: string,
  direction: TransactionDirection
): AssetInfo | null {
  const normalizedWallet = walletAddress.toLowerCase();

  // Priority 1: NFT transfers
  if (nftTransfers.length > 0) {
    // Get the most relevant NFT transfer
    const relevantTransfer =
      direction === "out"
        ? nftTransfers.find((t) => t.from.toLowerCase() === normalizedWallet)
        : nftTransfers.find((t) => t.to.toLowerCase() === normalizedWallet);

    const transfer = relevantTransfer || nftTransfers[0];
    const collection = nftCollections.get(transfer.collectionAddress.toLowerCase());

    return {
      type: "nft",
      address: transfer.collectionAddress,
      symbol: collection?.symbol || "NFT",
      name: collection?.name || "Unknown NFT",
      iconUrl: collection?.iconUrl || null,
      amount: "1",
      formattedAmount: "1",
      isVerified: collection?.isVerified,
      tokenId: transfer.tokenId,
      collectionName: collection?.name || undefined,
    };
  }

  // Priority 2: Token transfers
  if (tokenTransfers.length > 0) {
    // Get the most relevant token transfer based on direction
    const relevantTransfer =
      direction === "out"
        ? tokenTransfers.find((t) => t.from.toLowerCase() === normalizedWallet)
        : tokenTransfers.find((t) => t.to.toLowerCase() === normalizedWallet);

    const transfer = relevantTransfer || tokenTransfers[0];
    const ponderToken = tokenMetadata.get(transfer.tokenAddress.toLowerCase());
    const tokenInfo = getTokenInfo(transfer.tokenAddress, ponderToken);

    return {
      type: "token",
      address: transfer.tokenAddress,
      symbol: tokenInfo.symbol,
      name: tokenInfo.name,
      decimals: tokenInfo.decimals,
      iconUrl: tokenInfo.iconUrl,
      amount: transfer.value,
      formattedAmount: formatAmount(transfer.value, tokenInfo.decimals),
      isVerified: tokenInfo.isVerified,
    };
  }

  // Priority 3: Native FLOW value
  const value = BigInt(tx.value);
  if (value > 0n) {
    return {
      type: "native",
      symbol: "FLOW",
      name: "Flow",
      decimals: 18,
      iconUrl: getKnownTokenLogo("FLOW") || null,
      amount: tx.value,
      formattedAmount: formatAmount(tx.value, 18),
      isVerified: true,
    };
  }

  return null;
}

/**
 * Build secondary assets (for swaps)
 */
export function buildSecondaryAssets(
  tokenTransfers: IndexedTokenTransfer[],
  nftTransfers: NftTransferInfo[],
  tokenMetadata: Map<string, IndexedToken>,
  nftCollections: Map<string, NftCollectionInfo>,
  walletAddress: string,
  direction: TransactionDirection,
  primaryAssetAddress?: string
): AssetInfo[] {
  const normalizedWallet = walletAddress.toLowerCase();
  const assets: AssetInfo[] = [];

  // For swaps, get assets going the opposite direction
  if (direction === "swap") {
    // Tokens received (for out direction primary)
    const tokensIn = tokenTransfers.filter(
      (t) =>
        t.to.toLowerCase() === normalizedWallet &&
        t.tokenAddress.toLowerCase() !== primaryAssetAddress?.toLowerCase()
    );

    for (const transfer of tokensIn) {
      const ponderToken = tokenMetadata.get(transfer.tokenAddress.toLowerCase());
      const tokenInfo = getTokenInfo(transfer.tokenAddress, ponderToken);

      assets.push({
        type: "token",
        address: transfer.tokenAddress,
        symbol: tokenInfo.symbol,
        name: tokenInfo.name,
        decimals: tokenInfo.decimals,
        iconUrl: tokenInfo.iconUrl,
        amount: transfer.value,
        formattedAmount: formatAmount(transfer.value, tokenInfo.decimals),
        isVerified: tokenInfo.isVerified,
      });
    }

    // NFTs received
    const nftsIn = nftTransfers.filter(
      (t) =>
        t.to.toLowerCase() === normalizedWallet &&
        t.collectionAddress.toLowerCase() !== primaryAssetAddress?.toLowerCase()
    );

    for (const transfer of nftsIn) {
      const collection = nftCollections.get(transfer.collectionAddress.toLowerCase());

      assets.push({
        type: "nft",
        address: transfer.collectionAddress,
        symbol: collection?.symbol || "NFT",
        name: collection?.name || "Unknown NFT",
        iconUrl: collection?.iconUrl || null,
        amount: "1",
        formattedAmount: "1",
        isVerified: collection?.isVerified,
        tokenId: transfer.tokenId,
        collectionName: collection?.name || undefined,
      });
    }
  }

  return assets;
}

/**
 * Enrich a transaction with full metadata for wallet display
 */
export function enrichTransaction(
  tx: IndexedTransaction,
  tokenTransfers: IndexedTokenTransfer[],
  nftTransfers: NftTransferInfo[],
  tokenMetadata: Map<string, IndexedToken>,
  nftCollections: Map<string, NftCollectionInfo>,
  accountInfo: Map<string, IndexedAccount>,
  walletAddress: string
): WalletTxMetadata {
  // Classify transaction
  const { type, direction } = classifyTransactionType(
    tx,
    tokenTransfers,
    nftTransfers,
    walletAddress
  );

  // Build primary asset
  const primaryAsset = buildPrimaryAsset(
    tx,
    tokenTransfers,
    nftTransfers,
    tokenMetadata,
    nftCollections,
    walletAddress,
    direction
  );

  // Build secondary assets for swaps
  const secondaryAssets =
    type === "swap"
      ? buildSecondaryAssets(
          tokenTransfers,
          nftTransfers,
          tokenMetadata,
          nftCollections,
          walletAddress,
          direction,
          primaryAsset?.address
        )
      : undefined;

  // Get type label
  const typeLabel = getTypeLabel(
    type,
    primaryAsset,
    secondaryAssets?.[0] || null
  );

  // Build participant info
  const fromAccount = accountInfo.get(tx.from.toLowerCase());
  const toAccount = tx.to ? accountInfo.get(tx.to.toLowerCase()) : null;

  const participants = {
    from: {
      address: tx.from,
      label: (fromAccount as { label?: string })?.label || null,
      isContract: fromAccount?.isContract || false,
    },
    to: tx.to
      ? {
          address: tx.to,
          label: (toAccount as { label?: string })?.label || null,
          isContract: toAccount?.isContract || false,
        }
      : null,
  };

  // Calculate gas
  const gasUsed = tx.gasUsed || tx.gas;
  const gasPrice = tx.gasPrice || "0";
  const fee = BigInt(gasUsed) * BigInt(gasPrice);

  const gas: GasInfo = {
    used: gasUsed.toString(),
    price: gasPrice.toString(),
    fee: fee.toString(),
    formattedFee: formatAmount(fee, 18),
  };

  // Determine status
  let status: "success" | "failed" | "pending" = "pending";
  if (tx.status !== null) {
    status = tx.status === 1 ? "success" : "failed";
  }

  // Get category from tx if available
  const category = (tx as { txCategory?: string }).txCategory || type;

  return {
    hash: tx.hash,
    blockNumber: tx.blockNumber,
    timestamp: tx.timestamp,
    status,
    type,
    typeLabel,
    category,
    direction,
    primaryAsset,
    secondaryAssets: secondaryAssets?.length ? secondaryAssets : undefined,
    participants,
    gas,
  };
}

/**
 * Filter transactions by type
 */
export function filterByTypes(
  transactions: WalletTxMetadata[],
  types: TransactionType[]
): WalletTxMetadata[] {
  if (types.length === 0) return transactions;
  return transactions.filter((tx) => types.includes(tx.type));
}

/**
 * Parse type filter from query string
 */
export function parseTypeFilter(typesParam: string | null): TransactionType[] {
  if (!typesParam) return [];

  const validTypes: TransactionType[] = [
    "send",
    "receive",
    "swap",
    "bridge",
    "mint",
    "approve",
    "nft_send",
    "nft_receive",
    "deploy",
    "contract_call",
  ];

  return typesParam
    .split(",")
    .map((t) => t.trim().toLowerCase() as TransactionType)
    .filter((t) => validTypes.includes(t));
}
