# Flow Block Explorer

A block explorer for Flow EVM (Chain ID: 747) built with Next.js 14 and Ponder indexer.

## Architecture

```
Frontend (Next.js/Vercel) ──→ viem RPC ──→ Flow EVM Node
                         └──→ Ponder GraphQL ──→ PostgreSQL (Railway)
```

## Project Structure

```
├── src/                    # Next.js frontend
│   ├── app/               # App Router pages
│   │   ├── account/       # Account details page
│   │   ├── analytics/     # Analytics dashboard
│   │   ├── api/           # API routes
│   │   ├── block/         # Block details page
│   │   ├── blocks/        # Block list page
│   │   └── tx/            # Transaction details page
│   ├── components/        # React components
│   │   └── charts/        # Recharts-based visualizations
│   ├── lib/               # Core utilities
│   │   ├── rpc.ts        # viem client for RPC calls
│   │   ├── ponder.ts     # GraphQL client for indexed data
│   │   ├── chains.ts     # Network configurations
│   │   └── tokens.ts     # Token utilities
│   └── data/              # Static data files
├── ponder/                 # Ponder indexer (separate deployment)
│   ├── ponder.config.ts   # Network & database config
│   ├── ponder.schema.ts   # Database schema (9 tables)
│   └── src/index.ts       # Block & event handlers
└── public/                 # Static assets
```

## Commands

```bash
# Frontend
npm run dev          # Start Next.js dev server
npm run build        # Build for production
npm run lint         # Run ESLint

# Ponder (run from /ponder directory)
cd ponder
npm run dev          # Start Ponder in dev mode
npm run start        # Start Ponder in production
npm run codegen      # Regenerate types from schema
```

## Key Technologies

- **Next.js 14** - App Router, Server Components, ISR
- **viem 2.21** - Type-safe EVM client
- **Ponder 0.7** - EVM indexer with GraphQL API
- **Ant Design 5** - UI components
- **Recharts** - Charts and visualizations
- **TypeScript 5.7** - Strict mode enabled

## Code Patterns

### RPC Client (src/lib/rpc.ts)
- Uses viem `createPublicClient` with retry logic
- Supports mainnet and testnet switching
- All functions accept optional `network` parameter

### Ponder Client (src/lib/ponder.ts)
- GraphQL queries with 5-second cache (`next: { revalidate: 5 }`)
- Graceful fallback when Ponder unavailable
- All queries return `null` on error, not throw

### Components
- Use Ant Design components (`Button`, `Card`, `Table`, etc.)
- Follow pattern: `ComponentName.tsx` with named export
- Charts use Recharts with custom theme from `lib/chartTheme.ts`

### API Routes
- Located in `src/app/api/`
- Use `export const dynamic = "force-dynamic"` for dynamic routes
- Return JSON with consistent error structure

## Ponder.sh Concepts

Ponder is an open-source EVM indexer framework that provides a GraphQL API over blockchain data.

### Architecture
```
Flow EVM RPC ──→ Ponder Indexer ──→ PostgreSQL ──→ GraphQL API
                   │
                   └──→ Event Handlers (TypeScript)
```

### Key Concepts

**1. Schema Definition (`ponder.schema.ts`)**
```typescript
import { onchainTable, index } from "@ponder/core";

export const blocks = onchainTable("blocks", (t) => ({
  number: t.bigint().primaryKey(),
  hash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}), (table) => ({
  timestampIdx: index().on(table.timestamp),
}));
```

**2. Event Handlers (`src/index.ts`)**
```typescript
import { ponder } from "@/generated";

// Block handler - runs for every block
ponder.on("FlowBlocks:block", async ({ event, context }) => {
  const { db, client } = context;
  await db.insert(blocks).values({...}).onConflictDoNothing();
});

// Event handler - catches ERC-20 transfers
ponder.on("ERC20:Transfer", async ({ event, context }) => {
  const { from, to, value } = event.args;
  // Process transfer...
});
```

