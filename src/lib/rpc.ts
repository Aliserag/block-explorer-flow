import { createPublicClient, http, formatEther, type Address, type Hex } from "viem";
import { chains, type NetworkId } from "./chains";

// Create clients for each network
const clients = {
  mainnet: createPublicClient({
    chain: chains.mainnet,
    transport: http(process.env.NEXT_PUBLIC_FLOW_RPC_URL ?? chains.mainnet.rpcUrls.default.http[0]),
  }),
  testnet: createPublicClient({
    chain: chains.testnet,
    transport: http(chains.testnet.rpcUrls.default.http[0]),
  }),
};

export function getClient(network: NetworkId = "mainnet") {
  return clients[network];
}

// Block operations
export async function getLatestBlockNumber(network: NetworkId = "mainnet") {
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

export async function getBlocks(start: bigint, count: number, network: NetworkId = "mainnet") {
  const client = getClient(network);

  const promises = Array.from({ length: count }, (_, i) =>
    client.getBlock({ blockNumber: start - BigInt(i) }).catch(() => null)
  );

  const results = await Promise.all(promises);
  return results.filter((b) => b !== null);
}

// Transaction operations
export async function getTransaction(hash: Hex, network: NetworkId = "mainnet") {
  try {
    return await getClient(network).getTransaction({ hash });
  } catch {
    return null;
  }
}

export async function getTransactionReceipt(hash: Hex, network: NetworkId = "mainnet") {
  try {
    return await getClient(network).getTransactionReceipt({ hash });
  } catch {
    return null;
  }
}

// Account operations
export async function getBalance(address: Address, network: NetworkId = "mainnet") {
  const balance = await getClient(network).getBalance({ address });
  return {
    wei: balance,
    formatted: formatEther(balance),
  };
}

export async function getTransactionCount(address: Address, network: NetworkId = "mainnet") {
  return getClient(network).getTransactionCount({ address });
}

export async function getCode(address: Address, network: NetworkId = "mainnet") {
  const code = await getClient(network).getCode({ address });
  return code ?? "0x";
}

// Scan recent blocks for transactions involving an address
export async function getRecentTransactionsForAddress(
  address: Address,
  maxBlocks: number = 10000, // ~3 hours at 1 block/sec
  network: NetworkId = "mainnet"
): Promise<Array<{ hash: string; from: string; to: string | null; blockNumber: string; value: string }>> {
  const client = getClient(network);
  const latestBlock = await client.getBlockNumber();
  const addressLower = address.toLowerCase();

  const transactions: Array<{ hash: string; from: string; to: string | null; blockNumber: string; value: string }> = [];

  // Fetch blocks in larger batches for efficiency
  const batchSize = 100;
  const maxBatches = Math.ceil(maxBlocks / batchSize);

  for (let batch = 0; batch < maxBatches && transactions.length < 50; batch++) {
    const startBlock = latestBlock - BigInt(batch * batchSize);
    const promises = Array.from({ length: batchSize }, (_, i) => {
      const blockNum = startBlock - BigInt(i);
      if (blockNum < 0n) return null;
      return client.getBlock({ blockNumber: blockNum, includeTransactions: true }).catch(() => null);
    });

    const blocks = await Promise.all(promises);

    for (const block of blocks) {
      if (!block || !block.transactions) continue;

      for (const tx of block.transactions) {
        if (typeof tx === "object" && tx !== null) {
          const txFrom = (tx.from || "").toLowerCase();
          const txTo = (tx.to || "").toLowerCase();

          if (txFrom === addressLower || txTo === addressLower) {
            transactions.push({
              hash: tx.hash,
              from: tx.from,
              to: tx.to || null,
              blockNumber: block.number?.toString() || "0",
              value: tx.value?.toString() || "0",
            });

            if (transactions.length >= 50) break;
          }
        }
      }

      if (transactions.length >= 50) break;
    }
  }

  return transactions;
}

// Format helpers
export function formatBlock(block: NonNullable<Awaited<ReturnType<typeof getBlock>>>) {
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
  };
}

export function formatTransaction(
  tx: NonNullable<Awaited<ReturnType<typeof getTransaction>>>,
  receipt?: Awaited<ReturnType<typeof getTransactionReceipt>>
) {
  return {
    hash: tx.hash,
    blockNumber: tx.blockNumber?.toString() ?? null,
    blockHash: tx.blockHash ?? null,
    from: tx.from,
    to: tx.to ?? null,
    value: tx.value?.toString() ?? "0",
    valueFormatted: formatEther(tx.value ?? BigInt(0)),
    gas: tx.gas?.toString() ?? "0",
    gasPrice: tx.gasPrice?.toString() ?? null,
    maxFeePerGas: tx.maxFeePerGas?.toString() ?? null,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString() ?? null,
    input: tx.input,
    nonce: tx.nonce,
    type: tx.type,
    status: receipt?.status === "success" ? 1 : receipt?.status === "reverted" ? 0 : null,
    gasUsed: receipt?.gasUsed?.toString() ?? null,
    contractAddress: receipt?.contractAddress ?? null,
  };
}
