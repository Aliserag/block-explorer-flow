import { defineChain } from "viem";

export const flowEvmMainnet = defineChain({
  id: 747,
  name: "Flow EVM",
  nativeCurrency: {
    name: "Flow",
    symbol: "FLOW",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://mainnet.evm.nodes.onflow.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Flowscan",
      url: "https://evm.flowscan.io",
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
});

export const flowEvmTestnet = defineChain({
  id: 545,
  name: "Flow EVM Testnet",
  nativeCurrency: {
    name: "Flow",
    symbol: "FLOW",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://testnet.evm.nodes.onflow.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Flowscan Testnet",
      url: "https://evm-testnet.flowscan.io",
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: true,
});

export type NetworkId = "mainnet" | "testnet";

export const chains = {
  mainnet: flowEvmMainnet,
  testnet: flowEvmTestnet,
} as const;

export const defaultNetwork: NetworkId = "mainnet";

// Network helper constants and functions
export const CHAIN_IDS = {
  mainnet: 747,
  testnet: 545,
} as const;

export function isValidNetwork(network: string): network is NetworkId {
  return network === "mainnet" || network === "testnet";
}

export function getChainId(network: NetworkId): number {
  return CHAIN_IDS[network];
}
