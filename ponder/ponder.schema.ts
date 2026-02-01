import { onchainTable, index } from "@ponder/core";

// ============================================================================
// FAST MODE SCHEMA (7 tables)
// ============================================================================
// This is Ponder-recommended architecture: block handler only, no wildcard events.
// Target: 200+ blocks/sec
// To restore Full Mode (28 tables), uncomment the sections below.
// ============================================================================

// ============ Core Tables (KEEP) ============

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
  // New fields for better UX
  errorMessage: t.text(),       // Revert reason for failed transactions
  methodName: t.text(),         // Human-readable: "transfer", "swap", "approve", etc.
  txCategory: t.text(),         // 'transfer' | 'swap' | 'mint' | 'approve' | 'contract_call' | 'contract_deploy'
}), (table) => ({
  blockNumberIdx: index().on(table.blockNumber),
  fromIdx: index().on(table.from),
  toIdx: index().on(table.to),
  timestampIdx: index().on(table.timestamp),
  txCategoryIdx: index().on(table.txCategory),
}));

export const accounts = onchainTable("accounts", (t) => ({
  address: t.hex().primaryKey(),
  transactionCount: t.integer().notNull(),
  isContract: t.boolean().notNull(),
  firstSeenBlock: t.bigint().notNull(),
  lastSeenBlock: t.bigint().notNull(),
  firstSeenTimestamp: t.bigint(),
  lastSeenTimestamp: t.bigint(),
  // New fields for account classification
  accountType: t.text(),        // 'eoa' | 'contract' | 'coa' (Cadence Owned Account)
  label: t.text(),              // Known address label (e.g., "Uniswap Router")
}), (table) => ({
  transactionCountIdx: index().on(table.transactionCount),
  isContractIdx: index().on(table.isContract),
  accountTypeIdx: index().on(table.accountType),
}));

export const contracts = onchainTable("contracts", (t) => ({
  address: t.hex().primaryKey(),
  deployerAddress: t.hex().notNull(),
  deploymentTxHash: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  bytecodeSize: t.integer(),
  // Contract classification
  isVerified: t.boolean(),      // Verification status from Sourcify/Blockscout
  name: t.text(),               // Contract name if verified
  contractType: t.text(),       // 'erc20' | 'erc721' | 'erc1155' | 'proxy' | 'other'
  // Proxy detection
  isProxy: t.boolean(),         // Is this a proxy contract?
  implementationAddress: t.hex(), // Address of implementation (if proxy)
  // Usage stats (simplified - no longer tracking per-caller)
  transactionCount: t.integer(), // Total transactions to this contract
  uniqueCallerCount: t.integer(), // Total unique addresses that called this contract
  lastActivityBlock: t.bigint(), // Last block with activity
  lastActivityTimestamp: t.bigint(),
}), (table) => ({
  deployerIdx: index().on(table.deployerAddress),
  blockIdx: index().on(table.blockNumber),
  timestampIdx: index().on(table.timestamp),
  contractTypeIdx: index().on(table.contractType),
  isVerifiedIdx: index().on(table.isVerified),
  txCountIdx: index().on(table.transactionCount),
  uniqueCallerIdx: index().on(table.uniqueCallerCount),
  isProxyIdx: index().on(table.isProxy),
}));

export const eventLogs = onchainTable("event_logs", (t) => ({
  id: t.text().primaryKey(),          // txHash-logIndex
  transactionHash: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  address: t.hex().notNull(),         // Contract that emitted the event
  topic0: t.hex(),                    // Event signature hash
  topic1: t.hex(),
  topic2: t.hex(),
  topic3: t.hex(),
  data: t.text(),                     // Non-indexed event data
  logIndex: t.integer().notNull(),
  eventName: t.text(),                // Decoded event name if known
}), (table) => ({
  blockIdx: index().on(table.blockNumber),
  addressIdx: index().on(table.address),
  topic0Idx: index().on(table.topic0),
  txHashIdx: index().on(table.transactionHash),
  timestampIdx: index().on(table.timestamp),
}));

