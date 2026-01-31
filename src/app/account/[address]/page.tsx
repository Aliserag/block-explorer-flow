import { notFound } from "next/navigation";
import { isAddress, type Address } from "viem";
import { getBalance, getTransactionCount, getCode } from "@/lib/rpc";
import { getAccountTransactions, isPonderAvailable } from "@/lib/ponder";
import AccountContent from "./AccountContent";

export const revalidate = 30;

export default async function AccountPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;

  if (!isAddress(address)) notFound();

  const addr = address as Address;

  // Fetch basic account info in parallel (fast RPC calls)
  const [balance, transactionCount, code, ponderAvailable] = await Promise.all([
    getBalance(addr),
    getTransactionCount(addr),
    getCode(addr),
    isPonderAvailable(),
  ]);

  const isContract = code !== "0x" && code.length > 2;

  // Only fetch tx history from Ponder (fast) - don't do slow RPC scan on server
  let txHistory: Array<{ hash: string; from: string; to: string | null; blockNumber: string }> = [];

  if (ponderAvailable) {
    txHistory = await getAccountTransactions(address);
  }

  // Don't do expensive RPC block scanning here - let client handle loading state
  // The AccountContent component will show appropriate empty state

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
