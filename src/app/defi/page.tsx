"use client";

import Link from "next/link";
import { Tag, Tooltip, Input } from "antd";
import {
  LinkOutlined,
  SearchOutlined,
  CopyOutlined,
  CheckOutlined,
  SafetyCertificateOutlined,
  CodeOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useState, useMemo } from "react";

interface DefiContract {
  name: string;
  address: string;
  description?: string;
  docsUrl?: string;
  verified?: boolean;
}

interface DefiCategory {
  id: string;
  name: string;
  color: string;
  gradient: string;
  description: string;
  contracts: DefiContract[];
}

const DEFI_CATEGORIES: DefiCategory[] = [
  {
    id: "tokens",
    name: "Stablecoins & Wrapped Assets",
    color: "#00EF8B",
    gradient: "linear-gradient(135deg, #00EF8B 0%, #00C972 100%)",
    description: "Native and bridged stablecoins, wrapped tokens for DeFi composability",
    contracts: [
      {
        name: "WFLOW",
        address: "0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e",
        description: "Wrapped FLOW - ERC20 wrapper for native FLOW",
        verified: true,
      },
      {
        name: "USDC",
        address: "0xF1815bd50389c46847f0Bda824eC8da914045D14",
        description: "USD Coin - Circle stablecoin",
        verified: true,
      },
      {
        name: "PYUSD",
        address: "0x99aF3EeA856556646C98c8B9b2548Fe815240750",
        description: "PayPal USD stablecoin",
        verified: true,
      },
      {
        name: "USDT",
        address: "0x674843C06FF83502ddb4D37c2E09C01cdA38cbc8",
        description: "Tether USD stablecoin",
        verified: true,
      },
      {
        name: "WBTC",
        address: "0x717DAE2BaF7656BE9a9B01deE31d571a9d4c9579",
        description: "Wrapped Bitcoin on Flow",
        verified: true,
      },
      {
        name: "WETH",
        address: "0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590",
        description: "Wrapped Ether on Flow",
        verified: true,
      },
      {
        name: "stFLOW",
        address: "0x5598c0652B899EB40f169Dd5949BdBE0BF36ffDe",
        description: "Liquid staked FLOW by Increment Finance",
        verified: true,
      },
    ],
  },
  {
    id: "dex",
    name: "DEXs & AMMs",
    color: "#A855F7",
    gradient: "linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)",
    description: "Decentralized exchanges and automated market makers for token swaps",
    contracts: [
      {
        name: "FlowSwap V2 Factory",
        address: "0x681D1bFE03522e0727730Ba02a05CD3C0a08fa30",
        description: "Uniswap V2 style pair factory",
        docsUrl: "https://flowswap.xyz",
        verified: true,
      },
      {
        name: "FlowSwap V3 Factory",
        address: "0xca6d7Bb03334bBf135902e1d919a5feccb461632",
        description: "Concentrated liquidity AMM factory",
        docsUrl: "https://flowswap.xyz",
        verified: true,
      },
      {
        name: "FlowSwap Router",
        address: "0xeEDC6Ff75e1b10B903D9013c358e446a73d35341",
        description: "Main router for token swaps",
        docsUrl: "https://flowswap.xyz",
        verified: true,
      },
      {
        name: "KittyPunch StableFactory",
        address: "0x4412140D52C1F5834469a061927811Abb6026dB7",
        description: "Curve-style stable swap factory",
        docsUrl: "https://kittypunch.xyz",
        verified: true,
      },
      {
        name: "PunchSwap Router",
        address: "0xf45AFe28fd5519d5f8C1d4787a4D5f724C0eFa4d",
        description: "PunchSwap V2 router for swaps",
        docsUrl: "https://kittypunch.xyz",
        verified: true,
      },
    ],
  },
  {
    id: "oracles",
    name: "Oracles",
    color: "#FF8C00",
    gradient: "linear-gradient(135deg, #FF8C00 0%, #F59E0B 100%)",
    description: "Decentralized price feeds and data oracles for smart contracts",
    contracts: [
      {
        name: "Pyth Network",
        address: "0x2880aB155794e7179c9eE2e38200202908C17B43",
        description: "High-fidelity price oracle with 400+ feeds",
        docsUrl: "https://pyth.network/developers",
        verified: true,
      },
      {
        name: "Stork Oracle",
        address: "0xacC0a0cF13571d30B4b8637996F5D6D774d4fd62",
        description: "Decentralized oracle network",
        docsUrl: "https://stork.network",
        verified: true,
      },
    ],
  },
  {
    id: "bridges",
    name: "Bridges & Interoperability",
    color: "#3B82F6",
    gradient: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
    description: "Cross-chain bridges for asset transfers and messaging",
    contracts: [
      {
        name: "Stargate",
        address: "",
        description: "LayerZero-powered omnichain liquidity",
        docsUrl: "https://stargate.finance",
      },
      {
        name: "Hyperlane",
        address: "",
        description: "Modular interoperability protocol",
        docsUrl: "https://hyperlane.xyz",
      },
      {
        name: "Flow Bridge",
        address: "",
        description: "Native Cadence-EVM bridge",
        docsUrl: "https://bridge.flow.com",
      },
      {
        name: "Celer cBridge",
        address: "",
        description: "Fast cross-chain value transfer",
        docsUrl: "https://cbridge.celer.network",
      },
      {
        name: "DeBridge",
        address: "",
        description: "Cross-chain interoperability",
        docsUrl: "https://debridge.finance",
      },
      {
        name: "LayerZero",
        address: "",
        description: "Omnichain messaging protocol",
        docsUrl: "https://layerzero.network",
      },
    ],
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Tooltip title={copied ? "Copied!" : "Copy address"}>
      <button
        onClick={handleCopy}
        className="copy-btn"
        style={{
          background: copied ? "rgba(0, 239, 139, 0.15)" : "transparent",
          border: "none",
          color: copied ? "var(--flow-green)" : "var(--text-muted)",
          cursor: "pointer",
          padding: "6px",
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s",
        }}
      >
        {copied ? <CheckOutlined /> : <CopyOutlined />}
      </button>
    </Tooltip>
  );
}

