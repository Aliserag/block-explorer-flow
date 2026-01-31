"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Tooltip } from "antd";
import {
  ReloadOutlined,
  SwapOutlined,
  FireOutlined,
  BlockOutlined,
  PauseOutlined,
  CaretRightOutlined,
} from "@ant-design/icons";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

type TimeRange = "live" | "1h";

interface HistoryPoint {
  time: string;
  fullDate: string;
  timestamp: number;
  transactions?: number;
  gas?: number;
}

interface LiveStats {
  latestBlock: string;
  blocksPerMinute: number;
  avgTxPerBlock: number;
  avgGasPerBlock: number;
  tps: number;
  totalTransactions: number;
  txHistory: HistoryPoint[];
  gasHistory: HistoryPoint[];
}

export default function TestnetAnalyticsPage() {
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<TimeRange>("live");
  const [isLive, setIsLive] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/analytics?range=1h&network=testnet`);
      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();

      const txHistory = (data.charts?.transactions || []).map((p: { time: string; value: number; timestamp: number }) => ({
        time: p.time,
        fullDate: new Date(p.timestamp * 1000).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
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
        txHistory,
        gasHistory,
      });

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

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
              LOADING TESTNET DATA...
            </p>
          </div>
        </div>
        <style jsx>{`
          .loading-cube {
            width: 40px;
            height: 40px;
            margin: 0 auto;
            border: 2px solid #F59E0B;
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
          borderRadius: "var(--radius-md)",
          padding: "var(--space-xl)",
          textAlign: "center",
        }}>
          <p style={{ color: "var(--status-error)", fontFamily: "var(--font-mono)", marginBottom: 16 }}>
            ERROR: {error}
          </p>
          <button
            onClick={fetchStats}
            style={{
              background: "transparent",
              border: "1px solid var(--status-error)",
              color: "var(--status-error)",
              padding: "8px 24px",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              borderRadius: "var(--radius-sm)",
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
            <span className="accent">_</span>TESTNET ANALYTICS
          </h1>
        </div>

        <div className="header-right">
          <div className="time-selector">
            {(["live", "1h"] as TimeRange[]).map((t) => (
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
        <div className="divider" />
        <div className="hero-metric">
          <span className="label">TPS</span>
          <span className="value">{stats?.tps?.toFixed(3) || "0"}</span>
        </div>
      </section>

      {/* Main grid */}
      <div className="dashboard-grid">
        {/* Transaction chart */}
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
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={stats.txHistory} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="txGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="time" stroke="transparent" tick={{ fontSize: 12, fill: "rgba(255,255,255,0.5)" }} />
                  <YAxis stroke="transparent" tick={{ fontSize: 12, fill: "rgba(255,255,255,0.5)" }} width={55} />
                  <ReferenceLine y={avgTx} stroke="rgba(245,158,11,0.3)" strokeDasharray="3 3" />
                  <RechartsTooltip content={<TransactionTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="transactions"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    fill="url(#txGradient)"
                    activeDot={{ r: 6, fill: "#F59E0B", stroke: "#000", strokeWidth: 2 }}
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
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.gasHistory} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="time" stroke="transparent" tick={{ fontSize: 12, fill: "rgba(255,255,255,0.5)" }} />
                  <YAxis stroke="transparent" tick={{ fontSize: 12, fill: "rgba(255,255,255,0.5)" }} tickFormatter={(v) => `${v.toFixed(0)}M`} width={50} />
                  <RechartsTooltip content={<GasTooltip />} />
                  <Bar dataKey="gas" radius={[3, 3, 0, 0]} maxBarSize={24}>
                    {stats.gasHistory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`rgba(255, 140, 0, ${0.4 + (index / stats.gasHistory.length) * 0.5})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoDataState compact />
            )}
          </div>
        </section>
      </div>

      {/* Testnet notice */}
      <div className="history-notice">
        <span className="notice-dot" />
        <span>This is testnet data. Historical indexing is not available for testnet.</span>
      </div>

      <style jsx>{`
        .analytics-page {
          min-height: 100vh;
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 var(--space-lg) var(--space-2xl);
        }
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
        .header-left { display: flex; align-items: center; gap: var(--space-lg); }
        .status-cluster {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: var(--radius-sm);
        }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #F59E0B; }
        .status-dot.live { box-shadow: 0 0 8px #F59E0B; animation: statusPulse 2s ease-in-out infinite; }
        .status-text { font-family: var(--font-mono); font-size: 11px; color: #F59E0B; letter-spacing: 0.1em; }
        .header-title { font-family: var(--font-mono); font-size: 24px; font-weight: 700; color: var(--text-primary); }
        .header-title .accent { color: #F59E0B; animation: cursorBlink 1s step-end infinite; }
        .header-right { display: flex; align-items: center; gap: var(--space-sm); }
        .time-selector { display: flex; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); overflow: hidden; }
        .time-btn { background: transparent; border: none; color: var(--text-muted); font-family: var(--font-mono); font-size: 13px; padding: 10px 14px; cursor: pointer; }
        .time-btn:hover { color: var(--text-primary); background: rgba(255,255,255,0.05); }
        .time-btn.active { color: var(--bg-primary); background: #F59E0B; }
        .control-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); color: var(--text-secondary); cursor: pointer; }
        .control-btn:hover { color: #F59E0B; border-color: #F59E0B; }
        .hero-strip { display: flex; align-items: center; padding: var(--space-lg) var(--space-xl); background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); margin-bottom: var(--space-xl); overflow-x: auto; }
        .hero-metric { display: flex; flex-direction: column; padding: 0 var(--space-xl); }
        .hero-metric.main { padding-left: var(--space-md); }
        .hero-metric .label { font-family: var(--font-mono); font-size: 12px; color: var(--text-muted); letter-spacing: 0.15em; margin-bottom: 6px; }
        .hero-metric .value { font-family: var(--font-mono); font-size: 26px; font-weight: 700; color: var(--text-primary); }
        .hero-metric.main .value { color: #F59E0B; font-size: 30px; }
        .divider { width: 1px; height: 40px; background: var(--border-subtle); flex-shrink: 0; }
        .dashboard-grid { display: grid; grid-template-columns: 2fr 1fr; gap: var(--space-lg); }
        @media (max-width: 1024px) { .dashboard-grid { grid-template-columns: 1fr; } }
        .chart-panel { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; }
        .tx-chart { grid-column: 1 / -1; }
        .panel-header { display: flex; justify-content: space-between; align-items: center; padding: var(--space-md) var(--space-lg); border-bottom: 1px solid var(--border-subtle); background: rgba(0,0,0,0.2); }
        .panel-title { font-family: var(--font-mono); font-size: 14px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; }
        .panel-meta { font-family: var(--font-mono); font-size: 13px; color: var(--text-muted); }
        .chart-container { padding: var(--space-md); }
        .history-notice { display: flex; align-items: center; gap: 12px; margin-top: var(--space-xl); padding: var(--space-lg); background: rgba(245, 158, 11, 0.03); border: 1px solid rgba(245, 158, 11, 0.1); border-radius: var(--radius-md); font-family: var(--font-mono); font-size: 14px; color: var(--text-muted); }
        .notice-dot { width: 6px; height: 6px; border-radius: 50%; background: #F59E0B; opacity: 0.6; flex-shrink: 0; }
        @keyframes statusPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes cursorBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}

function TransactionTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: HistoryPoint }> }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div style={{ background: "rgba(10, 10, 11, 0.98)", border: "1px solid var(--border-default)", borderRadius: 8, padding: "14px 18px", fontFamily: "var(--font-mono)", minWidth: 200 }}>
      <div style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{data.fullDate}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <SwapOutlined style={{ color: "#F59E0B", fontSize: 16 }} />
        <span style={{ color: "#F59E0B", fontSize: 20, fontWeight: 700 }}>{data.transactions?.toLocaleString()}</span>
        <span style={{ color: "var(--text-muted)", fontSize: 13 }}>transactions</span>
      </div>
    </div>
  );
}

function GasTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: HistoryPoint }> }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div style={{ background: "rgba(10, 10, 11, 0.98)", border: "1px solid var(--border-default)", borderRadius: 8, padding: "14px 18px", fontFamily: "var(--font-mono)", minWidth: 200 }}>
      <div style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{data.fullDate}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <FireOutlined style={{ color: "#FF8C00", fontSize: 16 }} />
        <span style={{ color: "#FF8C00", fontSize: 20, fontWeight: 700 }}>{data.gas?.toFixed(2)}M</span>
        <span style={{ color: "var(--text-muted)", fontSize: 13 }}>gas used</span>
      </div>
    </div>
  );
}

function NoDataState({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: compact ? 190 : 240, color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 14 }}>
      <BlockOutlined style={{ fontSize: 28, marginBottom: 14, opacity: 0.3 }} />
      <span>COLLECTING DATA...</span>
    </div>
  );
}
