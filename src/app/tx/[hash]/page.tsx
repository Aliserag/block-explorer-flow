import { notFound } from "next/navigation";
import { Tag } from "antd";
import { type Hex } from "viem";
import { getTransaction, getTransactionReceipt, formatTransaction } from "@/lib/rpc";
import DataField from "@/components/DataField";

export const revalidate = 60;

export default async function TransactionPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;

  const [tx, receipt] = await Promise.all([
    getTransaction(hash as Hex),
    getTransactionReceipt(hash as Hex),
  ]);

  if (!tx) notFound();

  const formatted = formatTransaction(tx, receipt);

  const statusTag =
    formatted.status === 1 ? (
      <Tag color="success">Success</Tag>
    ) : formatted.status === 0 ? (
      <Tag color="error">Failed</Tag>
    ) : (
      <Tag color="warning">Pending</Tag>
    );

  return (
    <div className="container">
      {/* Header */}
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-sm)" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Transaction Details</h1>
          {statusTag}
        </div>
        <p className="mono" style={{ color: "var(--text-muted)", fontSize: 13, wordBreak: "break-all" }}>
          {formatted.hash}
        </p>
      </div>

      {/* Overview */}
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
          Overview
        </h3>
        <DataField label="Transaction Hash" value={formatted.hash} mono copyable />
        <DataField label="Status" value={formatted.status === 1 ? "Success" : formatted.status === 0 ? "Failed" : "Pending"} />
        {formatted.blockNumber && (
          <DataField label="Block" value={`#${Number(formatted.blockNumber).toLocaleString()}`} href={`/block/${formatted.blockNumber}`} />
        )}
        <DataField label="From" value={formatted.from} mono copyable href={`/account/${formatted.from}`} />
        {formatted.to ? (
          <DataField label="To" value={formatted.to} mono copyable href={`/account/${formatted.to}`} />
        ) : formatted.contractAddress ? (
          <DataField label="Contract Created" value={formatted.contractAddress} mono copyable href={`/account/${formatted.contractAddress}`} />
        ) : (
          <DataField label="To" value="Contract Creation" />
        )}
      </div>

      {/* Value & Fees */}
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
          Value & Fees
        </h3>
        <DataField label="Value" value={`${formatted.valueFormatted} FLOW`} mono />
        <DataField label="Gas Limit" value={Number(formatted.gas).toLocaleString()} mono />
        {formatted.gasUsed && <DataField label="Gas Used" value={Number(formatted.gasUsed).toLocaleString()} mono />}
        {formatted.gasPrice && <DataField label="Gas Price" value={`${formatted.gasPrice} wei`} mono />}
        {formatted.maxFeePerGas && <DataField label="Max Fee Per Gas" value={`${formatted.maxFeePerGas} wei`} mono />}
        <DataField label="Nonce" value={formatted.nonce} mono />
        <DataField label="Type" value={formatted.type} mono />
      </div>

      {/* Input Data */}
      {formatted.input && formatted.input !== "0x" && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-lg)",
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: "var(--space-md)", color: "var(--text-primary)" }}>
            Input Data
          </h3>
          <div
            className="mono"
            style={{
              background: "var(--bg-secondary)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-md)",
              fontSize: 12,
              color: "var(--text-secondary)",
              wordBreak: "break-all",
              maxHeight: 200,
              overflow: "auto",
            }}
          >
            {formatted.input}
          </div>
        </div>
      )}
    </div>
  );
}
