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

// ============ NFT Tables ============

export const nftCollections = onchainTable("nft_collections", (t) => ({
  address: t.hex().primaryKey(),
  name: t.text(),
  symbol: t.text(),
  standard: t.text().notNull(), // "ERC721" or "ERC1155"
  totalSupply: t.integer(),
  transferCount: t.integer().notNull(),
  holderCount: t.integer().notNull(),
  uniqueOwnerCount: t.integer().notNull(), // Unique addresses that own NFTs from this collection
  creatorAddress: t.hex(),      // Address that deployed this collection
  mintCount: t.integer(),       // Total NFTs minted
  burnCount: t.integer(),       // Total NFTs burned
  firstSeenBlock: t.bigint().notNull(),
  firstSeenTimestamp: t.bigint().notNull(),
  // Metadata fields from Fixes API
  iconUrl: t.text(),            // Collection logo from Fixes API
  bannerUrl: t.text(),          // Banner image from Fixes API
  description: t.text(),        // Collection description
  website: t.text(),            // Project website
  isVerified: t.boolean(),      // True if in Fixes token list
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
  // New fields for metadata display
  imageUrl: t.text(),           // Direct image URL (fetched from tokenUri)
  metadata: t.text(),           // Full JSON metadata blob
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
  operator: t.hex(), // For ERC-1155
  value: t.bigint(), // For ERC-1155 (quantity)
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
  balance: t.bigint().notNull(), // 1 for ERC-721, variable for ERC-1155
  lastUpdatedBlock: t.bigint().notNull(),
  lastUpdatedTimestamp: t.bigint().notNull(),
}), (table) => ({
  ownerIdx: index().on(table.ownerAddress),
  collectionIdx: index().on(table.collectionAddress),
}));

// ============ Contract Tables ============

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
  // Usage stats
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

// ============ Deployers (Builders) Table ============

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

// ============ Deployer Daily Stats ============

export const deployerDailyStats = onchainTable("deployer_daily_stats", (t) => ({
  id: t.text().primaryKey(),          // deployerAddress-YYYY-MM-DD
  deployerAddress: t.hex().notNull(),
  date: t.text().notNull(),
  totalTransactions: t.integer().notNull(),     // Sum of all contract txs
  totalUniqueCallers: t.integer().notNull(),    // Unique users across all contracts
  activeContractsCount: t.integer().notNull(),  // How many of their contracts were used
  newContractsDeployed: t.integer().notNull(),  // New contracts deployed this day
}), (table) => ({
  deployerIdx: index().on(table.deployerAddress),
  dateIdx: index().on(table.date),
}));

// ============ Analytics Tables ============

