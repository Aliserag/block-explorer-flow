"use client";

import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { networkPath } from "@/lib/links";
import type { NetworkId } from "@/lib/chains";

dayjs.extend(relativeTime);

interface Block {
  number: string;
  hash: string;
  timestampDate: string | null;
  transactionCount: number;
  gasUsed: string;
}

interface BlockCardProps {
  block: Block;
  network?: NetworkId;
}

export default function BlockCard({ block, network = "mainnet" }: BlockCardProps) {
  const timeAgo = block.timestampDate ? dayjs(block.timestampDate).fromNow() : "-";
  const accentColor = network === "testnet" ? "#F59E0B" : "var(--flow-green)";

  return (
    <Link
      href={networkPath(`/block/${block.number}`, network)}
      style={{
        display: "block",
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-lg)",
        transition: "all 0.2s ease",
      }}
      className="block-card"
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-lg)" }}>
        <div
          style={{
            width: 48,
            height: 48,
            background: network === "testnet"
              ? "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
              : "linear-gradient(135deg, var(--flow-green) 0%, var(--flow-green-dark) 100%)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" />
            <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" />
            <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" />
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: 4 }}>
            <span className="mono" style={{ fontWeight: 600, fontSize: 16, color: "var(--text-primary)" }}>
              #{block.number}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{timeAgo}</span>
          </div>

          <div
            className="truncate mono"
            style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: "var(--space-sm)" }}
          >
            {block.hash}
          </div>

          <div style={{ display: "flex", gap: "var(--space-lg)" }}>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Txns: </span>
              <span className="mono" style={{ color: "var(--text-accent)", fontWeight: 500 }}>
                {block.transactionCount}
              </span>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Gas: </span>
              <span className="mono" style={{ color: "var(--text-secondary)" }}>
                {Number(block.gasUsed).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div style={{ color: "var(--text-muted)", fontSize: 20 }}>&#8594;</div>
      </div>
    </Link>
  );
}
