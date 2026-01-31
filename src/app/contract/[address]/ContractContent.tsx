"use client";

import { useState } from "react";
import { Tabs, Tag, Skeleton, Card, message } from "antd";
import {
  FileTextOutlined,
  ApiOutlined,
  CodeOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SafetyCertificateOutlined,
  CopyOutlined,
  CheckOutlined,
  UserOutlined,
  FieldTimeOutlined,
  BlockOutlined,
  FileZipOutlined,
  ReadOutlined,
  EditOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import DataField from "@/components/DataField";
import ContractCode from "@/components/ContractCode";
import ContractABI from "@/components/ContractABI";
import type { IndexedContract } from "@/lib/ponder";
import type { VerificationStatus, VerifiedContract } from "@/lib/sourcify";

interface ContractContentProps {
  address: string;
  bytecode: string;
  bytecodeSize: number;
  contractData: IndexedContract | null;
  verificationStatus: VerificationStatus;
  verifiedContract: VerifiedContract | null;
}

export default function ContractContent({
  address,
  bytecode,
  bytecodeSize,
  contractData,
  verificationStatus,
  verifiedContract,
}: ContractContentProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      message.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      message.error("Failed to copy");
    }
  };

  // Format timestamp
  const formatDate = (timestamp: string) => {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Overview Tab
  const OverviewTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      {/* Contract Info Card */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-lg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--space-md)" }}>
          <InfoCircleOutlined style={{ color: "var(--flow-green)", fontSize: 18 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
            Contract Information
          </h3>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          <DataField label="Contract Address" value={address} mono copyable />

          {contractData && (
            <>
              <DataField
                label="Deployer"
                value={contractData.deployerAddress}
                mono
                copyable
                href={`/account/${contractData.deployerAddress}`}
              />
              <DataField
                label="Deployment Transaction"
                value={contractData.deploymentTxHash}
                mono
                copyable
                href={`/tx/${contractData.deploymentTxHash}`}
              />
              <DataField
                label="Deployment Block"
                value={`#${Number(contractData.blockNumber).toLocaleString()}`}
                href={`/block/${contractData.blockNumber}`}
              />
              <DataField label="Deployment Time" value={formatDate(contractData.timestamp)} />
            </>
          )}

          <DataField label="Bytecode Size" value={`${bytecodeSize.toLocaleString()} bytes`} />

          {verifiedContract && (
            <>
              <DataField label="Contract Name" value={verifiedContract.name} />
              <DataField label="Compiler" value={verifiedContract.compiler} />
            </>
          )}
        </div>
      </div>

      {/* Verification Status Card */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-lg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--space-md)" }}>
          <SafetyCertificateOutlined style={{ color: "var(--flow-green)", fontSize: 18 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
            Verification Status
          </h3>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--space-md)",
            background: "var(--bg-secondary)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
            {verificationStatus === "full" ? (
              <CheckCircleOutlined style={{ fontSize: 24, color: "var(--status-success)" }} />
            ) : verificationStatus === "partial" ? (
              <InfoCircleOutlined style={{ fontSize: 24, color: "var(--status-pending)" }} />
            ) : (
              <CloseCircleOutlined style={{ fontSize: 24, color: "var(--text-muted)" }} />
            )}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                {verificationStatus === "full"
                  ? "Fully Verified"
                  : verificationStatus === "partial"
                  ? "Partially Verified"
                  : "Not Verified"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                {verificationStatus !== "none"
                  ? "Source code is available on Sourcify"
                  : "Source code is not available"}
              </div>
            </div>
          </div>

          {verificationStatus !== "none" && (
            <a
              href={`https://sourcify.dev/#/lookup/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: "var(--text-accent)",
                fontSize: 12,
                textDecoration: "none",
                padding: "6px 12px",
                background: "var(--bg-tertiary)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              View on Sourcify
            </a>
          )}
        </div>
      </div>
    </div>
  );

  // Source Code Tab
  const SourceCodeTab = () => {
    if (!verifiedContract || Object.keys(verifiedContract.sources).length === 0) {
      return (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-xl)",
            textAlign: "center",
          }}
        >
          <CloseCircleOutlined style={{ fontSize: 48, color: "var(--text-muted)", marginBottom: "var(--space-md)" }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: "var(--space-sm)" }}>
            Source Code Not Available
          </h3>
          <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-md)" }}>
            This contract has not been verified on Sourcify.
          </p>
          <a
            href="https://sourcify.dev/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--flow-green)",
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            Learn about contract verification
          </a>
        </div>
      );
    }

    return (
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-lg)",
        }}
      >
        <ContractCode sources={verifiedContract.sources} compiler={verifiedContract.compiler} />
      </div>
    );
  };

  // Read Contract Tab
  const ReadContractTab = () => {
    if (!verifiedContract || !verifiedContract.abi || verifiedContract.abi.length === 0) {
      return (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-xl)",
            textAlign: "center",
          }}
        >
          <ReadOutlined style={{ fontSize: 48, color: "var(--text-muted)", marginBottom: "var(--space-md)" }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: "var(--space-sm)" }}>
            ABI Not Available
          </h3>
          <p style={{ color: "var(--text-muted)" }}>
            Contract must be verified to interact with read functions.
          </p>
        </div>
      );
    }

    const readFunctions = verifiedContract.abi.filter(
      (item) =>
        item.type === "function" && (item.stateMutability === "view" || item.stateMutability === "pure")
    );

    if (readFunctions.length === 0) {
      return (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-xl)",
            textAlign: "center",
          }}
        >
          <ReadOutlined style={{ fontSize: 48, color: "var(--text-muted)", marginBottom: "var(--space-md)" }} />
          <p style={{ color: "var(--text-muted)" }}>No read functions available in this contract.</p>
        </div>
      );
    }

    return (
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-lg)",
        }}
      >
        <div
          style={{
            background: "var(--bg-secondary)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-md)",
            marginBottom: "var(--space-lg)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-sm)",
          }}
        >
          <InfoCircleOutlined style={{ color: "var(--text-muted)", fontSize: 16 }} />
          <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            Read functions allow you to query contract state without making a transaction.
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          {readFunctions.map((func, index) => {
            const inputs = func.inputs?.map((i: any) => `${i.type} ${i.name}`).join(", ") || "";
            const outputs = func.outputs?.map((o: any) => o.type).join(", ") || "";
            const signature = `${func.name}(${inputs})${outputs ? ` returns (${outputs})` : ""}`;

            return (
              <div
                key={`${func.name}-${index}`}
                style={{
                  padding: "var(--space-md)",
                  background: "var(--bg-secondary)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <code
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      color: "var(--text-primary)",
                    }}
                  >
                    {signature}
                  </code>
                  <Tag
                    style={{
                      background: "rgba(34, 197, 94, 0.1)",
                      border: "none",
                      color: "var(--status-success)",
                    }}
                  >
                    {func.stateMutability}
                  </Tag>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Write Contract Tab
  const WriteContractTab = () => {
    if (!verifiedContract || !verifiedContract.abi || verifiedContract.abi.length === 0) {
      return (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-xl)",
            textAlign: "center",
          }}
        >
          <EditOutlined style={{ fontSize: 48, color: "var(--text-muted)", marginBottom: "var(--space-md)" }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: "var(--space-sm)" }}>
            ABI Not Available
          </h3>
          <p style={{ color: "var(--text-muted)" }}>
            Contract must be verified to interact with write functions.
          </p>
        </div>
      );
    }

    const writeFunctions = verifiedContract.abi.filter(
      (item) =>
        item.type === "function" &&
        item.stateMutability !== "view" &&
        item.stateMutability !== "pure"
    );

    if (writeFunctions.length === 0) {
      return (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-xl)",
            textAlign: "center",
          }}
        >
          <EditOutlined style={{ fontSize: 48, color: "var(--text-muted)", marginBottom: "var(--space-md)" }} />
          <p style={{ color: "var(--text-muted)" }}>No write functions available in this contract.</p>
        </div>
      );
    }

    return (
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-lg)",
        }}
      >
        <div
          style={{
            background: "var(--bg-secondary)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-md)",
            marginBottom: "var(--space-lg)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-sm)",
          }}
        >
          <InfoCircleOutlined style={{ color: "var(--text-muted)", fontSize: 16 }} />
          <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            Write functions require a wallet connection and will create blockchain transactions.
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          {writeFunctions.map((func, index) => {
            const inputs = func.inputs?.map((i: any) => `${i.type} ${i.name}`).join(", ") || "";
            const signature = `${func.name}(${inputs})`;
            const isPayable = func.stateMutability === "payable";

            return (
              <div
                key={`${func.name}-${index}`}
                style={{
                  padding: "var(--space-md)",
                  background: "var(--bg-secondary)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <code
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      color: "var(--text-primary)",
                    }}
                  >
                    {signature}
                  </code>
                  <div style={{ display: "flex", gap: 6 }}>
                    {isPayable && (
                      <Tag
                        style={{
                          background: "rgba(234, 179, 8, 0.1)",
                          border: "none",
                          color: "var(--status-pending)",
                        }}
                      >
                        payable
                      </Tag>
                    )}
                    <Tag
                      style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "none",
                        color: "#ef4444",
                      }}
                    >
                      {func.stateMutability || "nonpayable"}
                    </Tag>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ABI Tab
  const ABITab = () => {
    if (!verifiedContract || !verifiedContract.abi || verifiedContract.abi.length === 0) {
      return (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-xl)",
            textAlign: "center",
          }}
        >
          <ApiOutlined style={{ fontSize: 48, color: "var(--text-muted)", marginBottom: "var(--space-md)" }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: "var(--space-sm)" }}>
            ABI Not Available
          </h3>
          <p style={{ color: "var(--text-muted)" }}>This contract has not been verified.</p>
        </div>
      );
    }

    return (
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-lg)",
        }}
      >
        <ContractABI abi={verifiedContract.abi} />
      </div>
    );
  };

  // Bytecode Tab
  const BytecodeTab = () => (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-lg)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-md)",
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
          Contract Bytecode
        </h3>
        <button
          onClick={() => handleCopy(bytecode)}
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
          }}
        >
          {copied ? <CheckOutlined /> : <CopyOutlined />}
          {copied ? "Copied" : "Copy Bytecode"}
        </button>
      </div>
      <div
        className="mono"
        style={{
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-md)",
          fontSize: 11,
          color: "var(--text-secondary)",
          wordBreak: "break-all",
          maxHeight: 600,
          overflow: "auto",
          lineHeight: 1.6,
        }}
      >
        {bytecode}
      </div>
      <div
        style={{
          marginTop: "var(--space-md)",
          padding: "var(--space-sm)",
          background: "var(--bg-tertiary)",
          borderRadius: "var(--radius-sm)",
          fontSize: 12,
          color: "var(--text-muted)",
        }}
      >
        Size: {bytecodeSize.toLocaleString()} bytes ({((bytecodeSize / 24576) * 100).toFixed(2)}% of max contract size)
      </div>
    </div>
  );

  const tabItems = [
    {
      key: "overview",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <InfoCircleOutlined />
          Overview
        </span>
      ),
      children: <OverviewTab />,
    },
    {
      key: "code",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <FileTextOutlined />
          Source Code
        </span>
      ),
      children: <SourceCodeTab />,
    },
    {
      key: "read",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ReadOutlined />
          Read Contract
        </span>
      ),
      children: <ReadContractTab />,
    },
    {
      key: "write",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <EditOutlined />
          Write Contract
        </span>
      ),
      children: <WriteContractTab />,
    },
    {
      key: "abi",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ApiOutlined />
          ABI
        </span>
      ),
      children: <ABITab />,
    },
    {
      key: "bytecode",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <CodeOutlined />
          Bytecode
        </span>
      ),
      children: <BytecodeTab />,
    },
  ];

  return (
    <div className="container">
      {/* Header */}
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-sm)" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
            {verifiedContract?.name || "Smart Contract"}
          </h1>
          <Tag
            icon={
              verificationStatus === "full" ? (
                <CheckCircleOutlined />
              ) : verificationStatus === "partial" ? (
                <InfoCircleOutlined />
              ) : (
                <CloseCircleOutlined />
              )
            }
            color={
              verificationStatus === "full" ? "success" : verificationStatus === "partial" ? "warning" : "default"
            }
          >
            {verificationStatus === "full"
              ? "Verified"
              : verificationStatus === "partial"
              ? "Partially Verified"
              : "Not Verified"}
          </Tag>
          <Tag color="purple">Contract</Tag>
        </div>
        <p className="mono" style={{ color: "var(--text-muted)", fontSize: 13, wordBreak: "break-all" }}>
          {address}
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        defaultActiveKey="overview"
        items={tabItems}
        style={{
          color: "var(--text-primary)",
        }}
        className="contract-tabs"
      />

      {/* Add custom styles for Ant Design tabs */}
      <style jsx global>{`
        .contract-tabs .ant-tabs-nav::before {
          border-bottom-color: var(--border-subtle) !important;
        }

        .contract-tabs .ant-tabs-tab {
          color: var(--text-muted) !important;
          font-weight: 500;
        }

        .contract-tabs .ant-tabs-tab:hover {
          color: var(--text-primary) !important;
        }

        .contract-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: var(--flow-green) !important;
        }

        .contract-tabs .ant-tabs-ink-bar {
          background: var(--flow-green) !important;
        }

        .contract-tabs .ant-tabs-content-holder {
          padding-top: var(--space-lg);
        }
      `}</style>
    </div>
  );
}
