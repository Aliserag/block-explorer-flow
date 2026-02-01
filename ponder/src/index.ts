import { ponder } from "@/generated";
import {
  blocks,
  transactions,
  accounts,
  contracts,
  eventLogs,
  tokens,
  tokenTransfers,
} from "../ponder.schema";
import { erc20Abi } from "viem";

// ============================================================================
// FAST MODE INDEXER (Optimized for Flow EVM)
// ============================================================================
// Ponder-recommended architecture:
// - Block handler only (no wildcard event handlers)
// - Uses eth_getBlockReceipts for single RPC call per block (10-100x faster)
// - Detects tokens from Transfer events in receipts (lightweight approach)
// - Target: 50-100 blocks/sec (block handler inherently slower than event indexing)
// ============================================================================

// Common 4-byte function selectors for method name detection
const COMMON_SELECTORS: Record<string, string> = {
  "0xa9059cbb": "transfer",
  "0x23b872dd": "transferFrom",
  "0x095ea7b3": "approve",
  "0x70a08231": "balanceOf",
  "0x18160ddd": "totalSupply",
  "0xdd62ed3e": "allowance",
  "0x39509351": "increaseAllowance",
  "0xa457c2d7": "decreaseAllowance",
  "0x40c10f19": "mint",
  "0x42966c68": "burn",
  "0x79cc6790": "burnFrom",
  "0xa22cb465": "setApprovalForAll",
  "0xe985e9c5": "isApprovedForAll",
  "0x6352211e": "ownerOf",
  "0xb88d4fde": "safeTransferFrom",
  "0x42842e0e": "safeTransferFrom",
  "0x2eb2c2d6": "safeBatchTransferFrom",
  "0xf242432a": "safeTransferFrom",
  "0x00fdd58e": "balanceOf",
  "0x4e1273f4": "balanceOfBatch",
  "0x3593564c": "execute", // Uniswap Universal Router
  "0x5ae401dc": "multicall",
  "0xac9650d8": "multicall",
  "0x1249c58b": "mint",
  "0x6a627842": "mint",
  "0xd0e30db0": "deposit",
  "0x2e1a7d4d": "withdraw",
  "0x7ff36ab5": "swapExactETHForTokens",
  "0x38ed1739": "swapExactTokensForTokens",
  "0x8803dbee": "swapTokensForExactTokens",
  "0xfb3bdb41": "swapETHForExactTokens",
  "0x18cbafe5": "swapExactTokensForETH",
  "0x4a25d94a": "swapTokensForExactETH",
  "0xe8e33700": "addLiquidity",
  "0xf305d719": "addLiquidityETH",
  "0xbaa2abde": "removeLiquidity",
  "0x02751cec": "removeLiquidityETH",
};

// Helper to detect COA (Cadence Owned Account) - 20+ leading zeros
function isCOA(address: string): boolean {
  const hex = address.toLowerCase().slice(2);
  let zeroCount = 0;
  for (const char of hex) {
    if (char === "0") zeroCount++;
    else break;
  }
  return zeroCount >= 20;
}

// Helper to get account type
function getAccountType(address: string, isContract: boolean): string {
  if (isCOA(address)) return "coa";
  if (isContract) return "contract";
  return "eoa";
}

// Helper to get method name from input data
function getMethodName(input: string): string | null {
  if (!input || input === "0x" || input.length < 10) return null;
  const selector = input.slice(0, 10).toLowerCase();
  return COMMON_SELECTORS[selector] || null;
}

