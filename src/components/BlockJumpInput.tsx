"use client";

import { Input, Button, Space } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchOutlined } from "@ant-design/icons";

interface BlockJumpInputProps {
  currentBlock?: number;
  latestBlock?: number;
  baseUrl?: string;
}

export default function BlockJumpInput({ currentBlock, latestBlock, baseUrl = "/block" }: BlockJumpInputProps) {
  const router = useRouter();
  const [blockNumber, setBlockNumber] = useState("");
  const [error, setError] = useState("");

  const handleJump = () => {
    const num = parseInt(blockNumber);
    if (isNaN(num) || num < 0) {
      setError("Please enter a valid block number");
      return;
    }
    if (latestBlock && num > latestBlock) {
      setError(`Block number cannot exceed ${latestBlock.toLocaleString()}`);
      return;
    }
    setError("");
    router.push(`${baseUrl}/${num}`);
    setBlockNumber("");
  };

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-md)",
        marginBottom: "var(--space-lg)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "var(--space-md)",
        }}
      >
        <div>
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Jump to Block
          </span>
          {currentBlock !== undefined && latestBlock !== undefined && (
            <span
              style={{
                color: "var(--text-muted)",
                fontSize: 12,
                marginLeft: "var(--space-sm)",
              }}
            >
              (Current: #{currentBlock.toLocaleString()} / Latest: #{latestBlock.toLocaleString()})
            </span>
          )}
        </div>
        <Space>
          <Input
            value={blockNumber}
            onChange={(e) => {
              setBlockNumber(e.target.value);
              setError("");
            }}
            onPressEnter={handleJump}
            placeholder="Enter block number"
            status={error ? "error" : undefined}
            style={{
              width: 180,
              fontFamily: "var(--font-mono)",
              background: "var(--bg-secondary)",
              borderColor: "var(--border-subtle)",
            }}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleJump}
            style={{
              background: "var(--flow-green)",
              borderColor: "var(--flow-green)",
              color: "var(--bg-primary)",
            }}
          >
            Go
          </Button>
        </Space>
      </div>
      {error && (
        <div style={{ color: "var(--status-error)", fontSize: 12, marginTop: "var(--space-xs)" }}>
          {error}
        </div>
      )}
    </div>
  );
}
