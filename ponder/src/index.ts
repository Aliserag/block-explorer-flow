import { ponder } from "@/generated";
import {
  blocks,
  transactions,
  accounts,
  tokens,
  tokenTransfers,
  accountTokenBalances,
  contracts,
  dailyStats,
  hourlyStats,
  nftCollections,
  nfts,
  nftTransfers,
  nftOwnership,
  addressLabels,
  eventLogs,
  tokenDailyStats,
  contractDailyStats,
  nftCollectionDailyStats,
  contractCallers,
  contractDailyCallers,
  deployers,
  deployerDailyStats,
  tokenApprovals,
  hourlyGasStats,
  nftCreators,
  nftCreatorDailyStats,
  nftCollectors,
  nftCollectorHoldings,
} from "../ponder.schema";
import { createPublicClient, http, erc20Abi } from "viem";

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
  if (selector === "0xa9059cbb" || selector === "0x23b872dd") return "transfer"; // transfer, transferFrom
  if (selector === "0x095ea7b3") return "approve"; // approve

  // Swaps
  if (["0x7ff36ab5", "0x38ed1739", "0x8803dbee", "0xfb3bdb41", "0x18cbafe5", "0x4a25d94a", "0x3593564c"].includes(selector)) {
    return "swap";
  }

  // Minting
  if (["0x1249c58b", "0x6a627842", "0x40c10f19"].includes(selector)) return "mint";

  // Liquidity
  if (["0xe8e33700", "0xf305d719", "0xbaa2abde", "0x02751cec"].includes(selector)) return "liquidity";

  // Bridge operations (common bridge selectors)
  if (["0x0f5287b0", "0xa44c80e3", "0x3d7c74f8", "0x9c307de6", "0xd7fd19dd"].includes(selector)) {
    return "bridge";
  }

  // NFT operations
  if (["0x42842e0e", "0xb88d4fde", "0xa22cb465"].includes(selector)) return "nft_transfer";

  // Default to contract call
  return "contract_call";
}

// MaxUint256 for unlimited approval detection
const MAX_UINT256 = 115792089237316195423570985008687907853269984665640564039457584007913129639935n;

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

// Helper to get event name from topic0
function getEventName(topic0: string | undefined): string | null {
  if (!topic0) return null;
  return COMMON_EVENTS[topic0.toLowerCase()] || null;
}

// Create a dedicated viem client for fetching block data with transactions
// Ponder's context.client doesn't expose getBlock/getTransaction methods
const rpcClient = createPublicClient({
  transport: http(process.env.FLOW_EVM_RPC_URL ?? "https://mainnet.evm.nodes.onflow.org"),
});

// Helper to get date key (YYYY-MM-DD) from timestamp
function getDateKey(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toISOString().split("T")[0];
}

// Helper to get hour key (YYYY-MM-DD-HH) from timestamp
function getHourKey(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  const dateStr = date.toISOString().split("T")[0];
  const hour = date.getUTCHours().toString().padStart(2, "0");
  return `${dateStr}-${hour}`;
}

