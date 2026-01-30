import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#00EF8B",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://flow-explorer-production.up.railway.app"),
  title: "Flow EVM Explorer",
  description: "Block explorer for Flow EVM - explore blocks, transactions, and accounts on the Flow blockchain",
  keywords: ["Flow", "EVM", "blockchain", "explorer", "blocks", "transactions", "accounts"],
  authors: [{ name: "Flow EVM Explorer" }],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/favicon.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://flow-explorer-production.up.railway.app",
    siteName: "Flow EVM Explorer",
    title: "Flow EVM Explorer",
    description: "Block explorer for Flow EVM - explore blocks, transactions, and accounts on the Flow blockchain",
  },
  twitter: {
    card: "summary_large_image",
    title: "Flow EVM Explorer",
    description: "Block explorer for Flow EVM - explore blocks, transactions, and accounts on the Flow blockchain",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Sora:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#00EF8B" />
      </head>
      <body>
        <Providers>
          <div className="app-container">
            <Header />
            <main className="main-content">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
