import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { Input, Select, message } from "antd";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { search } from "@/services/api";
import { useNetwork } from "@/hooks/useNetwork";

export default function Layout() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { network, setNetwork, chain } = useNetwork();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const result = await search(searchQuery.trim(), network);

      if (!result.found) {
        message.warning("No results found");
        return;
      }

      switch (result.type) {
        case "block":
          navigate(`/block/${result.data?.blockNumber}`);
          break;
        case "transaction":
          navigate(`/tx/${result.data?.transactionHash || searchQuery}`);
          break;
        case "address":
          navigate(`/account/${result.data?.address || searchQuery}`);
          break;
        default:
          message.warning("Unknown result type");
      }
      setSearchQuery("");
    } catch {
      message.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
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
              to="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
                color: "var(--text-primary)",
                textDecoration: "none",
              }}
            >
              <motion.div
                whileHover={{ rotate: 90 }}
                transition={{ type: "spring", stiffness: 300 }}
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
              </motion.div>
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 18,
                    letterSpacing: "-0.02em",
                  }}
                >
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

            {/* Search */}
            <div style={{ flex: 1, maxWidth: 600 }}>
              <Input.Search
                placeholder="Search by address, tx hash, or block number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onSearch={handleSearch}
                loading={isSearching}
                allowClear
                size="large"
                style={{
                  fontFamily: "var(--font-mono)",
                }}
              />
            </div>

            {/* Network Selector */}
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
                  label: (
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "var(--status-pending)",
                        }}
                      />
                      Testnet
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav
        style={{
          background: "var(--bg-tertiary)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="container">
          <div style={{ display: "flex", gap: "var(--space-md)" }}>
            {[
              { path: "/", label: "Home" },
              { path: "/blocks", label: "Blocks" },
            ].map(({ path, label }) => {
              const isActive =
                path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
              return (
                <Link
                  key={path}
                  to={path}
                  style={{
                    padding: "var(--space-md) var(--space-sm)",
                    color: isActive ? "var(--flow-green)" : "var(--text-secondary)",
                    fontWeight: 500,
                    fontSize: 14,
                    borderBottom: isActive ? "2px solid var(--flow-green)" : "2px solid transparent",
                    marginBottom: -1,
                    transition: "all 0.2s",
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "var(--space-xl) 0" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer
        style={{
          background: "var(--bg-secondary)",
          borderTop: "1px solid var(--border-subtle)",
          padding: "var(--space-lg) 0",
        }}
      >
        <div className="container">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "var(--space-md)",
            }}
          >
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
              Flow EVM Block Explorer • Chain ID: {chain.id}
            </div>
            <div style={{ display: "flex", gap: "var(--space-lg)" }}>
              <a
                href="https://developers.flow.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--text-secondary)", fontSize: 13 }}
              >
                Docs
              </a>
              <a
                href="https://flow.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--text-secondary)", fontSize: 13 }}
              >
                Flow
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