// ============ Token Tables (KEEP - minimal for token detection) ============

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
  // New fields for better display
  iconUrl: t.text(),            // Token logo URL (from token list or CoinGecko)
  isVerified: t.boolean(),      // Verified/trusted token list
  website: t.text(),            // Project website
}), (table) => ({
  symbolIdx: index().on(table.symbol),
  transferCountIdx: index().on(table.transferCount),
  isVerifiedIdx: index().on(table.isVerified),
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

// ============================================================================
// FULL MODE TABLES (commented out for fast indexing)
// ============================================================================
// Uncomment these sections to restore full functionality at ~37 blocks/sec
// ============================================================================

/*
// ============ Token Balance Tracking (DISABLED - compute on-demand) ============

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

// ============ NFT Tables (DISABLED - compute on-demand) ============

export const nftCollections = onchainTable("nft_collections", (t) => ({
  address: t.hex().primaryKey(),
  name: t.text(),
  symbol: t.text(),
  standard: t.text().notNull(), // "ERC721" or "ERC1155"
  totalSupply: t.integer(),
  transferCount: t.integer().notNull(),
  holderCount: t.integer().notNull(),
  uniqueOwnerCount: t.integer().notNull(),
  creatorAddress: t.hex(),
  mintCount: t.integer(),
  burnCount: t.integer(),
  firstSeenBlock: t.bigint().notNull(),
  firstSeenTimestamp: t.bigint().notNull(),
  iconUrl: t.text(),
  bannerUrl: t.text(),
  description: t.text(),
  website: t.text(),
  isVerified: t.boolean(),
}), (table) => ({
  standardIdx: index().on(table.standard),
  transferCountIdx: index().on(table.transferCount),
  creatorIdx: index().on(table.creatorAddress),
  uniqueOwnerIdx: index().on(table.uniqueOwnerCount),
  isVerifiedIdx: index().on(table.isVerified),
}));

export const nfts = onchainTable("nfts", (t) => ({
  id: t.text().primaryKey(), // collectionAddress-tokenId
  collectionAddress: t.hex().notNull(),
  tokenId: t.bigint().notNull(),
  owner: t.hex().notNull(),
  tokenUri: t.text(),
  mintedBlock: t.bigint().notNull(),
  mintedTimestamp: t.bigint().notNull(),
  lastTransferBlock: t.bigint().notNull(),
  lastTransferTimestamp: t.bigint().notNull(),
  transferCount: t.integer().notNull(),
  imageUrl: t.text(),
  metadata: t.text(),
}), (table) => ({
  collectionIdx: index().on(table.collectionAddress),
  ownerIdx: index().on(table.owner),
  tokenIdIdx: index().on(table.tokenId),
}));

export const nftTransfers = onchainTable("nft_transfers", (t) => ({
  id: t.text().primaryKey(), // txHash-logIndex
  transactionHash: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  collectionAddress: t.hex().notNull(),
  tokenId: t.bigint().notNull(),
  from: t.hex().notNull(),
  to: t.hex().notNull(),
  operator: t.hex(),
  value: t.bigint(),
  logIndex: t.integer().notNull(),
}), (table) => ({
  collectionIdx: index().on(table.collectionAddress),
  tokenIdIdx: index().on(table.tokenId),
  fromIdx: index().on(table.from),
  toIdx: index().on(table.to),
  blockIdx: index().on(table.blockNumber),
}));

export const nftOwnership = onchainTable("nft_ownership", (t) => ({
  id: t.text().primaryKey(), // ownerAddress-collectionAddress-tokenId
  ownerAddress: t.hex().notNull(),
  collectionAddress: t.hex().notNull(),
  tokenId: t.bigint().notNull(),
  balance: t.bigint().notNull(),
  lastUpdatedBlock: t.bigint().notNull(),
  lastUpdatedTimestamp: t.bigint().notNull(),
}), (table) => ({
  ownerIdx: index().on(table.ownerAddress),
  collectionIdx: index().on(table.collectionAddress),
}));

// ============ Deployers (Builders) Tables (DISABLED - compute on-demand) ============

export const deployers = onchainTable("deployers", (t) => ({
  address: t.hex().primaryKey(),
  contractCount: t.integer().notNull(),
  totalTransactionsAcrossContracts: t.bigint().notNull(),
  totalUniqueUsersAcrossContracts: t.integer().notNull(),
  firstDeployBlock: t.bigint().notNull(),
  firstDeployTimestamp: t.bigint().notNull(),
  lastDeployBlock: t.bigint().notNull(),
  lastDeployTimestamp: t.bigint().notNull(),
}), (table) => ({
  contractCountIdx: index().on(table.contractCount),
  totalTxIdx: index().on(table.totalTransactionsAcrossContracts),
  totalUsersIdx: index().on(table.totalUniqueUsersAcrossContracts),
}));

export const deployerDailyStats = onchainTable("deployer_daily_stats", (t) => ({
  id: t.text().primaryKey(),
  deployerAddress: t.hex().notNull(),
  date: t.text().notNull(),
  totalTransactions: t.integer().notNull(),
  totalUniqueCallers: t.integer().notNull(),
  activeContractsCount: t.integer().notNull(),
  newContractsDeployed: t.integer().notNull(),
}), (table) => ({
  deployerIdx: index().on(table.deployerAddress),
  dateIdx: index().on(table.date),
}));

// ============ Analytics Tables (DISABLED - compute via SQL) ============

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
  nftTransferCount: t.integer().notNull(),
  newAccountsCount: t.integer().notNull(),
  activeContractsCount: t.integer().notNull(),
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

// ============ Address Labels Table (DISABLED) ============

export const addressLabels = onchainTable("address_labels", (t) => ({
  address: t.hex().primaryKey(),
  label: t.text().notNull(),
  category: t.text(),
  website: t.text(),
  logoUrl: t.text(),
}), (table) => ({
  categoryIdx: index().on(table.category),
}));

// ============ Token Daily Stats (DISABLED) ============

export const tokenDailyStats = onchainTable("token_daily_stats", (t) => ({
  id: t.text().primaryKey(),
  tokenAddress: t.hex().notNull(),
  date: t.text().notNull(),
  transferCount: t.integer().notNull(),
  volume: t.bigint().notNull(),
  uniqueSenders: t.integer().notNull(),
  uniqueReceivers: t.integer().notNull(),
  mintAmount: t.bigint().notNull(),
  burnAmount: t.bigint().notNull(),
}), (table) => ({
  tokenIdx: index().on(table.tokenAddress),
  dateIdx: index().on(table.date),
}));

// ============ Contract Daily Stats (DISABLED) ============

export const contractDailyStats = onchainTable("contract_daily_stats", (t) => ({
  id: t.text().primaryKey(),
  contractAddress: t.hex().notNull(),
  date: t.text().notNull(),
  transactionCount: t.integer().notNull(),
  uniqueCallers: t.integer().notNull(),
  totalGasUsed: t.bigint().notNull(),
}), (table) => ({
  contractIdx: index().on(table.contractAddress),
  dateIdx: index().on(table.date),
}));

// ============ Contract Callers (DISABLED) ============

export const contractCallers = onchainTable("contract_callers", (t) => ({
  id: t.text().primaryKey(),
  contractAddress: t.hex().notNull(),
  callerAddress: t.hex().notNull(),
  firstCallBlock: t.bigint().notNull(),
  firstCallTimestamp: t.bigint().notNull(),
  lastCallBlock: t.bigint().notNull(),
  lastCallTimestamp: t.bigint().notNull(),
  callCount: t.integer().notNull(),
}), (table) => ({
  contractIdx: index().on(table.contractAddress),
  callerIdx: index().on(table.callerAddress),
}));

export const contractDailyCallers = onchainTable("contract_daily_callers", (t) => ({
  id: t.text().primaryKey(),
  contractAddress: t.hex().notNull(),
  callerAddress: t.hex().notNull(),
  date: t.text().notNull(),
  callCount: t.integer().notNull(),
}), (table) => ({
  contractDateIdx: index().on(table.contractAddress, table.date),
}));

// ============ Token Approvals (DISABLED) ============

export const tokenApprovals = onchainTable("token_approvals", (t) => ({
  id: t.text().primaryKey(),
  tokenAddress: t.hex().notNull(),
  ownerAddress: t.hex().notNull(),
  spenderAddress: t.hex().notNull(),
  allowance: t.bigint().notNull(),
  isUnlimited: t.boolean().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
}), (table) => ({
  tokenIdx: index().on(table.tokenAddress),
  ownerIdx: index().on(table.ownerAddress),
  spenderIdx: index().on(table.spenderAddress),
  unlimitedIdx: index().on(table.isUnlimited),
}));

// ============ Hourly Gas Stats (DISABLED) ============

export const hourlyGasStats = onchainTable("hourly_gas_stats", (t) => ({
  hour: t.text().primaryKey(),
  minGasPrice: t.bigint().notNull(),
  maxGasPrice: t.bigint().notNull(),
  avgGasPrice: t.bigint().notNull(),
  medianGasPrice: t.bigint(),
  transactionCount: t.integer().notNull(),
  totalGasUsed: t.bigint().notNull(),
}));

// ============ NFT Creators (DISABLED) ============

export const nftCreators = onchainTable("nft_creators", (t) => ({
  address: t.hex().primaryKey(),
  collectionCount: t.integer().notNull(),
  totalNftsMinted: t.integer().notNull(),
  totalUniqueOwners: t.integer().notNull(),
  totalTransfers: t.integer().notNull(),
  firstCreateBlock: t.bigint().notNull(),
  firstCreateTimestamp: t.bigint().notNull(),
  lastCreateBlock: t.bigint().notNull(),
  lastCreateTimestamp: t.bigint().notNull(),
}), (table) => ({
  collectionCountIdx: index().on(table.collectionCount),
  totalOwnersIdx: index().on(table.totalUniqueOwners),
}));

export const nftCreatorDailyStats = onchainTable("nft_creator_daily_stats", (t) => ({
  id: t.text().primaryKey(),
  creatorAddress: t.hex().notNull(),
  date: t.text().notNull(),
  mintCount: t.integer().notNull(),
  transferCount: t.integer().notNull(),
  uniqueBuyers: t.integer().notNull(),
  newCollectionsCreated: t.integer().notNull(),
}), (table) => ({
  creatorIdx: index().on(table.creatorAddress),
  dateIdx: index().on(table.date),
}));

// ============ NFT Collectors (DISABLED) ============

export const nftCollectors = onchainTable("nft_collectors", (t) => ({
  address: t.hex().primaryKey(),
  totalNftsOwned: t.integer().notNull(),
  collectionsCount: t.integer().notNull(),
  totalNftsBought: t.integer().notNull(),
  totalNftsSold: t.integer().notNull(),
  totalNftsMinted: t.integer().notNull(),
  firstAcquisitionBlock: t.bigint(),
  lastAcquisitionBlock: t.bigint(),
}), (table) => ({
  totalOwnedIdx: index().on(table.totalNftsOwned),
  collectionsIdx: index().on(table.collectionsCount),
}));

export const nftCollectorHoldings = onchainTable("nft_collector_holdings", (t) => ({
  id: t.text().primaryKey(),
  collectorAddress: t.hex().notNull(),
  collectionAddress: t.hex().notNull(),
  tokenCount: t.integer().notNull(),
  firstAcquisitionBlock: t.bigint().notNull(),
  lastActivityBlock: t.bigint().notNull(),
}), (table) => ({
  collectorIdx: index().on(table.collectorAddress),
  collectionIdx: index().on(table.collectionAddress),
  tokenCountIdx: index().on(table.tokenCount),
}));

// ============ NFT Collection Daily Stats (DISABLED) ============

export const nftCollectionDailyStats = onchainTable("nft_collection_daily_stats", (t) => ({
  id: t.text().primaryKey(),
  collectionAddress: t.hex().notNull(),
  date: t.text().notNull(),
  transferCount: t.integer().notNull(),
  mintCount: t.integer().notNull(),
  burnCount: t.integer().notNull(),
  uniqueTraders: t.integer().notNull(),
}), (table) => ({
  collectionIdx: index().on(table.collectionAddress),
  dateIdx: index().on(table.date),
}));
*/
