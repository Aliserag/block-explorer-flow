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
} from "../ponder.schema";
import { erc20Abi } from "viem";

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
  const { db, client } = context;
  const block = event.block;

  // Get transaction count safely
  const txList = block.transactions ?? [];
  const transactionCount = Array.isArray(txList) ? txList.length : 0;

  // Insert block
  await db.insert(blocks).values({
    number: block.number,
    hash: block.hash,
    parentHash: block.parentHash,
    timestamp: block.timestamp,
    gasUsed: block.gasUsed,
    gasLimit: block.gasLimit,
    baseFeePerGas: block.baseFeePerGas ?? null,
    transactionCount,
    miner: block.miner,
    size: block.size ?? null,
  }).onConflictDoNothing();

  const dateKey = getDateKey(block.timestamp);
  const hourKey = getHourKey(block.timestamp);

  let contractsDeployed = 0;
  let totalGasUsed = 0n;
  let totalGasPrice = 0n;
  let totalValue = 0n;
  const fromAddresses = new Set<string>();
  const toAddresses = new Set<string>();

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
        const fullTx = await client.getTransaction({ hash: txData as `0x${string}` });
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

    // Get receipt for gas used and status
    let gasUsed: bigint | null = null;
    let status: number | null = null;
    let contractAddress: `0x${string}` | null = null;

    try {
      const receipt = await client.getTransactionReceipt({ hash: tx.hash });
      gasUsed = receipt.gasUsed;
      status = receipt.status === "success" ? 1 : 0;
      contractAddress = receipt.contractAddress ?? null;
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
      type: tx.type ? Number(tx.type) : 0,
      status: status,
      timestamp: block.timestamp,
    }).onConflictDoNothing();

    // Stats tracking
    if (gasUsed) totalGasUsed += gasUsed;
    if (tx.gasPrice) totalGasPrice += tx.gasPrice;
    totalValue += tx.value;
    fromAddresses.add(tx.from.toLowerCase());
    if (tx.to) toAddresses.add(tx.to.toLowerCase());

    // Track contract deployments (to = null means contract creation)
    if (tx.to === null && contractAddress) {
      contractsDeployed++;

      // Get bytecode size
      let bytecodeSize: number | null = null;
      try {
        const code = await client.getBytecode({ address: contractAddress });
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
      }).onConflictDoNothing();
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
    }).onConflictDoNothing();
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

  // Update daily stats token transfer count
  const dateKey = getDateKey(timestamp);
  await db.update(dailyStats, { date: dateKey }).set((row) => ({
    tokenTransferCount: row.tokenTransferCount + 1,
  }));

  // Update hourly stats token transfer count
  const hourKey = getHourKey(timestamp);
  await db.update(hourlyStats, { hour: hourKey }).set((row) => ({
    tokenTransferCount: row.tokenTransferCount + 1,
  }));
});