// Helper to categorize transaction type
function getTxCategory(input: string, to: string | null, value: bigint): string {
  // Contract deployment
  if (!to) return "contract_deploy";

  // Simple ETH transfer (no input data)
  if (!input || input === "0x") return "transfer";

  const selector = input.slice(0, 10).toLowerCase();

  // Token operations
  if (selector === "0xa9059cbb" || selector === "0x23b872dd") return "transfer";
  if (selector === "0x095ea7b3") return "approve";

  // Swaps
  if (["0x7ff36ab5", "0x38ed1739", "0x8803dbee", "0xfb3bdb41", "0x18cbafe5", "0x4a25d94a", "0x3593564c"].includes(selector)) {
    return "swap";
  }

  // Minting
  if (["0x1249c58b", "0x6a627842", "0x40c10f19"].includes(selector)) return "mint";

  // Liquidity
  if (["0xe8e33700", "0xf305d719", "0xbaa2abde", "0x02751cec"].includes(selector)) return "liquidity";

  // Bridge operations
  if (["0x0f5287b0", "0xa44c80e3", "0x3d7c74f8", "0x9c307de6", "0xd7fd19dd"].includes(selector)) {
    return "bridge";
  }

  // NFT operations
  if (["0x42842e0e", "0xb88d4fde", "0xa22cb465"].includes(selector)) return "nft_transfer";

  // Default to contract call
  return "contract_call";
}

// Common event topic0 signatures for event name detection
const COMMON_EVENTS: Record<string, string> = {
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef": "Transfer",
  "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925": "Approval",
  "0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31": "ApprovalForAll",
  "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62": "TransferSingle",
  "0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb": "TransferBatch",
  "0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c": "Deposit",
  "0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65": "Withdrawal",
  "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822": "Swap",
  "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1": "Sync",
  "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f": "Mint",
  "0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496": "Burn",
};

// ERC-20 Transfer topic0
const ERC20_TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

// Helper to get event name from topic0
function getEventName(topic0: string | undefined): string | null {
  if (!topic0) return null;
  return COMMON_EVENTS[topic0.toLowerCase()] || null;
}

// Helper to decode ERC-20 Transfer event
function decodeERC20Transfer(log: { topics: readonly `0x${string}`[]; data: `0x${string}` }): { from: `0x${string}`; to: `0x${string}`; value: bigint } | null {
  const topic0 = log.topics[0]?.toLowerCase();

  // ERC-20 Transfer has 3 topics (topic0 + indexed from + indexed to)
  // ERC-721 Transfer has 4 topics (topic0 + indexed from + indexed to + indexed tokenId)
  // We only want ERC-20 (3 topics, value in data)
  if (topic0 !== ERC20_TRANSFER_TOPIC.toLowerCase()) return null;
  if (log.topics.length !== 3) return null; // Not ERC-20
  if (!log.data || log.data === "0x" || log.data.length < 66) return null;

  try {
    const from = `0x${log.topics[1]?.slice(26)}` as `0x${string}`;
    const to = `0x${log.topics[2]?.slice(26)}` as `0x${string}`;
    const value = BigInt(log.data);
    return { from, to, value };
  } catch {
    return null;
  }
}

