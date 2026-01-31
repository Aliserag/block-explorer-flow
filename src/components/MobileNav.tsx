"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Drawer, Select } from "antd";
import { CloseOutlined, HomeOutlined, BlockOutlined, BarChartOutlined, BankOutlined } from "@ant-design/icons";
import SearchBar from "./SearchBar";
import { networkPath, stripNetworkPrefix } from "@/lib/links";
import type { NetworkId } from "@/lib/chains";

interface MobileNavProps {
  network: NetworkId;
  onNetworkChange: (network: NetworkId) => void;
}

// Using a simple event-based approach to control the drawer from outside
let openDrawerCallback: (() => void) | null = null;

export function openMobileNav() {
  if (openDrawerCallback) {
    openDrawerCallback();
  }
}

export default function MobileNav({
  network,
  onNetworkChange,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    openDrawerCallback = () => setOpen(true);
    return () => {
      openDrawerCallback = null;
    };
  }, []);

  const navItems = [
    { path: "/", label: "Home", icon: <HomeOutlined /> },
    { path: "/blocks", label: "Blocks", icon: <BlockOutlined /> },
    { path: "/defi", label: "DeFi", icon: <BankOutlined /> },
    { path: "/analytics", label: "Analytics", icon: <BarChartOutlined /> },
  ];

  const handleNavClick = () => {
    setOpen(false);
  };

  return (
    <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
            <div
              style={{
                width: 28,
                height: 28,
                background: "var(--flow-green)",
                borderRadius: "var(--radius-sm)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gridTemplateRows: "1fr 1fr",
                gap: 2,
                padding: 4,
              }}
            >
              <div style={{ background: "white", borderRadius: 1 }} />
              <div style={{ background: "white", borderRadius: 1 }} />
              <div style={{ background: "white", borderRadius: 1 }} />
              <div style={{ background: "white", borderRadius: "50%" }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Flow EVM Explorer</span>
          </div>
        }
        placement="right"
        onClose={() => setOpen(false)}
        open={open}
        width={300}
        closeIcon={<CloseOutlined style={{ color: "var(--text-primary)" }} />}
        styles={{
          header: {
            background: "var(--bg-secondary)",
            borderBottom: "1px solid var(--border-subtle)",
          },
          body: {
            background: "var(--bg-primary)",
            padding: "var(--space-lg)",
          },
        }}
      >
        {/* Search */}
        <div style={{ marginBottom: "var(--space-xl)" }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              color: "var(--text-muted)",
              marginBottom: "var(--space-sm)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Search
          </label>
          <SearchBar placeholder="Address, tx hash, block..." />
        </div>

        {/* Network Selector */}
        <div style={{ marginBottom: "var(--space-xl)" }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              color: "var(--text-muted)",
              marginBottom: "var(--space-sm)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Network
          </label>
          <Select
            value={network}
            onChange={(value) => {
              onNetworkChange(value);
              setOpen(false);
            }}
            style={{ width: "100%" }}
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
                label: (
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#F59E0B",
                      }}
                    />
                    Testnet
                  </span>
                ),
              },
            ]}
          />
        </div>

        {/* Navigation Links */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              color: "var(--text-muted)",
              marginBottom: "var(--space-md)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Navigation
          </label>
          <nav style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
            {navItems.map(({ path, label, icon }) => {
              const fullPath = networkPath(path, network);
              const basePath = stripNetworkPrefix(pathname);
              const isActive = path === "/" ? basePath === "/" : basePath.startsWith(path);
              const accentColor = network === "testnet" ? "#F59E0B" : "var(--flow-green)";
              return (
                <Link
                  key={path}
                  href={fullPath}
                  onClick={handleNavClick}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-md)",
                    padding: "var(--space-md)",
                    borderRadius: "var(--radius-md)",
                    background: isActive ? "var(--bg-card)" : "transparent",
                    color: isActive ? accentColor : "var(--text-secondary)",
                    fontWeight: 500,
                    fontSize: 15,
                    transition: "all 0.2s",
                  }}
                >
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </Drawer>
  );
}
