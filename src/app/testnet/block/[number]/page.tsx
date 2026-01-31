import { notFound } from "next/navigation";
import Link from "next/link";
import { Tag } from "antd";
import dayjs from "dayjs";
import { getBlock, getLatestBlockNumber, formatBlock, formatTransaction } from "@/lib/rpc";
import DataField from "@/components/DataField";
import BlockJumpInput from "@/components/BlockJumpInput";
import Breadcrumb from "@/components/Breadcrumb";

export const revalidate = 60;

export default async function TestnetBlockDetailPage({ params }: { params: Promise<{ number: string }> }) {
  const network = "testnet";
  const { number } = await params;
  const blockNum = BigInt(number);
  const [block, latestBlockNumber] = await Promise.all([
    getBlock(blockNum, network, true),
    getLatestBlockNumber(network),
  ]);

  if (!block) notFound();

  const formatted = formatBlock(block);
  const currentBlockNum = Number(formatted.number);
  const latestNum = Number(latestBlockNumber);
  const timestamp = formatted.timestampDate
    ? dayjs(formatted.timestampDate).format("MMM D, YYYY HH:mm:ss")
    : "-";

  return (
    <div className="container">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Testnet", href: "/testnet" },
          { label: "Blocks", href: "/testnet/blocks" },
          { label: `Block #${currentBlockNum.toLocaleString()}` },
        ]}
      />

      {/* Block Jump Input */}
      <BlockJumpInput currentBlock={currentBlockNum} latestBlock={latestNum} baseUrl="/testnet/block" />

      {/* Header */}
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-md)",
            marginBottom: "var(--space-sm)",
          }}
        >
          <h1
            className="mono"
            style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}
          >
            Block #{currentBlockNum.toLocaleString()}
          </h1>
          <Tag color="orange">{formatted.transactionCount} Transactions</Tag>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{timestamp}</p>
      </div>

      {/* Navigation */}
      <div
        style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-lg)" }}
      >
        <Link
          href={`/testnet/block/${currentBlockNum - 1}`}
          style={{ color: currentBlockNum > 0 ? "var(--text-accent)" : "var(--text-muted)" }}
        >
          &#8592; Block #{(currentBlockNum - 1).toLocaleString()}
        </Link>
        <Link
          href={`/testnet/block/${currentBlockNum + 1}`}
          style={{
            color: currentBlockNum < latestNum ? "var(--text-accent)" : "var(--text-muted)",
          }}
        >
          Block #{(currentBlockNum + 1).toLocaleString()} &#8594;
        </Link>
      </div>

      {/* Details */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-lg)",
          marginBottom: "var(--space-xl)",
        }}
      >
        <DataField label="Block Hash" value={formatted.hash} mono copyable />
        <DataField label="Parent Hash" value={formatted.parentHash} mono copyable />
        <DataField label="Timestamp" value={timestamp} />
        <DataField label="Transaction Count" value={formatted.transactionCount} />
        <DataField label="Gas Used" value={Number(formatted.gasUsed).toLocaleString()} mono />
        <DataField label="Gas Limit" value={Number(formatted.gasLimit).toLocaleString()} mono />
        {formatted.baseFeePerGas && (
          <DataField label="Base Fee" value={`${formatted.baseFeePerGas} wei`} mono />
        )}
        <DataField
          label="Miner"
          value={formatted.miner}
          mono
          copyable
          href={`/testnet/account/${formatted.miner}`}
        />
        {formatted.size && (
          <DataField label="Size" value={`${Number(formatted.size).toLocaleString()} bytes`} />
        )}
      </div>

      {/* Transactions */}
      {block.transactions.length > 0 && (
        <div>
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
            {block.transactions.map((tx) => {
              const txData = typeof tx === "string" ? null : formatTransaction(tx);
              const hash = typeof tx === "string" ? tx : tx.hash;
              return (
                <Link
                  key={hash}
                  href={`/testnet/tx/${hash}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-md)",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    padding: "var(--space-md)",
                  }}
                >
                  <span className="mono" style={{ color: "#F59E0B", fontSize: 13 }}>
                    {hash.slice(0, 18)}...{hash.slice(-8)}
                  </span>
                  {txData && (
                    <>
                      <span style={{ color: "var(--text-muted)" }}>&#8594;</span>
                      <span className="mono" style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                        {txData.to ? `${txData.to.slice(0, 10)}...` : "Contract Creation"}
                      </span>
                      {txData.valueFormatted !== "0" && (
                        <span
                          className="mono"
                          style={{ marginLeft: "auto", color: "var(--text-primary)" }}
                        >
                          {parseFloat(txData.valueFormatted).toFixed(4)} FLOW
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
