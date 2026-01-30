"use client";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

function SkeletonBase({ width = "100%", height = 16, borderRadius, className }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className || ""}`}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        borderRadius: borderRadius || "var(--radius-md)",
      }}
    />
  );
}

export function BlockCardSkeleton() {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-lg)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-lg)" }}>
        {/* Icon placeholder */}
        <SkeletonBase
          width={48}
          height={48}
          borderRadius="var(--radius-md)"
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Block number and time */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: 8 }}>
            <SkeletonBase width={80} height={20} />
            <SkeletonBase width={60} height={14} />
          </div>

          {/* Hash */}
          <div style={{ marginBottom: "var(--space-sm)" }}>
            <SkeletonBase width="80%" height={14} />
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: "var(--space-lg)" }}>
            <SkeletonBase width={60} height={14} />
            <SkeletonBase width={80} height={14} />
          </div>
        </div>

        {/* Arrow */}
        <SkeletonBase width={20} height={20} borderRadius="var(--radius-sm)" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-lg)",
      }}
    >
      {/* Icon */}
      <div style={{ marginBottom: "var(--space-md)" }}>
        <SkeletonBase width={40} height={40} borderRadius="var(--radius-md)" />
      </div>

      {/* Label */}
      <div style={{ marginBottom: "var(--space-sm)" }}>
        <SkeletonBase width={80} height={12} />
      </div>

      {/* Value */}
      <SkeletonBase width={120} height={28} />
    </div>
  );
}

export function DataFieldSkeleton({ labelWidth = 180 }: { labelWidth?: number }) {
  return (
    <div
      style={{
        display: "flex",
        padding: "var(--space-md) 0",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div style={{ width: labelWidth, flexShrink: 0 }}>
        <SkeletonBase width={100} height={14} />
      </div>
      <div style={{ flex: 1 }}>
        <SkeletonBase width="60%" height={16} />
      </div>
    </div>
  );
}

export function TransactionRowSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-md)",
        padding: "var(--space-md)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <SkeletonBase width={24} height={24} borderRadius="50%" />
      <div style={{ flex: 1 }}>
        <SkeletonBase width="70%" height={14} />
      </div>
      <SkeletonBase width={80} height={14} />
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-md)",
        padding: "var(--space-md)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} style={{ flex: i === 0 ? 2 : 1 }}>
          <SkeletonBase width={i === 0 ? "80%" : "60%"} height={14} />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-lg)",
        height,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Title */}
      <div style={{ marginBottom: "var(--space-lg)" }}>
        <SkeletonBase width={150} height={20} />
      </div>

      {/* Chart area */}
      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: "var(--space-sm)" }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{ flex: 1 }}>
            <SkeletonBase
              width="100%"
              height={`${30 + Math.random() * 50}%`}
              borderRadius="var(--radius-sm)"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default SkeletonBase;
