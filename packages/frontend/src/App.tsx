import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, theme } from "antd";
import { NetworkProvider } from "@/hooks/useNetwork";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Blocks from "@/pages/Blocks";
import BlockDetail from "@/pages/BlockDetail";
import TransactionDetail from "@/pages/TransactionDetail";
import AccountDetail from "@/pages/AccountDetail";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 2,
    },
  },
});

const antTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: "#00EF8B",
    colorBgContainer: "#1A1A1D",
    colorBgElevated: "#222225",
    colorBorder: "#3F3F46",
    colorBorderSecondary: "#27272A",
    colorText: "#FAFAFA",
    colorTextSecondary: "#A1A1AA",
    colorTextTertiary: "#71717A",
    fontFamily: "'Sora', system-ui, sans-serif",
    borderRadius: 8,
  },
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={antTheme}>
        <NetworkProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="blocks" element={<Blocks />} />
                <Route path="block/:blockNumber" element={<BlockDetail />} />
                <Route path="tx/:hash" element={<TransactionDetail />} />
                <Route path="account/:address" element={<AccountDetail />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </NetworkProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
