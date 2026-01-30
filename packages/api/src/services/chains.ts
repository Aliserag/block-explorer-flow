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
  testnet: true,
});

export type NetworkId = "mainnet" | "testnet";

export const chains = {
  mainnet: flowEvmMainnet,
  testnet: flowEvmTestnet,
} as const;
