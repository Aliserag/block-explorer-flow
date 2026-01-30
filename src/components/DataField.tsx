"use client";

import { CopyOutlined, CheckOutlined } from "@ant-design/icons";
import { message } from "antd";
import { useState } from "react";
import Link from "next/link";

interface DataFieldProps {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
  copyable?: boolean;
  href?: string;
}

export default function DataField({ label, value, mono = false, copyable = false, href }: DataFieldProps) {
  const [copied, setCopied] = useState(false);

  if (value === null || value === undefined) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      message.success("Copied!");
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
        {href ? (
          <Link href={href} style={{ color: "var(--text-accent)" }}>
            {displayValue}
          </Link>
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
            }}
          >
            {copied ? <CheckOutlined /> : <CopyOutlined />}
          </button>
        )}
      </div>
    </div>
  );
}
