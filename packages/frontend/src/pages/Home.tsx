import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { getBlocks } from "@/services/api";
import { useNetwork } from "@/hooks/useNetwork";
import BlockCard from "@/components/BlockCard";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";

export default function Home() {
  const { network, chain } = useNetwork();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["blocks", network, 10],
    queryFn: () => getBlocks(10, network),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  if (isLoading) return <LoadingState message="Fetching latest blocks..." />;
  if (isError) return <ErrorState message="Failed to load blocks from the network." />;

  return (
    <div className="container">
      {/* Hero Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "var(--space-lg)",
          marginBottom: "var(--space-2xl)",
        }}
      >
        <StatCard
          label="Latest Block"
          value={`#${Number(data?.latestBlock || 0).toLocaleString()}`}
          accent
        />
        <StatCard label="Network" value={chain.name} />
        <StatCard label="Chain ID" value={chain.id.toString()} />
        <StatCard label="Symbol" value={chain.nativeCurrency.symbol} />
      </motion.div>

      {/* Latest Blocks */}
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
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                width: 8,
                height: 8,
                background: "var(--flow-green)",
                borderRadius: "50%",
                display: "inline-block",
              }}
            />
            Latest Blocks
          </h2>
          <Link
            to="/blocks"
            style={{
              color: "var(--text-accent)",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            View All →
          </Link>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          {data?.blocks.map((block, i) => (
            <BlockCard key={block.hash} block={block} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      style={{
        background: accent
          ? "linear-gradient(135deg, var(--flow-green) 0%, var(--flow-green-dark) 100%)"
          : "var(--bg-card)",
        border: accent ? "none" : "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-lg)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: accent ? "rgba(255,255,255,0.8)" : "var(--text-muted)",
          marginBottom: "var(--space-xs)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          fontFamily: "var(--font-mono)",
          color: accent ? "white" : "var(--text-primary)",
        }}
      >
        {value}
      </div>
    </motion.div>
  );
}
