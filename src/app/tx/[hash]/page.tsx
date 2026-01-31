import { notFound } from "next/navigation";
import { Tabs } from "antd";
import TransactionOverview from "@/components/TransactionOverview";
import LogsSection from "@/components/LogsSection";
import { type Hex } from "viem";
import { getTransaction, getTransactionReceipt } from "@/lib/rpc";

export const revalidate = 60;

export default async function TransactionPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;

  const [tx, receipt] = await Promise.all([
    getTransaction(hash as Hex),
    getTransactionReceipt(hash as Hex),
  ]);

  if (!tx) notFound();

  const items = [
    {
      key: "overview",
      label: "Overview",
      children: <TransactionOverview tx={tx} receipt={receipt} />,
    },
    {
      key: "logs",
      label: `Logs${receipt?.logs ? ` (${receipt.logs.length})` : ""}`,
      children: receipt?.logs ? <LogsSection logs={receipt.logs} /> : (
        <div style={{ padding: "var(--space-lg)", color: "var(--text-muted)" }}>
          No logs available
        </div>
      ),
    },
  ];

  return (
    <div className="container">
      <Tabs defaultActiveKey="overview" items={items} />
    </div>
  );
}
