import { getBlocks, getLatestBlockNumber, formatBlock } from "@/lib/rpc";
import BlockCard from "@/components/BlockCard";
import Pagination from "@/components/Pagination";
import Breadcrumb from "@/components/Breadcrumb";

export const revalidate = 10;

interface BlocksPageProps {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}

export default async function BlocksPage({ searchParams }: BlocksPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1"));
  const pageSize = Math.min(Math.max(1, parseInt(params.pageSize || "25")), 100);

  const latestBlockNumber = await getLatestBlockNumber();
  const totalBlocks = Number(latestBlockNumber) + 1;
  const totalPages = Math.ceil(totalBlocks / pageSize);

  // Calculate which blocks to fetch
  const startBlock = latestBlockNumber - BigInt((page - 1) * pageSize);
  const blocks = await getBlocks(startBlock, pageSize);
  const formattedBlocks = blocks.map(formatBlock);

  // Calculate display range
  const toBlock = Number(startBlock);
  const fromBlock = Math.max(0, toBlock - formattedBlocks.length + 1);

  return (
    <div className="container">
      <Breadcrumb items={[{ label: "Blocks" }]} />

      <div style={{ marginBottom: "var(--space-xl)" }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "var(--space-xs)",
          }}
        >
          Blocks
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Showing blocks #{fromBlock.toLocaleString()} to #{toBlock.toLocaleString()} of{" "}
          {totalBlocks.toLocaleString()} total (Latest: #{latestBlockNumber.toLocaleString()})
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        {formattedBlocks.map((block) => (
          <BlockCard key={block.hash} block={block} />
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          baseUrl="/blocks"
          pageSize={pageSize}
        />
      )}
    </div>
  );
}
