import { onchainTable, index } from "@ponder/core";

// Blocks table - stores indexed block data
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
  extraData: t.hex(),
}), (table) => ({
  timestampIdx: index().on(table.timestamp),
  hashIdx: index().on(table.hash),
}));

// Transactions table - stores indexed transaction data
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
  maxFeePerGas: t.bigint(),
  maxPriorityFeePerGas: t.bigint(),
  input: t.text().notNull(),
  nonce: t.integer().notNull(),
  type: t.integer().notNull(),
  status: t.integer(), // 1 = success, 0 = failure
  timestamp: t.bigint().notNull(),
}), (table) => ({
  blockNumberIdx: index().on(table.blockNumber),
  fromIdx: index().on(table.from),
  toIdx: index().on(table.to),
  timestampIdx: index().on(table.timestamp),
}));

// ERC20 Transfers table
export const erc20Transfers = onchainTable("erc20_transfers", (t) => ({
  id: t.text().primaryKey(), // txHash-logIndex
  transactionHash: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  logIndex: t.integer().notNull(),
  tokenAddress: t.hex().notNull(),
  from: t.hex().notNull(),
  to: t.hex().notNull(),
  value: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
}), (table) => ({
  tokenAddressIdx: index().on(table.tokenAddress),
  fromIdx: index().on(table.from),
  toIdx: index().on(table.to),
  blockNumberIdx: index().on(table.blockNumber),
}));

// Tokens table - tracks known ERC20 tokens
export const tokens = onchainTable("tokens", (t) => ({
  address: t.hex().primaryKey(),
  name: t.text(),
  symbol: t.text(),
  decimals: t.integer(),
  totalSupply: t.bigint(),
  firstSeenBlock: t.bigint().notNull(),
}));

// Accounts table - tracks account activity
export const accounts = onchainTable("accounts", (t) => ({
  address: t.hex().primaryKey(),
  transactionCount: t.integer().notNull().default(0),
  firstSeenBlock: t.bigint().notNull(),
  lastSeenBlock: t.bigint().notNull(),
}), (table) => ({
  transactionCountIdx: index().on(table.transactionCount),
}));
