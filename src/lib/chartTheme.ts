export const chartTheme = {
  colors: {
    primary: '#00EF8B',    // Flow green
    secondary: '#00C972',
    grid: '#27272A',
    text: '#A1A1AA',
    background: '#18181B',
    backgroundDark: '#0A0A0B',
    gradientStart: 'rgba(0, 239, 139, 0.3)',
    gradientEnd: 'rgba(0, 239, 139, 0)',
  },
  fonts: {
    mono: "'JetBrains Mono', monospace",
  },
};

export const tooltipStyle = {
  contentStyle: {
    background: chartTheme.colors.background,
    border: `1px solid ${chartTheme.colors.grid}`,
    borderRadius: 8,
    fontFamily: chartTheme.fonts.mono,
    fontSize: 12,
  },
  labelStyle: {
    color: chartTheme.colors.text,
    marginBottom: 4,
  },
  itemStyle: {
    color: chartTheme.colors.primary,
  },
};
