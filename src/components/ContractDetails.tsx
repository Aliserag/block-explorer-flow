"use client";

import { useEffect, useState } from "react";
import { Spin, Tag, Tabs } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SafetyCertificateOutlined,
  CodeOutlined,
  FileTextOutlined,
  ApiOutlined,
} from "@ant-design/icons";
import { checkVerification, getVerifiedSources, type VerificationStatus, type VerifiedContract } from "@/lib/sourcify";
import ContractCode from "./ContractCode";
import ContractABI from "./ContractABI";

interface ContractDetailsProps {
  address: string;
  bytecode: string;
}

export default function ContractDetails({ address, bytecode }: ContractDetailsProps) {
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("none");
  const [contract, setContract] = useState<VerifiedContract | null>(null);

  useEffect(() => {
    async function fetchContractDetails() {
      setLoading(true);
      try {
        // Check verification status
        const status = await checkVerification(address);
        setVerificationStatus(status);

        // If verified, get source files
        if (status !== "none") {
          const sources = await getVerifiedSources(address);
          setContract(sources);
        }
      } catch (error) {
        console.error("Error fetching contract details:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchContractDetails();
  }, [address]);

  if (loading) {
    return (
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-xl)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 200,
        }}
      >
        <Spin size="large" />
        <p style={{ marginTop: "var(--space-md)", color: "var(--text-muted)" }}>
          Checking contract verification...
        </p>
      </div>
    );
  }

  // Not verified - show bytecode only
  if (verificationStatus === "none" || !contract) {
    return (
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-lg)",
        }}
      >
        {/* Header with verification status */}
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
            Contract Bytecode
          </h3>
          <Tag
            icon={<CloseCircleOutlined />}
            color="default"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            Not Verified
          </Tag>
        </div>

        {/* Info message */}
        <div
          style={{
            background: "var(--bg-secondary)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-md)",
            marginBottom: "var(--space-md)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-sm)",
          }}
        >
          <SafetyCertificateOutlined style={{ color: "var(--text-muted)", fontSize: 16 }} />
          <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            This contract is not verified on Sourcify. Only bytecode is available.
          </span>
        </div>

        {/* Bytecode display */}
        <div
          className="mono"
          style={{
            background: "var(--bg-secondary)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-md)",
            fontSize: 11,
            color: "var(--text-secondary)",
            wordBreak: "break-all",
            maxHeight: 300,
            overflow: "auto",
          }}
        >
          {bytecode}
        </div>
      </div>
    );
  }

  // Verified contract - show source code and ABI
  const tabItems = [
    {
      key: "code",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <FileTextOutlined />
          Source Code
        </span>
      ),
      children: <ContractCode sources={contract.sources} compiler={contract.compiler} />,
    },
    {
      key: "abi",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ApiOutlined />
          ABI
        </span>
      ),
      children: <ContractABI abi={contract.abi} />,
    },
    {
      key: "bytecode",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <CodeOutlined />
          Bytecode
        </span>
      ),
      children: (
        <div
          className="mono"
          style={{
            background: "var(--bg-secondary)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-md)",
            fontSize: 11,
            color: "var(--text-secondary)",
            wordBreak: "break-all",
            maxHeight: 400,
            overflow: "auto",
          }}
        >
          {bytecode}
        </div>
      ),
    },
  ];

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-lg)",
      }}
    >
      {/* Header with verification badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-lg)",
          paddingBottom: "var(--space-md)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {contract.name}
          </h3>
          <Tag
            icon={<CheckCircleOutlined />}
            color={verificationStatus === "full" ? "success" : "warning"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {verificationStatus === "full" ? "Fully Verified" : "Partially Verified"}
          </Tag>
        </div>
        <a
          href={`https://sourcify.dev/#/lookup/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: "var(--text-muted)",
            fontSize: 12,
          }}
        >
          <SafetyCertificateOutlined />
          View on Sourcify
        </a>
      </div>

      {/* Tabs for code, ABI, bytecode */}
      <Tabs
        items={tabItems}
        defaultActiveKey="code"
        style={{
          marginTop: "var(--space-sm)",
        }}
      />
    </div>
  );
}
