# Flow EVM Block Explorer

A modern block explorer for Flow EVM (Chain ID: 747) built with Next.js and Ponder.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js App (Vercel)                         │
│  ├── app/                    # React pages with SSR             │
│  ├── lib/rpc.ts              # viem for real-time data          │
│  └── lib/ponder.ts           # Client for Ponder GraphQL        │
└─────────────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
┌─────────────────┐          ┌─────────────────────────────────┐
│  Flow EVM RPC   │          │  Ponder Indexer (Railway)       │
│  (real-time)    │          │  ├── GraphQL API                │
│                 │          │  └── PostgreSQL                 │
└─────────────────┘          └─────────────────────────────────┘
```

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Ant Design
- **Blockchain Client**: viem (type-safe Ethereum client)
- **Indexer**: Ponder.sh, PostgreSQL
- **Styling**: CSS Variables, Framer Motion

## Quick Start

```bash
# Install dependencies
npm install

# Run Next.js development server
npm run dev

# In a separate terminal, run Ponder indexer (optional)
cd ponder && npm install && npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
flow-explorer/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── page.tsx         # Home - latest blocks
│   │   ├── blocks/          # Blocks list
│   │   ├── block/[number]/  # Block details
│   │   ├── tx/[hash]/       # Transaction details
│   │   └── account/[addr]/  # Account details
│   ├── components/          # React components
│   └── lib/
│       ├── rpc.ts           # viem client for Flow EVM
│       ├── ponder.ts        # Ponder GraphQL client
│       └── chains.ts        # Chain definitions
├── ponder/                  # Ponder indexer (separate deploy)
│   ├── ponder.config.ts
│   ├── ponder.schema.ts
│   └── src/index.ts
└── package.json
```

## Deployment

### Next.js (Vercel)

| Setting | Value |
|---------|-------|
| Framework | Next.js |
| Build Command | `npm run build` |
| Output Directory | `.next` |

Environment variables:
- `NEXT_PUBLIC_PONDER_URL` - Ponder GraphQL endpoint (optional)

### Ponder (Railway)

Deploy the `ponder/` directory separately:

```bash
cd ponder
npm install
npm start
```

Environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `FLOW_EVM_RPC_URL` - Flow EVM RPC (default: mainnet)

## Features

- Real-time block updates via viem RPC
- Historical data via Ponder indexer (when running)
- Block, transaction, and account details
- Search by block number, tx hash, or address
- Network switcher (Mainnet/Testnet)
- Dark theme with Flow branding

## Networks

| Network | Chain ID | RPC URL |
|---------|----------|---------|
| Mainnet | 747 | https://mainnet.evm.nodes.onflow.org |
| Testnet | 545 | https://testnet.evm.nodes.onflow.org |

## License

MIT