function ContractCard({ contract, categoryColor }: { contract: DefiContract; categoryColor: string }) {
  const hasAddress = contract.address && contract.address.length > 0;

  return (
    <div className="contract-card">
      <div className="card-accent" />
      <div className="card-content">
        <div className="card-header">
          <div className="name-row">
            <span className="contract-name">{contract.name}</span>
            {contract.verified && (
              <Tooltip title="Verified Contract">
                <SafetyCertificateOutlined className="verified-badge" />
              </Tooltip>
            )}
          </div>
          {contract.docsUrl && (
            <Tooltip title="View Documentation">
              <a
                href={contract.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="docs-link"
                onClick={(e) => e.stopPropagation()}
              >
                <CodeOutlined />
              </a>
            </Tooltip>
          )}
        </div>

        {contract.description && (
          <p className="contract-desc">{contract.description}</p>
        )}

        {hasAddress ? (
          <div className="address-row">
            <Link
              href={`/contract/${contract.address}`}
              className="address-link"
            >
              {contract.address}
            </Link>
            <CopyButton text={contract.address} />
          </div>
        ) : (
          <div className="address-row no-address">
            <span className="multi-contract">Multiple contracts - see docs</span>
            {contract.docsUrl && (
              <a
                href={contract.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="external-link"
              >
                <LinkOutlined />
              </a>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .contract-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .card-accent {
          height: 3px;
          background: ${categoryColor};
          opacity: 0.6;
          transition: opacity 0.3s;
        }

        .card-content {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          flex: 1;
        }

        .contract-card:hover {
          border-color: ${categoryColor}50;
          transform: translateY(-4px);
          box-shadow: 0 12px 40px ${categoryColor}20;
        }

        .contract-card:hover .card-accent {
          opacity: 1;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .name-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .contract-name {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 18px;
          letter-spacing: -0.01em;
        }

        .contract-card :global(.verified-badge) {
          color: var(--flow-green);
          font-size: 14px;
        }

        .docs-link {
          color: var(--text-muted);
          font-size: 16px;
          padding: 6px;
          border-radius: 6px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .docs-link:hover {
          color: var(--text-primary);
          background: var(--bg-tertiary);
        }

        .contract-desc {
          color: var(--text-secondary);
          font-size: 15px;
          line-height: 1.6;
          margin: 0;
        }

        .address-row {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--bg-tertiary);
          padding: 12px 14px;
          border-radius: 10px;
          margin-top: auto;
          border: 1px solid var(--border-subtle);
          min-width: 0;
          overflow: hidden;
        }

        .address-link {
          font-family: var(--font-mono);
          font-size: 13px;
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: ${categoryColor};
        }

        .address-link:hover {
          opacity: 0.8;
        }

        .no-address {
          justify-content: space-between;
        }

        .multi-contract {
          font-family: var(--font-mono);
          font-size: 14px;
          color: var(--text-muted);
          font-style: italic;
        }

        .external-link {
          color: var(--text-muted);
          font-size: 14px;
          transition: color 0.2s;
        }

        .external-link:hover {
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}

function CategorySection({ category, isExpanded, onToggle }: {
  category: DefiCategory;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <section className="category-section">
      <button className="category-header" onClick={onToggle}>
        <div className="header-left">
          <div className="category-indicator" />
          <div className="header-text">
            <h2 className="category-name">{category.name}</h2>
            <p className="category-desc">{category.description}</p>
          </div>
        </div>
        <div className="header-right">
          <Tag className="count-tag" style={{
            background: `${category.color}15`,
            borderColor: `${category.color}40`,
            color: category.color
          }}>
            {category.contracts.length} {category.contracts.length === 1 ? 'contract' : 'contracts'}
          </Tag>
          <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
            <RightOutlined />
          </span>
        </div>
      </button>

      <div className={`contracts-grid ${isExpanded ? 'expanded' : ''}`}>
        {category.contracts.map((contract) => (
          <ContractCard
            key={contract.name}
            contract={contract}
            categoryColor={category.color}
          />
        ))}
      </div>

      <style jsx>{`
        .category-section {
          margin-bottom: 28px;
        }

        .category-header {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 28px;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.3s;
          text-align: left;
        }

        .category-header:hover {
          border-color: ${category.color}50;
          background: var(--bg-card-hover);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .category-indicator {
          width: 4px;
          height: 48px;
          border-radius: 2px;
          background: ${category.color};
          flex-shrink: 0;
        }

        .header-text {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .category-name {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
          letter-spacing: -0.01em;
        }

        .category-desc {
          font-size: 15px;
          color: var(--text-muted);
          margin: 0;
          line-height: 1.4;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .category-section :global(.count-tag) {
          font-family: var(--font-mono);
          font-size: 13px;
          border-radius: 8px;
          padding: 6px 14px;
          font-weight: 500;
        }

        .expand-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: var(--bg-tertiary);
          color: var(--text-muted);
          transition: all 0.3s;
          font-size: 12px;
        }

        .expand-icon.expanded {
          color: ${category.color};
          transform: rotate(90deg);
        }

        .contracts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 20px;
          padding: 0;
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .contracts-grid.expanded {
          max-height: 3000px;
          opacity: 1;
          padding: 24px 0 0 0;
        }

        @media (max-width: 768px) {
          .category-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
            padding: 20px;
          }

          .header-right {
            width: 100%;
            justify-content: space-between;
          }

          .category-desc {
            display: none;
          }

          .contracts-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}

export default function DefiPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return DEFI_CATEGORIES;

    const query = searchQuery.toLowerCase();
    return DEFI_CATEGORIES.map((category) => ({
      ...category,
      contracts: category.contracts.filter(
        (contract) =>
          contract.name.toLowerCase().includes(query) ||
          contract.address.toLowerCase().includes(query) ||
          (contract.description?.toLowerCase().includes(query) ?? false)
      ),
    })).filter((category) => category.contracts.length > 0);
  }, [searchQuery]);

  const totalContracts = DEFI_CATEGORIES.reduce(
    (acc, cat) => acc + cat.contracts.length,
    0
  );

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="defi-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              <span className="title-prefix">FLOW</span>
              <span className="title-accent">_</span>
              <span className="title-main">DEFI</span>
            </h1>
            <p className="hero-subtitle">
              Essential DeFi infrastructure on Flow EVM. Find verified contracts,
              integrate protocols, and build the future of finance.
            </p>
          </div>
        </div>
      </section>

      {/* Search & Filters */}
      <section className="search-section">
        <div className="search-wrapper">
          <Input
            prefix={<SearchOutlined style={{ color: "var(--text-muted)", fontSize: 18 }} />}
            placeholder="Search protocols, contracts, or addresses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            allowClear
          />
        </div>
        <div className="filter-tags">
          <span className="filter-label">Quick filters:</span>
          {DEFI_CATEGORIES.slice(0, 4).map((cat) => (
            <button
              key={cat.id}
              className="filter-tag"
              onClick={() => setSearchQuery(cat.name.split(' ')[0])}
              style={{ '--tag-color': cat.color } as React.CSSProperties}
            >
              <span>{cat.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Categories */}
      <main className="categories-section">
        {filteredCategories.length > 0 ? (
          filteredCategories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              isExpanded={expandedCategories.has(category.id)}
              onToggle={() => toggleCategory(category.id)}
            />
          ))
        ) : (
          <div className="no-results">
            <div className="no-results-icon">
              <SearchOutlined />
            </div>
            <h3>No protocols found</h3>
            <p>Try adjusting your search or explore all {totalContracts} contracts</p>
            <button
              className="clear-search"
              onClick={() => setSearchQuery("")}
            >
              Clear search
            </button>
          </div>
        )}
      </main>

      <style jsx>{`
        .defi-page {
          min-height: 100vh;
          background: var(--bg-primary);
          padding: 0;
        }

        /* Hero Section */
        .hero {
          position: relative;
          padding: 48px 24px 64px;
          margin-bottom: 32px;
          overflow: hidden;
        }

        .hero-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 239, 139, 0.15), transparent),
            radial-gradient(ellipse 60% 40% at 100% 0%, rgba(168, 85, 247, 0.1), transparent),
            radial-gradient(ellipse 60% 40% at 0% 100%, rgba(59, 130, 246, 0.08), transparent);
          pointer-events: none;
        }

        .hero-content {
          position: relative;
          max-width: 1200px;
          margin: 0 auto;
        }

        .hero-text {
          text-align: center;
          margin-bottom: 48px;
        }

        .hero-title {
          font-family: var(--font-mono);
          font-size: 48px;
          font-weight: 700;
          letter-spacing: 0.05em;
          margin: 0 0 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
        }

        .title-prefix {
          color: var(--text-primary);
        }

        .title-accent {
          color: var(--flow-green);
          animation: cursorBlink 1s step-end infinite;
        }

        .title-main {
          background: linear-gradient(90deg, var(--flow-green), #A855F7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          font-size: 18px;
          color: var(--text-secondary);
          max-width: 640px;
          margin: 0 auto;
          line-height: 1.7;
        }

        /* Search Section */
        .search-section {
          max-width: 1200px;
          margin: 0 auto 40px;
          padding: 0 24px;
        }

        .search-wrapper {
          margin-bottom: 20px;
        }

        .search-section :global(.search-input) {
          width: 100%;
          height: 56px;
          background: var(--bg-card) !important;
          border: 1px solid var(--border-subtle) !important;
          border-radius: 14px !important;
          font-size: 16px;
        }

        .search-section :global(.search-input input) {
          font-size: 16px !important;
        }

        .search-section :global(.search-input:hover),
        .search-section :global(.search-input:focus-within) {
          border-color: var(--flow-green) !important;
          box-shadow: 0 0 0 3px rgba(0, 239, 139, 0.1) !important;
        }

        .filter-tags {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .filter-label {
          font-size: 14px;
          color: var(--text-muted);
          margin-right: 6px;
        }

        .filter-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
          border-radius: 24px;
          color: var(--text-secondary);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
        }

        .filter-tag:hover {
          border-color: var(--tag-color);
          color: var(--tag-color);
          background: color-mix(in srgb, var(--tag-color) 10%, transparent);
        }

        /* Categories */
        .categories-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* No Results */
        .no-results {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 100px 24px;
          text-align: center;
        }

        .no-results-icon {
          width: 72px;
          height: 72px;
          border-radius: 18px;
          background: var(--bg-tertiary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          color: var(--text-muted);
          margin-bottom: 28px;
        }

        .no-results h3 {
          font-size: 24px;
          color: var(--text-primary);
          margin: 0 0 12px;
        }

        .no-results p {
          color: var(--text-muted);
          margin: 0 0 28px;
          font-size: 16px;
        }

        .clear-search {
          padding: 14px 32px;
          background: var(--flow-green);
          border: none;
          border-radius: 10px;
          color: var(--bg-primary);
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .clear-search:hover {
          opacity: 0.9;
          transform: translateY(-2px);
        }

        /* Animations */
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        /* Mobile */
        @media (max-width: 768px) {
          .hero {
            padding: 32px 16px 48px;
          }

          .hero-title {
            font-size: 36px;
          }

          .hero-subtitle {
            font-size: 16px;
          }

          .search-section {
            padding: 0 16px;
          }

          .search-section :global(.search-input) {
            height: 52px;
          }

          .categories-section {
            padding: 0 16px;
          }
        }
      `}</style>
    </div>
  );
}
