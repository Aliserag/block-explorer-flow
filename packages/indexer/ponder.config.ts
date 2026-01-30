import { createConfig, http } from "@ponder/core";
import { defineChain } from "viem";

// Define Flow EVM Mainnet chain
const flowEvmMainnet = defineChain({
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
      name: "Flow Explorer",
      url: "https://evm.flowscan.io",
    },
  },
});

export default createConfig({
  networks: {
    flowEvm: {
      chainId: 747,
      transport: http(process.env.FLOW_EVM_RPC_URL ?? "https://mainnet.evm.nodes.onflow.org"),
    },
  },
  blocks: {
    // Index all blocks for the explorer
    FlowBlocks: {
      network: "flowEvm",
      startBlock: "latest",
      interval: 1,
    },
  },
});
