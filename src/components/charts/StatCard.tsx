"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";
import { chartTheme } from "@/lib/chartTheme";

interface StatCardProps {
  label: string;
  value: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  sparklineData?: { value: number }[];
  accent?: boolean;
}

export default function StatCard({
  label,
  value,
  trend,
  trendValue,
  sparklineData,
  accent = false,
}: StatCardProps) {
  const trendColors = {
    up: "var(--status-success)",
    down: "var(--status-error)",
    neutral: "var(--text-muted)",
  };

  const trendIcons = {
    up: "\u2191",
    down: "\u2193",
    neutral: "\u2192",
  };

  return (
    <div
      style={{
        background: accent
          ? "linear-gradient(135deg, var(--flow-green) 0%, var(--flow-green-dark) 100%)"
          : "var(--bg-card)",
        border: accent ? "none" : "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-lg)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-sm)",
        minHeight: 140,
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: accent ? "rgba(255,255,255,0.8)" : "var(--text-muted)",
        }}
      >
        {label}
      </div>

      <div
        className="mono"
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: accent ? "white" : "var(--text-primary)",
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>

      {trend && trendValue && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-xs)",
            fontSize: 12,
            color: accent ? "rgba(255,255,255,0.9)" : trendColors[trend],
            fontFamily: "var(--font-mono)",
          }}
        >
          <span>{trendIcons[trend]}</span>
          <span>{trendValue}</span>
        </div>
      )}

      {sparklineData && sparklineData.length > 1 && (
        <div style={{ flex: 1, minHeight: 40, marginTop: "auto" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={accent ? "rgba(255,255,255,0.6)" : chartTheme.colors.primary}
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