// Block handler - indexes blocks, transactions, contracts, and stats
ponder.on("FlowBlocks:block", async ({ event, context }) => {
  const { db } = context;
  const block = event.block;

  // First, insert just the block with 0 transactions to verify DB writes work
  await db.insert(blocks).values({
    number: block.number,
    hash: block.hash,
    parentHash: block.parentHash,
    timestamp: block.timestamp,
    gasUsed: block.gasUsed,
    gasLimit: block.gasLimit,
    baseFeePerGas: block.baseFeePerGas ?? null,
    transactionCount: 0, // Start with 0, we'll update if we fetch transactions
    miner: block.miner,
    size: block.size ?? null,
  }).onConflictDoNothing();

  // Try to fetch the full block with transactions
  let txList: Array<unknown> = [];
  let transactionCount = 0;

  try {
    const fullBlock = await rpcClient.getBlock({
      blockNumber: block.number,
      includeTransactions: true,
    });
    txList = fullBlock.transactions ?? [];
    transactionCount = Array.isArray(txList) ? txList.length : 0;

    // Update block with actual transaction count if we got it
    if (transactionCount > 0) {
      await db.update(blocks, { number: block.number }).set({
        transactionCount,
      });
    }
  } catch (err) {
    // If RPC fetch fails, continue - block already inserted with transactionCount: 0
    console.error(`Failed to fetch block ${block.number} transactions:`, err);
  }

  const dateKey = getDateKey(block.timestamp);
  const hourKey = getHourKey(block.timestamp);

  let contractsDeployed = 0;
  let totalGasUsed = 0n;
  let totalGasPrice = 0n;
  let totalValue = 0n;
  const fromAddresses = new Set<string>();
  const toAddresses = new Set<string>();
  const activeContracts = new Set<string>();
  let newAccountsCount = 0;

  // Process transactions - fetch full data if we only have hashes
  for (let i = 0; i < transactionCount; i++) {
    const txData = txList[i];
    if (!txData) continue;

    // If we only have the hash, fetch the full transaction
    let tx: {
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

    if (typeof txData === "string") {
      // txData is just a hash, fetch full transaction
      try {
        const fullTx = await rpcClient.getTransaction({ hash: txData as `0x${string}` });
        tx = {
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
        // Can't fetch transaction, skip it
        continue;
      }
    } else {
      tx = txData as typeof tx;
    }

    // Get receipt for gas used, status, and logs
    let gasUsed: bigint | null = null;
    let status: number | null = null;
    let contractAddress: `0x${string}` | null = null;
    let logs: Array<{
      address: `0x${string}`;
      topics: readonly `0x${string}`[];
      data: `0x${string}`;
      logIndex: number;
    }> = [];

    try {
      const receipt = await rpcClient.getTransactionReceipt({ hash: tx.hash });
      gasUsed = receipt.gasUsed;
      status = receipt.status === "success" ? 1 : 0;
      contractAddress = receipt.contractAddress ?? null;
      logs = receipt.logs ?? [];

      // Index event logs
      for (const log of logs) {
        const logId = `${tx.hash}-${log.logIndex}`;
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
          eventName: getEventName(log.topics[0]),
        }).onConflictDoNothing();
      }
    } catch {
      // Receipt not available, continue without it
    }

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
      errorMessage: null, // TODO: Fetch revert reason for failed txs
      txCategory: getTxCategory(tx.input, tx.to, tx.value),
    }).onConflictDoNothing();

    // Stats tracking
    if (gasUsed) totalGasUsed += gasUsed;
    if (tx.gasPrice) totalGasPrice += tx.gasPrice;
    totalValue += tx.value;
    fromAddresses.add(tx.from.toLowerCase());
    if (tx.to) {
      toAddresses.add(tx.to.toLowerCase());
      // Track active contracts (contracts that received calls)
      // We'll check if it's a contract based on having input data
      if (tx.input && tx.input !== "0x") {
        activeContracts.add(tx.to.toLowerCase());

        // Track contract caller (all-time unique users)
        const callerId = `${tx.to.toLowerCase()}-${tx.from.toLowerCase()}`;
        const existingCaller = await db.find(contractCallers, { id: callerId });

        if (!existingCaller) {
          // New caller - increment unique callers in daily stats
          await db.insert(contractCallers).values({
            id: callerId,
            contractAddress: tx.to,
            callerAddress: tx.from,
            firstCallBlock: block.number,
            firstCallTimestamp: block.timestamp,
            lastCallBlock: block.number,
            lastCallTimestamp: block.timestamp,
            callCount: 1,
          }).onConflictDoNothing();
        } else {
          // Existing caller - update stats
          await db.update(contractCallers, { id: callerId }).set({
            lastCallBlock: block.number,
            lastCallTimestamp: block.timestamp,
            callCount: existingCaller.callCount + 1,
          });
        }

        // Track daily caller
        const dailyCallerId = `${tx.to.toLowerCase()}-${tx.from.toLowerCase()}-${dateKey}`;
        const existingDailyCaller = await db.find(contractDailyCallers, { id: dailyCallerId });
        const isNewDailyCaller = !existingDailyCaller;

        await db.insert(contractDailyCallers).values({
          id: dailyCallerId,
          contractAddress: tx.to,
          callerAddress: tx.from,
          date: dateKey,
          callCount: 1,
        }).onConflictDoUpdate((row) => ({
          callCount: row.callCount + 1,
        }));

        // Update contract daily stats
        const contractDailyId = `${tx.to.toLowerCase()}-${dateKey}`;
        await db.insert(contractDailyStats).values({
          id: contractDailyId,
          contractAddress: tx.to,
          date: dateKey,
          transactionCount: 1,
          uniqueCallers: 1,
          totalGasUsed: gasUsed ?? 0n,
        }).onConflictDoUpdate((row) => ({
          transactionCount: row.transactionCount + 1,
          uniqueCallers: isNewDailyCaller ? row.uniqueCallers + 1 : row.uniqueCallers,
          totalGasUsed: row.totalGasUsed + (gasUsed ?? 0n),
        }));

        // Update contract's total transaction count and unique caller count
        const contractRecord = await db.find(contracts, { address: tx.to });
        if (contractRecord) {
          await db.update(contracts, { address: tx.to }).set({
            transactionCount: (contractRecord.transactionCount ?? 0) + 1,
            uniqueCallerCount: !existingCaller
              ? (contractRecord.uniqueCallerCount ?? 0) + 1
              : (contractRecord.uniqueCallerCount ?? 0),
            lastActivityBlock: block.number,
            lastActivityTimestamp: block.timestamp,
          });

          // Update deployer aggregate stats
          const deployerAddress = contractRecord.deployerAddress;
          await db.update(deployers, { address: deployerAddress }).set((row) => ({
            totalTransactionsAcrossContracts: row.totalTransactionsAcrossContracts + 1n,
            totalUniqueUsersAcrossContracts: !existingCaller
              ? row.totalUniqueUsersAcrossContracts + 1
              : row.totalUniqueUsersAcrossContracts,
          }));

          // Update deployer daily stats
          const deployerDailyId = `${deployerAddress.toLowerCase()}-${dateKey}`;
          await db.insert(deployerDailyStats).values({
            id: deployerDailyId,
            deployerAddress: deployerAddress,
            date: dateKey,
            totalTransactions: 1,
            totalUniqueCallers: !existingCaller ? 1 : 0,
            activeContractsCount: 1,
            newContractsDeployed: 0,
          }).onConflictDoUpdate((row) => ({
            totalTransactions: row.totalTransactions + 1,
            totalUniqueCallers: !existingCaller ? row.totalUniqueCallers + 1 : row.totalUniqueCallers,
            // Note: activeContractsCount is an approximation here
          }));
        }
      }
    }

    // Track contract deployments (to = null means contract creation)
    if (tx.to === null && contractAddress) {
      contractsDeployed++;

      // Get bytecode size
      let bytecodeSize: number | null = null;
      try {
        const code = await rpcClient.getCode({ address: contractAddress });
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
        isVerified: null, // Will be updated by verification service
        name: null,
        contractType: null, // Will be detected from events
        isProxy: null, // Will be detected from bytecode analysis
        implementationAddress: null,
        transactionCount: 0,
        uniqueCallerCount: 0,
        lastActivityBlock: block.number,
        lastActivityTimestamp: block.timestamp,
      }).onConflictDoNothing();

      // Track deployer (builder)
      const existingDeployer = await db.find(deployers, { address: tx.from });
      if (!existingDeployer) {
        await db.insert(deployers).values({
          address: tx.from,
          contractCount: 1,
          totalTransactionsAcrossContracts: 0n,
          totalUniqueUsersAcrossContracts: 0,
          firstDeployBlock: block.number,
          firstDeployTimestamp: block.timestamp,
          lastDeployBlock: block.number,
          lastDeployTimestamp: block.timestamp,
        }).onConflictDoNothing();
      } else {
        await db.update(deployers, { address: tx.from }).set({
          contractCount: existingDeployer.contractCount + 1,
          lastDeployBlock: block.number,
          lastDeployTimestamp: block.timestamp,
        });
      }

      // Update deployer daily stats for new deployment
      const deployerDailyId = `${tx.from.toLowerCase()}-${dateKey}`;
      await db.insert(deployerDailyStats).values({
        id: deployerDailyId,
        deployerAddress: tx.from,
        date: dateKey,
        totalTransactions: 0,
        totalUniqueCallers: 0,
        activeContractsCount: 0,
        newContractsDeployed: 1,
      }).onConflictDoUpdate((row) => ({
        newContractsDeployed: row.newContractsDeployed + 1,
      }));
    }

    // Track accounts
    const isContract = tx.to === null && contractAddress !== null;

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

  // Calculate average gas price
  const avgGasPrice = transactionCount > 0
    ? totalGasPrice / BigInt(transactionCount)
    : 0n;

  // Update daily stats
  await db.insert(dailyStats).values({
    date: dateKey,
    transactionCount: transactionCount,
    blockCount: 1,
    contractsDeployed,
    totalGasUsed,
    avgGasPrice,
    uniqueFromAddresses: fromAddresses.size,
    uniqueToAddresses: toAddresses.size,
    tokenTransferCount: 0, // Updated by Transfer handler
    totalValueTransferred: totalValue,
    nftTransferCount: 0, // Updated by NFT handlers
    newAccountsCount: newAccountsCount,
    activeContractsCount: activeContracts.size,
  }).onConflictDoUpdate((row) => ({
    transactionCount: row.transactionCount + transactionCount,
    blockCount: row.blockCount + 1,
    contractsDeployed: row.contractsDeployed + contractsDeployed,
    totalGasUsed: row.totalGasUsed + totalGasUsed,
    avgGasPrice: row.transactionCount > 0
      ? (row.avgGasPrice * BigInt(row.transactionCount) + avgGasPrice * BigInt(transactionCount)) /
        BigInt(row.transactionCount + transactionCount)
      : avgGasPrice,
    uniqueFromAddresses: row.uniqueFromAddresses + fromAddresses.size, // Approximation
    newAccountsCount: row.newAccountsCount + newAccountsCount,
    activeContractsCount: row.activeContractsCount + activeContracts.size, // Approximation
    uniqueToAddresses: row.uniqueToAddresses + toAddresses.size, // Approximation
    totalValueTransferred: row.totalValueTransferred + totalValue,
  }));

  // Update hourly stats
  await db.insert(hourlyStats).values({
    hour: hourKey,
    transactionCount: transactionCount,
    blockCount: 1,
    contractsDeployed,
    totalGasUsed,
    avgGasPrice,
    tokenTransferCount: 0, // Updated by Transfer handler
  }).onConflictDoUpdate((row) => ({
    transactionCount: row.transactionCount + transactionCount,
    blockCount: row.blockCount + 1,
    contractsDeployed: row.contractsDeployed + contractsDeployed,
    totalGasUsed: row.totalGasUsed + totalGasUsed,
    avgGasPrice: row.transactionCount > 0
      ? (row.avgGasPrice * BigInt(row.transactionCount) + avgGasPrice * BigInt(transactionCount)) /
        BigInt(row.transactionCount + transactionCount)
      : avgGasPrice,
  }));

  // Update hourly gas stats (for gas tracker)
  const minGas = avgGasPrice;
  const maxGas = avgGasPrice;
  await db.insert(hourlyGasStats).values({
    hour: hourKey,
    minGasPrice: minGas,
    maxGasPrice: maxGas,
    avgGasPrice,
    medianGasPrice: null,
    transactionCount,
    totalGasUsed,
  }).onConflictDoUpdate((row) => ({
    minGasPrice: row.minGasPrice < minGas ? row.minGasPrice : minGas,
    maxGasPrice: row.maxGasPrice > maxGas ? row.maxGasPrice : maxGas,
    avgGasPrice: row.transactionCount > 0
      ? (row.avgGasPrice * BigInt(row.transactionCount) + avgGasPrice * BigInt(transactionCount)) /
        BigInt(row.transactionCount + transactionCount)
      : avgGasPrice,
    transactionCount: row.transactionCount + transactionCount,
    totalGasUsed: row.totalGasUsed + totalGasUsed,
  }));
});

