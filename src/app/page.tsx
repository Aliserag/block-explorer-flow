import { getBlocks, getLatestBlockNumber, formatBlock } from "@/lib/rpc";
import LatestBlocks from "@/components/LatestBlocks";

export const revalidate = 5;

export default async function HomePage() {
  const latestBlockNumber = await getLatestBlockNumber();
  const blocks = await getBlocks(latestBlockNumber, 10);
  const formattedBlocks = blocks.map(formatBlock);

  const initialData = {
    blocks: formattedBlocks,
    latestBlock: latestBlockNumber.toString(),
  };

  return (
    <div className="container">
      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "var(--space-lg)",
          marginBottom: "var(--space-2xl)",
        }}
      >
        <StatCard label="Latest Block" value={`#${latestBlockNumber.toLocaleString()}`} accent />
        <StatCard label="Network" value="Flow EVM" />
        <StatCard label="Chain ID" value="747" />
        <StatCard label="Symbol" value="FLOW" />
      </div>

      {/* Latest Blocks with auto-refresh */}
      <LatestBlocks initialData={initialData} />
    </div>
  );
}

function StatCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
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
        className="mono"
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: accent ? "rgba(255,255,255,0.8)" : "var(--text-muted)",
          marginBottom: "var(--space-xs)",
        }}
      >
        {label}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: accent ? "white" : "var(--text-primary)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
