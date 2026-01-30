import { onchainTable, index } from "@ponder/core";

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
  transactionCount: t.integer().notNull().default(0),
  firstSeenBlock: t.bigint().notNull(),
  lastSeenBlock: t.bigint().notNull(),
}), (table) => ({
  transactionCountIdx: index().on(table.transactionCount),
}));
