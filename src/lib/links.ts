import { type NetworkId } from "./chains";

/**
 * Generates a network-aware path.
 * Mainnet paths stay as-is, testnet paths get /testnet prefix.
 */
export function networkPath(path: string, network: NetworkId): string {
  if (network === "testnet") {
    // Ensure path starts with /
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `/testnet${normalizedPath}`;
  }
  return path;
}

/**
 * Extracts the network from a pathname.
 * Returns "testnet" if pathname starts with /testnet, otherwise "mainnet".
 */
export function getNetworkFromPathname(pathname: string): NetworkId {
  return pathname.startsWith("/testnet") ? "testnet" : "mainnet";
}

/**
 * Strips the network prefix from a pathname if present.
 * /testnet/blocks -> /blocks
 * /blocks -> /blocks
 */
export function stripNetworkPrefix(pathname: string): string {
  if (pathname.startsWith("/testnet")) {
    return pathname.slice("/testnet".length) || "/";
  }
  return pathname;
}
