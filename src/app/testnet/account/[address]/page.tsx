import { notFound } from "next/navigation";
import { isAddress, type Address } from "viem";
import { getBalance, getTransactionCount, getCode } from "@/lib/rpc";
import { getAccountTransactions, isPonderAvailable } from "@/lib/ponder";
import AccountContent from "@/app/account/[address]/AccountContent";

export const revalidate = 30;

export default async function TestnetAccountPage({ params }: { params: Promise<{ address: string }> }) {
  const network = "testnet";
  const { address } = await params;

  if (!isAddress(address)) notFound();

  const addr = address as Address;

  // Fetch basic account info in parallel (fast RPC calls)
  const [balance, transactionCount, code, ponderAvailable] = await Promise.all([
    getBalance(addr, network),
    getTransactionCount(addr, network),
    getCode(addr, network),
    isPonderAvailable(network),
  ]);

  const isContract = code !== "0x" && code.length > 2;

  // Ponder returns empty for testnet (graceful degradation)
  let txHistory: Array<{ hash: string; from: string; to: string | null; blockNumber: string }> = [];

  if (ponderAvailable) {
    txHistory = await getAccountTransactions(address, 20, network);
  }

  return (
    <AccountContent
      address={address}
      balance={balance}
      transactionCount={transactionCount}
      code={code}
      isContract={isContract}
      txHistory={txHistory}
      network={network}
    />
  );
}
