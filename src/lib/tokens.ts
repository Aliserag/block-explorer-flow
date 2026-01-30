import { type Address, formatUnits } from "viem";
import { getClient } from "./rpc";
import { type NetworkId } from "./chains";

// Token interface
export interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string | null;
}

// Token balance with metadata
export interface TokenBalance {
  token: Token;
  balance: bigint;
  formattedBalance: string;
}

// Minimal ERC-20 ABI for balance checking
const erc20Abi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

// Cache for token registry
let tokenRegistryCache: Token[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Flow token registry URL
const FLOW_TOKEN_REGISTRY_URL =
  "https://raw.githubusercontent.com/onflow/assets/main/tokens/outputs/mainnet/token-list.json";

// Fetch token list from Flow registry
async function fetchTokenRegistry(): Promise<Token[]> {
  // Check cache
  if (tokenRegistryCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return tokenRegistryCache;
  }

  try {
    const response = await fetch(FLOW_TOKEN_REGISTRY_URL, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch token registry: ${response.status}`);
    }

    const data = await response.json();
    const tokens: Token[] = [];

    // Parse tokens from the registry
    if (data.tokens && Array.isArray(data.tokens)) {
      for (const token of data.tokens) {
        // Only include tokens with EVM addresses
        if (token.evmAddress) {
          tokens.push({
            address: token.evmAddress,
            name: token.name || "Unknown",
            symbol: token.symbol || "???",
            decimals: token.decimals || 18,
            logoURI: token.logoURI || null,
          });
        }
      }
    }

    // Cache the results
    tokenRegistryCache = tokens;
    cacheTimestamp = Date.now();

    return tokens;
  } catch (error) {
    console.error("Error fetching token registry:", error);
    // Return cached data if available, even if stale
    return tokenRegistryCache || [];
  }
}

// Get token list (combines registry with any additional known tokens)
export async function getTokenList(): Promise<Token[]> {
  const registryTokens = await fetchTokenRegistry();

  // Additional tokens not in the official registry
  // These will use default letter-based logos
  const additionalTokens: Token[] = [
    // Add any known tokens not in the registry here
  ];

  // Merge, avoiding duplicates (registry takes priority)
  const addressSet = new Set(registryTokens.map((t) => t.address.toLowerCase()));
  const mergedTokens = [...registryTokens];

  for (const token of additionalTokens) {
    if (!addressSet.has(token.address.toLowerCase())) {
      mergedTokens.push(token);
    }
  }

  return mergedTokens;
}

// Get token balances for an address using multicall
export async function getTokenBalances(
  address: Address,
  network: NetworkId = "mainnet"
): Promise<TokenBalance[]> {
  const client = getClient(network);
  const tokens = await getTokenList();

  if (tokens.length === 0) {
    return [];
  }

  try {
    // Create multicall contracts for balance checks
    const balanceCalls = tokens.map((token) => ({
      address: token.address as Address,
      abi: erc20Abi,
      functionName: "balanceOf" as const,
      args: [address] as const,
    }));

    // Execute multicall
    const results = await client.multicall({
      contracts: balanceCalls,
      allowFailure: true,
    });

    // Process results and filter out zero balances
    const balances: TokenBalance[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const result = results[i];
      const token = tokens[i];

      if (result.status === "success" && result.result !== undefined) {
        const balance = result.result as bigint;

        // Only include non-zero balances
        if (balance > 0n) {
          balances.push({
            token,
            balance,
            formattedBalance: formatUnits(balance, token.decimals),
          });
        }
      }
    }

    // Sort by balance (highest first)
    balances.sort((a, b) => {
      const aValue = parseFloat(a.formattedBalance);
      const bValue = parseFloat(b.formattedBalance);
      return bValue - aValue;
    });

    return balances;
  } catch (error) {
    console.error("Error fetching token balances:", error);
    return [];
  }
}

// Format token balance for display
export function formatTokenBalance(balance: string, maxDecimals: number = 6): string {
  const num = parseFloat(balance);

  if (num === 0) return "0";

  if (num < 0.000001) {
    return "< 0.000001";
  }

  if (num >= 1_000_000) {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}
