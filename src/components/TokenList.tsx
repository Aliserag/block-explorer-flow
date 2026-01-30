"use client";

import { useEffect, useState } from "react";
import { Skeleton, Empty } from "antd";
import { WalletOutlined } from "@ant-design/icons";
import TokenRow from "./TokenRow";
import { type TokenBalance } from "@/lib/tokens";

interface TokenListProps {
  address: string;
}

interface ApiTokenResponse {
  address: string;
  tokenCount: number;
  tokens: Array<{
    symbol: string;
    name: string;
    address: string;
    balance: string;
    rawBalance: string;
    decimals?: number;
    logoURI?: string | null;
  }>;
}

interface DiscoveredTokenResponse {
  available: boolean;
  address: string;
  tokenCount: number;
  tokens: Array<{
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    balance: string;
    rawBalance: string;
    logoURI: string;
    fromPonder: boolean;
  }>;
}

export default function TokenList({ address }: TokenListProps) {
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"ponder" | "multicall" | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchBalances() {
      try {
        setLoading(true);
        setError(null);

        // Try Ponder-discovered tokens first
        try {
          const ponderResponse = await fetch(`/api/tokens/discovered?address=${address}`);
          if (ponderResponse.ok) {
            const ponderData: DiscoveredTokenResponse = await ponderResponse.json();
            if (ponderData.available && ponderData.tokenCount > 0) {
              if (mounted) {
                const tokenBalances: TokenBalance[] = ponderData.tokens.map((t) => ({
                  token: {
                    address: t.address,
                    name: t.name,
                    symbol: t.symbol,
                    decimals: t.decimals,
                    logoURI: t.logoURI,
                  },
                  balance: BigInt(t.rawBalance),
                  formattedBalance: t.balance,
                }));
                setBalances(tokenBalances);
                setSource("ponder");
                return;
              }
            }
          }
        } catch {
          // Ponder not available, fall through to multicall
        }

        // Fall back to multicall-based API
        const response = await fetch(`/api/tokens/${address}`);
        if (!response.ok) {
          throw new Error("Failed to fetch token balances");
        }

        const data: ApiTokenResponse = await response.json();

        if (mounted) {
          const tokenBalances: TokenBalance[] = data.tokens.map((t) => ({
            token: {
              address: t.address as `0x${string}`,
              name: t.name,
              symbol: t.symbol,
              decimals: t.decimals || 18,
              logoURI: t.logoURI || null,
            },
            balance: BigInt(t.rawBalance),
            formattedBalance: t.balance,
          }));
          setBalances(tokenBalances);
          setSource("multicall");
        }
      } catch (err) {
        console.error("Error fetching token balances:", err);
        if (mounted) {
          setError("Failed to fetch token balances");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchBalances();

    return () => {
      mounted = false;
    };
  }, [address]);

  // Loading skeleton
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "var(--space-md)",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-secondary)",
            }}
          >
            <Skeleton.Avatar active size={40} style={{ marginRight: "var(--space-md)" }} />
            <div style={{ flex: 1 }}>
              <Skeleton.Input active size="small" style={{ width: 120, marginBottom: 4 }} />
              <Skeleton.Input active size="small" style={{ width: 200 }} />
            </div>
            <Skeleton.Input active size="small" style={{ width: 80 }} />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        style={{
          padding: "var(--space-xl)",
          textAlign: "center",
          color: "var(--status-error)",
        }}
      >
        <p>{error}</p>
      </div>
    );
  }

  // Empty state
  if (balances.length === 0) {
    return (
      <Empty
        image={<WalletOutlined style={{ fontSize: 48, color: "var(--text-muted)" }} />}
        description={
          <span style={{ color: "var(--text-muted)" }}>No token holdings found</span>
        }
        style={{
          padding: "var(--space-2xl)",
        }}
      />
    );
  }

  // Token list
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--space-md)",
        }}
      >
        <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          {balances.length} token{balances.length !== 1 ? "s" : ""} found
        </span>
        {source === "ponder" && (
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

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        {balances.map((tokenBalance) => (
          <TokenRow key={tokenBalance.token.address} tokenBalance={tokenBalance} />
        ))}
      </div>

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
        {source === "ponder" ? (
          <>Token balances discovered from on-chain Transfer events.</>
        ) : (
          <>
            Token balances are fetched from known ERC-20 contracts on Flow EVM.
            <br />
            Some tokens may not be listed.
          </>
        )}
      </div>
    </div>
  );
}
