import { NextRequest, NextResponse } from "next/server";
import { isAddress, type Address } from "viem";
import { getTokenBalances } from "@/lib/tokens";
import { isValidNetwork, type NetworkId } from "@/lib/chains";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const { searchParams } = new URL(request.url);

  // Network param (defaults to mainnet)
  const networkParam = searchParams.get("network") || "mainnet";
  const network: NetworkId = isValidNetwork(networkParam) ? networkParam : "mainnet";

  if (!isAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const balances = await getTokenBalances(address as Address, network);

    return NextResponse.json({
      address,
      tokenCount: balances.length,
      tokens: balances.map((b) => ({
        symbol: b.token.symbol,
        name: b.token.name,
        address: b.token.address,
        decimals: b.token.decimals,
        logoURI: b.token.logoURI,
        balance: b.formattedBalance,
        rawBalance: b.balance.toString(),
      })),
    });
  } catch (error) {
    console.error("Token fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tokens" },
      { status: 500 }
    );
  }
}
