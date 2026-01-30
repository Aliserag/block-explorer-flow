import { CopyOutlined, CheckOutlined } from "@ant-design/icons";
import { message } from "antd";
import { useState } from "react";

interface DataFieldProps {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
  copyable?: boolean;
  link?: string;
}

export default function DataField({ label, value, mono = false, copyable = false, link }: DataFieldProps) {
  const [copied, setCopied] = useState(false);

  if (value === null || value === undefined) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      message.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      message.error("Failed to copy");
    }
  };

  const displayValue = String(value);

  return (
    <div
      style={{
        display: "flex",
        padding: "var(--space-md) 0",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div
        style={{
          width: 180,
          flexShrink: 0,
          color: "var(--text-muted)",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div
        style={{
          flex: 1,
          fontFamily: mono ? "var(--font-mono)" : "inherit",
          fontSize: 14,
          color: "var(--text-primary)",
          wordBreak: "break-all",
          display: "flex",
          alignItems: "flex-start",
          gap: "var(--space-sm)",
        }}
      >
        {link ? (
          <a
            href={link}
            style={{
              color: "var(--text-accent)",
              textDecoration: "none",
            }}
          >
            {displayValue}
          </a>
        ) : (
          <span>{displayValue}</span>
        )}
        {copyable && (
          <button
            onClick={handleCopy}
            style={{
              background: "transparent",
              border: "none",
              padding: 4,
              cursor: "pointer",
              color: copied ? "var(--status-success)" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              transition: "color 0.2s",
            }}
          >
            {copied ? <CheckOutlined /> : <CopyOutlined />}
          </button>
        )}
      </div>
    </div>
  );
}
