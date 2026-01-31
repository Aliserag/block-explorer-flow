import Link from "next/link";
import { getBlocks, getLatestBlockNumber, formatBlock } from "@/lib/rpc";
import { getRecentTransactions, isPonderAvailable } from "@/lib/ponder";
import { formatDistanceToNow } from "date-fns";

export const revalidate = 5;

export default async function HomePage() {
  const [latestBlockNumber, ponderAvailable] = await Promise.all([
    getLatestBlockNumber(),
    isPonderAvailable(),
  ]);

  const blocks = await getBlocks(latestBlockNumber, 6);
  const formattedBlocks = blocks.map(formatBlock);

  // Get recent transactions if Ponder is available
  let recentTxs: Array<{
    hash: string;
    from: string;
    to: string | null;
    value: string;
    timestamp: string;
  }> = [];

  if (ponderAvailable) {
    recentTxs = await getRecentTransactions(6);
  }

  // Calculate stats from blocks
  const totalTxInBlocks = formattedBlocks.reduce((sum, b) => sum + b.transactionCount, 0);
  const totalGasUsed = formattedBlocks.reduce((sum, b) => sum + BigInt(b.gasUsed), BigInt(0));
  const avgGasPerBlock = formattedBlocks.length > 0
    ? Number(totalGasUsed / BigInt(formattedBlocks.length)) / 1e6
    : 0;

  return (
    <div className="container">
      {/* Hero Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "var(--space-md)",
          marginBottom: "var(--space-xl)",
        }}
        className="stats-grid"
      >
        <StatCard
          label="Latest Block"
          value={`#${latestBlockNumber.toLocaleString()}`}
          accent
        />
        <StatCard
          label="TX (Last 6 Blocks)"
          value={totalTxInBlocks.toString()}
        />
        <StatCard
          label="Avg Gas/Block"
          value={`${avgGasPerBlock.toFixed(1)}M`}
        />
        <StatCard
          label="Network"
          value="Flow EVM"
          sub="Chain ID: 747"
        />
      </div>

      {/* Two Column Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--space-xl)",
        }}
        className="two-col-grid"
      >
        {/* Recent Blocks */}
        <section>
          <SectionHeader title="Latest Blocks" href="/blocks" />
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {formattedBlocks.map((block) => (
              <BlockRow key={block.hash} block={block} />
            ))}
          </div>
        </section>

        {/* Recent Transactions */}
        <section>
          <SectionHeader title="Latest Transactions" href="/blocks" />
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {recentTxs.length > 0 ? (
              recentTxs.map((tx) => <TxRow key={tx.hash} tx={tx} />)
            ) : (
              <div
                style={{
                  padding: "var(--space-xl)",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  background: "var(--bg-card)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 15,
                }}
              >
                Transaction history is being indexed...
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Historical data notice */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: "var(--space-xl)",
          padding: "var(--space-md) var(--space-lg)",
          background: "rgba(0, 239, 139, 0.03)",
          border: "1px solid rgba(0, 239, 139, 0.1)",
          borderRadius: 6,
          fontSize: 14,
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--flow-green)",
            opacity: 0.6,
            flexShrink: 0,
          }}
        />
        <span>Historical data coverage is expanding daily.</span>
      </div>

      <style>{`
        .row-hover:hover {
          background: var(--bg-card-hover) !important;
        }
        @media (max-width: 900px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .two-col-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 500px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: accent
          ? "linear-gradient(135deg, rgba(0, 239, 139, 0.15) 0%, rgba(0, 239, 139, 0.05) 100%)"
          : "var(--bg-card)",
        border: accent
          ? "1px solid rgba(0, 239, 139, 0.3)"
          : "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-md) var(--space-lg)",
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 13,
          color: accent ? "var(--flow-green)" : "var(--text-muted)",
          letterSpacing: "0.08em",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: accent ? "var(--flow-green)" : "var(--text-primary)",
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="mono"
          style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "var(--space-md)",
      }}
    >
      <h2
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        {title}
      </h2>
      <Link
        href={href}
        style={{
          fontSize: 14,
          color: "var(--text-muted)",
          textDecoration: "none",
        }}
      >
        View All →
      </Link>
    </div>
  );
}

function BlockRow({
  block,
}: {
  block: {
    number: string;
    hash: string;
    timestampDate: string | null;
    transactionCount: number;
    miner: string;
  };
}) {
  const timeAgo = block.timestampDate
    ? formatDistanceToNow(new Date(block.timestampDate), { addSuffix: true })
    : "";

  return (
    <Link
      href={`/block/${block.number}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--space-sm) var(--space-md)",
        background: "var(--bg-card)",
        borderBottom: "1px solid var(--border-subtle)",
        textDecoration: "none",
        transition: "background 0.15s",
      }}
      className="row-hover"
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 6,
            background: "var(--bg-tertiary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            color: "var(--text-muted)",
          }}
        >
          Bk
        </div>
        <div>
          <div className="mono" style={{ fontSize: 15, color: "var(--flow-green)", fontWeight: 500 }}>
            {Number(block.number).toLocaleString()}
          </div>
          <div className="mono" style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {timeAgo}
          </div>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          {block.transactionCount} txns
        </div>
        <div className="mono" style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {block.miner.slice(0, 8)}...
        </div>
      </div>
    </Link>
  );
}

function TxRow({
  tx,
}: {
  tx: {
    hash: string;
    from: string;
    to: string | null;
    value: string;
    timestamp: string;
  };
}) {
  // Timestamp might be Unix seconds or ISO string
  const date = tx.timestamp.includes("T")
    ? new Date(tx.timestamp)
    : new Date(Number(tx.timestamp) * 1000);
  const timeAgo = formatDistanceToNow(date, { addSuffix: true });
  const valueInFlow = (Number(tx.value) / 1e18).toFixed(4);

  return (
    <Link
      href={`/tx/${tx.hash}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--space-sm) var(--space-md)",
        background: "var(--bg-card)",
        borderBottom: "1px solid var(--border-subtle)",
        textDecoration: "none",
        transition: "background 0.15s",
      }}
      className="row-hover"
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 6,
            background: "var(--bg-tertiary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            color: "var(--text-muted)",
          }}
        >
          Tx
        </div>
        <div>
          <div className="mono" style={{ fontSize: 15, color: "var(--flow-green)", fontWeight: 500 }}>
            {tx.hash.slice(0, 14)}...
          </div>
          <div className="mono" style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {timeAgo}
          </div>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="mono" style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          {valueInFlow} FLOW
        </div>
        <div className="mono" style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {tx.from.slice(0, 8)}... → {tx.to ? `${tx.to.slice(0, 8)}...` : "Contract"}
        </div>
      </div>
    </Link>
  );
}
