export interface ChainConfig {
  id: number;
  name: string;
  shortName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrl: string;
  explorerUrl: string;
  isTestnet: boolean;
}

export const flowEvmMainnet: ChainConfig = {
  id: 747,
  name: "Flow EVM",
  shortName: "Flow",
  nativeCurrency: {
    name: "Flow",
    symbol: "FLOW",
    decimals: 18,
  },
  rpcUrl: "https://mainnet.evm.nodes.onflow.org",
  explorerUrl: "https://evm.flowscan.io",
  isTestnet: false,
};

export const flowEvmTestnet: ChainConfig = {
  id: 545,
  name: "Flow EVM Testnet",
  shortName: "Flow Testnet",
  nativeCurrency: {
    name: "Flow",
    symbol: "FLOW",
    decimals: 18,
  },
  rpcUrl: "https://testnet.evm.nodes.onflow.org",
  explorerUrl: "https://evm-testnet.flowscan.io",
  isTestnet: true,
};

export const chains = {
  mainnet: flowEvmMainnet,
  testnet: flowEvmTestnet,
} as const;

export type NetworkId = keyof typeof chains;

export const defaultNetwork: NetworkId = "mainnet";
