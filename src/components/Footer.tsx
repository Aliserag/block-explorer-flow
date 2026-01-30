export default function Footer() {
  return (
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
            Flow EVM Block Explorer • Chain ID: 747
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
  );
}