// ERC-20 Transfer event handler - discovers tokens and tracks balances
ponder.on("ERC20:Transfer", async ({ event, context }) => {
  const { db, client } = context;
  const { from, to, value } = event.args;
  const tokenAddress = event.log.address;
  const blockNumber = event.block.number;
  const timestamp = event.block.timestamp;

  // Insert transfer record
  const transferId = `${event.transaction.hash}-${event.log.logIndex}`;
  await db.insert(tokenTransfers).values({
    id: transferId,
    transactionHash: event.transaction.hash,
    blockNumber,
    timestamp,
    tokenAddress,
    from,
    to,
    value,
    logIndex: event.log.logIndex,
  }).onConflictDoNothing();

  // Discover/update token
  const existingToken = await db.find(tokens, { address: tokenAddress });

  if (!existingToken) {
    // New token discovered - try to fetch metadata
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
      // Non-standard token, leave metadata null
    }

    await db.insert(tokens).values({
      address: tokenAddress,
      name,
      symbol,
      decimals,
      totalSupply: null,
      transferCount: 1,
      holderCount: 0,
      firstSeenBlock: blockNumber,
      firstSeenTimestamp: timestamp,
      iconUrl: null, // Can be populated from token list
      isVerified: null,
      website: null,
    }).onConflictDoNothing();

    // Update contract type to ERC-20 if this contract exists
    await db.update(contracts, { address: tokenAddress }).set({
      contractType: "erc20",
    });
  } else {
    // Update transfer count
    await db.update(tokens, { address: tokenAddress }).set((row) => ({
      transferCount: row.transferCount + 1,
    }));
  }

  // Update sender balance (if not minting from zero address)
  const zeroAddress = "0x0000000000000000000000000000000000000000" as `0x${string}`;

  if (from.toLowerCase() !== zeroAddress.toLowerCase()) {
    const fromBalanceId = `${from.toLowerCase()}-${tokenAddress.toLowerCase()}`;

    const existingFromBalance = await db.find(accountTokenBalances, { id: fromBalanceId });

    if (existingFromBalance) {
      await db.update(accountTokenBalances, { id: fromBalanceId }).set((row) => ({
        balance: row.balance - value,
        lastUpdatedBlock: blockNumber,
        lastUpdatedTimestamp: timestamp,
      }));
    } else {
      // First outgoing transfer without previous incoming - shouldn't happen normally
      // but handle gracefully
      await db.insert(accountTokenBalances).values({
        id: fromBalanceId,
        accountAddress: from,
        tokenAddress,
        balance: 0n - value, // Will be negative, corrected by future incoming transfers
        lastUpdatedBlock: blockNumber,
        lastUpdatedTimestamp: timestamp,
      }).onConflictDoNothing();
    }
  }

  // Update receiver balance (if not burning to zero address)
  if (to.toLowerCase() !== zeroAddress.toLowerCase()) {
    const toBalanceId = `${to.toLowerCase()}-${tokenAddress.toLowerCase()}`;

    const existingToBalance = await db.find(accountTokenBalances, { id: toBalanceId });

    if (existingToBalance) {
      await db.update(accountTokenBalances, { id: toBalanceId }).set((row) => ({
        balance: row.balance + value,
        lastUpdatedBlock: blockNumber,
        lastUpdatedTimestamp: timestamp,
      }));
    } else {
      // New holder
      await db.insert(accountTokenBalances).values({
        id: toBalanceId,
        accountAddress: to,
        tokenAddress,
        balance: value,
        lastUpdatedBlock: blockNumber,
        lastUpdatedTimestamp: timestamp,
      }).onConflictDoNothing();

      // Increment holder count for token
      await db.update(tokens, { address: tokenAddress }).set((row) => ({
        holderCount: row.holderCount + 1,
      }));
    }
  }

  // Update token daily stats
  const dateKey = getDateKey(timestamp);
  const tokenDailyId = `${tokenAddress.toLowerCase()}-${dateKey}`;
  const isMint = from.toLowerCase() === zeroAddress.toLowerCase();
  const isBurn = to.toLowerCase() === zeroAddress.toLowerCase();

  await db.insert(tokenDailyStats).values({
    id: tokenDailyId,
    tokenAddress,
    date: dateKey,
    transferCount: 1,
    volume: value,
    uniqueSenders: 1,
    uniqueReceivers: 1,
    mintAmount: isMint ? value : 0n,
    burnAmount: isBurn ? value : 0n,
  }).onConflictDoUpdate((row) => ({
    transferCount: row.transferCount + 1,
    volume: row.volume + value,
    mintAmount: isMint ? row.mintAmount + value : row.mintAmount,
    burnAmount: isBurn ? row.burnAmount + value : row.burnAmount,
  }));

  // Update daily stats token transfer count
  await db.update(dailyStats, { date: dateKey }).set((row) => ({
    tokenTransferCount: row.tokenTransferCount + 1,
  }));

  // Update hourly stats token transfer count
  const hourKey = getHourKey(timestamp);
  await db.update(hourlyStats, { hour: hourKey }).set((row) => ({
    tokenTransferCount: row.tokenTransferCount + 1,
  }));
});

