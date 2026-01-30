"use client";

import { useState } from "react";
import { Tabs, message } from "antd";
import { CopyOutlined, CheckOutlined, FileTextOutlined } from "@ant-design/icons";
import { Highlight, themes } from "prism-react-renderer";

interface ContractCodeProps {
  sources: Record<string, string>;
  compiler: string;
}

// Custom dark theme matching the explorer design
const customTheme = {
  plain: {
    color: "#FAFAFA",
    backgroundColor: "#111113",
  },
  styles: [
    {
      types: ["comment", "prolog", "doctype", "cdata"],
      style: { color: "#71717A", fontStyle: "italic" as const },
    },
    {
      types: ["punctuation"],
      style: { color: "#A1A1AA" },
    },
    {
      types: ["property", "tag", "boolean", "number", "constant", "symbol", "deleted"],
      style: { color: "#00EF8B" },
    },
    {
      types: ["selector", "attr-name", "string", "char", "builtin", "inserted"],
      style: { color: "#22C55E" },
    },
    {
      types: ["operator", "entity", "url"],
      style: { color: "#F59E0B" },
    },
    {
      types: ["atrule", "attr-value", "keyword"],
      style: { color: "#00C972" },
    },
    {
      types: ["function", "class-name"],
      style: { color: "#00EF8B" },
    },
    {
      types: ["regex", "important", "variable"],
      style: { color: "#EF4444" },
    },
  ],
};

export default function ContractCode({ sources, compiler }: ContractCodeProps) {
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const fileNames = Object.keys(sources);

  const handleCopy = async (filename: string) => {
    try {
      await navigator.clipboard.writeText(sources[filename]);
      setCopiedFile(filename);
      message.success("Copied to clipboard!");
      setTimeout(() => setCopiedFile(null), 2000);
    } catch {
      message.error("Failed to copy");
    }
  };

  const tabItems = fileNames.map((filename) => {
    const code = sources[filename];
    const shortName = filename.split("/").pop() || filename;

    return {
      key: filename,
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <FileTextOutlined style={{ fontSize: 12 }} />
          {shortName}
        </span>
      ),
      children: (
        <div style={{ position: "relative" }}>
          {/* Copy button */}
          <button
            onClick={() => handleCopy(filename)}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "6px 10px",
              cursor: "pointer",
              color: copiedFile === filename ? "var(--status-success)" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              zIndex: 10,
              transition: "all 0.2s",
            }}
          >
            {copiedFile === filename ? <CheckOutlined /> : <CopyOutlined />}
            {copiedFile === filename ? "Copied" : "Copy"}
          </button>

          {/* Code block */}
          <Highlight theme={customTheme} code={code.trim()} language="solidity">
            {({ style, tokens, getLineProps, getTokenProps }) => (
              <pre
                style={{
                  ...style,
                  margin: 0,
                  padding: "var(--space-md)",
                  paddingTop: "var(--space-xl)",
                  borderRadius: "var(--radius-md)",
                  overflow: "auto",
                  maxHeight: 600,
                  fontSize: 13,
                  lineHeight: 1.6,
                  fontFamily: "var(--font-mono)",
                }}
              >
                {tokens.map((line, i) => (
                  <div key={i} {...getLineProps({ line })} style={{ display: "table-row" }}>
                    {/* Line number */}
                    <span
                      style={{
                        display: "table-cell",
                        textAlign: "right",
                        paddingRight: "var(--space-md)",
                        userSelect: "none",
                        opacity: 0.4,
                        minWidth: 40,
                        color: "var(--text-muted)",
                      }}
                    >
                      {i + 1}
                    </span>
                    {/* Line content */}
                    <span style={{ display: "table-cell" }}>
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </span>
                  </div>
                ))}
              </pre>
            )}
          </Highlight>
        </div>
      ),
    };
  });

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-md)",
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          Contract Source Code
        </h3>
        <span
          className="mono"
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            background: "var(--bg-tertiary)",
            padding: "4px 8px",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {compiler}
        </span>
      </div>

      {/* File tabs */}
      {fileNames.length === 1 ? (
        // Single file - no tabs needed
        <div>{tabItems[0].children}</div>
      ) : (
        // Multiple files - show tabs
        <Tabs
          items={tabItems}
          type="card"
          style={{
            marginTop: "var(--space-sm)",
          }}
          tabBarStyle={{
            marginBottom: 0,
          }}
        />
      )}
    </div>
  );
}