// Block handler - indexes blocks, transactions, contracts, and events
ponder.on("FlowBlocks:block", async ({ event, context }) => {
  const { db, client } = context;
  const block = event.block;

  // Insert block with 0 transactions initially
  await db.insert(blocks).values({
    number: block.number,
    hash: block.hash,
    parentHash: block.parentHash,
    timestamp: block.timestamp,
    gasUsed: block.gasUsed,
    gasLimit: block.gasLimit,
    baseFeePerGas: block.baseFeePerGas ?? null,
    transactionCount: 0,
    miner: block.miner,
    size: block.size ?? null,
  }).onConflictDoNothing();

  // Fetch full block with transactions
  let txList: Array<unknown> = [];
  let transactionCount = 0;

  try {
    const fullBlock = await client.getBlock({
      blockNumber: block.number,
      includeTransactions: true,
    });
    txList = fullBlock.transactions ?? [];
    transactionCount = Array.isArray(txList) ? txList.length : 0;

    if (transactionCount > 0) {
      await db.update(blocks, { number: block.number }).set({
        transactionCount,
      });
    }
  } catch (err) {
    console.error(`Failed to fetch block ${block.number} transactions:`, err);
    return; // Continue to next block
  }

  // Type for processed transaction data
  type TxData = {
    hash: `0x${string}`;
    from: `0x${string}`;
    to: `0x${string}` | null;
    value: bigint;
    gas: bigint;
    gasPrice: bigint | null;
    input: `0x${string}`;
    nonce: number;
    type: string | number;
  };

  type ReceiptData = {
    gasUsed: bigint;
    status: number;
    contractAddress: `0x${string}` | null;
    logs: Array<{
      address: `0x${string}`;
      topics: readonly `0x${string}`[];
      data: `0x${string}`;
      logIndex: number;
    }>;
  } | null;

  // Batch fetch full transactions for any that are just hashes
  const txPromises = txList.map(async (txData): Promise<TxData | null> => {
    if (!txData) return null;

    if (typeof txData === "string") {
      try {
        const fullTx = await client.getTransaction({ hash: txData as `0x${string}` });
        return {
          hash: fullTx.hash,
          from: fullTx.from,
          to: fullTx.to ?? null,
          value: fullTx.value,
          gas: fullTx.gas,
          gasPrice: fullTx.gasPrice ?? null,
          input: fullTx.input,
          nonce: fullTx.nonce,
          type: fullTx.type ?? 0,
        };
      } catch {
        return null;
      }
    }
    return txData as TxData;
  });

  const resolvedTxs = await Promise.all(txPromises);

  // ============================================================================
  // OPTIMIZED: Fetch ALL receipts in a SINGLE RPC call using eth_getBlockReceipts
  // This reduces N receipt calls to 1 call per block (10-100x improvement)
  // ============================================================================

  type BlockReceiptResult = {
    transactionHash: `0x${string}`;
    transactionIndex: `0x${string}`;
    gasUsed: `0x${string}`;
    status: `0x${string}`;
    contractAddress: `0x${string}` | null;
    logs: Array<{
      address: `0x${string}`;
      topics: `0x${string}`[];
      data: `0x${string}`;
      logIndex: `0x${string}`;
    }>;
  };

  const receiptsMap = new Map<string, ReceiptData>();

  try {
    // Single RPC call for all receipts in block
    const blockReceipts = await client.request({
      method: "eth_getBlockReceipts" as "eth_getTransactionReceipt",
      params: [`0x${block.number.toString(16)}`] as unknown as [hash: `0x${string}`],
    }) as unknown as BlockReceiptResult[] | null;

    if (blockReceipts) {
      for (const receipt of blockReceipts) {
        receiptsMap.set(receipt.transactionHash.toLowerCase(), {
          gasUsed: BigInt(receipt.gasUsed),
          status: receipt.status === "0x1" ? 1 : 0,
          contractAddress: receipt.contractAddress ?? null,
          logs: receipt.logs.map((log) => ({
            address: log.address,
            topics: log.topics as readonly `0x${string}`[],
            data: log.data,
            logIndex: parseInt(log.logIndex, 16),
          })),
        });
      }
    }
  } catch (err) {
    // Fallback to individual receipt fetches if eth_getBlockReceipts fails
    console.warn(`eth_getBlockReceipts failed for block ${block.number}, falling back:`, err);
    const receiptPromises = resolvedTxs.map(async (tx): Promise<[string, ReceiptData]> => {
      if (!tx) return ["", null];
      try {
        const receipt = await client.getTransactionReceipt({ hash: tx.hash });
        return [tx.hash.toLowerCase(), {
          gasUsed: receipt.gasUsed,
          status: receipt.status === "success" ? 1 : 0,
          contractAddress: receipt.contractAddress ?? null,
          logs: receipt.logs ?? [],
        }];
      } catch {
        return [tx.hash.toLowerCase(), null];
      }
    });
    const results = await Promise.all(receiptPromises);
    for (const [hash, receipt] of results) {
      if (hash) receiptsMap.set(hash, receipt);
    }
  }

  // Track discovered tokens in this block (to avoid duplicate metadata fetches)
  const discoveredTokens = new Set<string>();

  // Process transactions with their receipts
  for (let i = 0; i < transactionCount; i++) {
    const tx = resolvedTxs[i];
    if (!tx) continue;

    // Get receipt from map (keyed by lowercase tx hash)
    const receipt = receiptsMap.get(tx.hash.toLowerCase());
    const gasUsed = receipt?.gasUsed ?? null;
    const status = receipt?.status ?? null;
    const contractAddress = receipt?.contractAddress ?? null;
    const logs = receipt?.logs ?? [];

    // Index event logs and detect token transfers
    for (const log of logs) {
      const logId = `${tx.hash}-${log.logIndex}`;
      const eventName = getEventName(log.topics[0]);

      await db.insert(eventLogs).values({
        id: logId,
        transactionHash: tx.hash,
        blockNumber: block.number,
        timestamp: block.timestamp,
        address: log.address,
        topic0: log.topics[0] ?? null,
        topic1: log.topics[1] ?? null,
        topic2: log.topics[2] ?? null,
        topic3: log.topics[3] ?? null,
        data: log.data,
        logIndex: log.logIndex,
        eventName,
      }).onConflictDoNothing();

      // Detect ERC-20 transfers and record them
      const transfer = decodeERC20Transfer(log);
      if (transfer) {
        const tokenAddress = log.address;

        // Insert token transfer record
        await db.insert(tokenTransfers).values({
          id: logId,
          transactionHash: tx.hash,
          blockNumber: block.number,
          timestamp: block.timestamp,
          tokenAddress,
          from: transfer.from,
          to: transfer.to,
          value: transfer.value,
          logIndex: log.logIndex,
        }).onConflictDoNothing();

        // Discover token if not already processed in this block
        const tokenKey = tokenAddress.toLowerCase();
        if (!discoveredTokens.has(tokenKey)) {
          discoveredTokens.add(tokenKey);

          const existingToken = await db.find(tokens, { address: tokenAddress });
          if (!existingToken) {
            // New token - fetch metadata
            let name: string | null = null;
            let symbol: string | null = null;
            let decimals: number | null = null;

            try {
              const [nameResult, symbolResult, decimalsResult] = await Promise.allSettled([
                client.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "name" }),
                client.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "symbol" }),
                client.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "decimals" }),
              ]);

              if (nameResult.status === "fulfilled") name = nameResult.value as string;
              if (symbolResult.status === "fulfilled") symbol = symbolResult.value as string;
              if (decimalsResult.status === "fulfilled") decimals = Number(decimalsResult.value);
            } catch {
              // Non-standard token
            }

            await db.insert(tokens).values({
              address: tokenAddress,
              name,
              symbol,
              decimals,
              totalSupply: null,
              transferCount: 1,
              holderCount: 0,
              firstSeenBlock: block.number,
              firstSeenTimestamp: block.timestamp,
              iconUrl: null,
              isVerified: null,
              website: null,
            }).onConflictDoNothing();

            // Update contract type to ERC-20 if exists
            const existingContract = await db.find(contracts, { address: tokenAddress });
            if (existingContract) {
              await db.update(contracts, { address: tokenAddress }).set({
                contractType: "erc20",
              });
            }
          } else {
            // Update transfer count
            await db.update(tokens, { address: tokenAddress }).set((row) => ({
              transferCount: row.transferCount + 1,
            }));
          }
        }
      }
    }

    // Insert transaction
    await db.insert(transactions).values({
      hash: tx.hash,
      blockNumber: block.number,
      blockHash: block.hash,
      transactionIndex: i,
      from: tx.from,
      to: tx.to ?? null,
      value: tx.value,
      gas: tx.gas,
      gasPrice: tx.gasPrice ?? null,
      gasUsed: gasUsed,
      input: tx.input,
      nonce: tx.nonce,
      type: Number.isFinite(Number(tx.type)) ? Number(tx.type) : 0,
      status: status,
      timestamp: block.timestamp,
      methodName: getMethodName(tx.input),
      errorMessage: null,
      txCategory: getTxCategory(tx.input, tx.to, tx.value),
    }).onConflictDoNothing();

    // Track contract deployments
    if (tx.to === null && contractAddress) {
      let bytecodeSize: number | null = null;
      try {
        const code = await client.getCode({ address: contractAddress });
        if (code) bytecodeSize = code.length;
      } catch {
        // Ignore
      }

      await db.insert(contracts).values({
        address: contractAddress,
        deployerAddress: tx.from,
        deploymentTxHash: tx.hash,
        blockNumber: block.number,
        timestamp: block.timestamp,
        bytecodeSize,
        isVerified: null,
        name: null,
        contractType: null,
        isProxy: null,
        implementationAddress: null,
        transactionCount: 0,
        uniqueCallerCount: 0,
        lastActivityBlock: block.number,
        lastActivityTimestamp: block.timestamp,
      }).onConflictDoNothing();
    }

    // Track accounts (simplified - no transaction count updates for receivers)
    await db.insert(accounts).values({
      address: tx.from,
      transactionCount: 1,
      isContract: false,
      firstSeenBlock: block.number,
      lastSeenBlock: block.number,
      firstSeenTimestamp: block.timestamp,
      lastSeenTimestamp: block.timestamp,
      accountType: getAccountType(tx.from, false),
      label: null,
    }).onConflictDoUpdate((row) => ({
      transactionCount: row.transactionCount + 1,
      lastSeenBlock: block.number,
      lastSeenTimestamp: block.timestamp,
    }));

    if (tx.to) {
      await db.insert(accounts).values({
        address: tx.to,
        transactionCount: 0,
        isContract: false,
        firstSeenBlock: block.number,
        lastSeenBlock: block.number,
        firstSeenTimestamp: block.timestamp,
        lastSeenTimestamp: block.timestamp,
        accountType: getAccountType(tx.to, false),
        label: null,
      }).onConflictDoUpdate(() => ({
        lastSeenBlock: block.number,
        lastSeenTimestamp: block.timestamp,
      }));
    }

    // Track deployed contract as account
    if (contractAddress) {
      await db.insert(accounts).values({
        address: contractAddress,
        transactionCount: 0,
        isContract: true,
        firstSeenBlock: block.number,
        lastSeenBlock: block.number,
        firstSeenTimestamp: block.timestamp,
        lastSeenTimestamp: block.timestamp,
        accountType: getAccountType(contractAddress, true),
        label: null,
      }).onConflictDoNothing();
    }
  }
});

// ============================================================================
// FULL MODE EVENT HANDLERS (disabled for fast indexing)
// ============================================================================
// Uncomment these handlers and the corresponding schema tables to restore
// full token/NFT tracking functionality at ~37 blocks/sec.
// ============================================================================

/*
// ERC-20 Transfer event handler - discovers tokens and tracks balances
ponder.on("ERC20:Transfer", async ({ event, context }) => {
  // ... full implementation in git history
});

// ERC-721 Transfer event handler - indexes NFT transfers
ponder.on("ERC721:Transfer", async ({ event, context }) => {
  // ... full implementation in git history
});

// ERC-1155 TransferSingle event handler
ponder.on("ERC1155:TransferSingle", async ({ event, context }) => {
  // ... full implementation in git history
});

// ERC-1155 TransferBatch event handler
ponder.on("ERC1155:TransferBatch", async ({ event, context }) => {
  // ... full implementation in git history
});

// ERC-20 Approval event handler - tracks token approvals
ponder.on("ERC20:Approval", async ({ event, context }) => {
  // ... full implementation in git history
});
*/
