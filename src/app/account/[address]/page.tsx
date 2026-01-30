import { notFound } from "next/navigation";
import { isAddress, type Address } from "viem";
import { getBalance, getTransactionCount, getCode, getRecentTransactionsForAddress } from "@/lib/rpc";
import { getAccountTransactions, isPonderAvailable } from "@/lib/ponder";
import AccountContent from "./AccountContent";

export const revalidate = 30;

export default async function AccountPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;

  if (!isAddress(address)) notFound();

  const addr = address as Address;

  const [balance, transactionCount, code, ponderAvailable] = await Promise.all([
    getBalance(addr),
    getTransactionCount(addr),
    getCode(addr),
    isPonderAvailable(),
  ]);

  const isContract = code !== "0x" && code.length > 2;

  // Get transaction history - try Ponder first, fall back to RPC scan
  let txHistory: Array<{ hash: string; from: string; to: string | null; blockNumber: string }> = [];

  if (ponderAvailable) {
    // Try Ponder first
    txHistory = await getAccountTransactions(address);
  }

  // If Ponder didn't return data, scan recent blocks via RPC
  // Scan 1000 blocks (~17 min) to avoid rate limits
  if (txHistory.length === 0) {
    const recentTxs = await getRecentTransactionsForAddress(addr, 1000);
    txHistory = recentTxs.map((tx) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      blockNumber: tx.blockNumber,
    }));
  }

  return (
    <AccountContent
      address={address}
      balance={balance}
      transactionCount={transactionCount}
      code={code}
      isContract={isContract}
      txHistory={txHistory}
    />
  );
}
