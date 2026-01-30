import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Tag } from "antd";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { getBlock, getBlockTransactions } from "@/services/api";
import { useNetwork } from "@/hooks/useNetwork";
import DataField from "@/components/DataField";
import TransactionCard from "@/components/TransactionCard";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";

export default function BlockDetail() {
  const { blockNumber } = useParams<{ blockNumber: string }>();
  const { network } = useNetwork();

  const { data: block, isLoading, isError } = useQuery({
    queryKey: ["block", network, blockNumber],
    queryFn: () => getBlock(blockNumber!, network),
    enabled: !!blockNumber,
  });

  const { data: txData } = useQuery({
    queryKey: ["blockTransactions", network, blockNumber],
    queryFn: () => getBlockTransactions(blockNumber!, network),
    enabled: !!blockNumber && !!block && block.transactionCount > 0,
  });

  if (isLoading) return <LoadingState message="Loading block details..." />;
  if (isError || !block) return <ErrorState title="Block Not Found" message={`Block ${blockNumber} was not found.`} />;

  const blockNum = Number(block.number);
  const timestamp = block.timestampDate ? dayjs(block.timestampDate).format("MMM D, YYYY HH:mm:ss") : "—";

  return (
    <div className="container">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: "var(--space-xl)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-sm)" }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
            }}
          >
            Block #{blockNum.toLocaleString()}
          </h1>
          <Tag color="green">{block.transactionCount} Transactions</Tag>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{timestamp}</p>
      </motion.div>

      {/* Navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "var(--space-lg)",
        }}
      >
        <Link
          to={`/block/${blockNum - 1}`}
          style={{
            color: blockNum > 0 ? "var(--text-accent)" : "var(--text-muted)",
            pointerEvents: blockNum > 0 ? "auto" : "none",
          }}
        >
          ← Block #{(blockNum - 1).toLocaleString()}
        </Link>
        <Link to={`/block/${blockNum + 1}`} style={{ color: "var(--text-accent)" }}>
          Block #{(blockNum + 1).toLocaleString()} →
        </Link>
      </div>

      {/* Block Details */}
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
        <DataField label="Block Hash" value={block.hash} mono copyable />
        <DataField label="Parent Hash" value={block.parentHash} mono copyable />
        <DataField label="Timestamp" value={timestamp} />
        <DataField label="Transaction Count" value={block.transactionCount} />
        <DataField label="Gas Used" value={Number(block.gasUsed).toLocaleString()} mono />
        <DataField label="Gas Limit" value={Number(block.gasLimit).toLocaleString()} mono />
        {block.baseFeePerGas && (
          <DataField
            label="Base Fee Per Gas"
            value={`${Number(block.baseFeePerGas).toLocaleString()} wei`}
            mono
          />
        )}
        <DataField label="Miner" value={block.miner} mono copyable link={`/account/${block.miner}`} />
        {block.size && <DataField label="Size" value={`${Number(block.size).toLocaleString()} bytes`} />}
      </motion.div>

      {/* Transactions */}
      {block.transactionCount > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: "var(--space-lg)",
            }}
          >
            Transactions
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            {txData?.transactions.map((tx, i) => (
              <TransactionCard key={tx.hash} transaction={tx} index={i} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
