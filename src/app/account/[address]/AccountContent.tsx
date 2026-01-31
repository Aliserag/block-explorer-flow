"use client";

import { useEffect, useState } from "react";
import { Tag, Tabs, Pagination, Skeleton } from "antd";
import {
  WalletOutlined,
  CodeOutlined,
  SwapOutlined,
  DollarOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import DataField from "@/components/DataField";
import TokenList from "@/components/TokenList";
import ContractDetails from "@/components/ContractDetails";
import Link from "next/link";

interface Transaction {
  hash: string;
  from: string;
  to: string | null;
  blockNumber: string;
  value?: string;
  timestamp?: string;
  status?: number | null;
}

interface AccountContentProps {
  address: string;
  balance: {
    wei: bigint;
    formatted: string;
  };
  transactionCount: number;
  code: string;
  isContract: boolean;
  txHistory: Transaction[];
}

const PAGE_SIZE = 25;

// Detect Flow COA (Cadence Owned Account) - addresses starting with leading zeros
function isCOA(address: string): boolean {
  // COA addresses on Flow EVM have many leading zeros
  // Check for at least 20 leading zeros (10 zero bytes) after 0x
  // Example: 0x00000000000000000000000235F48d21dc84fFcE
  const addr = address.toLowerCase();
  if (!addr.startsWith("0x")) return false;

  // Count leading zeros after 0x
  const hex = addr.slice(2);
  let zeroCount = 0;
  for (const char of hex) {
    if (char === "0") zeroCount++;
    else break;
  }

  // COA typically has 20+ leading zeros (address is derived from Cadence address)
  return zeroCount >= 20;
}

// Get account type label and color
function getAccountType(address: string, isContract: boolean): { label: string; title: string; color: string } {
  if (isCOA(address)) {
    return { label: "COA", title: "Cadence Owned Account", color: "green" };
  }
  if (isContract) {
    return { label: "Contract", title: "Smart Contract", color: "purple" };
  }
  return { label: "EOA", title: "Externally Owned Account", color: "blue" };
}

export default function AccountContent({
  address,
  balance,
  transactionCount,
  code,
  isContract,
  txHistory: initialTxHistory,
}: AccountContentProps) {
  // Determine account type
  const accountType = getAccountType(address, isContract);

  // Transaction pagination state
  const [txHistory, setTxHistory] = useState<Transaction[]>(initialTxHistory);
  const [currentPage, setCurrentPage] = useState(1);
  const [txLoading, setTxLoading] = useState(false);
  const [totalTxCount, setTotalTxCount] = useState(transactionCount);
  const [usePonder, setUsePonder] = useState(false);

  // Fetch transactions with pagination (tries Ponder first)
  useEffect(() => {
    let mounted = true;

    async function fetchTransactions() {
      // Only fetch if we're on page > 1 or if we want to try Ponder
      if (currentPage === 1 && initialTxHistory.length > 0 && !usePonder) {
        return; // Use initial data for page 1
      }

      setTxLoading(true);

      try {
        // Try Ponder indexed data first
        const offset = (currentPage - 1) * PAGE_SIZE;
        const ponderUrl = `/api/transactions/indexed?address=${address}&limit=${PAGE_SIZE}&offset=${offset}`;

        const response = await fetch(ponderUrl);
        if (response.ok) {
          const data = await response.json();
          // Only use Ponder if it actually has transactions
          if (data.available && data.transactions && data.transactions.length > 0) {
            if (mounted) {
              setTxHistory(data.transactions);
              setTotalTxCount(data.totalCount || transactionCount);
              setUsePonder(true);
              setTxLoading(false);
            }
            return;
          }
        }
      } catch {
        // Ponder not available
      }

      // Fall back to initial data (from RPC scan) for any page
      if (mounted) {
        if (currentPage === 1) {
          setTxHistory(initialTxHistory);
        }
        setUsePonder(false);
        setTxLoading(false);
      }
    }

    fetchTransactions();

    return () => {
      mounted = false;
    };
  }, [currentPage, address, initialTxHistory, transactionCount, usePonder]);

  // Overview tab content
  const OverviewTab = () => (
    <>
      {/* Balance Card */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--flow-green) 0%, var(--flow-green-dark) 100%)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-xl)",
          marginBottom: "var(--space-xl)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            className="mono"
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.8)",
              marginBottom: "var(--space-xs)",
            }}
          >
            Balance
          </div>
          <div className="mono" style={{ fontSize: 32, fontWeight: 700, color: "white" }}>
            {parseFloat(balance.formatted).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6,
            })}{" "}
            <span style={{ fontSize: 20, opacity: 0.8 }}>FLOW</span>
          </div>
        </div>
        <div
          style={{
            width: 64,
            height: 64,
            background: "rgba(255,255,255,0.2)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
            <path d="M12 6V18M18 12H6" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Token Holdings */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-lg)",
          marginBottom: "var(--space-xl)",
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: "var(--space-md)", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
          <DollarOutlined /> Token Holdings
        </h3>
        <TokenList address={address} />
      </div>

      {/* Account Details */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-lg)",
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: "var(--space-md)", color: "var(--text-primary)" }}>
          Account Details
        </h3>
        <DataField label="Address" value={address} mono copyable />
        <DataField label="Balance (wei)" value={balance.wei.toString()} mono />
        <DataField label="Transaction Count" value={transactionCount} />
        <DataField label="Type" value={`${accountType.title} (${accountType.label})`} />
      </div>
    </>
  );

  // Transactions tab content with pagination
  const TransactionsTab = () => {
    const totalPages = Math.ceil(totalTxCount / PAGE_SIZE);
    const showPagination = totalTxCount > PAGE_SIZE;

    return (
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-lg)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-lg)" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
            Transaction History
          </h3>
          {usePonder && (
            <span
              style={{
                fontSize: 11,
                color: "var(--flow-green)",
                background: "rgba(0, 239, 139, 0.1)",
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              Indexed
            </span>
          )}
        </div>

        {/* Transaction count banner */}
        <div
          style={{
            background: "var(--bg-tertiary)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-md)",
            marginBottom: "var(--space-lg)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-md)",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius-md)",
              background: "rgba(0, 239, 139, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--flow-green)",
            }}
          >
            <SwapOutlined style={{ fontSize: 20 }} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)" }}>
              {totalTxCount.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Total Transactions
            </div>
          </div>
        </div>

        {txLoading ? (
          // Loading skeleton
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton.Input key={i} active style={{ width: "100%", height: 48 }} />
            ))}
          </div>
        ) : txHistory.length === 0 ? (
          <div
            style={{
              padding: "var(--space-xl)",
              textAlign: "center",
              color: "var(--text-muted)",
              background: "var(--bg-secondary)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <SwapOutlined style={{ fontSize: 32, marginBottom: "var(--space-md)", opacity: 0.5 }} />
            <p style={{ marginBottom: "var(--space-xs)" }}>
              No transactions found.
            </p>
            <p style={{ fontSize: 13 }}>
              {usePonder
                ? "This account has no indexed transactions yet."
                : "Full transaction history requires the indexer to be running."}
            </p>
          </div>
        ) : (
          <>
            {/* Transaction table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <th style={{ padding: "var(--space-sm) var(--space-md)", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Txn Hash
                    </th>
                    <th style={{ padding: "var(--space-sm) var(--space-md)", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Block
                    </th>
                    <th style={{ padding: "var(--space-sm) var(--space-md)", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Direction
                    </th>
                    <th style={{ padding: "var(--space-sm) var(--space-md)", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                      From
                    </th>
                    <th style={{ padding: "var(--space-sm) var(--space-md)", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                      To
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {txHistory.map((tx, index) => {
                    const isOut = tx.from.toLowerCase() === address.toLowerCase();
                    return (
                      <tr
                        key={tx.hash}
                        style={{
                          borderBottom: index < txHistory.length - 1 ? "1px solid var(--border-subtle)" : "none",
                          background: index % 2 === 0 ? "transparent" : "var(--bg-secondary)",
                        }}
                      >
                        <td style={{ padding: "var(--space-md)" }}>
                          <Link
                            href={`/tx/${tx.hash}`}
                            className="mono"
                            style={{ color: "var(--flow-green)", fontSize: 13, textDecoration: "none" }}
                          >
                            {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}
                          </Link>
                        </td>
                        <td style={{ padding: "var(--space-md)" }}>
                          <Link
                            href={`/block/${tx.blockNumber}`}
                            className="mono"
                            style={{ color: "var(--text-accent)", fontSize: 13, textDecoration: "none" }}
                          >
                            {tx.blockNumber}
                          </Link>
                        </td>
                        <td style={{ padding: "var(--space-md)" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 600,
                              background: isOut ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.15)",
                              color: isOut ? "#ef4444" : "#22c55e",
                            }}
                          >
                            {isOut ? "OUT" : "IN"}
                          </span>
                        </td>
                        <td style={{ padding: "var(--space-md)" }}>
                          <Link
                            href={`/account/${tx.from}`}
                            className="mono"
                            style={{
                              color: isOut ? "var(--text-secondary)" : "var(--text-accent)",
                              fontSize: 13,
                              textDecoration: "none",
                            }}
                          >
                            {tx.from.slice(0, 8)}...{tx.from.slice(-6)}
                          </Link>
                        </td>
                        <td style={{ padding: "var(--space-md)" }}>
                          {tx.to ? (
                            <Link
                              href={`/account/${tx.to}`}
                              className="mono"
                              style={{
                                color: isOut ? "var(--text-accent)" : "var(--text-secondary)",
                                fontSize: 13,
                                textDecoration: "none",
                              }}
                            >
                              {tx.to.slice(0, 8)}...{tx.to.slice(-6)}
                            </Link>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Contract Creation</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {showPagination && (
              <div
                style={{
                  marginTop: "var(--space-lg)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "var(--space-md)",
                }}
              >
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: "var(--space-sm) var(--space-md)",
                    background: currentPage === 1 ? "var(--bg-tertiary)" : "var(--bg-secondary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    color: currentPage === 1 ? "var(--text-muted)" : "var(--text-primary)",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 13,
                  }}
                >
                  <LeftOutlined style={{ fontSize: 10 }} /> Prev
                </button>

                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  Page {currentPage} of {totalPages.toLocaleString()}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: "var(--space-sm) var(--space-md)",
                    background: currentPage === totalPages ? "var(--bg-tertiary)" : "var(--bg-secondary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    color: currentPage === totalPages ? "var(--text-muted)" : "var(--text-primary)",
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 13,
                  }}
                >
                  Next <RightOutlined style={{ fontSize: 10 }} />
                </button>
              </div>
            )}

            {/* Info footer */}
            <div
              style={{
                marginTop: "var(--space-lg)",
                padding: "var(--space-md)",
                background: "var(--bg-secondary)",
                borderRadius: "var(--radius-md)",
                fontSize: 12,
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              {usePonder ? (
                <>Showing page {currentPage} of indexed transactions.</>
              ) : (
                <>
                  Showing {txHistory.length} recent transactions from scanned blocks.
                  {transactionCount > txHistory.length && (
                    <> Enable the indexer for full history with pagination.</>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // Contract code tab content (only for contracts)
  const ContractTab = () => (
    <ContractDetails address={address} bytecode={code} />
  );

  // Build tabs based on account type
  const tabItems = [
    {
      key: "overview",
      label: (
        <span>
          <WalletOutlined /> Overview
        </span>
      ),
      children: <OverviewTab />,
    },
    {
      key: "transactions",
      label: (
        <span>
          <SwapOutlined /> Transactions
        </span>
      ),
      children: <TransactionsTab />,
    },
  ];

  // Add Contract tab only for contracts
  if (isContract) {
    tabItems.push({
      key: "contract",
      label: (
        <span>
          <CodeOutlined /> Contract
        </span>
      ),
      children: <ContractTab />,
    });
  }

  return (
    <div className="container">
      {/* Header */}
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-sm)" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
            {accountType.title}
          </h1>
          <Tag color={accountType.color}>{accountType.label}</Tag>
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
        className="account-tabs"
      />

      {/* Add custom styles for Ant Design tabs */}
      <style jsx global>{`
        .account-tabs .ant-tabs-nav::before {
          border-bottom-color: var(--border-subtle) !important;
        }

        .account-tabs .ant-tabs-tab {
          color: var(--text-muted) !important;
          font-weight: 500;
        }

        .account-tabs .ant-tabs-tab:hover {
          color: var(--text-primary) !important;
        }

        .account-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: var(--flow-green) !important;
        }

        .account-tabs .ant-tabs-ink-bar {
          background: var(--flow-green) !important;
        }

        .account-tabs .ant-tabs-content-holder {
          padding-top: var(--space-lg);
        }
      `}</style>
    </div>
  );
}
