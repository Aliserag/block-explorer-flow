import { notFound } from "next/navigation";
import { Tag, Tabs } from "antd";
import { isAddress, type Address } from "viem";
import { getBalance, getTransactionCount, getCode } from "@/lib/rpc";
import { getAccountTransactions, isPonderAvailable } from "@/lib/ponder";
import DataField from "@/components/DataField";
import Link from "next/link";

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

  // Get transaction history from Ponder if available
  const txHistory = ponderAvailable ? await getAccountTransactions(address) : [];

  return (
    <div className="container">
      {/* Header */}
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-sm)" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
            {isContract ? "Contract" : "Account"}
          </h1>
          {isContract ? <Tag color="purple">Contract</Tag> : <Tag color="blue">EOA</Tag>}
        </div>
        <p className="mono" style={{ color: "var(--text-muted)", fontSize: 13, wordBreak: "break-all" }}>
          {address}
        </p>
      </div>

      {/* Balance Card */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--flow-green) 0%, var(--flow-green-dark) 100%)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-xl)",
          marginBottom: "var(--space-xl)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            className="mono"
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.8)",
              marginBottom: "var(--space-xs)",
            }}
          >
            Balance
          </div>
          <div className="mono" style={{ fontSize: 32, fontWeight: 700, color: "white" }}>
            {parseFloat(balance.formatted).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6,
            })}{" "}
            <span style={{ fontSize: 20, opacity: 0.8 }}>FLOW</span>
          </div>
        </div>
        <div
          style={{
            width: 64,
            height: 64,
            background: "rgba(255,255,255,0.2)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
            <path d="M12 6V18M18 12H6" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Details */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-lg)",
          marginBottom: "var(--space-xl)",
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: "var(--space-md)", color: "var(--text-primary)" }}>
          Account Details
        </h3>
        <DataField label="Address" value={address} mono copyable />
        <DataField label="Balance (wei)" value={balance.wei.toString()} mono />
        <DataField label="Transaction Count" value={transactionCount} />
        <DataField label="Type" value={isContract ? "Smart Contract" : "Externally Owned Account (EOA)"} />
      </div>

      {/* Transaction History from Ponder */}
      {txHistory.length > 0 && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-lg)",
            marginBottom: "var(--space-xl)",
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: "var(--space-md)", color: "var(--text-primary)" }}>
            Transaction History
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400, marginLeft: 8 }}>
              (from Ponder indexer)
            </span>
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            {txHistory.map((tx) => (
              <Link
                key={tx.hash}
                href={`/tx/${tx.hash}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-md)",
                  padding: "var(--space-sm)",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-secondary)",
                }}
              >
                <span className="mono" style={{ color: "var(--text-accent)", fontSize: 13 }}>
                  {tx.hash.slice(0, 14)}...
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  {tx.from.toLowerCase() === address.toLowerCase() ? "OUT →" : "IN ←"}
                </span>
                <span className="mono" style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                  Block #{tx.blockNumber}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Contract Code */}
      {isContract && code && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-lg)",
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: "var(--space-md)", color: "var(--text-primary)" }}>
            Contract Bytecode
          </h3>
          <div
            className="mono"
            style={{
              background: "var(--bg-secondary)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-md)",
              fontSize: 11,
              color: "var(--text-secondary)",
              wordBreak: "break-all",
              maxHeight: 300,
              overflow: "auto",
            }}
          >
            {code}
          </div>
        </div>
      )}
    </div>
  );
}
