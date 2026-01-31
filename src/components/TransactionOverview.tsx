"use client";

import { Tag } from "antd";
import DataField from "./DataField";
import { type Transaction, type TransactionReceipt } from "viem";

interface TransactionOverviewProps {
  tx: Transaction;
  receipt: TransactionReceipt | null;
}

export default function TransactionOverview({ tx, receipt }: TransactionOverviewProps) {
  const status = receipt?.status === "success" ? 1 : receipt?.status === "reverted" ? 0 : null;

  const statusTag =
    status === 1 ? (
      <Tag color="success">Success</Tag>
    ) : status === 0 ? (
      <Tag color="error">Failed</Tag>
    ) : (
      <Tag color="warning">Pending</Tag>
    );

  const formatValue = (value: bigint | undefined) => {
    if (!value) return "0";
    const eth = Number(value) / 1e18;
    return eth.toFixed(8).replace(/\.?0+$/, "");
  };

  const getTransactionType = (type: string) => {
    const types: Record<string, string> = {
      "0x0": "Legacy",
      "0x1": "EIP-2930 (Access List)",
      "0x2": "EIP-1559 (Dynamic Fee)",
      "legacy": "Legacy",
      "eip2930": "EIP-2930 (Access List)",
      "eip1559": "EIP-1559 (Dynamic Fee)",
    };
    return types[type] || type;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-sm)" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Transaction Details</h1>
          {statusTag}
        </div>
        <p className="mono" style={{ color: "var(--text-muted)", fontSize: 13, wordBreak: "break-all" }}>
          {tx.hash}
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
        <DataField label="Transaction Hash" value={tx.hash} mono copyable />
        <DataField label="Status" value={status === 1 ? "Success" : status === 0 ? "Failed" : "Pending"} />
        {tx.blockNumber && (
          <DataField label="Block" value={`#${Number(tx.blockNumber).toLocaleString()}`} href={`/block/${tx.blockNumber}`} />
        )}
        <DataField label="From" value={tx.from} mono copyable href={`/account/${tx.from}`} />
        {tx.to ? (
          <DataField label="To" value={tx.to} mono copyable href={`/account/${tx.to}`} />
        ) : receipt?.contractAddress ? (
          <DataField label="Contract Created" value={receipt.contractAddress} mono copyable href={`/account/${receipt.contractAddress}`} />
        ) : (
          <DataField label="To" value="Contract Creation" />
        )}
        <DataField label="Transaction Type" value={getTransactionType(tx.type)} />
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
        <DataField label="Value" value={`${formatValue(tx.value)} FLOW`} mono />
        <DataField label="Gas Limit" value={Number(tx.gas).toLocaleString()} mono />
        {receipt?.gasUsed && <DataField label="Gas Used" value={Number(receipt.gasUsed).toLocaleString()} mono />}
        {tx.gasPrice && <DataField label="Gas Price" value={`${tx.gasPrice} wei`} mono />}
        {tx.maxFeePerGas && <DataField label="Max Fee Per Gas" value={`${tx.maxFeePerGas} wei`} mono />}
        {tx.maxPriorityFeePerGas && <DataField label="Max Priority Fee Per Gas" value={`${tx.maxPriorityFeePerGas} wei`} mono />}
        {receipt?.effectiveGasPrice && <DataField label="Effective Gas Price" value={`${receipt.effectiveGasPrice} wei`} mono />}
        <DataField label="Nonce" value={tx.nonce} mono />
      </div>

      {/* Input Data */}
      {tx.input && tx.input !== "0x" && (
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
            Input Data
          </h3>
          <div style={{ marginBottom: "var(--space-sm)" }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Function Signature:
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-accent)", marginLeft: "var(--space-sm)" }}>
              {tx.input.slice(0, 10)}
            </span>
          </div>
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
            {tx.input}
          </div>
        </div>
      )}

      {/* Access List */}
      {tx.accessList && tx.accessList.length > 0 && (
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
            Access List
          </h3>
          {tx.accessList.map((item, index) => (
            <div
              key={index}
              style={{
                padding: "var(--space-md)",
                background: "var(--bg-secondary)",
                borderRadius: "var(--radius-md)",
                marginBottom: "var(--space-sm)",
              }}
            >
              <DataField label="Address" value={item.address} mono copyable />
              {item.storageKeys && item.storageKeys.length > 0 && (
                <div style={{ marginTop: "var(--space-sm)" }}>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: "var(--space-xs)" }}>
                    Storage Keys:
                  </div>
                  {item.storageKeys.map((key, keyIndex) => (
                    <div
                      key={keyIndex}
                      className="mono"
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        padding: "var(--space-xs)",
                        wordBreak: "break-all",
                      }}
                    >
                      {key}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Additional Details */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-lg)",
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: "var(--space-md)", color: "var(--text-primary)" }}>
          Additional Details
        </h3>
        {tx.blockHash && <DataField label="Block Hash" value={tx.blockHash} mono copyable />}
        {tx.transactionIndex !== null && <DataField label="Transaction Index" value={tx.transactionIndex} mono />}
        {tx.v && <DataField label="v" value={tx.v.toString()} mono />}
        {tx.r && <DataField label="r" value={tx.r} mono copyable />}
        {tx.s && <DataField label="s" value={tx.s} mono copyable />}
        {receipt?.cumulativeGasUsed && (
          <DataField label="Cumulative Gas Used" value={Number(receipt.cumulativeGasUsed).toLocaleString()} mono />
        )}
        {receipt?.logsBloom && (
          <DataField label="Logs Bloom" value={`${receipt.logsBloom.slice(0, 66)}...`} mono />
        )}
      </div>
    </div>
  );
}
