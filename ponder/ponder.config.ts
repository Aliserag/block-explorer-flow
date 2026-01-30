import { createConfig, http } from "@ponder/core";

export default createConfig({
  networks: {
    flowEvm: {
      chainId: 747,
      transport: http(process.env.FLOW_EVM_RPC_URL ?? "https://mainnet.evm.nodes.onflow.org"),
    },
  },
  blocks: {
    FlowBlocks: {
      network: "flowEvm",
      startBlock: "latest",
      interval: 1,
    },
  },
});
