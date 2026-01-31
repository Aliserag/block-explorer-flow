"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Tooltip } from "antd";
import Link from "next/link";
import {
  ReloadOutlined,
  SwapOutlined,
  FireOutlined,
  BlockOutlined,
  ThunderboltOutlined,
  CodeOutlined,
  DollarOutlined,
  PauseOutlined,
  CaretRightOutlined,
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
  ReferenceLine,
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

interface HistoryPoint {
  time: string;
  fullDate: string;
  timestamp: number;
  transactions?: number;
  gas?: number;
  contracts?: number;
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
  txHistory: HistoryPoint[];
  gasHistory: HistoryPoint[];
  contractsHistory: HistoryPoint[];
  recentContracts: RecentContract[];
}

// Parse period string and return date info
function parsePeriod(period: string): { date: Date; shortLabel: string; fullLabel: string } {
  const parts = period.split("-");
  let date: Date;
  let shortLabel: string;
  let fullLabel: string;

  if (parts.length === 4) {
    // Hourly format: "2026-01-30-19"
    const [year, month, day, hour] = parts;
    date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour));
    shortLabel = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    fullLabel = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  } else if (parts.length === 3) {
    // Daily format: "2026-01-30"
    const [year, month, day] = parts;
    date = new Date(Number(year), Number(month) - 1, Number(day));
    shortLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    fullLabel = date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  } else {
    date = new Date();
    shortLabel = period;
    fullLabel = period;
  }

  return { date, shortLabel, fullLabel };
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<TimeRange>("24h");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [hasDetailedData, setHasDetailedData] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      if (range !== "live") {
        try {
          const response = await fetch(`/api/analytics/indexed?range=${range}`);
          if (response.ok) {
            const data: IndexedAnalytics = await response.json();
            if (data.available && data.timeSeries.length > 0) {
              const txHistory = data.timeSeries.map((p) => {
                const { shortLabel, fullLabel, date } = parsePeriod(p.period);
                return {
                  time: shortLabel,
                  fullDate: fullLabel,
                  timestamp: date.getTime(),
                  transactions: p.transactionCount,
                };
              });

              const gasHistory = data.timeSeries.map((p) => {
                const { shortLabel, fullLabel, date } = parsePeriod(p.period);
                return {
                  time: shortLabel,
                  fullDate: fullLabel,
                  timestamp: date.getTime(),
                  gas: Number(p.totalGasUsed) / 1e6,
                };
              });

              const contractsHistory = data.timeSeries.map((p) => {
                const { shortLabel, fullLabel, date } = parsePeriod(p.period);
                return {
                  time: shortLabel,
                  fullDate: fullLabel,
                  timestamp: date.getTime(),
                  contracts: p.contractsDeployed,
                };
              });

              setStats({
                latestBlock: data.latestIndexedBlock || "0",
                blocksPerMinute: 0,
                avgTxPerBlock: data.stats.avgTxPerBlock,
                avgGasPerBlock: 0,
                tps: 0,
                totalTransactions: data.stats.totalTransactions,
                totalContracts: data.stats.totalContractsDeployed,
                totalTokenTransfers: data.stats.totalTokenTransfers,
                txHistory,
                gasHistory,
                contractsHistory,
                recentContracts: data.recentContracts,
              });

              setHasDetailedData(true);
              setLastUpdated(new Date());
              setError(null);
              setLoading(false);
              return;
            }
          }
        } catch {
          // Fall through to RPC
        }
      }

      const response = await fetch(`/api/analytics?range=${range === "live" ? "1h" : range}`);
      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();

      const txHistory = (data.charts?.transactions || []).map((p: { time: string; value: number; timestamp: number }) => ({
        time: p.time,
        fullDate: new Date(p.timestamp * 1000).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        timestamp: p.timestamp * 1000,
        transactions: p.value,
      }));

      const gasHistory = (data.charts?.gasUsage || []).map((p: { time: string; value: number; timestamp: number }) => ({
        time: p.time,
        fullDate: new Date(p.timestamp * 1000).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        timestamp: p.timestamp * 1000,
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

      setHasDetailedData(false);
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

  if (loading && !stats) {
    return (
      <div className="analytics-page">
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
          <div style={{ textAlign: "center" }}>
            <div className="loading-cube" />
            <p style={{ marginTop: 24, color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
              LOADING NETWORK DATA...
            </p>
          </div>
        </div>
        <style jsx>{`
          .loading-cube {
            width: 40px;
            height: 40px;
            margin: 0 auto;
            border: 2px solid var(--flow-green);
            animation: cubeRotate 1.5s ease-in-out infinite;
          }
          @keyframes cubeRotate {
            0%, 100% { transform: rotate(0deg) scale(1); border-radius: 0; }
            25% { transform: rotate(90deg) scale(0.8); border-radius: 8px; }
            50% { transform: rotate(180deg) scale(1); border-radius: 0; }
            75% { transform: rotate(270deg) scale(0.8); border-radius: 8px; }
          }
        `}</style>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="analytics-page" style={{ padding: "var(--space-xl)" }}>
        <div style={{
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: 4,
          padding: "var(--space-xl)",
          textAlign: "center",
        }}>
          <p style={{ color: "#EF4444", fontFamily: "var(--font-mono)", marginBottom: 16 }}>
            ERROR: {error}
          </p>
          <button
            onClick={fetchStats}
            style={{
              background: "transparent",
              border: "1px solid #EF4444",
              color: "#EF4444",
              padding: "8px 24px",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

  const avgTx = stats?.txHistory?.length
    ? stats.txHistory.reduce((a, b) => a + (b.transactions || 0), 0) / stats.txHistory.length
    : 0;

  return (
    <div className="analytics-page">
      {/* Terminal-style header */}
      <header className="terminal-header">
        <div className="header-left">
          {isLive && range === "live" && (
            <div className="status-cluster">
              <div className="status-dot live" />
              <span className="status-text">LIVE</span>
            </div>
          )}
          <h1 className="header-title">
            FLOW<span className="accent">_</span>ANALYTICS
          </h1>
        </div>

        <div className="header-right">
          <div className="time-selector">
            {(["live", "1h", "24h", "7d", "30d"] as TimeRange[]).map((t) => (
              <button
                key={t}
                onClick={() => setRange(t)}
                className={`time-btn ${range === t ? "active" : ""}`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          <Tooltip title={isLive ? "Pause" : "Resume"}>
            <button onClick={() => setIsLive(!isLive)} className="control-btn">
              {isLive ? <PauseOutlined /> : <CaretRightOutlined />}
            </button>
          </Tooltip>
          <Tooltip title="Refresh">
            <button onClick={fetchStats} className="control-btn">
              <ReloadOutlined />
            </button>
          </Tooltip>
        </div>
      </header>

      {/* Hero metrics strip */}
      <section className="hero-strip">
        <div className="hero-metric main">
          <span className="label">BLOCK</span>
          <span className="value">
            #{Number(stats?.latestBlock || 0).toLocaleString()}
          </span>
        </div>
        <div className="divider" />
        <div className="hero-metric">
          <span className="label">TX</span>
          <span className="value">{stats?.totalTransactions?.toLocaleString() || "0"}</span>
        </div>
        <div className="divider" />
        <div className="hero-metric">
          <span className="label">TX/BLOCK</span>
          <span className="value">{stats?.avgTxPerBlock?.toFixed(2) || "0"}</span>
        </div>
        {range === "live" && (
          <>
            <div className="divider" />
            <div className="hero-metric">
              <span className="label">TPS</span>
              <span className="value">{stats?.tps?.toFixed(3) || "0"}</span>
            </div>
          </>
        )}
        {hasDetailedData && stats?.totalContracts ? (
          <>
            <div className="divider" />
            <div className="hero-metric">
              <span className="label">CONTRACTS</span>
              <span className="value">{stats.totalContracts.toLocaleString()}</span>
            </div>
          </>
        ) : null}
        {hasDetailedData && stats?.totalTokenTransfers ? (
          <>
            <div className="divider" />
            <div className="hero-metric">
              <span className="label">TRANSFERS</span>
              <span className="value">{stats.totalTokenTransfers.toLocaleString()}</span>
            </div>
          </>
        ) : null}
      </section>

      {/* Main grid */}
      <div className="dashboard-grid">
        {/* Transaction chart - large */}
        <section className="chart-panel tx-chart">
          <div className="panel-header">
            <div className="panel-title">
              <SwapOutlined style={{ marginRight: 8 }} />
              TRANSACTION ACTIVITY
            </div>
            <div className="panel-meta">
              {stats?.txHistory?.length || 0} data points
            </div>
          </div>
          <div className="chart-container">
            {stats?.txHistory && stats.txHistory.length > 1 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={stats.txHistory} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="txGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00EF8B" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#00EF8B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="2 4"
                    stroke="rgba(255,255,255,0.05)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    stroke="transparent"
                    tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)" }}
                    interval="preserveStartEnd"
                    tickMargin={10}
                  />
                  <YAxis
                    stroke="transparent"
                    tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)" }}
                    width={50}
                    tickFormatter={(v) => v.toLocaleString()}
                  />
                  <ReferenceLine y={avgTx} stroke="rgba(0,239,139,0.3)" strokeDasharray="3 3" label={{ value: 'avg', fill: 'rgba(0,239,139,0.5)', fontSize: 10 }} />
                  <RechartsTooltip content={<TransactionTooltip />} />
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
            ) : (
              <NoDataState />
            )}
          </div>
        </section>

        {/* Gas usage chart */}
        <section className="chart-panel gas-chart">
          <div className="panel-header">
            <div className="panel-title">
              <FireOutlined style={{ marginRight: 8 }} />
              GAS CONSUMPTION
            </div>
            <div className="panel-meta mono">Million gas units</div>
          </div>
          <div className="chart-container">
            {stats?.gasHistory && stats.gasHistory.length > 1 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.gasHistory} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="transparent"
                    tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)" }}
                    interval="preserveStartEnd"
                    tickMargin={10}
                  />
                  <YAxis
                    stroke="transparent"
                    tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)" }}
                    tickFormatter={(v) => `${v.toFixed(0)}M`}
                    width={45}
                  />
                  <RechartsTooltip content={<GasTooltip />} />
                  <Bar dataKey="gas" radius={[3, 3, 0, 0]} maxBarSize={24}>
                    {stats.gasHistory.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`rgba(255, 140, 0, ${0.4 + (index / stats.gasHistory.length) * 0.5})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoDataState compact />
            )}
          </div>
        </section>

        {/* Contracts chart - only when we have detailed data */}
        {hasDetailedData && stats?.contractsHistory && stats.contractsHistory.length > 0 && (
          <section className="chart-panel contracts-chart">
            <div className="panel-header">
              <div className="panel-title">
                <CodeOutlined style={{ marginRight: 8 }} />
                CONTRACT DEPLOYMENTS
              </div>
              <div className="panel-meta">Smart contracts deployed</div>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={stats.contractsHistory} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="transparent"
                    tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)" }}
                    interval="preserveStartEnd"
                    tickMargin={10}
                  />
                  <YAxis
                    stroke="transparent"
                    tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)" }}
                    width={35}
                    allowDecimals={false}
                  />
                  <RechartsTooltip content={<ContractTooltip />} />
                  <Line
                    type="stepAfter"
                    dataKey="contracts"
                    stroke="#A855F7"
                    strokeWidth={2}
                    dot={{ fill: "#A855F7", r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: "#A855F7", stroke: "#000", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Recent contracts table */}
        {hasDetailedData && stats?.recentContracts && stats.recentContracts.length > 0 && (
          <section className="data-panel contracts-table">
            <div className="panel-header">
              <div className="panel-title">RECENT DEPLOYMENTS</div>
              <div className="panel-meta">{stats.recentContracts.length} contracts</div>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>CONTRACT</th>
                    <th>DEPLOYER</th>
                    <th>BLOCK</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentContracts.slice(0, 6).map((contract) => (
                    <tr key={contract.address}>
                      <td>
                        <Link href={`/account/${contract.address}`} className="address-link">
                          {contract.address.slice(0, 8)}...{contract.address.slice(-4)}
                        </Link>
                      </td>
                      <td>
                        <Link href={`/account/${contract.deployer}`} className="address-link muted">
                          {contract.deployer.slice(0, 8)}...{contract.deployer.slice(-4)}
                        </Link>
                      </td>
                      <td>
                        <Link href={`/block/${contract.blockNumber}`} className="block-link">
                          {Number(contract.blockNumber).toLocaleString()}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </div>

      {/* Historical data notice */}
      <div className="history-notice">
        <span className="notice-dot" />
        <span>Historical data coverage is expanding daily. Older transactions will become available over time.</span>
      </div>

      <style jsx>{`
        .analytics-page {
          min-height: 100vh;
          background: var(--bg-primary);
          padding: 0 var(--space-lg) var(--space-2xl);
        }

        /* Terminal Header */
        .terminal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-lg) 0;
          border-bottom: 1px solid var(--border-subtle);
          margin-bottom: var(--space-lg);
          flex-wrap: wrap;
          gap: var(--space-md);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: var(--space-lg);
        }

        .status-cluster {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(0, 239, 139, 0.08);
          border: 1px solid rgba(0, 239, 139, 0.2);
          border-radius: 4px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--flow-green);
        }

        .status-dot.live {
          box-shadow: 0 0 8px var(--flow-green);
          animation: statusPulse 2s ease-in-out infinite;
        }

        .status-text {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--flow-green);
          letter-spacing: 0.1em;
        }

        .header-title {
          font-family: var(--font-mono);
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: 0.05em;
        }

        .header-title .accent {
          color: var(--flow-green);
          animation: cursorBlink 1s step-end infinite;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }

        .time-selector {
          display: flex;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          overflow: hidden;
        }

        .time-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-family: var(--font-mono);
          font-size: 11px;
          padding: 8px 12px;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.05em;
        }

        .time-btn:hover {
          color: var(--text-primary);
          background: rgba(255,255,255,0.05);
        }

        .time-btn.active {
          color: var(--bg-primary);
          background: var(--flow-green);
        }

        .control-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .control-btn:hover {
          color: var(--flow-green);
          border-color: var(--flow-green);
        }

        /* Hero Strip */
        .hero-strip {
          display: flex;
          align-items: center;
          gap: 0;
          padding: var(--space-lg) var(--space-xl);
          background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          margin-bottom: var(--space-xl);
          overflow-x: auto;
          flex-wrap: nowrap;
        }

        .hero-metric {
          display: flex;
          flex-direction: column;
          padding: 0 var(--space-xl);
          position: relative;
        }

        .hero-metric.main {
          padding-left: var(--space-md);
        }

        .hero-metric .label {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--text-muted);
          letter-spacing: 0.15em;
          margin-bottom: 4px;
        }

        .hero-metric .value {
          font-family: var(--font-mono);
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .hero-metric.main .value {
          color: var(--flow-green);
          font-size: 26px;
        }

        .divider {
          width: 1px;
          height: 40px;
          background: var(--border-subtle);
          flex-shrink: 0;
        }

        /* Dashboard Grid */
        .dashboard-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: var(--space-lg);
        }

        @media (max-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Panels */
        .chart-panel, .data-panel {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          overflow: hidden;
        }

        .tx-chart {
          grid-column: 1 / -1;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-md) var(--space-lg);
          border-bottom: 1px solid var(--border-subtle);
          background: rgba(0,0,0,0.2);
        }

        .panel-title {
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: 0.08em;
          display: flex;
          align-items: center;
        }

        .panel-meta {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-muted);
        }

        .chart-container {
          padding: var(--space-md);
        }

        /* Data table */
        .table-scroll {
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-family: var(--font-mono);
          font-size: 12px;
        }

        .data-table th {
          text-align: left;
          padding: var(--space-sm) var(--space-md);
          color: var(--text-muted);
          font-weight: 500;
          font-size: 10px;
          letter-spacing: 0.1em;
          background: rgba(0,0,0,0.2);
          border-bottom: 1px solid var(--border-subtle);
        }

        .data-table td {
          padding: var(--space-sm) var(--space-md);
          border-bottom: 1px solid rgba(255,255,255,0.03);
          color: var(--text-primary);
        }

        .data-table tr:hover td {
          background: rgba(255,255,255,0.02);
        }

        .address-link {
          color: var(--flow-green);
          text-decoration: none;
        }

        .address-link.muted {
          color: var(--text-secondary);
        }

        .block-link {
          color: var(--text-muted);
        }

        /* History notice */
        .history-notice {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: var(--space-xl);
          padding: var(--space-md) var(--space-lg);
          background: rgba(0, 239, 139, 0.03);
          border: 1px solid rgba(0, 239, 139, 0.1);
          border-radius: 6px;
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--text-muted);
        }

        .notice-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--flow-green);
          opacity: 0.6;
          flex-shrink: 0;
        }

        /* Animations */
        @keyframes statusPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px var(--flow-green); }
          50% { opacity: 0.6; box-shadow: 0 0 4px var(--flow-green); }
        }

        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        
        /* Mobile */
        @media (max-width: 768px) {
          .analytics-page {
            padding: 0 var(--space-md) var(--space-xl);
          }

          .terminal-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .header-right {
            width: 100%;
            justify-content: flex-start;
          }

          .hero-strip {
            padding: var(--space-md);
          }

          .hero-metric {
            padding: 0 var(--space-md);
          }

          .hero-metric .value {
            font-size: 16px;
          }

          .hero-metric.main .value {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
}

// Detailed Transaction Tooltip
function TransactionTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: HistoryPoint }> }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;

  return (
    <div style={{
      background: "rgba(10, 10, 11, 0.98)",
      border: "1px solid var(--border-default)",
      borderRadius: 6,
      padding: "12px 16px",
      fontFamily: "var(--font-mono)",
      minWidth: 180,
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
    }}>
      <div style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        {data.fullDate}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <SwapOutlined style={{ color: "var(--flow-green)", fontSize: 14 }} />
        <span style={{ color: "var(--flow-green)", fontSize: 18, fontWeight: 700 }}>
          {data.transactions?.toLocaleString()}
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>transactions</span>
      </div>
    </div>
  );
}

