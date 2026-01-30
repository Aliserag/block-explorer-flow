import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { Block } from "@/services/api";

dayjs.extend(relativeTime);

interface BlockCardProps {
  block: Block;
  index?: number;
}

export default function BlockCard({ block, index = 0 }: BlockCardProps) {
  const timeAgo = block.timestampDate ? dayjs(block.timestampDate).fromNow() : "—";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link
        to={`/block/${block.number}`}
        style={{
          display: "block",
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-lg)",
          textDecoration: "none",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--flow-green)";
          e.currentTarget.style.transform = "translateX(4px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border-subtle)";
          e.currentTarget.style.transform = "translateX(0)";
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-lg)" }}>
          {/* Block Icon */}
          <div
            style={{
              width: 48,
              height: 48,
              background: "linear-gradient(135deg, var(--flow-green) 0%, var(--flow-green-dark) 100%)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Block Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: 4 }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  fontSize: 16,
                  color: "var(--text-primary)",
                }}
              >
                #{block.number}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                {timeAgo}
              </span>
            </div>

            <div
              className="truncate"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: "var(--space-sm)",
              }}
            >
              {block.hash}
            </div>

            <div style={{ display: "flex", gap: "var(--space-lg)", flexWrap: "wrap" }}>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Txns: </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-accent)",
                    fontWeight: 500,
                  }}
                >
                  {block.transactionCount}
                </span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Gas Used: </span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                  {Number(block.gasUsed).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div style={{ color: "var(--text-muted)", fontSize: 20 }}>→</div>
        </div>
      </Link>
    </motion.div>
  );
}
