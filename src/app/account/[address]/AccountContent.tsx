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
import { networkPath } from "@/lib/links";
import type { NetworkId } from "@/lib/chains";

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
  network?: NetworkId;
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
  network = "mainnet",
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
        // Try Ponder indexed data first (only for mainnet)
        const offset = (currentPage - 1) * PAGE_SIZE;
        const ponderUrl = `/api/transactions/indexed?address=${address}&limit=${PAGE_SIZE}&offset=${offset}&network=${network}`;

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
        <TokenList address={address} network={network} />
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

  // Transaction filter state
  const [directionFilter, setDirectionFilter] = useState<"all" | "in" | "out">("all");

  // Format timestamp to readable date/time
  const formatTimestamp = (timestamp: string | undefined): string => {
    if (!timestamp) return "-";
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Relative time (e.g., "2 mins ago")
  const getRelativeTime = (timestamp: string | undefined): string => {
    if (!timestamp) return "";
    const now = Date.now();
    const then = Number(timestamp) * 1000;
    const diff = now - then;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    return "";
  };

  // Transactions tab content with pagination
  const TransactionsTab = () => {
    // Filter transactions by direction
    const filteredTxHistory = txHistory.filter((tx) => {
      if (directionFilter === "all") return true;
      const isOut = tx.from.toLowerCase() === address.toLowerCase();
      return directionFilter === "out" ? isOut : !isOut;
    });

    // Only show pagination if we actually have more data to show
    // If current page has fewer items than PAGE_SIZE, there's no next page
    const hasMoreData = txHistory.length >= PAGE_SIZE;
    const totalPages = hasMoreData ? Math.ceil(totalTxCount / PAGE_SIZE) : currentPage;
    const showPagination = totalTxCount > PAGE_SIZE && (currentPage > 1 || hasMoreData);

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
              Full History
            </span>
          )}
        </div>

        {/* Transaction count banner and filters */}
        <div
          style={{
            background: "var(--bg-tertiary)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-md)",
            marginBottom: "var(--space-lg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "var(--space-md)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
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

          {/* Direction Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", marginRight: 4 }}>Filter:</span>
            {(["all", "in", "out"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setDirectionFilter(filter)}
                style={{
                  padding: "4px 12px",
                  fontSize: 12,
                  fontWeight: 500,
                  border: "1px solid",
                  borderColor: directionFilter === filter ? "var(--flow-green)" : "var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  background: directionFilter === filter ? "rgba(0, 239, 139, 0.15)" : "transparent",
                  color: directionFilter === filter ? "var(--flow-green)" : "var(--text-secondary)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textTransform: "capitalize",
                }}
              >
                {filter === "all" ? "All" : filter === "in" ? "Received" : "Sent"}
              </button>
            ))}
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
              This account has no transaction history on Flow EVM.
            </p>
          </div>
        ) : filteredTxHistory.length === 0 ? (
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
              No {directionFilter === "in" ? "received" : "sent"} transactions found.
            </p>
            <p style={{ fontSize: 13 }}>
              <button
                onClick={() => setDirectionFilter("all")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--flow-green)",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Show all transactions
              </button>
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
                      Date/Time
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
                  {filteredTxHistory.map((tx, index) => {
                    const isOut = tx.from.toLowerCase() === address.toLowerCase();
                    return (
                      <tr
                        key={tx.hash}
                        style={{
                          borderBottom: index < filteredTxHistory.length - 1 ? "1px solid var(--border-subtle)" : "none",
                          background: index % 2 === 0 ? "transparent" : "var(--bg-secondary)",
                        }}
                      >
                        <td style={{ padding: "var(--space-md)" }}>
                          <Link
                            href={networkPath(`/tx/${tx.hash}`, network)}
                            className="mono"
                            style={{ color: "var(--flow-green)", fontSize: 13, textDecoration: "none" }}
                          >
                            {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}
                          </Link>
                        </td>
                        <td style={{ padding: "var(--space-md)" }}>
                          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                            {formatTimestamp(tx.timestamp)}
                          </div>
                          {tx.timestamp && (
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                              {getRelativeTime(tx.timestamp)}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "var(--space-md)" }}>
                          <Link
                            href={networkPath(`/block/${tx.blockNumber}`, network)}
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
                            href={networkPath(`/account/${tx.from}`, network)}
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
                              href={networkPath(`/account/${tx.to}`, network)}
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
              Showing page {currentPage} of transactions. Historical data coverage is expanding daily.
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

  // Add Contract tab only for actual contracts (not COAs)
  const showContractTab = isContract && !isCOA(address);
  if (showContractTab) {
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-sm)", flexWrap: "wrap", gap: "var(--space-md)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
              {accountType.title}
            </h1>
            <Tag color={accountType.color}>{accountType.label}</Tag>
          </div>
          {showContractTab && (
            <Link
              href={networkPath(`/contract/${address}`, network)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                background: "var(--flow-green)",
                color: "white",
                borderRadius: "var(--radius-md)",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 600,
                transition: "all 0.2s",
              }}
            >
              <CodeOutlined />
              View Contract Details
            </Link>
          )}
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
