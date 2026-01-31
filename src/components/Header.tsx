"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Select, Button } from "antd";
import { MenuOutlined } from "@ant-design/icons";
import { useState } from "react";
import MobileNav, { openMobileNav } from "./MobileNav";
import SearchBar from "./SearchBar";

export default function Header() {
  const [network, setNetwork] = useState<"mainnet" | "testnet">("mainnet");
  const pathname = usePathname();

  return (
    <header
      style={{
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border-subtle)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="container">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 72,
            gap: "var(--space-lg)",
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-sm)",
              color: "var(--text-primary)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                background: "var(--flow-green)",
                borderRadius: "var(--radius-md)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gridTemplateRows: "1fr 1fr",
                gap: 3,
                padding: 6,
              }}
            >
              <div style={{ background: "white", borderRadius: 2 }} />
              <div style={{ background: "white", borderRadius: 2 }} />
              <div style={{ background: "white", borderRadius: 2 }} />
              <div style={{ background: "white", borderRadius: "50%" }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em" }}>
                Flow EVM
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Explorer
              </div>
            </div>
          </Link>

          {/* Search - Desktop only */}
          <div className="desktop-only" style={{ flex: 1, maxWidth: 600 }}>
            <SearchBar />
          </div>

          {/* Network Selector - Desktop only */}
          <div className="desktop-only">
            <Select
              value={network}
              onChange={setNetwork}
              style={{ width: 160 }}
              options={[
                {
                  value: "mainnet",
                  label: (
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "var(--flow-green)",
                        }}
                      />
                      Mainnet
                    </span>
                  ),
                },
                {
                  value: "testnet",
                  disabled: true,
                  label: (
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "var(--text-muted)",
                        }}
                      />
                      Testnet
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          background: "var(--bg-tertiary)",
                          borderRadius: 4,
                          color: "var(--text-muted)",
                        }}
                      >
                        Coming Soon
                      </span>
                    </span>
                  ),
                },
              ]}
            />
          </div>

          {/* Mobile Menu Button */}
          <Button
            type="text"
            icon={<MenuOutlined style={{ fontSize: 20, color: "var(--text-primary)" }} />}
            onClick={openMobileNav}
            className="mobile-only"
            style={{ padding: "var(--space-sm)" }}
          />

          {/* Mobile Navigation Drawer */}
          <MobileNav
            network={network}
            onNetworkChange={setNetwork}
          />
        </div>
      </div>

      {/* Nav - Desktop only */}
      <nav className="desktop-only" style={{ background: "var(--bg-tertiary)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="container">
          <div style={{ display: "flex", gap: "var(--space-md)" }}>
            {[
              { path: "/", label: "Home" },
              { path: "/blocks", label: "Blocks" },
              { path: "/defi", label: "DeFi" },
              { path: "/analytics", label: "Analytics" },
            ].map(({ path, label }) => {
              const isActive = path === "/" ? pathname === "/" : pathname.startsWith(path);
              return (
                <Link
                  key={path}
                  href={path}
                  style={{
                    padding: "var(--space-md) var(--space-sm)",
                    color: isActive ? "var(--flow-green)" : "var(--text-secondary)",
                    fontWeight: 500,
                    fontSize: 14,
                    borderBottom: isActive ? "2px solid var(--flow-green)" : "2px solid transparent",
                    marginBottom: -1,
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </header>
  );
}
