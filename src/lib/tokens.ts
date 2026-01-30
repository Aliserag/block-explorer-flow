import { type Address, formatUnits } from "viem";
import { getClient } from "./rpc";
import { type NetworkId } from "./chains";
import localTokens from "@/data/tokens.json";

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

// Load tokens from local registry (comprehensive list from fixes.world + official tokens)
function fetchTokenRegistry(): Token[] {
  if (tokenRegistryCache) {
    return tokenRegistryCache;
  }

  // Use local tokens.json which has 59+ tokens
  const tokens: Token[] = localTokens.map((token) => ({
    address: token.address,
    name: token.name,
    symbol: token.symbol,
    decimals: token.decimals,
    logoURI: token.logoURI || null,
  }));

  tokenRegistryCache = tokens;
  return tokens;
}

// Get token list (combines registry with any additional known tokens)
export function getTokenList(): Token[] {
  const registryTokens = fetchTokenRegistry();

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
  const tokens = getTokenList();

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
