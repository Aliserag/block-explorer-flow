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

## Ponder Schema

Tables: `blocks`, `transactions`, `accounts`, `tokens`, `tokenTransfers`, `accountTokenBalances`, `contracts`, `dailyStats`, `hourlyStats`

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

## Guidelines

1. **Don't modify Ponder schema without coordination** - Railway indexer depends on it
2. **Use existing lib functions** - `rpc.ts` and `ponder.ts` have all needed utilities
3. **Graceful degradation** - Frontend works without Ponder (falls back to RPC scanning)
4. **Type safety** - Use strict TypeScript, avoid `any`
5. **Error handling** - Return `null` from data fetching, handle in UI

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

#### Next Steps
1. Wait for Ponder sync to complete (~6 min from 35.6% at time of session)
2. After sync: most QA failures should become passes
3. Optional: Set `PONDER_START_BLOCK=0` for full historical indexing
4. Delete broken "Postgres" service from Railway to avoid confusion
