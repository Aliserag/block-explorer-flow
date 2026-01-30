/**
 * Token Logo Utilities
 *
 * Provides deterministic default logos for tokens not in the official registry.
 * Uses the token address to generate a unique color hue, ensuring the same token
 * always gets the same color.
 */

/**
 * Generate a deterministic hue (0-360) from a hex string
 */
function addressToHue(address: string): number {
  // Use first 6 characters after 0x for hue calculation
  const hexValue = address.slice(2, 8);
  return parseInt(hexValue, 16) % 360;
}

/**
 * Get a saturation value based on address
 */
function addressToSaturation(address: string): number {
  const hexValue = address.slice(8, 10);
  const base = parseInt(hexValue, 16) % 30;
  return 50 + base; // 50-80%
}

/**
 * Get a lightness value based on address
 */
function addressToLightness(address: string): number {
  const hexValue = address.slice(10, 12);
  const base = parseInt(hexValue, 16) % 15;
  return 40 + base; // 40-55% for good contrast with white text
}

/**
 * Generate a deterministic SVG logo for tokens not in the registry.
 * Uses the token symbol's first letter and address-derived colors.
 *
 * @param address - Token contract address
 * @param symbol - Token symbol (e.g., "USDC")
 * @param size - Size in pixels (default 40)
 * @returns Data URI of an SVG image
 */
export function getDefaultTokenLogo(
  address: string,
  symbol: string | null,
  size: number = 40
): string {
  const hue = addressToHue(address);
  const saturation = addressToSaturation(address);
  const lightness = addressToLightness(address);
  const letter = (symbol || "?")[0].toUpperCase();

  // Create SVG with HSL color
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="grad-${address.slice(2, 10)}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:hsl(${hue}, ${saturation}%, ${lightness}%);stop-opacity:1" />
      <stop offset="100%" style="stop-color:hsl(${(hue + 30) % 360}, ${saturation}%, ${lightness - 10}%);stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="url(#grad-${address.slice(2, 10)})"/>
  <text x="${size / 2}" y="${size / 2 + size * 0.35 * 0.35}" text-anchor="middle" fill="white" font-size="${size * 0.45}" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${letter}</text>
</svg>`.trim();

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Get token logo URL - uses registry logo if available, otherwise generates default
 *
 * @param address - Token contract address
 * @param symbol - Token symbol
 * @param registryLogoURI - Logo URI from token registry (if available)
 * @returns URL to use for img src
 */
export function getTokenLogoUrl(
  address: string,
  symbol: string | null,
  registryLogoURI: string | null | undefined
): string {
  if (registryLogoURI && registryLogoURI.startsWith("http")) {
    return registryLogoURI;
  }

  return getDefaultTokenLogo(address, symbol);
}

/**
 * Prebuilt common token colors for well-known tokens
 * These override the generated colors for better recognition
 */
const KNOWN_TOKEN_COLORS: Record<string, string> = {
  USDC: "#2775CA",
  USDT: "#26A17B",
  ETH: "#627EEA",
  WETH: "#627EEA",
  BTC: "#F7931A",
  WBTC: "#F7931A",
  FLOW: "#00EF8B",
  WFLOW: "#00EF8B",
  DAI: "#F5AC37",
  LINK: "#2A5ADA",
  UNI: "#FF007A",
};

/**
 * Get a custom logo for well-known tokens
 */
export function getKnownTokenLogo(
  symbol: string | null,
  size: number = 40
): string | null {
  if (!symbol) return null;

  const color = KNOWN_TOKEN_COLORS[symbol.toUpperCase()];
  if (!color) return null;

  const letter = symbol[0].toUpperCase();

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${color}"/>
  <text x="${size / 2}" y="${size / 2 + size * 0.35 * 0.35}" text-anchor="middle" fill="white" font-size="${size * 0.45}" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${letter}</text>
</svg>`.trim();

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
