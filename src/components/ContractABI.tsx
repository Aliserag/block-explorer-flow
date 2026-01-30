"use client";

import { useState } from "react";
import { Collapse, Tag, message } from "antd";
import {
  CopyOutlined,
  CheckOutlined,
  ReadOutlined,
  EditOutlined,
  BellOutlined,
  CodeOutlined,
  DownOutlined,
} from "@ant-design/icons";

interface ABIItem {
  type: string;
  name?: string;
  inputs?: Array<{ name: string; type: string; indexed?: boolean }>;
  outputs?: Array<{ name: string; type: string }>;
  stateMutability?: string;
  anonymous?: boolean;
}

interface ContractABIProps {
  abi: ABIItem[];
}

type FunctionCategory = "read" | "write" | "events";

function categorizeABI(abi: ABIItem[]): Record<FunctionCategory, ABIItem[]> {
  const categories: Record<FunctionCategory, ABIItem[]> = {
    read: [],
    write: [],
    events: [],
  };

  for (const item of abi) {
    if (item.type === "event") {
      categories.events.push(item);
    } else if (item.type === "function") {
      if (item.stateMutability === "view" || item.stateMutability === "pure") {
        categories.read.push(item);
      } else {
        categories.write.push(item);
      }
    }
  }

  return categories;
}

function formatSignature(item: ABIItem): string {
  if (item.type === "event") {
    const params =
      item.inputs?.map((i) => `${i.type}${i.indexed ? " indexed" : ""} ${i.name}`).join(", ") || "";
    return `event ${item.name}(${params})`;
  }

  const inputs = item.inputs?.map((i) => `${i.type} ${i.name}`).join(", ") || "";
  const outputs = item.outputs?.map((o) => o.type).join(", ") || "";
  const returnsStr = outputs ? ` returns (${outputs})` : "";
  const mutability = item.stateMutability ? ` ${item.stateMutability}` : "";

  return `function ${item.name}(${inputs})${mutability}${returnsStr}`;
}

function ABIItem({ item }: { item: ABIItem }) {
  const [copied, setCopied] = useState(false);
  const signature = formatSignature(item);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(signature);
      setCopied(true);
      message.success("Copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      message.error("Failed to copy");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        padding: "var(--space-sm) var(--space-md)",
        background: "var(--bg-secondary)",
        borderRadius: "var(--radius-sm)",
        marginBottom: "var(--space-xs)",
      }}
    >
      <code
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--text-primary)",
          wordBreak: "break-all",
          flex: 1,
        }}
      >
        {signature}
      </code>
      <button
        onClick={handleCopy}
        style={{
          background: "transparent",
          border: "none",
          padding: 4,
          cursor: "pointer",
          color: copied ? "var(--status-success)" : "var(--text-muted)",
          marginLeft: "var(--space-sm)",
          flexShrink: 0,
        }}
      >
        {copied ? <CheckOutlined /> : <CopyOutlined />}
      </button>
    </div>
  );
}

function CategorySection({
  title,
  items,
  icon,
  tagColor,
  defaultOpen = false,
}: {
  title: string;
  items: ABIItem[];
  icon: React.ReactNode;
  tagColor: string;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (items.length === 0) return null;

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        marginBottom: "var(--space-md)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-md)",
          background: "var(--bg-tertiary)",
          border: "none",
          cursor: "pointer",
          color: "var(--text-primary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <span style={{ color: tagColor }}>{icon}</span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>
          <Tag
            style={{
              marginLeft: "var(--space-xs)",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)",
            }}
          >
            {items.length}
          </Tag>
        </div>
        <DownOutlined
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>

      {/* Content */}
      {isOpen && (
        <div style={{ padding: "var(--space-md)" }}>
          {items.map((item, index) => (
            <ABIItem key={`${item.name}-${index}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ContractABI({ abi }: ContractABIProps) {
  const [copied, setCopied] = useState(false);
  const categories = categorizeABI(abi);

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(abi, null, 2));
      setCopied(true);
      message.success("ABI copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      message.error("Failed to copy ABI");
    }
  };

  if (!abi || abi.length === 0) {
    return (
      <div
        style={{
          padding: "var(--space-xl)",
          textAlign: "center",
          color: "var(--text-muted)",
        }}
      >
        No ABI available
      </div>
    );
  }

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
          Contract ABI
        </h3>
        <button
          onClick={handleCopyAll}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            padding: "6px 12px",
            cursor: "pointer",
            color: copied ? "var(--status-success)" : "var(--text-muted)",
            fontSize: 12,
            transition: "all 0.2s",
          }}
        >
          {copied ? <CheckOutlined /> : <CopyOutlined />}
          {copied ? "Copied" : "Copy ABI"}
        </button>
      </div>

      {/* Categories */}
      <CategorySection
        title="Read Functions"
        items={categories.read}
        icon={<ReadOutlined />}
        tagColor="var(--status-success)"
        defaultOpen={true}
      />
      <CategorySection
        title="Write Functions"
        items={categories.write}
        icon={<EditOutlined />}
        tagColor="var(--status-pending)"
        defaultOpen={true}
      />
      <CategorySection
        title="Events"
        items={categories.events}
        icon={<BellOutlined />}
        tagColor="var(--flow-green)"
        defaultOpen={false}
      />
    </div>
  );
}
