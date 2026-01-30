import { NextResponse } from "next/server";
import {
  getAccountTokenBalances,
  getTokenMetadata,
  isPonderAvailable,
} from "@/lib/ponder";
import { getTokenLogoUrl } from "@/lib/tokenLogo";
import { formatUnits } from "viem";

// Import the static token list for logo fallback
import tokenRegistry from "@/data/tokens.json";

export const dynamic = "force-dynamic";

interface DiscoveredToken {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
  rawBalance: string;
  logoURI: string;
  fromPonder: boolean;
}

interface TokenDiscoveryResponse {
  available: boolean;
  address: string;
  tokenCount: number;
  tokens: DiscoveredToken[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Address parameter required" },
      { status: 400 }
    );
  }

  // Check if Ponder is available
  const ponderAvailable = await isPonderAvailable();

  if (!ponderAvailable) {
    return NextResponse.json<TokenDiscoveryResponse>({
      available: false,
      address,
      tokenCount: 0,
      tokens: [],
    });
  }

  try {
    // Get token balances from Ponder
    const balances = await getAccountTokenBalances(address);

    if (balances.length === 0) {
      return NextResponse.json<TokenDiscoveryResponse>({
        available: true,
        address,
        tokenCount: 0,
        tokens: [],
      });
    }

    // Get metadata for all discovered tokens
    const tokenAddresses = balances.map((b) => b.tokenAddress);
    const metadata = await getTokenMetadata(tokenAddresses);

    // Create a map of registry tokens for logo lookup
    const registryMap = new Map(
      tokenRegistry.map((t) => [t.address.toLowerCase(), t])
    );

    // Build the response
    const tokens: DiscoveredToken[] = balances.map((balance) => {
      const meta = metadata.find(
        (m) => m.address.toLowerCase() === balance.tokenAddress.toLowerCase()
      );

      const registryToken = registryMap.get(balance.tokenAddress.toLowerCase());

      const symbol = meta?.symbol || registryToken?.symbol || "???";
      const name = meta?.name || registryToken?.name || "Unknown Token";
      const decimals = meta?.decimals ?? registryToken?.decimals ?? 18;

      // Use registry logo if available, otherwise generate default
      const logoURI = getTokenLogoUrl(
        balance.tokenAddress,
        symbol,
        registryToken?.logoURI
      );

      // Format balance
      const rawBalance = balance.balance;
      const formattedBalance = formatUnits(BigInt(rawBalance), decimals);

      return {
        address: balance.tokenAddress,
        name,
        symbol,
        decimals,
        balance: formattedBalance,
        rawBalance,
        logoURI,
        fromPonder: true,
      };
    });

    // Sort by balance value (descending)
    tokens.sort((a, b) => {
      const aValue = parseFloat(a.balance);
      const bValue = parseFloat(b.balance);
      return bValue - aValue;
    });

    return NextResponse.json<TokenDiscoveryResponse>({
      available: true,
      address,
      tokenCount: tokens.length,
      tokens,
    });
  } catch (error) {
    console.error("Token discovery error:", error);
    return NextResponse.json(
      { error: "Failed to fetch discovered tokens" },
      { status: 500 }
    );
  }
}
