/**
 * Fixes Token-List API Client
 *
 * Fetches and caches token and NFT metadata from the Fixes token-list API.
 * Provides quick lookups for token/NFT icons and verification status.
 *
 * API Endpoints:
 * - https://token-list.fixes.world/api/token-list?evm=true
 * - https://token-list.fixes.world/api/nft-list?evm=true
 */

// ============ Type Definitions ============

export interface FixesToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  description?: string;
  extensions?: {
    website?: string;
    coingeckoId?: string;
    twitter?: string;
  };
}

export interface FixesNFT {
  address: string;
  name: string;
  logoURI?: string;
  bannerURI?: string;
  description?: string;
  extensions?: {
    website?: string;
    twitter?: string;
    discord?: string;
  };
}

// API response types (may contain additional fields)
interface FixesTokenListResponse {
  tokens?: FixesToken[];
  // Handle various response formats
  [key: string]: unknown;
}

interface FixesNFTListResponse {
  nfts?: FixesNFT[];
  collections?: FixesNFT[];
  // Handle various response formats
  [key: string]: unknown;
}

// ============ Cache Configuration ============

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// In-memory cache
let tokenCache: CacheEntry<FixesToken[]> | null = null;
let nftCache: CacheEntry<FixesNFT[]> | null = null;

// Lookup map caches (derived from main caches)
let tokenMapCache: CacheEntry<Map<string, FixesToken>> | null = null;
let nftMapCache: CacheEntry<Map<string, FixesNFT>> | null = null;

/**
 * Check if a cache entry is still valid
 */
function isCacheValid<T>(cache: CacheEntry<T> | null): boolean {
  if (!cache) return false;
  return Date.now() - cache.timestamp < CACHE_TTL_MS;
}

// ============ Fetch Functions ============

const FIXES_TOKEN_LIST_URL = "https://token-list.fixes.world/api/token-list?evm=true";
const FIXES_NFT_LIST_URL = "https://token-list.fixes.world/api/nft-list?evm=true";

/**
 * Fetch the complete token list from Fixes API
 *
 * @returns Array of tokens, or empty array on error
 */
export async function fetchFixesTokenList(): Promise<FixesToken[]> {
  // Return cached data if valid
  if (isCacheValid(tokenCache) && tokenCache) {
    return tokenCache.data;
  }

  try {
    const response = await fetch(FIXES_TOKEN_LIST_URL, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 300 }, // 5 minute cache for Next.js
    });

    if (!response.ok) {
      console.error(`Fixes token list fetch failed: ${response.status} ${response.statusText}`);
      return tokenCache?.data ?? [];
    }

    const json = await response.json();

    // Handle different response formats
    let tokens: FixesToken[] = [];

    if (Array.isArray(json)) {
      // Direct array response
      tokens = json as FixesToken[];
    } else if (json && typeof json === "object") {
      const data = json as FixesTokenListResponse;
      if (data.tokens && Array.isArray(data.tokens)) {
        // Wrapped in { tokens: [...] }
        tokens = data.tokens;
      }
    }

    // Normalize addresses to lowercase
    tokens = tokens.map((token) => ({
      ...token,
      address: token.address.toLowerCase(),
    }));

    // Update cache
    tokenCache = {
      data: tokens,
      timestamp: Date.now(),
    };

    // Invalidate derived map cache
    tokenMapCache = null;

    return tokens;
  } catch (error) {
    console.error("Error fetching Fixes token list:", error);
    return tokenCache?.data ?? [];
  }
}

/**
 * Fetch the complete NFT collection list from Fixes API
 *
 * @returns Array of NFT collections, or empty array on error
 */
export async function fetchFixesNFTList(): Promise<FixesNFT[]> {
  // Return cached data if valid
  if (isCacheValid(nftCache) && nftCache) {
    return nftCache.data;
  }

  try {
    const response = await fetch(FIXES_NFT_LIST_URL, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 300 }, // 5 minute cache for Next.js
    });

    if (!response.ok) {
      console.error(`Fixes NFT list fetch failed: ${response.status} ${response.statusText}`);
      return nftCache?.data ?? [];
    }

    const json = await response.json();

    // Handle different response formats
    let nfts: FixesNFT[] = [];

    if (Array.isArray(json)) {
      // Direct array response
      nfts = json as FixesNFT[];
    } else if (json && typeof json === "object") {
      const data = json as FixesNFTListResponse;
      if (data.nfts && Array.isArray(data.nfts)) {
        // Wrapped in { nfts: [...] }
        nfts = data.nfts;
      } else if (data.collections && Array.isArray(data.collections)) {
        // Wrapped in { collections: [...] }
        nfts = data.collections;
      }
    }

    // Normalize addresses to lowercase
    nfts = nfts.map((nft) => ({
      ...nft,
      address: nft.address.toLowerCase(),
    }));

    // Update cache
    nftCache = {
      data: nfts,
      timestamp: Date.now(),
    };

    // Invalidate derived map cache
    nftMapCache = null;

    return nfts;
  } catch (error) {
    console.error("Error fetching Fixes NFT list:", error);
    return nftCache?.data ?? [];
  }
}

