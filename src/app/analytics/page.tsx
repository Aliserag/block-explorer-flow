"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Spin, Segmented, Tooltip } from "antd";
import Link from "next/link";
import {
  LoadingOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  SwapOutlined,
  FireOutlined,
  BlockOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
  RiseOutlined,
  DatabaseOutlined,
  CodeOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type TimeRange = "live" | "1h" | "24h" | "7d" | "30d";

interface ChartDataPoint {
  period: string;
  transactionCount: number;
  blockCount: number;
  contractsDeployed: number;
  tokenTransferCount: number;
  totalGasUsed: string;
  avgGasPrice: string;
}

interface RecentContract {
  address: string;
  deployer: string;
  txHash: string;
  blockNumber: string;
  timestamp: string;
}

interface IndexedAnalytics {
  available: boolean;
  synced: boolean;
  latestIndexedBlock: string | null;
  range: string;
  stats: {
    totalTransactions: number;
    totalBlocks: number;
    totalContractsDeployed: number;
    totalTokenTransfers: number;
    avgTxPerBlock: number;
    avgGasPrice: string;
  };
  timeSeries: ChartDataPoint[];
  recentContracts: RecentContract[];
}

interface LiveStats {
  latestBlock: string;
  blocksPerMinute: number;
  avgTxPerBlock: number;
  avgGasPerBlock: number;
  tps: number;
  totalTransactions: number;
  totalContracts: number;
  totalTokenTransfers: number;
  txHistory: { time: string; transactions: number }[];
  gasHistory: { time: string; gas: number }[];
  contractsHistory: { time: string; contracts: number }[];
  recentContracts: RecentContract[];
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<TimeRange>("live");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [dataSource, setDataSource] = useState<"indexed" | "rpc">("rpc");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      // Try indexed data first for non-live ranges
      if (range !== "live") {
        try {
          const indexedResponse = await fetch(`/api/analytics/indexed?range=${range}`);
          if (indexedResponse.ok) {
            const indexedData: IndexedAnalytics = await indexedResponse.json();
            if (indexedData.available && indexedData.timeSeries.length > 0) {
              // Transform indexed data to our format
              const txHistory = indexedData.timeSeries.map((p) => ({
                time: p.period.split("-").slice(-1)[0] || p.period,
                transactions: p.transactionCount,
              }));

              const gasHistory = indexedData.timeSeries.map((p) => ({
                time: p.period.split("-").slice(-1)[0] || p.period,
                gas: Number(p.totalGasUsed) / 1e6,
              }));

              const contractsHistory = indexedData.timeSeries.map((p) => ({
                time: p.period.split("-").slice(-1)[0] || p.period,
                contracts: p.contractsDeployed,
              }));

              setStats({
                latestBlock: indexedData.latestIndexedBlock || "0",
                blocksPerMinute: 0,
                avgTxPerBlock: indexedData.stats.avgTxPerBlock,
                avgGasPerBlock: 0,
                tps: 0,
                totalTransactions: indexedData.stats.totalTransactions,
                totalContracts: indexedData.stats.totalContractsDeployed,
                totalTokenTransfers: indexedData.stats.totalTokenTransfers,
                txHistory,
                gasHistory,
                contractsHistory,
                recentContracts: indexedData.recentContracts,
              });

              setDataSource("indexed");
              setLastUpdated(new Date());
              setError(null);
              setLoading(false);
              return;
            }
          }
        } catch {
          // Indexed not available, fall through to RPC
        }
      }

      // Fall back to RPC-based analytics
      const response = await fetch(`/api/analytics?range=${range === "live" ? "1h" : range}`);
      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();

      const txHistory = (data.charts?.transactions || []).map((p: { time: string; value: number }) => ({
        time: p.time,
        transactions: p.value,
      }));

      const gasHistory = (data.charts?.gasUsage || []).map((p: { time: string; value: number }) => ({
        time: p.time,
        gas: p.value,
      }));

      setStats({
        latestBlock: data.stats.latestBlock,
        blocksPerMinute: data.stats.totalBlocks > 0 ? (data.stats.totalBlocks / (data.meta.actualTimeSpan / 60)) : 0,
        avgTxPerBlock: parseFloat(data.stats.avgTxPerBlock) || 0,
        avgGasPerBlock: parseInt(data.stats.avgGasUsed) || 0,
        tps: parseFloat(data.stats.tps) || 0,
        totalTransactions: data.stats.totalTransactions || 0,
        totalContracts: 0,
        totalTokenTransfers: 0,
        txHistory,
        gasHistory,
        contractsHistory: [],
        recentContracts: [],
      });

      setDataSource("rpc");
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    setLoading(true);
    fetchStats();

    if (isLive && range === "live") {
      intervalRef.current = setInterval(fetchStats, 5000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchStats, isLive, range]);

  const handleRangeChange = (value: string | number) => {
    setRange(value as TimeRange);
  };

  if (loading && !stats) {
    return (
      <div className="container">
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 32, color: "var(--flow-green)" }} />} />
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="container">
        <ErrorCard error={error} onRetry={fetchStats} />
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <header style={{ marginBottom: "var(--space-xl)" }}>
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "var(--space-lg)",
        }}>
          <div>
            <h1 style={{
              fontSize: 28,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: "var(--space-xs)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-sm)",
            }}>
              Network Analytics
              {isLive && range === "live" && (
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(0, 239, 139, 0.15)",
                  border: "1px solid rgba(0, 239, 139, 0.3)",
                  borderRadius: 20,
                  padding: "4px 12px",
                  fontSize: 12,
                  color: "var(--flow-green)",
                }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--flow-green)",
                    animation: "pulse 2s infinite",
                  }} />
                  LIVE
                </span>
              )}
              {dataSource === "indexed" && (
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(138, 43, 226, 0.15)",
                  border: "1px solid rgba(138, 43, 226, 0.3)",
                  borderRadius: 20,
                  padding: "4px 12px",
                  fontSize: 12,
                  color: "#8a2be2",
                }}>
                  <DatabaseOutlined />
                  Indexed
                </span>
              )}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <ClockCircleOutlined />
              {range === "live" ? "Real-time metrics" : range === "1h" ? "Last hour" : range === "24h" ? "Last 24 hours" : range === "7d" ? "Last 7 days" : "Last 30 days"}
              {lastUpdated && (
                <span>• Updated {lastUpdated.toLocaleTimeString()}</span>
              )}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
            <Segmented
              value={range}
              onChange={handleRangeChange}
              options={[
                { label: "Live", value: "live" },
                { label: "1H", value: "1h" },
                { label: "24H", value: "24h" },
                { label: "7D", value: "7d" },
                { label: "30D", value: "30d" },
              ]}
              style={{ background: "var(--bg-tertiary)" }}
            />
            <Tooltip title={isLive ? "Pause updates" : "Resume updates"}>
              <button
                onClick={() => setIsLive(!isLive)}
                style={{
                  background: isLive ? "rgba(0, 239, 139, 0.15)" : "var(--bg-tertiary)",
                  border: isLive ? "1px solid rgba(0, 239, 139, 0.3)" : "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "8px 12px",
                  cursor: "pointer",
                  color: isLive ? "var(--flow-green)" : "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  transition: "all 0.2s",
                }}
              >
                {isLive ? <LoadingOutlined /> : <ReloadOutlined />}
              </button>
            </Tooltip>
          </div>
        </div>
      </header>

      {/* Key Metrics */}
      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "var(--space-md)",
        }}>
          <MetricCard
            icon={<BlockOutlined />}
            label="Latest Block"
            value={`#${Number(stats?.latestBlock || 0).toLocaleString()}`}
            accent
            mono
          />
          <MetricCard
            icon={<SwapOutlined />}
            label="Transactions"
            value={stats?.totalTransactions?.toLocaleString() || "0"}
            subValue={range === "live" ? "in last hour" : `in ${range}`}
          />
          {dataSource === "indexed" && stats?.totalContracts !== undefined && stats.totalContracts > 0 && (
            <MetricCard
              icon={<CodeOutlined />}
              label="Contracts Deployed"
              value={stats.totalContracts.toLocaleString()}
              subValue={`in ${range}`}
            />
          )}
          {dataSource === "indexed" && stats?.totalTokenTransfers !== undefined && stats.totalTokenTransfers > 0 && (
            <MetricCard
              icon={<DollarOutlined />}
              label="Token Transfers"
              value={stats.totalTokenTransfers.toLocaleString()}
              subValue={`in ${range}`}
            />
          )}
          {range === "live" && (
            <>
              <MetricCard
                icon={<ThunderboltOutlined />}
                label="Network TPS"
                value={stats?.tps.toFixed(3) || "0"}
                subValue="tx per second"
              />
              <MetricCard
                icon={<RiseOutlined />}
                label="Blocks/Min"
                value={stats?.blocksPerMinute.toFixed(1) || "0"}
                subValue="block production"
              />
            </>
          )}
          <MetricCard
            icon={<FireOutlined />}
            label="Avg Tx/Block"
            value={stats?.avgTxPerBlock.toFixed(2) || "0"}
            subValue="transactions"
          />
        </div>
      </section>

      {/* Charts */}
      {stats?.txHistory && stats.txHistory.length > 1 ? (
        <>
          {/* Transaction Activity Chart */}
          <section style={{ marginBottom: "var(--space-2xl)" }}>
            <SectionHeader
              title="Transaction Activity"
              subtitle="Transactions over time"
            />
            <ChartCard>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats.txHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="txGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00EF8B" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00EF8B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    width={50}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 8,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    }}
                    labelStyle={{ color: "var(--text-muted)" }}
                    itemStyle={{ color: "var(--flow-green)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="transactions"
                    stroke="#00EF8B"
                    strokeWidth={2}
                    fill="url(#txGradient)"
                    activeDot={{ r: 6, fill: "#00EF8B", stroke: "#000", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </section>

          {/* Gas Usage Chart */}
          <section style={{ marginBottom: "var(--space-2xl)" }}>
            <SectionHeader
              title="Gas Usage"
              subtitle="Network gas consumption (millions)"
            />
            <ChartCard>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.gasHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    width={60}
                    tickFormatter={(v) => `${v.toFixed(1)}M`}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 8,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    }}
                    labelStyle={{ color: "var(--text-muted)" }}
                    formatter={(value) => [`${(value as number).toFixed(2)}M gas`, "Usage"]}
                  />
                  <Bar dataKey="gas" radius={[4, 4, 0, 0]}>
                    {stats.gasHistory.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`rgba(0, 239, 139, ${0.3 + (index / stats.gasHistory.length) * 0.7})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </section>

          {/* Contracts Deployed Chart (only when indexed) */}
          {dataSource === "indexed" && stats.contractsHistory && stats.contractsHistory.length > 0 && (
            <section style={{ marginBottom: "var(--space-2xl)" }}>
              <SectionHeader
                title="Contracts Deployed"
                subtitle="New smart contracts over time"
              />
              <ChartCard>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={stats.contractsHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis
                      dataKey="time"
                      stroke="rgba(255,255,255,0.5)"
                      tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
                      axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.5)"
                      tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
                      axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                      width={50}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: 8,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                      }}
                      labelStyle={{ color: "var(--text-muted)" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="contracts"
                      stroke="#8a2be2"
                      strokeWidth={2}
                      dot={{ fill: "#8a2be2", r: 4 }}
                      activeDot={{ r: 6, fill: "#8a2be2", stroke: "#000", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </section>
          )}
        </>
      ) : (
        <section style={{ marginBottom: "var(--space-2xl)" }}>
          <NoDataCard range={range} dataSource={dataSource} />
        </section>
      )}

      {/* Recent Contracts (only when indexed) */}
      {dataSource === "indexed" && stats?.recentContracts && stats.recentContracts.length > 0 && (
        <section style={{ marginBottom: "var(--space-2xl)" }}>
          <SectionHeader
            title="Recent Contract Deployments"
            subtitle="Latest deployed smart contracts"
          />
          <div style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <th style={{ padding: "var(--space-md)", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Contract
                  </th>
                  <th style={{ padding: "var(--space-md)", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Deployer
                  </th>
                  <th style={{ padding: "var(--space-md)", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Block
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.recentContracts.slice(0, 5).map((contract, index) => (
                  <tr
                    key={contract.address}
                    style={{
                      borderBottom: index < 4 ? "1px solid var(--border-subtle)" : "none",
                      background: index % 2 === 0 ? "transparent" : "var(--bg-secondary)",
                    }}
                  >
                    <td style={{ padding: "var(--space-md)" }}>
                      <Link
                        href={`/account/${contract.address}`}
                        className="mono"
                        style={{ color: "var(--flow-green)", fontSize: 13, textDecoration: "none" }}
                      >
                        {contract.address.slice(0, 10)}...{contract.address.slice(-6)}
                      </Link>
                    </td>
                    <td style={{ padding: "var(--space-md)" }}>
                      <Link
                        href={`/account/${contract.deployer}`}
                        className="mono"
                        style={{ color: "var(--text-accent)", fontSize: 13, textDecoration: "none" }}
                      >
                        {contract.deployer.slice(0, 10)}...{contract.deployer.slice(-6)}
                      </Link>
                    </td>
                    <td style={{ padding: "var(--space-md)" }}>
                      <Link
                        href={`/block/${contract.blockNumber}`}
                        className="mono"
                        style={{ color: "var(--text-secondary)", fontSize: 13, textDecoration: "none" }}
                      >
                        #{Number(contract.blockNumber).toLocaleString()}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Network Info */}
      <section>
        <NetworkInfoCard lastUpdated={lastUpdated} dataSource={dataSource} />
      </section>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// Components

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: "var(--space-lg)" }}>
      <h2 style={{
        fontSize: 16,
        fontWeight: 600,
        color: "var(--text-primary)",
        marginBottom: subtitle ? 4 : 0,
      }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{subtitle}</p>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  subValue,
  accent = false,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  accent?: boolean;
  mono?: boolean;
}) {
  return (
    <div style={{
      background: accent
        ? "linear-gradient(135deg, rgba(0, 239, 139, 0.15) 0%, rgba(0, 201, 114, 0.05) 100%)"
        : "var(--bg-card)",
      border: accent ? "1px solid rgba(0, 239, 139, 0.3)" : "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      padding: "var(--space-lg)",
      transition: "transform 0.2s, box-shadow 0.2s",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        marginBottom: "var(--space-sm)",
        color: accent ? "var(--flow-green)" : "var(--text-muted)",
        fontSize: 13,
      }}>
        {icon}
        <span>{label}</span>
      </div>
      <div style={{
        fontSize: 24,
        fontWeight: 700,
        color: accent ? "var(--flow-green)" : "var(--text-primary)",
        fontFamily: mono ? "var(--font-mono)" : "inherit",
        marginBottom: subValue ? 4 : 0,
      }}>
        {value}
      </div>
      {subValue && (
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {subValue}
        </div>
      )}
    </div>
  );
}

function ChartCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      padding: "var(--space-lg)",
    }}>
      {children}
    </div>
  );
}

function NoDataCard({ range, dataSource }: { range: TimeRange; dataSource: "indexed" | "rpc" }) {
  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      padding: "var(--space-2xl)",
      textAlign: "center",
    }}>
      <DatabaseOutlined style={{ fontSize: 48, color: "var(--text-muted)", marginBottom: "var(--space-lg)" }} />
      <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: "var(--space-sm)" }}>
        Limited Historical Data
      </h3>
      <p style={{ color: "var(--text-muted)", maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>
        {range === "live"
          ? "Collecting live data... Charts will appear as more blocks are processed."
          : dataSource === "rpc"
            ? "Historical charts require more data points. The RPC only provides recent blocks. Start the Ponder indexer for full historical analytics."
            : "The indexer is syncing. Charts will appear once enough data has been indexed."}
      </p>
      <div style={{
        marginTop: "var(--space-lg)",
        padding: "var(--space-md)",
        background: "var(--bg-tertiary)",
        borderRadius: "var(--radius-md)",
        display: "inline-block",
      }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
          <InfoCircleOutlined style={{ marginRight: 8 }} />
          Flow EVM produces ~1 block/second.
          {dataSource === "rpc" && " Run `ponder dev` for full indexed analytics."}
        </p>
      </div>
    </div>
  );
}

function ErrorCard({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--status-error)",
      borderRadius: "var(--radius-lg)",
      padding: "var(--space-xl)",
      textAlign: "center",
    }}>
      <p style={{ color: "var(--status-error)", marginBottom: "var(--space-md)" }}>
        Failed to load analytics data
      </p>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: "var(--space-md)" }}>{error}</p>
      <button
        onClick={onRetry}
        style={{
          background: "var(--flow-green)",
          color: "black",
          border: "none",
          borderRadius: "var(--radius-md)",
          padding: "8px 16px",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Retry
      </button>
    </div>
  );
}

function NetworkInfoCard({ lastUpdated, dataSource }: { lastUpdated: Date | null; dataSource: "indexed" | "rpc" }) {
  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      padding: "var(--space-lg)",
    }}>
      <h3 style={{
        fontSize: 16,
        fontWeight: 600,
        color: "var(--text-primary)",
        marginBottom: "var(--space-md)",
      }}>
        Network Information
      </h3>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "var(--space-md)",
      }}>
        <InfoRow label="Network" value="Flow EVM Mainnet" />
        <InfoRow label="Chain ID" value="747" />
        <InfoRow label="Block Time" value="~1 second" />
        <InfoRow label="RPC" value="mainnet.evm.nodes.onflow.org" />
        <InfoRow
          label="Last Updated"
          value={lastUpdated ? lastUpdated.toLocaleTimeString() : "-"}
        />
        <InfoRow label="Data Source" value={dataSource === "indexed" ? "Ponder Indexer" : "Direct RPC"} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "var(--space-sm) 0",
      borderBottom: "1px solid var(--border-subtle)",
    }}>
      <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{label}</span>
      <span style={{
        color: "var(--text-primary)",
        fontSize: 13,
        fontFamily: "var(--font-mono)",
      }}>
        {value}
      </span>
    </div>
  );
}