**3. GraphQL API Conventions**
- Plural queries use double-s: `blockss`, `transactionss`
- Use `limit` (not `first`)
- Use `orderBy` and `orderDirection` as strings
- Results wrapped in `{ items: [...] }`

```graphql
# Example query
{
  blockss(limit: 10, orderBy: "number", orderDirection: "desc") {
    items { number hash timestamp }
  }
  _meta { status }
}
```

**4. Sync Status**
- `_meta.status.flowEvm.ready: true` = Sync complete
- `_meta.status.flowEvm.ready: false` = Still syncing historical blocks
- Data only appears in API after block is fully processed

### Ponder Schema

Tables: `blocks`, `transactions`, `accounts`, `tokens`, `tokenTransfers`, `accountTokenBalances`, `nftCollections`, `nfts`, `nftTransfers`, `nftOwnership`, `contracts`, `dailyStats`, `hourlyStats`

- Import from `../ponder.schema` (relative path)
- Use `@/generated` for ponder registry
- Field naming: `camelCase` (e.g., `firstSeenBlock`, `gasUsed`)

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_FLOW_RPC_URL=https://mainnet.evm.nodes.onflow.org
NEXT_PUBLIC_PONDER_URL=<railway-ponder-url>
```

### Ponder (ponder/.env)
```
DATABASE_URL=<postgresql-connection-string>
FLOW_EVM_RPC_URL=https://mainnet.evm.nodes.onflow.org
PONDER_START_BLOCK=0
```

## Deployment

- **Frontend**: Vercel (auto-deploy from main)
- **Ponder**: Railway (PostgreSQL + Ponder service)

## Performance Architecture

### Data Sources (Speed Priority)
1. **Ponder GraphQL** (fastest) - Pre-indexed, single query, ~50-200ms
2. **RPC Single Calls** (fast) - Direct chain calls, ~100-500ms
3. **RPC Batch Calls** (slow) - Multiple blocks/txs, batched in groups of 50

### When to Use Each
| Use Case | Data Source | Why |
|----------|-------------|-----|
| Transaction details | RPC | Single call, always fresh |
| Block details | RPC | Single call, always fresh |
| Account transactions | Ponder → RPC fallback | Ponder has indexed history |
| Analytics (historical) | Ponder | Pre-aggregated stats |
| Analytics (live) | RPC (limited) | Real-time, but cap at 200 blocks |
| Token balances | Ponder | Indexed transfers |

### Performance Rules
- **Prefer Ponder over RPC** for any historical/aggregated data
- **Limit RPC batch requests** to 200 blocks max (batched in groups of 50)
- **Default to indexed mode** in analytics (24h vs live)
- **Use ISR/caching** where possible (`revalidate: 30` on pages)

## Guidelines

1. **Don't modify Ponder schema without coordination** - Railway indexer depends on it
2. **Use existing lib functions** - `rpc.ts` and `ponder.ts` have all needed utilities
3. **Graceful degradation** - Frontend works without Ponder (falls back to RPC scanning)
4. **Type safety** - Use strict TypeScript, avoid `any`
5. **Error handling** - Return `null` from data fetching, handle in UI

---

## Flow-Specific Concepts

### COA (Cadence Owned Account)

COAs are a unique Flow concept - they are EVM addresses controlled by Cadence (Flow's native smart contract language).

**Key Characteristics:**
- **Address Pattern**: COAs have many leading zeros (20+ hex zeros after `0x`)
  - Example: `0x00000000000000000000000235F48d21dc84fFcE`
- **Has Bytecode**: `getCode()` returns non-empty bytecode (they appear as contracts)
- **NOT a Smart Contract**: Despite having bytecode, they are NOT traditional EVM smart contracts
- **Bridge Accounts**: Used to bridge assets and functionality between Cadence and EVM

**UI Handling:**
- Display with green "COA" tag (not "Contract" or "EOA")
- Do NOT show "View Contract Details" link - COAs aren't inspectable contracts
- Do NOT show Contract tab on account page
- Token holdings and transaction history work normally

**Detection Logic** (in `AccountContent.tsx`):
```typescript
function isCOA(address: string): boolean {
  const hex = address.toLowerCase().slice(2);
  let zeroCount = 0;
  for (const char of hex) {
    if (char === "0") zeroCount++;
    else break;
  }
  return zeroCount >= 20; // 20+ leading zeros = COA
}
```

**Account Types Summary:**
| Type | Tag Color | Has Bytecode | Leading Zeros | Show Contract Link |
|------|-----------|--------------|---------------|-------------------|
| EOA | Blue | No | Any | No |
| Contract | Purple | Yes | Few/none | Yes |
| COA | Green | Yes | 20+ | No |

---

## Critical User Journeys (Must Work End-to-End)

### 1. "I want to verify a transaction"
**User Goal:** Confirm a tx went through + see details
**Entry Points:** tx hash, wallet activity, dapp link

**Key Steps:**
- Paste tx hash → tx page
- See status (pending/success/failed)
- Confirm block number + confirmations
- Inspect gas/fees, nonce, timestamp
- Inspect events/logs + internal txs
- Copy/share tx link

**Pages Involved:** `/tx/[hash]`
**Components:** TransactionOverview, LogsSection

---

### 2. "I want to check my wallet activity"
**User Goal:** Understand what happened to my funds/NFTs
**Entry Points:** wallet address search, portfolio link

**Key Steps:**
- Address page overview (balance, token holdings)
- Recent transactions list
- Filter by type: transfers, swaps, contract calls
- Drill into a tx
- Export history (CSV) / copy for tax tools

**Pages Involved:** `/account/[address]`
**Components:** AccountContent, TokenList, Pagination

---

### 3. "I want to check token info"
**User Goal:** Validate a token is real + view metrics
**Entry Points:** token contract address, token name search

**Key Steps:**
- Token page (name/symbol/decimals, contract)
- Supply info + holders
- Transfers list
- Contract verification status
- Links to website/socials (anti-scam)

**Pages Involved:** `/contract/[address]` (for token contracts)
**Components:** ContractDetails, TokenList

---

### 4. "I want to validate an NFT / collection"
**User Goal:** Confirm authenticity and provenance
**Entry Points:** NFT ID, collection contract, marketplace link

**Key Steps:**
- Collection overview (contract, total supply)
- NFT details (owner, metadata, mint tx)
- Transfer history
- Metadata display (image traits)
- "View on marketplace" outbound links

**Pages Involved:** `/contract/[address]` (NFT contracts)
**Status:** Partially implemented (contract page exists, NFT-specific features TBD)

---

### 5. "I want to understand what a contract does"
**User Goal:** Inspect contract behavior + trustworthiness
**Entry Points:** contract address, from tx logs

**Key Steps:**
- Contract page overview
- Verified source / bytecode match
- Read contract (view methods)
- Write contract (connect wallet)
- ABI/events
- Contract creator + deployment tx

**Pages Involved:** `/contract/[address]`
**Components:** ContractContent, ContractCode, ContractABI, ContractDetails

---

### 6. "I want to debug a failed transaction"
**User Goal:** Figure out why it failed
**Entry Points:** tx hash from wallet/dapp error

**Key Steps:**
- Tx status = failed
- Show revert reason / error codes
- Decode input data
- Trace execution / internal calls
- Link to related contract/event
- Suggest fixes (insufficient funds, slippage, etc.)

**Pages Involved:** `/tx/[hash]`
**Status:** Basic failure display works, revert reason decoding TBD

---

### 7. "I want to monitor network health"
**User Goal:** Check chain is alive / congested
**Entry Points:** homepage dashboard

**Key Steps:**
- Latest blocks stream
- TPS, gas price, mempool size
- Avg block time
- Finality / confirmation times
- Incident banner (outages)

**Pages Involved:** `/` (homepage), `/analytics`
**Components:** LatestBlocks, charts (AreaChart, BarChart, StatCard)

---

### 8. "I want to inspect blocks"
**User Goal:** Explore what's being produced on-chain
**Entry Points:** latest blocks feed, block number search

**Key Steps:**
- Block page (miner/validator, timestamp)
- Tx list in block
- Gas used / limit
- Fees summary
- Drill into a tx

**Pages Involved:** `/block/[number]`, `/blocks`
**Components:** BlockCard, Pagination

---

## Session Log

### 2026-01-30: PostgreSQL Database Recovery & Ponder Sync

#### Problem
- PostgreSQL database in Railway flow-ponder project was REMOVED/broken
- Ponder was crash-looping with database connection errors
- Root cause: `railway.json` was incorrectly applying Dockerfile build to Postgres service

#### Solution Applied
1. Deployed new PostgreSQL from Railway template (Postgres-X0f-)
2. Updated athletic-prosperity (Ponder) service with new DATABASE_URL
3. Ponder now successfully connecting and syncing

#### Architecture Decisions
- `PONDER_START_BLOCK=54600000` - Start with recent ~1 day of data for fast initial sync
- After initial sync completes, can set to `0` for full historical backfill
- Ponder uses historical sync mode - data not visible in API until sync completes

#### Railway Infrastructure

| Service | ID | Status |
|---------|-----|--------|
| Project | flow-ponder (849bd28b-9738-48d5-9c8a-5da02eadc65c) | Active |
| Postgres | Postgres-X0f- (NEW) | Working |
| Ponder | athletic-prosperity | Syncing |
| Old Postgres | Postgres | BROKEN - should be deleted |

#### Frontend Configuration
```
NEXT_PUBLIC_PONDER_URL=https://athletic-prosperity-production.up.railway.app
Dev server: http://localhost:3001
```

#### QA Test Results

| Status | Journey |
|--------|---------|
| PASS | Inspect Blocks |
| PARTIAL | Wallet Activity, Token Info, Contract Details, Network Health |
| FAIL | Transaction verification, NFT validation, Debug failed tx |

Note: FAIL statuses are expected until Ponder sync completes - these features require indexed data.

---

### 2026-01-31: 4-Stage Parallel Indexing Strategy

#### Problem
- Full historical indexing from block 0 takes days/weeks (54M+ blocks)
- Users need immediate access to explorer functionality

#### Solution: Parallel Multi-Stage Indexing

Run 4 Ponder instances simultaneously, each indexing a different time range:

| Stage | Project Name | Start Block | Time Coverage | Est. Sync Time | Status |
|-------|--------------|-------------|---------------|----------------|--------|
| 1 | flow-ponder (athletic-prosperity) | 54,600,000 | ~1 day | ~40 min | ✅ RUNNING |
| 2 | ponder-week | 54,000,000 | ~7 days | ~hours | ⏳ PENDING |
| 3 | ponder-month | 52,000,000 | ~30 days | ~1 day | ⏳ PENDING |
| 4 | ponder-genesis | 0 | Full history | days/weeks | ⏳ PENDING |

#### Switching Strategy
1. Frontend starts pointing to Stage 1 (fastest to complete)
2. When Stage 2 completes → Update `NEXT_PUBLIC_PONDER_URL` in Vercel → Delete Stage 1
3. When Stage 3 completes → Update URL → Delete Stage 2
4. When Stage 4 completes → Update URL → Delete Stage 3 → Keep Stage 4 forever

#### Railway Project URLs
```
Stage 1 (1 day):   https://athletic-prosperity-production.up.railway.app (ACTIVE)
Stage 2 (1 week):  https://railway.com/project/4cc50d84-480d-420f-afc6-6f36fe162377
Stage 3 (1 month): https://railway.com/project/2819b600-eb23-49ff-bd9a-a82583a7a31b
Stage 4 (genesis): https://railway.com/project/c3a10738-3b2b-48a8-829f-0a6b59e78fdb
```

#### Setup Instructions for New Stages

For each new stage (week, month, genesis):

1. **Create Railway Project** (via dashboard.railway.app):
   - New Project → Empty Project
   - Name: `ponder-week` / `ponder-month` / `ponder-genesis`

2. **Add PostgreSQL**:
   - New → Database → PostgreSQL

3. **Add Ponder Service**:
   - New → GitHub Repo → Select `block-explorer-flow` → Set root to `/ponder`

4. **Configure Environment Variables**:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   FLOW_EVM_RPC_URL=https://mainnet.evm.nodes.onflow.org
   PONDER_START_BLOCK=<stage-specific-block>
   PORT=42069
   ```

