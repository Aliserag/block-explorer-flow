import { NetworkProvider } from "@/contexts/NetworkContext";

export default function TestnetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NetworkProvider network="testnet">
      {/* Testnet Banner */}
      <div
        style={{
          background: "linear-gradient(90deg, #F59E0B 0%, #D97706 100%)",
          color: "#000",
          padding: "8px 16px",
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.05em",
        }}
      >
        TESTNET (Chain ID: 545) - Test tokens have no real value
      </div>
      {children}
    </NetworkProvider>
  );
}