// Detailed Gas Tooltip
function GasTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: HistoryPoint }> }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;

  return (
    <div style={{
      background: "rgba(10, 10, 11, 0.98)",
      border: "1px solid var(--border-default)",
      borderRadius: 6,
      padding: "12px 16px",
      fontFamily: "var(--font-mono)",
      minWidth: 180,
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
    }}>
      <div style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        {data.fullDate}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <FireOutlined style={{ color: "#FF8C00", fontSize: 14 }} />
        <span style={{ color: "#FF8C00", fontSize: 18, fontWeight: 700 }}>
          {data.gas?.toFixed(2)}M
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>gas used</span>
      </div>
    </div>
  );
}

// Detailed Contract Tooltip
function ContractTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: HistoryPoint }> }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;

  return (
    <div style={{
      background: "rgba(10, 10, 11, 0.98)",
      border: "1px solid var(--border-default)",
      borderRadius: 6,
      padding: "12px 16px",
      fontFamily: "var(--font-mono)",
      minWidth: 180,
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
    }}>
      <div style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        {data.fullDate}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <CodeOutlined style={{ color: "#A855F7", fontSize: 14 }} />
        <span style={{ color: "#A855F7", fontSize: 18, fontWeight: 700 }}>
          {data.contracts?.toLocaleString()}
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>contracts deployed</span>
      </div>
    </div>
  );
}

// No data state
function NoDataState({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: compact ? 170 : 220,
      color: "var(--text-muted)",
      fontFamily: "var(--font-mono)",
      fontSize: 11,
    }}>
      <BlockOutlined style={{ fontSize: 24, marginBottom: 12, opacity: 0.3 }} />
      <span>COLLECTING DATA...</span>
    </div>
  );
}

