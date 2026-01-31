"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BlockCard from "./BlockCard";
import { networkPath } from "@/lib/links";
import type { NetworkId } from "@/lib/chains";

interface Block {
  number: string;
  hash: string;
  timestampDate: string | null;
  transactionCount: number;
  gasUsed: string;
}

interface BlocksData {
  blocks: Block[];
  latestBlock: string;
}

interface LatestBlocksProps {
  initialData: BlocksData;
  network?: NetworkId;
}

export default function LatestBlocks({ initialData, network = "mainnet" }: LatestBlocksProps) {
  const [data, setData] = useState<BlocksData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        setIsRefreshing(true);
        const res = await fetch(`/api/blocks?limit=10&network=${network}`);
        if (res.ok) {
          const newData = await res.json();
          setData(newData);
        }
      } catch (error) {
        console.error("Failed to fetch blocks:", error);
      } finally {
        setIsRefreshing(false);
      }
    };

    // Poll every 5 seconds
    const interval = setInterval(fetchBlocks, 5000);

    return () => clearInterval(interval);
  }, [network]);

  return (
    <div style={{ marginBottom: "var(--space-2xl)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-lg)",
        }}
      >
        <h2
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: "var(--text-primary)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-sm)",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              background: isRefreshing ? "var(--status-pending)" : "var(--flow-green)",
              borderRadius: "50%",
              animation: "pulse 2s infinite",
            }}
          />
          Latest Blocks
          <span className="mono" style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 400 }}>
            #{Number(data.latestBlock).toLocaleString()}
          </span>
        </h2>
        <Link href={networkPath("/blocks", network)} style={{ color: "var(--text-accent)", fontSize: 14, fontWeight: 500 }}>
          View All →
        </Link>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        {data.blocks.map((block) => (
          <BlockCard key={block.hash} block={block} network={network} />
        ))}
      </div>
    </div>
  );
}