5. **Generate Domain**:
   - Settings → Networking → Generate Domain

#### Cost Estimate
- During parallel sync: ~$40-60/month (4 Postgres + 4 compute)
- After consolidation: ~$10-20/month (1 Postgres + 1 compute)

---

### 2026-01-30 (continued): All 4 Stages Deployed

#### Current Deployment Status (as of session end)

| Stage | Project | Start Block | Public Domain | Status |
|-------|---------|-------------|---------------|--------|
| 1 (day) | flow-ponder | 54,600,000 | `athletic-prosperity-production.up.railway.app` | ✅ RUNNING |
| 2 (week) | ponder-week | 54,000,000 | *(configured - check Railway)* | ✅ DEPLOYED |
| 3 (month) | ponder-month | 52,000,000 | `block-explorer-flow-production.up.railway.app` | ✅ DEPLOYED |
| 4 (genesis) | ponder-genesis | 0 | `block-explorer-flow-production-0468.up.railway.app` | ✅ DEPLOYED |

#### Railway Project Links (for management)
```
Stage 1: https://railway.com/project/849bd28b-9738-48d5-9c8a-5da02eadc65c
Stage 2: https://railway.com/project/4cc50d84-480d-420f-afc6-6f36fe162377
Stage 3: https://railway.com/project/2819b600-eb23-49ff-bd9a-a82583a7a31b
Stage 4: https://railway.com/project/c3a10738-3b2b-48a8-829f-0a6b59e78fdb
```

