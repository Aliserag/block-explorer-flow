import { getBlocks, getLatestBlockNumber, formatBlock } from "@/lib/rpc";
import BlockCard from "@/components/BlockCard";

export const revalidate = 10;

export default async function BlocksPage() {
  const latestBlockNumber = await getLatestBlockNumber();
  const blocks = await getBlocks(latestBlockNumber, 25);
  const formattedBlocks = blocks.map(formatBlock);

  return (
    <div className="container">
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", marginBottom: "var(--space-xs)" }}>
          Blocks
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Latest block: #{latestBlockNumber.toLocaleString()}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        {formattedBlocks.map((block) => (
          <BlockCard key={block.hash} block={block} />
        ))}
      </div>
    </div>
  );
}
