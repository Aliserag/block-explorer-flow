"use client";

import { SearchOutlined } from "@ant-design/icons";

export default function TestnetDefiPage() {
  return (
    <div className="defi-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              <span className="title-accent">_</span>TESTNET DEFI
            </h1>
            <p className="hero-subtitle">
              DeFi contracts and protocols on Flow EVM Testnet. Deploy and test your contracts before mainnet.
            </p>
          </div>
        </div>
      </section>

      {/* Notice */}
      <div className="notice-section">
        <div className="notice-card">
          <div className="notice-icon">
            <SearchOutlined />
          </div>
          <h3>No Testnet DeFi Directory Yet</h3>
          <p>
            The DeFi directory for testnet is coming soon. In the meantime, you can deploy and test your contracts
            on testnet using the contract verification tools.
          </p>
          <div className="notice-links">
            <a href="https://developers.flow.com/evm" target="_blank" rel="noopener noreferrer">
              Flow EVM Docs →
            </a>
            <a href="https://faucet.flow.com" target="_blank" rel="noopener noreferrer">
              Get Testnet FLOW →
            </a>
          </div>
        </div>
      </div>

      <style jsx>{`
        .defi-page {
          min-height: 100vh;
          padding: 0;
        }

        .hero {
          padding: var(--space-xl) var(--space-lg) var(--space-xl);
          margin-bottom: var(--space-lg);
        }

        .hero-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 var(--space-lg);
        }

        .hero-text {
          text-align: center;
          margin-bottom: var(--space-xl);
        }

        .hero-title {
          font-family: var(--font-mono);
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 0.05em;
          margin: 0 0 8px;
          color: var(--text-primary);
        }

        .title-accent {
          color: #F59E0B;
          animation: cursorBlink 1s step-end infinite;
        }

        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        .hero-subtitle {
          font-size: 14px;
          color: var(--text-muted);
          max-width: 480px;
          margin: 0 auto;
          line-height: 1.5;
        }

        .notice-section {
          max-width: 600px;
          margin: 0 auto;
          padding: 0 var(--space-lg);
        }

        .notice-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: var(--space-2xl);
          text-align: center;
        }

        .notice-icon {
          width: 72px;
          height: 72px;
          border-radius: var(--radius-lg);
          background: rgba(245, 158, 11, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          color: #F59E0B;
          margin: 0 auto 28px;
        }

        .notice-card h3 {
          font-size: 20px;
          color: var(--text-primary);
          margin: 0 0 12px;
        }

        .notice-card p {
          color: var(--text-muted);
          margin: 0 0 24px;
          font-size: 15px;
          line-height: 1.6;
        }

        .notice-links {
          display: flex;
          gap: var(--space-lg);
          justify-content: center;
          flex-wrap: wrap;
        }

        .notice-links a {
          color: #F59E0B;
          font-size: 14px;
          font-weight: 500;
        }

        .notice-links a:hover {
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}
