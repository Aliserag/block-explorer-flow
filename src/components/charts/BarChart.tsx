"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { chartTheme, tooltipStyle } from "@/lib/chartTheme";

interface BarChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  xKey: string;
  yKey: string;
  title: string;
  color?: string;
  formatY?: (value: number) => string;
  formatX?: (value: number) => string;
}

export default function BarChart({
  data,
  xKey,
  yKey,
  title,
  color = chartTheme.colors.primary,
  formatY,
  formatX,
}: BarChartProps) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-lg)",
      }}
    >
      <h3
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--text-secondary)",
          marginBottom: "var(--space-lg)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {title}
      </h3>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <RechartsBarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartTheme.colors.grid}
              vertical={false}
            />
            <XAxis
              dataKey={xKey}
              stroke={chartTheme.colors.text}
              tick={{ fontSize: 11, fontFamily: chartTheme.fonts.mono }}
              tickFormatter={formatX}
              axisLine={{ stroke: chartTheme.colors.grid }}
              tickLine={{ stroke: chartTheme.colors.grid }}
            />
            <YAxis
              stroke={chartTheme.colors.text}
              tick={{ fontSize: 11, fontFamily: chartTheme.fonts.mono }}
              tickFormatter={formatY}
              axisLine={{ stroke: chartTheme.colors.grid }}
              tickLine={{ stroke: chartTheme.colors.grid }}
              width={50}
            />
            <Tooltip
              contentStyle={tooltipStyle.contentStyle}
              labelStyle={tooltipStyle.labelStyle}
              formatter={(value: number | undefined) => [formatY && value !== undefined ? formatY(value) : (value ?? 0), yKey]}
              labelFormatter={(label) => String(label)}
              cursor={{ fill: "rgba(0, 239, 139, 0.1)" }}
            />
            <Bar
              dataKey={yKey}
              fill={color}
              radius={[4, 4, 0, 0]}
              maxBarSize={20}
            />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
