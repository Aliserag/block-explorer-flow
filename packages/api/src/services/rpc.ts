import { createPublicClient, http, formatEther, type PublicClient, type Address, type Hex } from "viem";
import { chains, type NetworkId } from "./chains.js";

// Create clients for each network
const clients: Record<NetworkId, PublicClient> = {
  mainnet: createPublicClient({
    chain: chains.mainnet,
    transport: http(process.env.FLOW_EVM_RPC_URL ?? chains.mainnet.rpcUrls.default.http[0]),
  }),
  testnet: createPublicClient({
    chain: chains.testnet,
    transport: http(chains.testnet.rpcUrls.default.http[0]),
  }),
};

export function getClient(network: NetworkId = "mainnet"): PublicClient {
  return clients[network];
}

// Block operations
export async function getLatestBlockNumber(network: NetworkId = "mainnet"): Promise<bigint> {
  return getClient(network).getBlockNumber();
}

export async function getBlock(
  blockNumberOrHash: bigint | Hex,
  network: NetworkId = "mainnet",
  includeTransactions = false
) {
  const client = getClient(network);

  try {
    if (typeof blockNumberOrHash === "bigint") {
      return await client.getBlock({
        blockNumber: blockNumberOrHash,
        includeTransactions,
      });
    } else {
      return await client.getBlock({
        blockHash: blockNumberOrHash,
        includeTransactions,
      });
    }
  } catch {
    return null;
  }
}

export async function getBlocks(
  start: bigint,
  count: number,
  network: NetworkId = "mainnet"
) {
  const client = getClient(network);

  const promises = Array.from({ length: count }, (_, i) =>
    client.getBlock({ blockNumber: start - BigInt(i) }).catch(() => null)
  );

  const results = await Promise.all(promises);
  return results.filter((b) => b !== null);
}

// Transaction operations
export async function getTransaction(
  hash: Hex,
  network: NetworkId = "mainnet"
) {
  try {
    return await getClient(network).getTransaction({ hash });
  } catch {
    return null;
  }
}

export async function getTransactionReceipt(
  hash: Hex,
  network: NetworkId = "mainnet"
) {
  try {
    return await getClient(network).getTransactionReceipt({ hash });
  } catch {
    return null;
  }
}

// Account operations
export async function getBalance(
  address: Address,
  network: NetworkId = "mainnet"
): Promise<{ wei: bigint; formatted: string }> {
  const balance = await getClient(network).getBalance({ address });
  return {
    wei: balance,
    formatted: formatEther(balance),
  };
}

export async function getTransactionCount(
  address: Address,
  network: NetworkId = "mainnet"
): Promise<number> {
  return getClient(network).getTransactionCount({ address });
}

export async function getCode(
  address: Address,
  network: NetworkId = "mainnet"
): Promise<string> {
  const code = await getClient(network).getCode({ address });
  return code ?? "0x";
}

// Utility to format block for API response
export function formatBlockResponse(block: NonNullable<Awaited<ReturnType<typeof getBlock>>>) {
  return {
    number: block.number?.toString() ?? "0",
    hash: block.hash,
    parentHash: block.parentHash,
    timestamp: block.timestamp?.toString() ?? "0",
    timestampDate: block.timestamp ? new Date(Number(block.timestamp) * 1000).toISOString() : null,
    gasUsed: block.gasUsed?.toString() ?? "0",
    gasLimit: block.gasLimit?.toString() ?? "0",
    baseFeePerGas: block.baseFeePerGas?.toString() ?? null,
    transactionCount: block.transactions?.length ?? 0,
    miner: block.miner,
    size: block.size?.toString() ?? null,
    extraData: block.extraData ?? null,
  };
}

// Utility to format transaction for API response
export function formatTransactionResponse(
  tx: NonNullable<Awaited<ReturnType<typeof getTransaction>>>,
  receipt?: Awaited<ReturnType<typeof getTransactionReceipt>>
) {
  return {
    hash: tx.hash,
    blockNumber: tx.blockNumber?.toString() ?? null,
    blockHash: tx.blockHash ?? null,
    transactionIndex: tx.transactionIndex?.toString() ?? null,
    from: tx.from,
    to: tx.to ?? null,
    value: tx.value?.toString() ?? "0",
    valueFormatted: formatEther(tx.value ?? 0n),
    gas: tx.gas?.toString() ?? "0",
    gasPrice: tx.gasPrice?.toString() ?? null,
    maxFeePerGas: tx.maxFeePerGas?.toString() ?? null,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString() ?? null,
    input: tx.input,
    nonce: tx.nonce,
    type: tx.type,
    // Receipt data if available
    status: receipt?.status === "success" ? 1 : receipt?.status === "reverted" ? 0 : null,
    gasUsed: receipt?.gasUsed?.toString() ?? null,
    effectiveGasPrice: receipt?.effectiveGasPrice?.toString() ?? null,
    contractAddress: receipt?.contractAddress ?? null,
    logs: receipt?.logs ?? [],
  };
}
