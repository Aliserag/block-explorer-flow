import { onchainTable, index } from "@ponder/core";

// ============ Core Tables ============

export const blocks = onchainTable("blocks", (t) => ({
  number: t.bigint().primaryKey(),
  hash: t.hex().notNull(),
  parentHash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
  gasUsed: t.bigint().notNull(),
  gasLimit: t.bigint().notNull(),
  baseFeePerGas: t.bigint(),
  transactionCount: t.integer().notNull(),
  miner: t.hex().notNull(),
  size: t.bigint(),
}), (table) => ({
  timestampIdx: index().on(table.timestamp),
  hashIdx: index().on(table.hash),
}));

export const transactions = onchainTable("transactions", (t) => ({
  hash: t.hex().primaryKey(),
  blockNumber: t.bigint().notNull(),
  blockHash: t.hex().notNull(),
  transactionIndex: t.integer().notNull(),
  from: t.hex().notNull(),
  to: t.hex(),
  value: t.bigint().notNull(),
  gas: t.bigint().notNull(),
  gasPrice: t.bigint(),
  gasUsed: t.bigint(),
  input: t.text().notNull(),
  nonce: t.integer().notNull(),
  type: t.integer().notNull(),
  status: t.integer(),
  timestamp: t.bigint().notNull(),
}), (table) => ({
  blockNumberIdx: index().on(table.blockNumber),
  fromIdx: index().on(table.from),
  toIdx: index().on(table.to),
  timestampIdx: index().on(table.timestamp),
}));

export const accounts = onchainTable("accounts", (t) => ({
  address: t.hex().primaryKey(),
  transactionCount: t.integer().notNull(),
  isContract: t.boolean().notNull(),
  firstSeenBlock: t.bigint().notNull(),
  lastSeenBlock: t.bigint().notNull(),
  firstSeenTimestamp: t.bigint(),
  lastSeenTimestamp: t.bigint(),
}), (table) => ({
  transactionCountIdx: index().on(table.transactionCount),
  isContractIdx: index().on(table.isContract),
}));

// ============ Token Tables ============

export const tokens = onchainTable("tokens", (t) => ({
  address: t.hex().primaryKey(),
  name: t.text(),
  symbol: t.text(),
  decimals: t.integer(),
  totalSupply: t.bigint(),
  transferCount: t.integer().notNull(),
  holderCount: t.integer().notNull(),
  firstSeenBlock: t.bigint().notNull(),
  firstSeenTimestamp: t.bigint().notNull(),
}), (table) => ({
  symbolIdx: index().on(table.symbol),
  transferCountIdx: index().on(table.transferCount),
}));

export const tokenTransfers = onchainTable("token_transfers", (t) => ({
  id: t.text().primaryKey(), // txHash-logIndex
  transactionHash: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  tokenAddress: t.hex().notNull(),
  from: t.hex().notNull(),
  to: t.hex().notNull(),
  value: t.bigint().notNull(),
  logIndex: t.integer().notNull(),
}), (table) => ({
  tokenIdx: index().on(table.tokenAddress),
  fromIdx: index().on(table.from),
  toIdx: index().on(table.to),
  blockIdx: index().on(table.blockNumber),
  timestampIdx: index().on(table.timestamp),
}));

export const accountTokenBalances = onchainTable("account_token_balances", (t) => ({
  id: t.text().primaryKey(), // account-token
  accountAddress: t.hex().notNull(),
  tokenAddress: t.hex().notNull(),
  balance: t.bigint().notNull(),
  lastUpdatedBlock: t.bigint().notNull(),
  lastUpdatedTimestamp: t.bigint().notNull(),
}), (table) => ({
  accountIdx: index().on(table.accountAddress),
  tokenIdx: index().on(table.tokenAddress),
  balanceIdx: index().on(table.balance),
}));

// ============ Contract Tables ============

export const contracts = onchainTable("contracts", (t) => ({
  address: t.hex().primaryKey(),
  deployerAddress: t.hex().notNull(),
  deploymentTxHash: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  bytecodeSize: t.integer(),
}), (table) => ({
  deployerIdx: index().on(table.deployerAddress),
  blockIdx: index().on(table.blockNumber),
  timestampIdx: index().on(table.timestamp),
}));

// ============ Analytics Tables ============

export const dailyStats = onchainTable("daily_stats", (t) => ({
  date: t.text().primaryKey(), // YYYY-MM-DD
  transactionCount: t.integer().notNull(),
  blockCount: t.integer().notNull(),
  contractsDeployed: t.integer().notNull(),
  totalGasUsed: t.bigint().notNull(),
  avgGasPrice: t.bigint().notNull(),
  uniqueFromAddresses: t.integer().notNull(),
  uniqueToAddresses: t.integer().notNull(),
  tokenTransferCount: t.integer().notNull(),
  totalValueTransferred: t.bigint().notNull(),
}));

export const hourlyStats = onchainTable("hourly_stats", (t) => ({
  hour: t.text().primaryKey(), // YYYY-MM-DD-HH
  transactionCount: t.integer().notNull(),
  blockCount: t.integer().notNull(),
  contractsDeployed: t.integer().notNull(),
  totalGasUsed: t.bigint().notNull(),
  avgGasPrice: t.bigint().notNull(),
  tokenTransferCount: t.integer().notNull(),
}));
