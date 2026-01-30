"use client";

import { ConfigProvider, theme } from "antd";
import { AntdRegistry } from "@ant-design/nextjs-registry";

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

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistry>
      <ConfigProvider theme={antTheme}>{children}</ConfigProvider>
    </AntdRegistry>
  );
}