// ERC-721 Transfer event handler - indexes NFT transfers
ponder.on("ERC721:Transfer", async ({ event, context }) => {
  const { db, client } = context;
  const { from, to, tokenId } = event.args;
  const collectionAddress = event.log.address;
  const blockNumber = event.block.number;
  const timestamp = event.block.timestamp;
  const zeroAddress = "0x0000000000000000000000000000000000000000" as `0x${string}`;
  const isMint = from.toLowerCase() === zeroAddress.toLowerCase();

  // Insert transfer record
  const transferId = `${event.transaction.hash}-${event.log.logIndex}`;
  await db.insert(nftTransfers).values({
    id: transferId,
    transactionHash: event.transaction.hash,
    blockNumber,
    timestamp,
    collectionAddress,
    tokenId,
    from,
    to,
    operator: null,
    value: 1n,
    logIndex: event.log.logIndex,
  }).onConflictDoNothing();

  // Discover/update collection
  const existingCollection = await db.find(nftCollections, { address: collectionAddress });

  if (!existingCollection) {
    // New collection discovered - try to fetch metadata
    let name: string | null = null;
    let symbol: string | null = null;

    try {
      const erc721MetadataAbi = [
        { type: "function", name: "name", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
        { type: "function", name: "symbol", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
      ] as const;

      const [nameResult, symbolResult] = await Promise.allSettled([
        client.readContract({ address: collectionAddress, abi: erc721MetadataAbi, functionName: "name" }),
        client.readContract({ address: collectionAddress, abi: erc721MetadataAbi, functionName: "symbol" }),
      ]);

      if (nameResult.status === "fulfilled") name = nameResult.value as string;
      if (symbolResult.status === "fulfilled") symbol = symbolResult.value as string;
    } catch {
      // Non-standard NFT, leave metadata null
    }

    // Get creator address from contract deployer
    const contractRecord = await db.find(contracts, { address: collectionAddress });
    const creatorAddress = contractRecord?.deployerAddress ?? null;

    await db.insert(nftCollections).values({
      address: collectionAddress,
      name,
      symbol,
      standard: "ERC721",
      totalSupply: null,
      transferCount: 1,
      holderCount: isMint ? 1 : 0,
      uniqueOwnerCount: isMint ? 1 : 0,
      creatorAddress,
      mintCount: isMint ? 1 : 0,
      burnCount: 0,
      firstSeenBlock: blockNumber,
      firstSeenTimestamp: timestamp,
    }).onConflictDoNothing();

    // Update contract type to ERC-721 if this contract exists
    await db.update(contracts, { address: collectionAddress }).set({
      contractType: "erc721",
    });

    // Track NFT creator
    if (creatorAddress) {
      const existingCreator = await db.find(nftCreators, { address: creatorAddress });
      if (!existingCreator) {
        await db.insert(nftCreators).values({
          address: creatorAddress,
          collectionCount: 1,
          totalNftsMinted: isMint ? 1 : 0,
          totalUniqueOwners: isMint ? 1 : 0,
          totalTransfers: 1,
          firstCreateBlock: blockNumber,
          firstCreateTimestamp: timestamp,
          lastCreateBlock: blockNumber,
          lastCreateTimestamp: timestamp,
        }).onConflictDoNothing();
      }
    }
  } else {
    // Update transfer count
    await db.update(nftCollections, { address: collectionAddress }).set((row) => ({
      transferCount: row.transferCount + 1,
      holderCount: isMint ? row.holderCount + 1 : row.holderCount,
    }));
  }

  // Update/create NFT record
  const nftId = `${collectionAddress.toLowerCase()}-${tokenId.toString()}`;
  const existingNft = await db.find(nfts, { id: nftId });

  if (!existingNft) {
    // New NFT - try to get tokenURI
    let tokenUri: string | null = null;
    try {
      const tokenUriAbi = [
        { type: "function", name: "tokenURI", inputs: [{ type: "uint256", name: "tokenId" }], outputs: [{ type: "string" }], stateMutability: "view" },
      ] as const;
      tokenUri = await client.readContract({ address: collectionAddress, abi: tokenUriAbi, functionName: "tokenURI", args: [tokenId] });
    } catch {
      // tokenURI not available
    }

    await db.insert(nfts).values({
      id: nftId,
      collectionAddress,
      tokenId,
      owner: to,
      tokenUri,
      mintedBlock: blockNumber,
      mintedTimestamp: timestamp,
      lastTransferBlock: blockNumber,
      lastTransferTimestamp: timestamp,
      transferCount: 1,
      imageUrl: null, // Can be fetched from tokenUri asynchronously
      metadata: null,
    }).onConflictDoNothing();
  } else {
    // Update NFT owner
    await db.update(nfts, { id: nftId }).set({
      owner: to,
      lastTransferBlock: blockNumber,
      lastTransferTimestamp: timestamp,
      transferCount: existingNft.transferCount + 1,
    });
  }

  // Update ownership records
  // Remove from sender (if not mint)
  if (!isMint) {
    const fromOwnershipId = `${from.toLowerCase()}-${collectionAddress.toLowerCase()}-${tokenId.toString()}`;
    const existingFromOwnership = await db.find(nftOwnership, { id: fromOwnershipId });

    if (existingFromOwnership) {
      await db.update(nftOwnership, { id: fromOwnershipId }).set({
        balance: 0n,
        lastUpdatedBlock: blockNumber,
        lastUpdatedTimestamp: timestamp,
      });
    }
    // If record doesn't exist, we're seeing a transfer for an NFT acquired before our start block - skip
  }

  // Add to receiver (if not burn)
  const isBurn = to.toLowerCase() === zeroAddress.toLowerCase();
  if (!isBurn) {
    const toOwnershipId = `${to.toLowerCase()}-${collectionAddress.toLowerCase()}-${tokenId.toString()}`;
    const existingOwnership = await db.find(nftOwnership, { id: toOwnershipId });

    if (existingOwnership) {
      await db.update(nftOwnership, { id: toOwnershipId }).set({
        balance: 1n,
        lastUpdatedBlock: blockNumber,
        lastUpdatedTimestamp: timestamp,
      });
    } else {
      await db.insert(nftOwnership).values({
        id: toOwnershipId,
        ownerAddress: to,
        collectionAddress,
        tokenId,
        balance: 1n,
        lastUpdatedBlock: blockNumber,
        lastUpdatedTimestamp: timestamp,
      }).onConflictDoNothing();
    }
  }

  // Update NFT collection daily stats
  const dateKey = getDateKey(timestamp);
  const collectionDailyId = `${collectionAddress.toLowerCase()}-${dateKey}`;

  await db.insert(nftCollectionDailyStats).values({
    id: collectionDailyId,
    collectionAddress,
    date: dateKey,
    transferCount: 1,
    mintCount: isMint ? 1 : 0,
    burnCount: isBurn ? 1 : 0,
    uniqueTraders: 1,
  }).onConflictDoUpdate((row) => ({
    transferCount: row.transferCount + 1,
    mintCount: isMint ? row.mintCount + 1 : row.mintCount,
    burnCount: isBurn ? row.burnCount + 1 : row.burnCount,
  }));

  // Update daily stats NFT transfer count
  await db.update(dailyStats, { date: dateKey }).set((row) => ({
    nftTransferCount: row.nftTransferCount + 1,
  }));
});

// ERC-1155 TransferSingle event handler
ponder.on("ERC1155:TransferSingle", async ({ event, context }) => {
  const { db, client } = context;
  const { operator, from, to, id: tokenId, value } = event.args;
  const collectionAddress = event.log.address;
  const blockNumber = event.block.number;
  const timestamp = event.block.timestamp;
  const zeroAddress = "0x0000000000000000000000000000000000000000" as `0x${string}`;
  const isMint = from.toLowerCase() === zeroAddress.toLowerCase();

  // Insert transfer record
  const transferId = `${event.transaction.hash}-${event.log.logIndex}`;
  await db.insert(nftTransfers).values({
    id: transferId,
    transactionHash: event.transaction.hash,
    blockNumber,
    timestamp,
    collectionAddress,
    tokenId,
    from,
    to,
    operator,
    value,
    logIndex: event.log.logIndex,
  }).onConflictDoNothing();

  // Discover/update collection
  const existingCollection = await db.find(nftCollections, { address: collectionAddress });

  if (!existingCollection) {
    await db.insert(nftCollections).values({
      address: collectionAddress,
      name: null,
      symbol: null,
      standard: "ERC1155",
      totalSupply: null,
      transferCount: 1,
      holderCount: isMint ? 1 : 0,
      firstSeenBlock: blockNumber,
      firstSeenTimestamp: timestamp,
    }).onConflictDoNothing();

    // Update contract type to ERC-1155 if this contract exists
    await db.update(contracts, { address: collectionAddress }).set({
      contractType: "erc1155",
    });
  } else {
    await db.update(nftCollections, { address: collectionAddress }).set((row) => ({
      transferCount: row.transferCount + 1,
    }));
  }

  // Update ownership for sender
  if (!isMint) {
    const fromOwnershipId = `${from.toLowerCase()}-${collectionAddress.toLowerCase()}-${tokenId.toString()}`;
    const existingFromOwnership = await db.find(nftOwnership, { id: fromOwnershipId });

    if (existingFromOwnership) {
      const newBalance = existingFromOwnership.balance - value;
      await db.update(nftOwnership, { id: fromOwnershipId }).set({
        balance: newBalance > 0n ? newBalance : 0n,
        lastUpdatedBlock: blockNumber,
        lastUpdatedTimestamp: timestamp,
      });
    }
  }

  // Update ownership for receiver
  const isBurn = to.toLowerCase() === zeroAddress.toLowerCase();
  if (!isBurn) {
    const toOwnershipId = `${to.toLowerCase()}-${collectionAddress.toLowerCase()}-${tokenId.toString()}`;
    const existingToOwnership = await db.find(nftOwnership, { id: toOwnershipId });

    if (existingToOwnership) {
      await db.update(nftOwnership, { id: toOwnershipId }).set({
        balance: existingToOwnership.balance + value,
        lastUpdatedBlock: blockNumber,
        lastUpdatedTimestamp: timestamp,
      });
    } else {
      await db.insert(nftOwnership).values({
        id: toOwnershipId,
        ownerAddress: to,
        collectionAddress,
        tokenId,
        balance: value,
        lastUpdatedBlock: blockNumber,
        lastUpdatedTimestamp: timestamp,
      }).onConflictDoNothing();

      // Increment holder count for collection
      await db.update(nftCollections, { address: collectionAddress }).set((row) => ({
        holderCount: row.holderCount + 1,
      }));
    }
  }
});

// ERC-1155 TransferBatch event handler
ponder.on("ERC1155:TransferBatch", async ({ event, context }) => {
  const { db } = context;
  const { operator, from, to, ids, values } = event.args;
  const collectionAddress = event.log.address;
  const blockNumber = event.block.number;
  const timestamp = event.block.timestamp;
  const zeroAddress = "0x0000000000000000000000000000000000000000" as `0x${string}`;
  const isMint = from.toLowerCase() === zeroAddress.toLowerCase();
  const isBurn = to.toLowerCase() === zeroAddress.toLowerCase();

  // Process each token in the batch
  for (let i = 0; i < ids.length; i++) {
    const tokenId = ids[i];
    const value = values[i];

    // Insert transfer record
    const transferId = `${event.transaction.hash}-${event.log.logIndex}-${i}`;
    await db.insert(nftTransfers).values({
      id: transferId,
      transactionHash: event.transaction.hash,
      blockNumber,
      timestamp,
      collectionAddress,
      tokenId,
      from,
      to,
      operator,
      value,
      logIndex: event.log.logIndex,
    }).onConflictDoNothing();

    // Update ownership for sender
    if (!isMint) {
      const fromOwnershipId = `${from.toLowerCase()}-${collectionAddress.toLowerCase()}-${tokenId.toString()}`;
      const existingFromOwnership = await db.find(nftOwnership, { id: fromOwnershipId });

      if (existingFromOwnership) {
        const newBalance = existingFromOwnership.balance - value;
        await db.update(nftOwnership, { id: fromOwnershipId }).set({
          balance: newBalance > 0n ? newBalance : 0n,
          lastUpdatedBlock: blockNumber,
          lastUpdatedTimestamp: timestamp,
        });
      }
    }

    // Update ownership for receiver
    if (!isBurn) {
      const toOwnershipId = `${to.toLowerCase()}-${collectionAddress.toLowerCase()}-${tokenId.toString()}`;
      const existingToOwnership = await db.find(nftOwnership, { id: toOwnershipId });

      if (existingToOwnership) {
        await db.update(nftOwnership, { id: toOwnershipId }).set({
          balance: existingToOwnership.balance + value,
          lastUpdatedBlock: blockNumber,
          lastUpdatedTimestamp: timestamp,
        });
      } else {
        await db.insert(nftOwnership).values({
          id: toOwnershipId,
          ownerAddress: to,
          collectionAddress,
          tokenId,
          balance: value,
          lastUpdatedBlock: blockNumber,
          lastUpdatedTimestamp: timestamp,
        }).onConflictDoNothing();
      }
    }
  }

  // Update collection stats once for the batch
  const existingCollection = await db.find(nftCollections, { address: collectionAddress });

  if (!existingCollection) {
    const contractRecord = await db.find(contracts, { address: collectionAddress });
    const creatorAddress = contractRecord?.deployerAddress ?? null;

    await db.insert(nftCollections).values({
      address: collectionAddress,
      name: null,
      symbol: null,
      standard: "ERC1155",
      totalSupply: null,
      transferCount: ids.length,
      holderCount: isMint ? 1 : 0,
      uniqueOwnerCount: isMint ? 1 : 0,
      creatorAddress,
      mintCount: isMint ? ids.length : 0,
      burnCount: isBurn ? ids.length : 0,
      firstSeenBlock: blockNumber,
      firstSeenTimestamp: timestamp,
    }).onConflictDoNothing();

    // Update contract type to ERC-1155 if this contract exists
    await db.update(contracts, { address: collectionAddress }).set({
      contractType: "erc1155",
    });
  } else {
    await db.update(nftCollections, { address: collectionAddress }).set((row) => ({
      transferCount: row.transferCount + ids.length,
      mintCount: isMint ? (row.mintCount ?? 0) + ids.length : row.mintCount,
      burnCount: isBurn ? (row.burnCount ?? 0) + ids.length : row.burnCount,
    }));
  }
});

// ERC-20 Approval event handler - tracks token approvals
ponder.on("ERC20:Approval", async ({ event, context }) => {
  const { db } = context;
  const { owner, spender, value } = event.args;
  const tokenAddress = event.log.address;
  const blockNumber = event.block.number;
  const timestamp = event.block.timestamp;

  const approvalId = `${tokenAddress.toLowerCase()}-${owner.toLowerCase()}-${spender.toLowerCase()}`;
  const isUnlimited = value >= MAX_UINT256 / 2n; // Treat very large values as unlimited

  await db.insert(tokenApprovals).values({
    id: approvalId,
    tokenAddress,
    ownerAddress: owner,
    spenderAddress: spender,
    allowance: value,
    isUnlimited,
    blockNumber,
    timestamp,
    transactionHash: event.transaction.hash,
  }).onConflictDoUpdate(() => ({
    allowance: value,
    isUnlimited,
    blockNumber,
    timestamp,
    transactionHash: event.transaction.hash,
  }));
});
