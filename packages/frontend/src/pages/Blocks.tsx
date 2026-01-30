import { useQuery } from "@tanstack/react-query";
import { Pagination } from "antd";
import { useState } from "react";
import { getBlocks } from "@/services/api";
import { useNetwork } from "@/hooks/useNetwork";
import BlockCard from "@/components/BlockCard";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";

const BLOCKS_PER_PAGE = 20;

export default function Blocks() {
  const { network } = useNetwork();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["blocks", network, BLOCKS_PER_PAGE],
    queryFn: () => getBlocks(BLOCKS_PER_PAGE, network),
    refetchInterval: 10000,
  });

  if (isLoading) return <LoadingState message="Loading blocks..." />;
  if (isError) return <ErrorState message="Failed to load blocks." />;

  const latestBlockNum = Number(data?.latestBlock || 0);

  return (
    <div className="container">
      {/* Header */}
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
          Latest block: #{latestBlockNum.toLocaleString()}
        </p>
      </div>

      {/* Blocks List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        {data?.blocks.map((block, i) => (
          <BlockCard key={block.hash} block={block} index={i} />
        ))}
      </div>

      {/* Pagination */}
      <div
        style={{
          marginTop: "var(--space-xl)",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Pagination
          current={page}
          total={latestBlockNum}
          pageSize={BLOCKS_PER_PAGE}
          onChange={setPage}
          showSizeChanger={false}
          showQuickJumper
        />
      </div>
    </div>
  );
}