// ============ Lookup Maps ============

/**
 * Get a map of token address -> token metadata for quick lookups
 *
 * @returns Map with lowercase addresses as keys
 */
export async function getTokenMetadataMap(): Promise<Map<string, FixesToken>> {
  // Return cached map if valid
  if (isCacheValid(tokenMapCache) && tokenMapCache) {
    return tokenMapCache.data;
  }

  const tokens = await fetchFixesTokenList();
  const map = new Map<string, FixesToken>();

  for (const token of tokens) {
    map.set(token.address.toLowerCase(), token);
  }

  // Cache the map
  tokenMapCache = {
    data: map,
    timestamp: Date.now(),
  };

  return map;
}

/**
 * Get a map of NFT address -> NFT metadata for quick lookups
 *
 * @returns Map with lowercase addresses as keys
 */
export async function getNFTMetadataMap(): Promise<Map<string, FixesNFT>> {
  // Return cached map if valid
  if (isCacheValid(nftMapCache) && nftMapCache) {
    return nftMapCache.data;
  }

  const nfts = await fetchFixesNFTList();
  const map = new Map<string, FixesNFT>();

  for (const nft of nfts) {
    map.set(nft.address.toLowerCase(), nft);
  }

  // Cache the map
  nftMapCache = {
    data: map,
    timestamp: Date.now(),
  };

  return map;
}

// ============ Helper Functions ============

/**
 * Get the icon URL for a token by address
 *
 * @param address - Token contract address
 * @param fallback - Optional fallback URL if token not found
 * @returns Icon URL or null if not found and no fallback provided
 */
export async function getTokenIcon(
  address: string,
  fallback?: string
): Promise<string | null> {
  const map = await getTokenMetadataMap();
  const token = map.get(address.toLowerCase());

  if (token?.logoURI) {
    return token.logoURI;
  }

  return fallback ?? null;
}

/**
 * Get the icon URL for an NFT collection by address
 *
 * @param address - NFT contract address
 * @param fallback - Optional fallback URL if collection not found
 * @returns Icon URL or null if not found and no fallback provided
 */
export async function getNFTCollectionIcon(
  address: string,
  fallback?: string
): Promise<string | null> {
  const map = await getNFTMetadataMap();
  const nft = map.get(address.toLowerCase());

  if (nft?.logoURI) {
    return nft.logoURI;
  }

  return fallback ?? null;
}

/**
 * Check if a token address is in the verified Fixes token list
 *
 * @param address - Token contract address to check
 * @returns true if token is in the Fixes verified list
 */
export async function isVerifiedToken(address: string): Promise<boolean> {
  const map = await getTokenMetadataMap();
  return map.has(address.toLowerCase());
}

/**
 * Check if an NFT collection address is in the Fixes NFT list
 *
 * @param address - NFT contract address to check
 * @returns true if collection is in the Fixes list
 */
export async function isVerifiedNFT(address: string): Promise<boolean> {
  const map = await getNFTMetadataMap();
  return map.has(address.toLowerCase());
}

/**
 * Get full token metadata by address
 *
 * @param address - Token contract address
 * @returns Token metadata or null if not found
 */
export async function getTokenMetadata(
  address: string
): Promise<FixesToken | null> {
  const map = await getTokenMetadataMap();
  return map.get(address.toLowerCase()) ?? null;
}

/**
 * Get full NFT collection metadata by address
 *
 * @param address - NFT contract address
 * @returns NFT metadata or null if not found
 */
export async function getNFTMetadata(
  address: string
): Promise<FixesNFT | null> {
  const map = await getNFTMetadataMap();
  return map.get(address.toLowerCase()) ?? null;
}

/**
 * Force refresh both token and NFT caches
 * Useful for manual cache invalidation
 */
export async function refreshFixesCaches(): Promise<void> {
  // Clear all caches
  tokenCache = null;
  nftCache = null;
  tokenMapCache = null;
  nftMapCache = null;

  // Refetch both lists in parallel
  await Promise.all([fetchFixesTokenList(), fetchFixesNFTList()]);
}

/**
 * Get cache status for debugging/monitoring
 */
export function getFixesCacheStatus(): {
  tokenCache: { valid: boolean; age: number | null; count: number };
  nftCache: { valid: boolean; age: number | null; count: number };
} {
  const now = Date.now();

  return {
    tokenCache: {
      valid: isCacheValid(tokenCache),
      age: tokenCache ? now - tokenCache.timestamp : null,
      count: tokenCache?.data.length ?? 0,
    },
    nftCache: {
      valid: isCacheValid(nftCache),
      age: nftCache ? now - nftCache.timestamp : null,
      count: nftCache?.data.length ?? 0,
    },
  };
}
