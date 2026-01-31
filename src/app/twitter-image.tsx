import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Flow EVM Explorer";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)",
          }}
        />

        {/* Glow effect */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 600,
            height: 600,
            borderRadius: 300,
            background: "radial-gradient(circle, rgba(0, 239, 139, 0.15) 0%, transparent 70%)",
          }}
        />

        {/* Flow logo representation */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 30,
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              background: "#00EF8B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 60px rgba(0, 239, 139, 0.4)",
            }}
          >
            <div
              style={{
                fontSize: 40,
                fontWeight: 700,
                color: "#0a0a0a",
              }}
            >
              F
            </div>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: -2,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 16,
            zIndex: 1,
          }}
        >
          <span>Flow</span>
          <span style={{ color: "#00EF8B" }}>EVM</span>
          <span>Explorer</span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "rgba(255, 255, 255, 0.7)",
            letterSpacing: 0.5,
            zIndex: 1,
          }}
        >
          Explore blocks, transactions & accounts on Flow
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: "flex",
            gap: 60,
            marginTop: 50,
            padding: "24px 48px",
            background: "rgba(255, 255, 255, 0.05)",
            borderRadius: 16,
            border: "1px solid rgba(0, 239, 139, 0.2)",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#00EF8B" }}>Blocks</div>
            <div style={{ fontSize: 18, color: "rgba(255, 255, 255, 0.5)" }}>Real-time</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#00EF8B" }}>Tokens</div>
            <div style={{ fontSize: 18, color: "rgba(255, 255, 255, 0.5)" }}>ERC-20</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#00EF8B" }}>Analytics</div>
            <div style={{ fontSize: 18, color: "rgba(255, 255, 255, 0.5)" }}>Real-time</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
