"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Select, Button } from "antd";
import { MenuOutlined } from "@ant-design/icons";
import MobileNav, { openMobileNav } from "./MobileNav";
import SearchBar from "./SearchBar";
import { getNetworkFromPathname, networkPath, stripNetworkPrefix } from "@/lib/links";
import type { NetworkId } from "@/lib/chains";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const network = getNetworkFromPathname(pathname);

  const handleNetworkChange = (newNetwork: NetworkId) => {
    // Get the path without network prefix, then add new network prefix
    const basePath = stripNetworkPrefix(pathname);
    const newPath = networkPath(basePath, newNetwork);
    router.push(newPath);
  };

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
              onChange={handleNetworkChange}
              style={{ width: 140 }}
              popupMatchSelectWidth={false}
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
            onNetworkChange={handleNetworkChange}
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
              const fullPath = networkPath(path, network);
              const basePath = stripNetworkPrefix(pathname);
              const isActive = path === "/"
                ? basePath === "/"
                : basePath.startsWith(path);
              const accentColor = network === "testnet" ? "#F59E0B" : "var(--flow-green)";
              return (
                <Link
                  key={path}
                  href={fullPath}
                  style={{
                    padding: "var(--space-md) var(--space-sm)",
                    color: isActive ? accentColor : "var(--text-secondary)",
                    fontWeight: 500,
                    fontSize: 14,
                    borderBottom: isActive ? `2px solid ${accentColor}` : "2px solid transparent",
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
