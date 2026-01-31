"use client";

import { type TokenBalance, formatTokenBalance } from "@/lib/tokens";
import { getTokenLogoUrl } from "@/lib/tokenLogo";
import AddToWalletButton from "./AddToWalletButton";

interface TokenRowProps {
  tokenBalance: TokenBalance;
}

export default function TokenRow({ tokenBalance }: TokenRowProps) {
  const { token, formattedBalance } = tokenBalance;

  // Get logo URL - uses registry logo if available, otherwise generates deterministic default
  const logoUrl = getTokenLogoUrl(token.address, token.symbol, token.logoURI);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "var(--space-md)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-secondary)",
        transition: "background 0.2s",
        gap: "var(--space-sm)",
      }}
    >
      {/* Token Icon */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginRight: "var(--space-md)",
          flexShrink: 0,
          background: "var(--bg-tertiary)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={token.symbol}
          style={{ width: 40, height: 40, borderRadius: "50%" }}
          onError={(e) => {
            // Fallback if external image fails
            const target = e.target as HTMLImageElement;
            target.src = getTokenLogoUrl(token.address, token.symbol, null);
          }}
        />
      </div>

      {/* Token Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-sm)",
            marginBottom: 2,
          }}
        >
          <span
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: "var(--text-primary)",
            }}
          >
            {token.symbol}
          </span>
          <span
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            {token.name}
          </span>
        </div>
        <div
          className="mono"
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {token.address.slice(0, 10)}...{token.address.slice(-8)}
        </div>
      </div>

      {/* Balance */}
      <div style={{ textAlign: "right", marginLeft: "var(--space-md)" }}>
        <div
          className="mono"
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {formatTokenBalance(formattedBalance)}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          {token.symbol}
        </div>
      </div>

      {/* Add to Wallet Button */}
      <AddToWalletButton
        tokenAddress={token.address}
        tokenSymbol={token.symbol}
        tokenDecimals={token.decimals}
        tokenImage={logoUrl}
      />
    </div>
  );
}
