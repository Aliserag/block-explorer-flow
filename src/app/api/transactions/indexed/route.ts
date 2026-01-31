import { NextResponse } from "next/server";
import {
  getAccountTransactions,
  getAccountTransactionCount,
  isPonderAvailable,
} from "@/lib/ponder";

export const dynamic = "force-dynamic";

interface TransactionResponse {
  available: boolean;
  address: string;
  totalCount: number;
  transactions: Array<{
    hash: string;
    blockNumber: string;
    from: string;
    to: string | null;
    value: string;
    timestamp: string;
    status: number | null;
  }>;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const limit = parseInt(searchParams.get("limit") || "25", 10);
  // Note: Ponder doesn't support offset-based pagination
  // For now, we only return the first page of results
  // TODO: Implement cursor-based pagination for full support

  if (!address) {
    return NextResponse.json(
      { error: "Address parameter required" },
      { status: 400 }
    );
  }

  // Check if Ponder is available
  const ponderAvailable = await isPonderAvailable();

  if (!ponderAvailable) {
    return NextResponse.json<TransactionResponse>({
      available: false,
      address,
      totalCount: 0,
      transactions: [],
    });
  }

  try {
    // Fetch transactions and total count in parallel
    const [transactions, totalCount] = await Promise.all([
      getAccountTransactions(address, limit),
      getAccountTransactionCount(address),
    ]);

    return NextResponse.json<TransactionResponse>({
      available: true,
      address,
      totalCount,
      transactions: transactions.map((tx) => ({
        hash: tx.hash,
        blockNumber: tx.blockNumber,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        timestamp: tx.timestamp,
        status: tx.status,
      })),
    });
  } catch (error) {
    console.error("Indexed transactions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch indexed transactions" },
      { status: 500 }
    );
  }
}