#### Environment Variables (all stages)
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
FLOW_EVM_RPC_URL=https://mainnet.evm.nodes.onflow.org
PONDER_START_BLOCK=<varies by stage>
PORT=42069
```

#### Next Steps
1. Monitor sync progress on each stage via Railway Logs
2. When a later stage catches up to an earlier one, update `NEXT_PUBLIC_PONDER_URL` in `.env`
3. Delete earlier stages once consolidated
4. Final state: Only ponder-genesis remains with full historical data

#### Frontend Configuration
Currently pointing to Stage 1:
```
NEXT_PUBLIC_PONDER_URL=https://athletic-prosperity-production.up.railway.app
```

When ready to switch, update `.env` and redeploy to Vercel.

---

### 2026-01-31: Current Infrastructure Status

#### Live Status Check (as of session)

| Stage | Endpoint | Indexed Block | Chain Head | Status |
|-------|----------|---------------|------------|--------|
| 1 (Day) | `athletic-prosperity-production.up.railway.app` | 54,691,334 | ~54,691,000+ | **READY** |
| 2 (Week) | TBD | - | - | **502 ERROR** |
| 3 (Month) | `block-explorer-flow-production.up.railway.app` | - | - | **Not Responding** |
| 4 (Genesis) | `block-explorer-flow-production-0468.up.railway.app` | 1,127,245 | ~1,272,467 | **SYNCING** (2.3% complete) |

#### GraphQL Status Query
```bash
curl -s "https://athletic-prosperity-production.up.railway.app/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ _meta { status } blockss(limit: 1, orderBy: \"number\", orderDirection: \"desc\") { items { number } } }"}'
```

#### Custom Claude Code Agents Created

The project now has custom agents in `.claude/agents/`:

| Agent | Purpose | Model |
|-------|---------|-------|
| `railway-monitor` | Check Railway/Ponder infrastructure status | haiku |
| `ponder-helper` | Guide Ponder schema/handler development | inherit |
| `explorer-tester` | Test block explorer user journeys | haiku |
| `flow-rpc` | Query Flow EVM chain directly via RPC | haiku |

#### Skills Created (`.claude/skills/`)

- `/check-ponder-status` - Quick status check of all 4 Ponder stages
- `/test-graphql` - Reference for Ponder GraphQL query syntax

---

## Future Ponder Schema Improvements

These are proposed schema additions for future releases. Adding them requires re-indexing, so batch together when implementing.

> **IMPORTANT: Implementation Strategy**
>
> Do NOT implement these changes until after full genesis indexing is complete. The priority is getting the explorer live with the current schema first. Once `ponder-genesis` has fully synced (54M+ blocks), then:
> 1. Implement all schema changes in a single batch
> 2. Deploy new Ponder instance with updated schema
> 3. Re-index from genesis with new fields populated
> 4. Switch frontend to new instance once caught up
> 5. Delete old instance
>
> This ensures we ship faster now and avoid multiple expensive re-indexing cycles.

### 1. Tokens Table - Icon & Metadata
```typescript
iconUrl: t.text(),           // Token logo URL (from token list or CoinGecko)
isVerified: t.boolean(),     // Verified/trusted token list
website: t.text(),           // Project website
```
**Use case:** Wallet display needs token icons

### 2. Accounts Table - Type Classification
```typescript
accountType: t.text(),       // 'eoa' | 'contract' | 'coa' (Cadence Owned Account)
label: t.text(),             // Known address label (e.g., "Uniswap Router")
```
**Use case:** Flow-specific COA detection, known address labeling

### 3. Contracts Table - Verification & Type
```typescript
isVerified: t.boolean(),     // Verification status from Sourcify/Blockscout
name: t.text(),              // Contract name if verified
contractType: t.text(),      // 'erc20' | 'erc721' | 'erc1155' | 'proxy' | 'other'
```
**Use case:** Show verification badge, auto-detect token contracts

### 4. Transactions Table - Error Handling
```typescript
errorMessage: t.text(),      // Revert reason for failed transactions
methodName: t.text(),        // Human-readable: "transfer", "swap", "approve", etc.
```
**Use case:** Better error debugging, human-readable tx descriptions

### 5. NFTs Table - Metadata Enrichment
```typescript
imageUrl: t.text(),          // Direct image URL (fetched from tokenUri)
metadata: t.text(),          // Full JSON metadata blob
```
**Use case:** Display NFT images without client-side fetching

### 6. New Table: Address Labels
```typescript
export const addressLabels = onchainTable("address_labels", (t) => ({
  address: t.hex().primaryKey(),
  label: t.text().notNull(),      // "Uniswap V3 Router", "Binance Hot Wallet"
  category: t.text(),             // "dex" | "bridge" | "cex" | "defi" | "nft"
  website: t.text(),
  logoUrl: t.text(),
}));
```
**Use case:** Show friendly names for known contracts/wallets

### Priority Matrix

| Addition | Usefulness | Effort | Priority |
|----------|------------|--------|----------|
| Token `iconUrl` | High | Low | P1 |
| Account `accountType` | High | Low | P1 |
| Transaction `methodName` | High | Medium | P1 |
| Transaction `errorMessage` | Medium | Medium | P2 |
| Contract `isVerified`, `contractType` | Medium | Low | P2 |
| NFT `imageUrl`, `metadata` | Medium | High | P3 |
| Address labels table | Medium | Low | P2 |

### Implementation Notes

- Token icons can be populated from `data/tokens.json` during indexing
- `accountType` COA detection: address has 20+ leading zeros
- `methodName` can be derived from 4-byte signature using a signature database
- NFT metadata fetching is slow - consider doing it async or on-demand
