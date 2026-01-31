"use client";

import { Collapse, Tag } from "antd";
import { type Log, decodeEventLog } from "viem";
import DataField from "./DataField";

interface LogsSectionProps {
  logs: Log[];
}

// Common ERC-20/ERC-721 event ABIs
const COMMON_EVENTS = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { type: "address", name: "from", indexed: true },
      { type: "address", name: "to", indexed: true },
      { type: "uint256", name: "value", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Approval",
    inputs: [
      { type: "address", name: "owner", indexed: true },
      { type: "address", name: "spender", indexed: true },
      { type: "uint256", name: "value", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ApprovalForAll",
    inputs: [
      { type: "address", name: "owner", indexed: true },
      { type: "address", name: "operator", indexed: true },
      { type: "bool", name: "approved", indexed: false },
    ],
  },
] as const;

function decodeLog(log: Log) {
  // Try to decode with common event ABIs
  for (const event of COMMON_EVENTS) {
    try {
      const decoded = decodeEventLog({
        abi: [event],
        data: log.data,
        topics: log.topics,
      });
      return {
        eventName: decoded.eventName,
        args: decoded.args as Record<string, unknown>,
      };
    } catch {
      // Try next event ABI
      continue;
    }
  }
  return null;
}

export default function LogsSection({ logs }: LogsSectionProps) {
  if (!logs || logs.length === 0) {
    return (
      <div style={{ color: "var(--text-muted)", padding: "var(--space-md)" }}>
        No logs emitted by this transaction
      </div>
    );
  }

  const items = logs.map((log, index) => {
    const decoded = decodeLog(log);
    const logIndex = log.logIndex !== null ? Number(log.logIndex) : index;

    return {
      key: `log-${logIndex}`,
      label: (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
          <Tag color="blue">Log {logIndex}</Tag>
          {decoded && (
            <Tag color="success">{decoded.eventName}</Tag>
          )}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
            {log.address}
          </span>
        </div>
      ),
      children: (
        <div style={{ padding: "var(--space-md) 0" }}>
          <DataField label="Contract Address" value={log.address} mono copyable />

          {decoded && (
            <div style={{ marginTop: "var(--space-md)" }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: "var(--space-sm)", color: "var(--text-primary)" }}>
                Decoded Parameters
              </h4>
              {Object.entries(decoded.args).map(([key, value]) => (
                <DataField
                  key={key}
                  label={key}
                  value={String(value)}
                  mono
                  copyable={typeof value === "string" && value.length > 10}
                />
              ))}
            </div>
          )}

          <div style={{ marginTop: "var(--space-md)" }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: "var(--space-sm)", color: "var(--text-primary)" }}>
              Topics
            </h4>
            {log.topics.map((topic, i) => (
              <DataField key={i} label={`Topic ${i}`} value={topic} mono copyable />
            ))}
          </div>

          {log.data && log.data !== "0x" && (
            <div style={{ marginTop: "var(--space-md)" }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: "var(--space-sm)", color: "var(--text-primary)" }}>
                Data
              </h4>
              <div
                className="mono"
                style={{
                  background: "var(--bg-secondary)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-md)",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  wordBreak: "break-all",
                  maxHeight: 200,
                  overflow: "auto",
                }}
              >
                {log.data}
              </div>
            </div>
          )}

          <div style={{ marginTop: "var(--space-md)", display: "flex", gap: "var(--space-lg)" }}>
            {log.blockNumber && (
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Block: </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
                  {Number(log.blockNumber).toLocaleString()}
                </span>
              </div>
            )}
            {log.transactionIndex !== null && (
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Tx Index: </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
                  {log.transactionIndex}
                </span>
              </div>
            )}
            {log.logIndex !== null && (
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Log Index: </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
                  {log.logIndex}
                </span>
              </div>
            )}
            {log.removed && (
              <Tag color="error">Removed</Tag>
            )}
          </div>
        </div>
      ),
    };
  });

  return (
    <div>
      <div style={{ marginBottom: "var(--space-md)", display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
          Events & Logs
        </h3>
        <Tag>{logs.length} {logs.length === 1 ? 'log' : 'logs'}</Tag>
      </div>
      <Collapse items={items} />
    </div>
  );
}