export const dailyStats = onchainTable("daily_stats", (t) => ({
  date: t.text().primaryKey(), // YYYY-MM-DD
  transactionCount: t.integer().notNull(),
  blockCount: t.integer().notNull(),
  contractsDeployed: t.integer().notNull(),
  totalGasUsed: t.bigint().notNull(),
  avgGasPrice: t.bigint().notNull(),
  uniqueFromAddresses: t.integer().notNull(),  // Daily active senders
  uniqueToAddresses: t.integer().notNull(),    // Daily active receivers
  tokenTransferCount: t.integer().notNull(),
  totalValueTransferred: t.bigint().notNull(),
  // New fields
  nftTransferCount: t.integer().notNull(),     // NFT transfers this day
  newAccountsCount: t.integer().notNull(),     // New accounts seen this day
  activeContractsCount: t.integer().notNull(), // Contracts that received calls
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

// ============ Address Labels Table ============

export const addressLabels = onchainTable("address_labels", (t) => ({
  address: t.hex().primaryKey(),
  label: t.text().notNull(),    // "Uniswap V3 Router", "Binance Hot Wallet"
  category: t.text(),           // "dex" | "bridge" | "cex" | "defi" | "nft"
  website: t.text(),
  logoUrl: t.text(),
}), (table) => ({
  categoryIdx: index().on(table.category),
}));

// ============ Event Logs Table ============

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

// ============ Token Daily Stats ============

export const tokenDailyStats = onchainTable("token_daily_stats", (t) => ({
  id: t.text().primaryKey(),          // tokenAddress-YYYY-MM-DD
  tokenAddress: t.hex().notNull(),
  date: t.text().notNull(),
  transferCount: t.integer().notNull(),
  volume: t.bigint().notNull(),       // Total value transferred
  uniqueSenders: t.integer().notNull(),
  uniqueReceivers: t.integer().notNull(),
  mintAmount: t.bigint().notNull(),   // Minted this day
  burnAmount: t.bigint().notNull(),   // Burned this day
}), (table) => ({
  tokenIdx: index().on(table.tokenAddress),
  dateIdx: index().on(table.date),
}));

// ============ Contract Daily Stats ============

export const contractDailyStats = onchainTable("contract_daily_stats", (t) => ({
  id: t.text().primaryKey(),          // contractAddress-YYYY-MM-DD
  contractAddress: t.hex().notNull(),
  date: t.text().notNull(),
  transactionCount: t.integer().notNull(),
  uniqueCallers: t.integer().notNull(),
  totalGasUsed: t.bigint().notNull(),
}), (table) => ({
  contractIdx: index().on(table.contractAddress),
  dateIdx: index().on(table.date),
}));

// ============ Contract Callers (for unique user tracking) ============

export const contractCallers = onchainTable("contract_callers", (t) => ({
  id: t.text().primaryKey(),          // contractAddress-callerAddress
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

// ============ Contract Daily Callers (for daily unique users) ============

export const contractDailyCallers = onchainTable("contract_daily_callers", (t) => ({
  id: t.text().primaryKey(),          // contractAddress-callerAddress-YYYY-MM-DD
  contractAddress: t.hex().notNull(),
  callerAddress: t.hex().notNull(),
  date: t.text().notNull(),
  callCount: t.integer().notNull(),
}), (table) => ({
  contractDateIdx: index().on(table.contractAddress, table.date),
}));

// ============ Token Approvals (for revoke.cash-style features) ============

export const tokenApprovals = onchainTable("token_approvals", (t) => ({
  id: t.text().primaryKey(),          // tokenAddress-ownerAddress-spenderAddress
  tokenAddress: t.hex().notNull(),
  ownerAddress: t.hex().notNull(),
  spenderAddress: t.hex().notNull(),
  allowance: t.bigint().notNull(),
  isUnlimited: t.boolean().notNull(), // MaxUint256 approval
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
}), (table) => ({
  tokenIdx: index().on(table.tokenAddress),
  ownerIdx: index().on(table.ownerAddress),
  spenderIdx: index().on(table.spenderAddress),
  unlimitedIdx: index().on(table.isUnlimited),
}));

// ============ Hourly Gas Stats (for gas tracker) ============

export const hourlyGasStats = onchainTable("hourly_gas_stats", (t) => ({
  hour: t.text().primaryKey(),        // YYYY-MM-DD-HH
  minGasPrice: t.bigint().notNull(),
  maxGasPrice: t.bigint().notNull(),
  avgGasPrice: t.bigint().notNull(),
  medianGasPrice: t.bigint(),
  transactionCount: t.integer().notNull(),
  totalGasUsed: t.bigint().notNull(),
}));

// ============ NFT Creators (like deployers for contracts) ============

export const nftCreators = onchainTable("nft_creators", (t) => ({
  address: t.hex().primaryKey(),
  collectionCount: t.integer().notNull(),
  totalNftsMinted: t.integer().notNull(),
  totalUniqueOwners: t.integer().notNull(),   // Unique owners across all collections
  totalTransfers: t.integer().notNull(),
  firstCreateBlock: t.bigint().notNull(),
  firstCreateTimestamp: t.bigint().notNull(),
  lastCreateBlock: t.bigint().notNull(),
  lastCreateTimestamp: t.bigint().notNull(),
}), (table) => ({
  collectionCountIdx: index().on(table.collectionCount),
  totalOwnersIdx: index().on(table.totalUniqueOwners),
}));

// ============ NFT Creator Daily Stats ============

export const nftCreatorDailyStats = onchainTable("nft_creator_daily_stats", (t) => ({
  id: t.text().primaryKey(),          // creatorAddress-YYYY-MM-DD
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

// ============ NFT Collectors (top collectors tracking) ============

export const nftCollectors = onchainTable("nft_collectors", (t) => ({
  address: t.hex().primaryKey(),
  totalNftsOwned: t.integer().notNull(),      // Current NFT count
  collectionsCount: t.integer().notNull(),    // Unique collections owned
  totalNftsBought: t.integer().notNull(),     // Lifetime purchases
  totalNftsSold: t.integer().notNull(),       // Lifetime sales
  totalNftsMinted: t.integer().notNull(),     // Directly minted
  firstAcquisitionBlock: t.bigint(),
  lastAcquisitionBlock: t.bigint(),
}), (table) => ({
  totalOwnedIdx: index().on(table.totalNftsOwned),
  collectionsIdx: index().on(table.collectionsCount),
}));

// ============ NFT Collector Per Collection (holdings by collection) ============

export const nftCollectorHoldings = onchainTable("nft_collector_holdings", (t) => ({
  id: t.text().primaryKey(),          // collectorAddress-collectionAddress
  collectorAddress: t.hex().notNull(),
  collectionAddress: t.hex().notNull(),
  tokenCount: t.integer().notNull(),  // How many NFTs from this collection
  firstAcquisitionBlock: t.bigint().notNull(),
  lastActivityBlock: t.bigint().notNull(),
}), (table) => ({
  collectorIdx: index().on(table.collectorAddress),
  collectionIdx: index().on(table.collectionAddress),
  tokenCountIdx: index().on(table.tokenCount),
}));

// ============ NFT Collection Daily Stats ============

export const nftCollectionDailyStats = onchainTable("nft_collection_daily_stats", (t) => ({
  id: t.text().primaryKey(),          // collectionAddress-YYYY-MM-DD
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
