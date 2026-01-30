import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Tag } from "antd";
import type { Transaction } from "@/services/api";

interface TransactionCardProps {
  transaction: Transaction;
  index?: number;
}

function shortenHash(hash: string, chars = 8): string {
  return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function TransactionCard({ transaction, index = 0 }: TransactionCardProps) {
  const isContractCreation = !transaction.to;
  const hasValue = transaction.value !== "0";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
    >
      <Link
        to={`/tx/${transaction.hash}`}
        style={{
          display: "block",
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-md) var(--space-lg)",
          textDecoration: "none",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--flow-green)";
          e.currentTarget.style.background = "var(--bg-card-hover)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border-subtle)";
          e.currentTarget.style.background = "var(--bg-card)";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-lg)" }}>
          {/* Status Indicator */}
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background:
                transaction.status === 1
                  ? "var(--status-success)"
                  : transaction.status === 0
                  ? "var(--status-error)"
                  : "var(--status-pending)",
              flexShrink: 0,
            }}
          />

          {/* Hash */}
          <div style={{ width: 180, flexShrink: 0 }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--text-accent)",
              }}
            >
              {shortenHash(transaction.hash)}
            </span>
          </div>

          {/* From -> To */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--text-secondary)",
              }}
            >
              {shortenAddress(transaction.from)}
            </span>
            <span style={{ color: "var(--text-muted)" }}>→</span>
            {isContractCreation ? (
              <Tag color="purple" style={{ margin: 0 }}>
                Contract Creation
              </Tag>
            ) : (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                }}
              >
                {shortenAddress(transaction.to!)}
              </span>
            )}
          </div>

          {/* Value */}
          {hasValue && (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--text-primary)",
                textAlign: "right",
                minWidth: 120,
              }}
            >
              {parseFloat(transaction.valueFormatted).toFixed(4)} FLOW
            </div>
          )}

          {/* Arrow */}
          <div style={{ color: "var(--text-muted)", fontSize: 16 }}>→</div>
        </div>
      </Link>
    </motion.div>
  );
}
