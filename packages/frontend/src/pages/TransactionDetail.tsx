import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Tag } from "antd";
import { motion } from "framer-motion";
import { getTransaction } from "@/services/api";
import { useNetwork } from "@/hooks/useNetwork";
import DataField from "@/components/DataField";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";

export default function TransactionDetail() {
  const { hash } = useParams<{ hash: string }>();
  const { network } = useNetwork();

  const { data: tx, isLoading, isError } = useQuery({
    queryKey: ["transaction", network, hash],
    queryFn: () => getTransaction(hash!, network),
    enabled: !!hash,
  });

  if (isLoading) return <LoadingState message="Loading transaction..." />;
  if (isError || !tx) return <ErrorState title="Transaction Not Found" message={`Transaction ${hash?.slice(0, 20)}... was not found.`} />;

  const statusTag =
    tx.status === 1 ? (
      <Tag color="success">Success</Tag>
    ) : tx.status === 0 ? (
      <Tag color="error">Failed</Tag>
    ) : (
      <Tag color="warning">Pending</Tag>
    );

  return (
    <div className="container">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: "var(--space-xl)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-sm)" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Transaction Details</h1>
          {statusTag}
        </div>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: 13,
            fontFamily: "var(--font-mono)",
            wordBreak: "break-all",
          }}
        >
          {tx.hash}
        </p>
      </motion.div>

      {/* Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
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
        <DataField label="Status" value={tx.status === 1 ? "Success" : tx.status === 0 ? "Failed" : "Pending"} />
        {tx.blockNumber && (
          <DataField
            label="Block"
            value={`#${Number(tx.blockNumber).toLocaleString()}`}
            link={`/block/${tx.blockNumber}`}
          />
        )}
        <DataField label="From" value={tx.from} mono copyable link={`/account/${tx.from}`} />
        {tx.to ? (
          <DataField label="To" value={tx.to} mono copyable link={`/account/${tx.to}`} />
        ) : tx.contractAddress ? (
          <DataField
            label="Contract Created"
            value={tx.contractAddress}
            mono
            copyable
            link={`/account/${tx.contractAddress}`}
          />
        ) : (
          <DataField label="To" value="Contract Creation" />
        )}
      </motion.div>

      {/* Value & Gas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
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
        <DataField label="Value" value={`${tx.valueFormatted} FLOW`} mono />
        <DataField label="Gas Limit" value={Number(tx.gas).toLocaleString()} mono />
        {tx.gasUsed && <DataField label="Gas Used" value={Number(tx.gasUsed).toLocaleString()} mono />}
        {tx.gasPrice && <DataField label="Gas Price" value={`${tx.gasPrice} wei`} mono />}
        {tx.effectiveGasPrice && (
          <DataField label="Effective Gas Price" value={`${tx.effectiveGasPrice} wei`} mono />
        )}
        {tx.maxFeePerGas && <DataField label="Max Fee Per Gas" value={`${tx.maxFeePerGas} wei`} mono />}
        {tx.maxPriorityFeePerGas && (
          <DataField label="Max Priority Fee" value={`${tx.maxPriorityFeePerGas} wei`} mono />
        )}
        <DataField label="Nonce" value={tx.nonce} mono />
        <DataField label="Transaction Type" value={tx.type} mono />
      </motion.div>

      {/* Input Data */}
      {tx.input && tx.input !== "0x" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
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
            style={{
              background: "var(--bg-secondary)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-md)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--text-secondary)",
              wordBreak: "break-all",
              maxHeight: 200,
              overflow: "auto",
            }}
          >
            {tx.input}
          </div>
        </motion.div>
      )}
    </div>
  );
}
